// ============================================================================
// POST /api/hair-transform
// 유저 셀카(input_image) + 마스터 프롬프트 → flux-kontext-pro 헤어 전이
//
// 모델: black-forest-labs/flux-kontext-pro
//   - 엔드포인트: /v1/models/black-forest-labs/flux-kontext-pro/predictions
//     (공식 모델 엔드포인트 — version hash 불필요, 항상 최신 버전)
//   - 비용: $0.04/run | 속도: 6~10초
//
// 파라미터:
//   input_image → 유저 셀카 (Vercel Blob 공개 URL)
//   prompt      → 4차원 마스터 프롬프트 (연령·기장·레이어드·웨이브 + 얼굴 보존 강제)
//
// 환경변수:
//   REPLICATE_API_TOKEN   — 필수
//   BLOB_READ_WRITE_TOKEN — 필수 (유저 셀카 Blob 업로드용)
// ============================================================================

export const maxDuration = 60; // Node.js 런타임 고정 (fs 사용)

import { access } from "fs/promises";
import { join }   from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getStyleDirectoryPath,
  buildHairStylePrompt,
  DEFAULT_REFERENCE_PATH,
  MAX_IMG,
} from "@/lib/styleReference";
import type { StyleAnswers } from "@/app/style/surveyData";
import { uploadPhotoToBlob } from "@/lib/storage";

// ─── 모델 설정 ────────────────────────────────────────────────────────────────
// /v1/models/{owner}/{name}/predictions 엔드포인트 → version hash 불필요
const REPLICATE_ENDPOINT =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions";

// ─── 공개 절대 URL 판별 ───────────────────────────────────────────────────────
function isPublicHttpsUrl(url: string): boolean {
  return (
    url.startsWith("https://") &&
    !url.includes("localhost") &&
    !url.includes("127.0.0.1")
  );
}

// ─── 절대 base URL 조립 ───────────────────────────────────────────────────────
// 우선순위: NEXT_PUBLIC_SITE_URL → VERCEL_URL → 요청 헤더
function getBaseUrl(req: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host  = req.headers.get("x-forwarded-host")
    ?? req.headers.get("host")
    ?? "localhost:3000";
  return `${proto}://${host}`;
}

