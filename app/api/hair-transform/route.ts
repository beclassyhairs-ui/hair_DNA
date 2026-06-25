// ============================================================================
// POST /api/hair-transform
// 유저 셀카(image) + 레퍼런스 헤어 사진(pose_image) → InstantID 합성
//
// 모델: zsxkib/instant-id
//   - /v1/models/zsxkib/instant-id/predictions 엔드포인트 사용 (항상 최신 버전)
//   - 검증된 버전 해시: 6af8583c541261472e92155d87bba80d5ad98461665802f2ba196ac099aaedc9
//   - 스키마 출처: https://replicate.com/zsxkib/instant-id/versions/6af8583c.../api
//
// 핵심 비즈니스 로직:
//   image      → 유저 셀카 (Base64 data URI) — 얼굴 identity 보존
//   pose_image → /public/references/... 레퍼런스 사진 (공개 절대 URL) — 헤어 스타일 전이
//
// 환경변수:
//   REPLICATE_API_TOKEN     — 필수
//   NEXT_PUBLIC_SITE_URL    — 프로덕션 절대 URL (예: https://your-domain.com)
//   REPLICATE_MODEL_OWNER   — 기본값: "zsxkib"
//   REPLICATE_MODEL_NAME    — 기본값: "instant-id"
// ============================================================================

export const maxDuration = 60; // Vercel Serverless Function 60초 연장 (Node.js 런타임 고정)

import { access }  from "fs/promises";
import { join }    from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getStyleDirectoryPath,
  buildHairStylePrompt,
  DEFAULT_REFERENCE_PATH,
  MAX_IMG,
} from "@/lib/styleReference";
import type { StyleAnswers } from "@/app/style/surveyData";

// ─── 모델 설정 ────────────────────────────────────────────────────────────────
// /v1/models/{owner}/{name}/predictions 엔드포인트 → 버전 해시 불필요, 항상 최신 버전
const MODEL_OWNER = process.env.REPLICATE_MODEL_OWNER ?? "zsxkib";
const MODEL_NAME  = process.env.REPLICATE_MODEL_NAME  ?? "instant-id";
const REPLICATE_ENDPOINT =
  `https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`;

// ─── 절대 base URL 조립 ───────────────────────────────────────────────────────
// 우선순위: NEXT_PUBLIC_SITE_URL → VERCEL_URL → 요청 헤더 (로컬 fallback)
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

// ─── 공개 절대 URL 판별 ───────────────────────────────────────────────────────
// Replicate 서버가 다운로드 가능한 URL = https:// + 로컬호스트 아닌 것
function isPublicHttpsUrl(url: string): boolean {
  return (
    url.startsWith("https://") &&
    !url.includes("localhost") &&
    !url.includes("127.0.0.1")
  );
}

