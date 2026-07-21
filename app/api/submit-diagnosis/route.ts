// ============================================================================
// POST /api/submit-diagnosis
// 설문 답변 + 시술 횟수 → Google Sheets 기록
//
// ⚠️ 원본 셀카는 저장하지 않는다.
//   과거엔 셀카(base64)를 Vercel Blob에 업로드하고 그 공개 URL을 Sheets에 남겼으나,
//   이 아카이브는 아무도 다시 읽지 않으면서 얼굴 사진을 영구 공개 보관하는 liability였다.
//   원본 셀카를 서버에 영구 보관하지 않는다는 정책에 따라 업로드 자체를 제거했다.
//   (합성에 필요한 셀카 처리는 /api/hair-transform에서 하고, 그쪽은 합성 직후 즉시 삭제한다.)
//   photoDataUrl 필드는 구버전 클라이언트 호환을 위해 받기만 하고 무시한다.
//
// ※ Sheets 저장 실패는 에러 로그를 남기지만 사용자 플로우를 막지 않음
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { appendDiagnosisRow } from "../../../lib/sheets";

const TAG = "[submit-diagnosis]";

export interface SubmitDiagnosisBody {
  /** @deprecated 더 이상 저장하지 않는다. 구버전 클라이언트 호환용으로만 남김. */
  photoDataUrl?: string;
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

  if (!body.answers) {
    console.error(`${TAG} ❌ 필수 필드 누락 — answers`);
    return NextResponse.json({ error: "answers는 필수입니다." }, { status: 400 });
  }

  console.log(`${TAG} 📊 답변 키 목록:`, Object.keys(body.answers).join(", "));

  // ── 원본 셀카는 저장하지 않는다 → Sheets photoUrl은 항상 빈 값 ──────────────
  let sheetsOk = false;
  try {
    console.log(`${TAG} 📋 Google Sheets 저장 시작...`);
    await appendDiagnosisRow({
      photoUrl: "",
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

  console.log(`${TAG} ✔ 처리 완료 — 셀카 미저장, Sheets: ${sheetsOk ? "저장됨" : "실패"}`);

  // Sheets 실패해도 200 반환 (사용자 결과 페이지 진행 보장)
  return NextResponse.json({ ok: true, sheetsOk });
}