// ─── [요구사항 2] 레퍼런스 이미지 랜덤 픽 + Fallback ──────────────────────────
// 1. 설문 결과로 조합된 폴더에서 1~MAX_IMG(5) 중 랜덤 시작 인덱스로 순환 탐색
// 2. 파일 존재 확인(fs.access) → 확정
// 3. 폴더 전체 비어있으면 /references/default_style.jpg 로 안전 폴백
async function pickReferenceUrl(
  answers: StyleAnswers,
  baseUrl: string,
): Promise<{ url: string; isDefault: boolean }> {
  const dir    = getStyleDirectoryPath(answers);      // e.g. "/references/group_2040/bob/c_curl/soft/"
  const relDir = dir.replace(/^\//, "");              // "references/group_2040/bob/c_curl/soft/"

  const startIdx = Math.floor(Math.random() * MAX_IMG) + 1; // 랜덤 시작 (1~5)

  for (let i = 0; i < MAX_IMG; i++) {
    const idx     = ((startIdx - 1 + i) % MAX_IMG) + 1;
    const relPath = `${relDir}${idx}.jpg`;
    const absPath = join(process.cwd(), "public", relPath);
    try {
      await access(absPath);
      const url = `${baseUrl}/${relPath}`;
      console.log(`[hair-transform] ✅ 레퍼런스 픽: ${relPath} → ${url}`);
      return { url, isDefault: false };
    } catch { /* 파일 없음 → 다음 인덱스 */ }
  }

  const url = `${baseUrl}${DEFAULT_REFERENCE_PATH}`;
  console.warn(`[hair-transform] ⚠️ 빈 폴더(${dir}) → default_style.jpg 폴백`);
  return { url, isDefault: true };
}

// ─── base64 Data URI 정규화 ───────────────────────────────────────────────────
function normalizeBase64(raw: string): string {
  if (raw.startsWith("data:image/") && raw.includes(";base64,")) return raw;
  if (raw.startsWith("data:")) {
    const b64 = raw.includes(",") ? raw.split(",")[1]! : raw.replace(/^data:[^,]*,?/, "");
    return `data:image/jpeg;base64,${b64}`;
  }
  return `data:image/jpeg;base64,${raw}`;
}

// ─── Replicate 입력 빌더 ─────────────────────────────────────────────────────
// 모델: black-forest-labs/flux-kontext-pro
//
// guidance (기본값 3.5):
//   낮을수록 원본 이미지에 충실 → 얼굴 훼손 위험 감소
//   2.0: 프롬프트 지시(헤어)는 적용하되 원본 이미지 충실도를 최대화
//
// prompt_upsampling (기본값 true):
//   true이면 FLUX가 프롬프트를 AI가 자동 확장·재해석 → 얼굴 서구화 원인 중 하나
//   false: 우리가 작성한 프롬프트를 literal하게 그대로 따름 → 얼굴 보존 우선
function buildReplicateInput(inputImage: string, prompt: string) {
  return {
    input_image:       inputImage,
    prompt,
    guidance:          2.0,   // 2.5 → 2.0: 원본 이미지 충실도 극대화
    output_quality:    90,
    prompt_upsampling: false,  // AI 프롬프트 자동 재해석 차단 — literal 준수 강제
  };
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // 1. API 키 하드 체크
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    const msg = "REPLICATE_API_TOKEN이 환경변수에 없습니다. Vercel 대시보드 또는 .env.local을 확인하세요.";
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "no_token", debugError: msg },
      { status: 500 },
    );
  }

  // 2. 요청 파싱
  let userPhoto: string;
  let answers: StyleAnswers;
  try {
    const body = await req.json();
    userPhoto = body.userPhoto as string;
    answers   = (body.answers ?? {}) as StyleAnswers;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad_request", debugError: "요청 JSON 파싱 실패" },
      { status: 400 },
    );
  }
  if (!userPhoto) {
    return NextResponse.json(
      { ok: false, reason: "missing_photo", debugError: "userPhoto 필드가 비어 있습니다" },
      { status: 400 },
    );
  }

  // 3. 유저 사진 포맷 검증 + 정규화
  if (userPhoto.startsWith("blob:") || userPhoto.startsWith("http:")) {
    const msg = `userPhoto 포맷 오류 — blob:/http: URL은 Replicate 처리 불가. 받은 값: "${userPhoto.slice(0, 80)}"`;
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "invalid_photo_format", debugError: msg },
      { status: 400 },
    );
  }
  const normalizedPhoto = normalizeBase64(userPhoto);
  console.log(`[hair-transform] 유저 사진: ${normalizedPhoto.slice(0, 30)}... (${normalizedPhoto.length}chars)`);

  // 3-1. 유저 셀카 → Vercel Blob 공개 URL 변환
  // lucataco/faceswap 모델은 data: URI를 URL로 처리해 NoneType 에러 발생
  // → Blob에 업로드 후 반환된 https:// URL을 swap_image로 전송
  let swapImageUrl: string;
  try {
    swapImageUrl = await uploadPhotoToBlob(normalizedPhoto);
    if (!swapImageUrl) {
      const msg = "BLOB_READ_WRITE_TOKEN이 환경변수에 없습니다. Vercel 대시보드 → Storage에서 Blob을 연결하세요.";
      console.error("[hair-transform]", msg);
      return NextResponse.json(
        { ok: false, reason: "blob_token_missing", debugError: msg },
        { status: 500 },
      );
    }
    console.log("[hair-transform] ✅ Blob 업로드 완료:", swapImageUrl);
  } catch (blobErr) {
    const msg = blobErr instanceof Error ? blobErr.message : String(blobErr);
    console.error("[hair-transform] ❌ Blob 업로드 실패:", msg);
    return NextResponse.json(
      { ok: false, reason: "blob_upload_failed", debugError: `Vercel Blob 업로드 실패: ${msg}` },
      { status: 500 },
    );
  }

  // 4. 마스터 프롬프트 생성 (4차원 변수 → 헤어 전이 지시문 + 얼굴 보존 강제)
  const prompt = buildHairStylePrompt(answers);

  // 5. Payload 로그
  console.log("[hair-transform] → Replicate payload:", JSON.stringify({
    model:        "black-forest-labs/flux-kontext-pro",
    input_image:  swapImageUrl,
    prompt:       prompt.slice(0, 120) + "...",
  }));

  // 6. Replicate API 호출 (/v1/models/ 엔드포인트 — version hash 불필요)
  try {
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=55",
      },
      body: JSON.stringify({
        input: buildReplicateInput(swapImageUrl, prompt),
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      const debugError = `Replicate HTTP ${res.status}: ${errText.slice(0, 500)}`;
      console.error("[hair-transform] Replicate 에러:", res.status, errText.slice(0, 300));
      return NextResponse.json({ ok: false, reason: "api_error", debugError });
    }

    const data = await res.json() as {
      output?: string | string[];
      error?:  string;
      status?: string;
      urls?:   { get?: string };
    };

    // processing 상태 → polling
    if (data.status === "processing" && data.urls?.get) {
      const pollResult = await pollUntilDone(data.urls.get, token);
      if (!pollResult) {
        return NextResponse.json({
          ok: false,
          reason: "poll_timeout",
          debugError: "Replicate 폴링 타임아웃: 50초 내에 이미지 생성 완료되지 않음",
        });
      }
      return NextResponse.json({ ok: true, imageUrl: pollResult });
    }

    if (data.error) {
      const debugError = `Replicate prediction error: ${data.error}`;
      console.error("[hair-transform] Prediction error:", data.error);
      return NextResponse.json({ ok: false, reason: "prediction_error", debugError });
    }

    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imageUrl) {
      const debugError = `output 없음. 응답 전체: ${JSON.stringify(data).slice(0, 400)}`;
      console.error("[hair-transform] No output:", data);
      return NextResponse.json({ ok: false, reason: "no_output", debugError });
    }

    console.log("[hair-transform] ✅ 합성 완료:", imageUrl);
    return NextResponse.json({ ok: true, imageUrl });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hair-transform] 예외:", msg);
    return NextResponse.json({
      ok: false,
      reason: "exception",
      debugError: `예외 발생: ${msg}`,
    });
  }
}

// ─── Replicate 폴링 ───────────────────────────────────────────────────────────

async function pollUntilDone(
  pollUrl: string,
  token:   string,
  maxMs  = 50_000,
): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2_500));
    try {
      const res  = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as {
        status?: string;
        output?: string | string[];
        error?:  string;
      };
      if (data.status === "succeeded") {
        return Array.isArray(data.output) ? (data.output[0] ?? null) : (data.output ?? null);
      }
      if (data.status === "failed" || data.error) {
        console.error("[hair-transform] 폴링 실패:", data.error ?? data.status);
        return null;
      }
    } catch { return null; }
  }
  return null;
}