// ─── [요구사항 2] 레퍼런스 이미지 랜덤 픽 + Fallback ──────────────────────────
//
// 알고리즘:
//   1. 설문 답변으로 조합된 폴더(예: /references/group_2040/bob/c_curl/soft/) 안에서
//      1~MAX_IMG(5) 번 중 랜덤 인덱스로 시작해 파일 존재를 순환 체크
//   2. 찾으면 → {baseUrl}/{relPath} 로 절대 URL 반환
//   3. 폴더가 비어 있으면 → /references/default_style.jpg 로 안전 폴백
//
// 반환값의 isDefault 플래그로 폴백 여부 식별 가능
async function pickReferenceUrl(
  answers: StyleAnswers,
  baseUrl: string,
): Promise<{ url: string; isDefault: boolean }> {
  const dir    = getStyleDirectoryPath(answers);               // "/references/group_2040/bob/c_curl/soft/"
  const relDir = dir.replace(/^\//, "");                       // "references/group_2040/bob/c_curl/soft/"

  const startIdx = Math.floor(Math.random() * MAX_IMG) + 1;   // 랜덤 시작 인덱스 (1~5)

  for (let i = 0; i < MAX_IMG; i++) {
    const idx     = ((startIdx - 1 + i) % MAX_IMG) + 1;
    const relPath = `${relDir}${idx}.jpg`;
    const absPath = join(process.cwd(), "public", relPath);

    try {
      await access(absPath);                                   // Node.js fs — 파일 실재 확인
      const url = `${baseUrl}/${relPath}`;
      console.log(`[hair-transform] ✅ 레퍼런스 픽: ${dir}${idx}.jpg → ${url}`);
      return { url, isDefault: false };
    } catch {
      // 파일 없음 → 다음 인덱스로 순환
    }
  }

  // 폴더 내 이미지 전부 없음 → default_style.jpg 폴백
  const url = `${baseUrl}${DEFAULT_REFERENCE_PATH}`;
  console.warn(`[hair-transform] ⚠️ 빈 폴더(${dir}) → 폴백: ${url}`);
  return { url, isDefault: true };
}

// ─── base64 Data URI 정규화 ───────────────────────────────────────────────────
// Replicate는 "data:image/jpeg;base64,..." 형식 필요.
// canvas.toDataURL("image/jpeg") 는 항상 올바른 형식을 생성하지만,
// 혹시 접두사가 없거나 잘못된 경우 강제 보정한다.
function normalizeBase64(raw: string): string {
  if (raw.startsWith("data:image/") && raw.includes(";base64,")) return raw;
  if (raw.startsWith("data:")) {
    const b64 = raw.includes(",") ? raw.split(",")[1]! : raw.replace(/^data:[^,]*,?/, "");
    return `data:image/jpeg;base64,${b64}`;
  }
  return `data:image/jpeg;base64,${raw}`;
}

// ─── [요구사항 3] Replicate 입력 빌더 ────────────────────────────────────────
// 모델: zsxkib/instant-id
// 스키마 기준: https://replicate.com/zsxkib/instant-id/versions/6af8583c.../api
//
//  image      (string, required) — 유저 얼굴 (Base64 data URI)
//  pose_image (string, optional) — 레퍼런스 헤어 스타일 (공개 https URL)
//
// ⚠️ 이 스키마에 없는 파라미터를 포함하면 HTTP 422(Invalid input) 에러 발생.
//    검증된 파라미터만 사용한다.
function buildReplicateInput(
  userPhoto:    string,        // normalizeBase64() 처리 후 전달
  poseImageUrl: string | null, // 반드시 공개 https URL, 없으면 null
  prompt:       string,
) {
  const hasPose = poseImageUrl !== null;

  return {
    // ── 필수 이미지 입력 ───────────────────────────────────────────────────
    image: userPhoto,                                // 유저 셀카 — 얼굴 identity 보존

    // ── 레퍼런스 헤어 스타일 (핵심 비즈니스 로직) ──────────────────────────
    ...(hasPose ? { pose_image: poseImageUrl } : {}),

    // ── 텍스트 프롬프트 ────────────────────────────────────────────────────
    prompt,
    negative_prompt:
      "blurry, low quality, distorted face, ugly, disfigured, watermark, " +
      "bad anatomy, multiple people, extra limbs, deformed, nsfw, cartoon, anime",

    // ── 출력 규격 ──────────────────────────────────────────────────────────
    width:  640,
    height: 640,

    // ── 추론 파라미터 ──────────────────────────────────────────────────────
    num_inference_steps:           30,    // 1-500, 기본 30
    guidance_scale:                7.5,   // 1-50, 기본 7.5
    ip_adapter_scale:              0.8,   // 0-1.5, identity 보존 강도
    controlnet_conditioning_scale: 0.8,   // 0-1.5, fidelity 강도

    // ── 포즈/스타일 컨트롤 ─────────────────────────────────────────────────
    enable_pose_controlnet: hasPose,      // pose_image 있을 때만 활성화
    pose_strength:          0.6,          // 0-1, 헤어 스타일 전이 강도
    enable_canny_controlnet: false,
    enable_depth_controlnet: false,
    enhance_nonface_region:  true,        // 배경/비얼굴 영역 보정

    disable_safety_checker: true,         // 헤어 사진 오검출 방지
  };
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // ── 1. API 키 하드 체크 ──────────────────────────────────────────────────
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    const msg = "REPLICATE_API_TOKEN이 환경변수에 없습니다. Vercel 대시보드 또는 .env.local을 확인하세요.";
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "no_token", debugError: msg },
      { status: 500 },
    );
  }

  // ── 2. 요청 파싱 ─────────────────────────────────────────────────────────
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

  // ── 3. 유저 사진 포맷 검증 + 정규화 ─────────────────────────────────────
  if (userPhoto.startsWith("blob:") || userPhoto.startsWith("http:")) {
    const msg = `userPhoto 포맷 오류. Blob/HTTP URL은 Replicate 처리 불가. 받은 값: "${userPhoto.slice(0, 80)}"`;
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "invalid_photo_format", debugError: msg },
      { status: 400 },
    );
  }
  const normalizedPhoto = normalizeBase64(userPhoto);
  console.log(`[hair-transform] 유저 사진 포맷: ${normalizedPhoto.slice(0, 30)}... (${normalizedPhoto.length} chars)`);

  // ── 4. [요구사항 2] 레퍼런스 이미지 랜덤 픽 + Fallback ─────────────────
  const baseUrl = getBaseUrl(req);
  let poseImageUrl: string | null = null;

  if (!isPublicHttpsUrl(baseUrl)) {
    // 로컬 개발 환경: Replicate 서버가 localhost URL에 접근 불가
    // → 프로덕션(Vercel)에서는 항상 공개 HTTPS URL이 제공됨
    console.warn(
      "[hair-transform] ⚠️ 로컬 환경(baseUrl=" + baseUrl + ") — " +
      "Replicate 서버가 localhost URL을 다운로드할 수 없습니다. " +
      "NEXT_PUBLIC_SITE_URL 환경변수에 프로덕션 URL을 설정하면 로컬에서도 레퍼런스 이미지 전송 가능.",
    );
  } else {
    // 프로덕션: 공개 절대 URL 확정 (랜덤 픽 + fallback 포함)
    const { url, isDefault } = await pickReferenceUrl(answers, baseUrl);

    // 2차 방어: 혹시 URL이 공개 HTTPS가 아닌 경우 차단
    if (!isPublicHttpsUrl(url)) {
      console.error("[hair-transform] ❌ 레퍼런스 URL이 공개 HTTPS가 아님:", url);
    } else {
      poseImageUrl = url;
      console.log(`[hair-transform] pose_image: ${isDefault ? "[DEFAULT FALLBACK]" : ""} ${url}`);
    }
  }

  // ── 5. 프롬프트 생성 ─────────────────────────────────────────────────────
  const prompt = buildHairStylePrompt(answers);

  // ── 6. Payload 로그 (base64 내용 제외) ───────────────────────────────────
  console.log("[hair-transform] → Replicate payload:", JSON.stringify({
    model:        `${MODEL_OWNER}/${MODEL_NAME}`,
    image:        `[base64 ${normalizedPhoto.length}chars]`,
    pose_image:   poseImageUrl ?? "(로컬 환경 — 미전송)",
    prompt,
    num_inference_steps: 30,
    ip_adapter_scale:    0.8,
    controlnet_conditioning_scale: 0.8,
    enable_pose_controlnet: poseImageUrl !== null,
  }));

  // ── 7. Replicate API 호출 ─────────────────────────────────────────────────
  try {
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=55",       // 55초 동기 대기 (타임아웃 직전까지)
      },
      body: JSON.stringify({
        input: buildReplicateInput(normalizedPhoto, poseImageUrl, prompt),
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
      const debugError = `output 없음. 응답: ${JSON.stringify(data).slice(0, 400)}`;
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

// ─── Replicate 폴링 (processing 상태 처리) ───────────────────────────────────

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
