// ============================================================================
// POST /api/submit-diagnosis
// 사진(base64) + 설문 답변 + 시술 횟수 → Vercel Blob 업로드 → Google Sheets 기록
//
// ※ Blob 업로드 실패(로컬 개발 시 토큰 없음 등)는 경고 처리 후 계속 진행
// ※ Sheets 저장 실패는 에러 로그를 남기지만 사용자 플로우를 막지 않음
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { uploadPhotoToBlob } from "../../../lib/storage";
import { appendDiagnosisRow } from "../../../lib/sheets";

const TAG = "[submit-diagnosis]";

export interface SubmitDiagnosisBody {
  photoDataUrl: string;
  answers: Record<string, string | string[]>;
  treatmentCounts?: Record<string, number>;
}

export async function POST(req: NextRequest) {
  console.log(`${TAG} ▶ 요청 수신`);

  let body: Partial<SubmitDiagnosisBody>;
  try {
    body = (await req.json()) as Partial<SubmitDiagnosisBody>;
  } catch {
    console.error(`${TAG} ❌ 요청 본문 파싱 실패`);
    return NextResponse.json({ error: "요청 본문을 파싱할 수 없습니다." }, { status: 400 });
  }

  if (!body.photoDataUrl || !body.answers) {
    console.error(`${TAG} ❌ 필수 필드 누락 — photoDataUrl: ${!!body.photoDataUrl}, answers: ${!!body.answers}`);
    return NextResponse.json({ error: "photoDataUrl과 answers는 필수입니다." }, { status: 400 });
  }

  console.log(`${TAG} 📊 답변 키 목록:`, Object.keys(body.answers).join(", "));

  // ── Step 1: Vercel Blob 이미지 업로드 ────────────────────────────────────
  // Blob은 로컬 개발 환경에서 실패할 수 있으므로 독립적으로 처리
  let photoUrl = "";
  try {
    console.log(`${TAG} 📸 Blob 업로드 시작...`);
    photoUrl = await uploadPhotoToBlob(body.photoDataUrl);
    if (photoUrl) {
      console.log(`${TAG} ✅ Blob 업로드 성공: ${photoUrl}`);
    } else {
      console.warn(`${TAG} ⚠️  Blob 업로드 건너뜀 (BLOB_READ_WRITE_TOKEN 미설정)`);
    }
  } catch (blobErr) {
    const msg = blobErr instanceof Error ? blobErr.message : String(blobErr);
    console.warn(
      `${TAG} ⚠️  Blob 업로드 실패 — Sheets 저장은 계속 진행합니다.\n  └─ 원인: ${msg}`,
    );
    // photoUrl은 빈 문자열로 유지 → Sheets에 빈 칸으로 기록
  }

  // ── Step 2: Google Sheets 행 추가 ─────────────────────────────────────────
  let sheetsOk = false;
  try {
    console.log(`${TAG} 📋 Google Sheets 저장 시작...`);
    await appendDiagnosisRow({
      photoUrl,
      answers: body.answers,
      treatmentCounts: body.treatmentCounts ?? {},
    });
    sheetsOk = true;
    // 성공 로그는 sheets.ts 내부에서 출력
  } catch (sheetsErr) {
    const msg = sheetsErr instanceof Error ? sheetsErr.message : String(sheetsErr);
    console.error(`${TAG} ❌ Google Sheets 저장 실패:\n  └─ ${msg}`);
    // Sheets 실패는 사용자 플로우를 막지 않음 (non-blocking)
  }

  console.log(
    `${TAG} ✔ 처리 완료 — Blob: ${photoUrl ? "업로드됨" : "건너뜀"}, Sheets: ${sheetsOk ? "저장됨" : "실패"}`,
  );

  // Blob이나 Sheets 중 하나라도 실패해도 200 반환 (사용자 결과 페이지 진행 보장)
  return NextResponse.json({ ok: true, photoUrl, sheetsOk });
}
