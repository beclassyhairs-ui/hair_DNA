// ============================================================================
// POST /api/hair-transform
// 유저 셀카 + 설문 답변 → 레퍼런스 이미지 안전 매핑 → Replicate 헤어 합성
//
// 환경변수 (Vercel 대시보드):
//   REPLICATE_API_TOKEN     — Replicate API 키 (필수)
//   NEXT_PUBLIC_SITE_URL    — 프로덕션 절대 URL (권장: https://your-domain.com)
//   REPLICATE_MODEL_OWNER   — 기본값: "tencentarc"
//   REPLICATE_MODEL_NAME    — 기본값: "photomaker-style"
//
// ※ fs/promises 사용으로 Node.js 런타임 고정 (Edge 런타임 불가)
// ============================================================================

// [요구사항 1] Vercel Serverless Function 타임아웃 60초로 연장
// fs/promises 사용 → Node.js 런타임 유지 (edge 선언 금지)
export const maxDuration = 60;

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

const MODEL_OWNER = process.env.REPLICATE_MODEL_OWNER ?? "tencentarc";
const MODEL_NAME  = process.env.REPLICATE_MODEL_NAME  ?? "photomaker-style";
const REPLICATE_ENDPOINT =
  `https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`;

// ─── [요구사항 2] 절대 URL 조립 ──────────────────────────────────────────────
// Replicate 서버가 레퍼런스 이미지를 다운로드하려면 반드시 공개 절대 URL 필요
// 우선순위:
//   1. NEXT_PUBLIC_SITE_URL  — 커스텀 도메인 (Vercel 환경변수 권장)
//   2. VERCEL_URL            — Vercel 자동 배포 URL (preview/production)
//   3. 요청 헤더             — 로컬 개발 환경 fallback

function getBaseUrl(req: NextRequest): string {
  // 1순위: 명시적으로 설정한 프로덕션 URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  // 2순위: Vercel이 자동으로 주입하는 배포 URL
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // 3순위: 요청 헤더에서 추출 (로컬 개발)
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host  = req.headers.get("x-forwarded-host")
    ?? req.headers.get("host")
    ?? "localhost:3000";
  return `${proto}://${host}`;
}

// ─── 빈 폴더 완벽 방어 레퍼런스 URL 확정 ─────────────────────────────────────
//
// 알고리즘:
//   1. 랜덤 시작 인덱스(1~5)를 정하고, 해당 .jpg 파일이 public/ 에 실제 존재하는지
//      Node.js fs.access 로 확인
//   2. 없으면 다음 인덱스로 순환 (최대 5회 시도)
//   3. 5장 전부 없으면 → /references/default_style.jpg 폴백
//   4. 확정된 URL은 Replicate API 입력에만 사용 — 절대 클라이언트 반환 금지

async function safeResolveReferenceUrl(
  answers:  StyleAnswers,
  baseUrl:  string,
): Promise<{ url: string; isDefault: boolean }> {
  const dir    = getStyleDirectoryPath(answers);
  // "/references/group_2040/bob/c_curl/soft/" → "references/group_2040/bob/c_curl/soft/"
  const relDir = dir.replace(/^\//, "");

  const startIdx = Math.floor(Math.random() * MAX_IMG) + 1;

  for (let i = 0; i < MAX_IMG; i++) {
    const idx      = ((startIdx - 1 + i) % MAX_IMG) + 1;
    const relPath  = `${relDir}${idx}.jpg`;
    const absPath  = join(process.cwd(), "public", relPath);

    try {
      await access(absPath);
      // 파일 존재 확인 → 해당 URL 확정
      console.log(`[hair-transform] 레퍼런스 확정: ${dir}${idx}.jpg`);
      return { url: `${baseUrl}/${relPath}`, isDefault: false };
    } catch {
      // 파일 없음 → 다음 인덱스 시도
    }
  }

  // 폴더 내 이미지 전부 없음 → default_style.jpg 폴백
  console.warn(
    `[hair-transform] 빈 폴더 감지 (${dir}) — ` +
    `default_style.jpg 로 안전 폴백`,
  );
  return { url: `${baseUrl}${DEFAULT_REFERENCE_PATH}`, isDefault: true };
}

// ─── base64 포맷 정규화 ───────────────────────────────────────────────────────
// Replicate는 "data:image/jpeg;base64,..." 형식의 Data URI를 요구한다.
// 업로드 페이지는 canvas.toDataURL("image/jpeg") 로 항상 올바른 형식을 생성하지만
// 혹시라도 접두사가 없거나 잘못된 경우 강제 보정한다.
function normalizeBase64(raw: string): string {
  // 이미 올바른 형식
  if (raw.startsWith("data:image/") && raw.includes(";base64,")) return raw;
  // "data:..." 있지만 ";base64," 없는 비정상 케이스 → jpeg 접두사로 교정
  if (raw.startsWith("data:")) {
    const b64 = raw.includes(",") ? raw.split(",")[1] : raw.replace(/^data:[^,]*,?/, "");
    return `data:image/jpeg;base64,${b64}`;
  }
  // 순수 base64 문자열 (접두사 전혀 없음) → jpeg 접두사 추가
  return `data:image/jpeg;base64,${raw}`;
}

// ─── 공개 절대 URL 검증 ───────────────────────────────────────────────────────
function isPublicUrl(url: string): boolean {
  return url.startsWith("https://") && !url.includes("localhost") && !url.includes("127.0.0.1");
}

// ─── Replicate 입력 빌더 ─────────────────────────────────────────────────────
// tencentarc/photomaker-style 공식 스펙 기준 (2024)
// https://replicate.com/tencentarc/photomaker-style
//
// 허용 파라미터:
//   prompt                — 필수. "img" 트리거 워드 포함 필수
//   input_image           — 필수. 유저 얼굴 (Data URI 또는 공개 URL)
//   negative_prompt       — 선택
//   num_steps             — 선택 (integer, 1-100, 기본 50)
//   style_strength_ratio  — 선택 (integer, 15-50, 기본 20)
//   num_outputs           — 선택 (integer, 1-4, 기본 1)
//   guidance_scale        — 선택 (float, 1-10, 기본 5)
//
// ⚠️ 이 모델은 style_image / ip_adapter_image 등 별도 스타일 이미지 파라미터가 없다.
//    인식 못하는 파라미터를 포함하면 HTTP 422(Invalid input) 에러가 발생한다.

function buildReplicateInput(
  userPhoto: string,  // normalizeBase64() 처리 후 전달
  prompt:    string,
) {
  return {
    prompt,           // "img" 트리거 워드 필수 포함 (buildHairStylePrompt 에서 보장)
    negative_prompt:
      "blurry, low quality, distorted face, ugly, disfigured, watermark, " +
      "bad anatomy, multiple people, extra limbs, deformed, nsfw",
    input_image:          userPhoto, // ← 유일한 이미지 입력 키
    num_steps:            30,        // ← num_inference_steps 아님!
    num_outputs:          1,
    guidance_scale:       5.0,       // 범위 1-10
    style_strength_ratio: 20,        // ← style_strength_radio(오타) 아님! 범위 15-50
  };
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ─── [지시 3] API 키 하드 체크 ─────────────────────────────────────────────
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

  // ─── [요구사항 1] 유저 사진 포맷 엄격 검증 + 정규화 ────────────────────────
  // blob:// 나 http:// → Replicate 처리 불가 → 즉시 거부
  if (
    userPhoto.startsWith("blob:") ||
    userPhoto.startsWith("http:") ||
    (!userPhoto.startsWith("data:") && !userPhoto.match(/^[A-Za-z0-9+/]/)  )
  ) {
    const msg = `userPhoto 포맷 오류. Replicate는 Data URI(data:image/...)만 허용합니다. 받은 값: "${userPhoto.slice(0, 80)}..."`;
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "invalid_photo_format", debugError: msg },
      { status: 400 },
    );
  }
  // data:image/jpeg;base64,... 형식으로 정규화 (접두사 누락 시 강제 보정)
  const normalizedPhoto = normalizeBase64(userPhoto);

  // ─── [요구사항 2] 레퍼런스 URL — 공개 절대 경로 검증 (디버그 용도, Replicate 미전송) ──
  // PhotoMaker-Style 모델은 style_image 파라미터를 지원하지 않는다.
  // 향후 다른 모델 전환 시를 대비해 URL 계산 로직만 유지.
  const baseUrl = getBaseUrl(req);
  const isLocal = !isPublicUrl(baseUrl);
  if (isLocal) {
    console.log("[hair-transform] 로컬 환경 — baseUrl:", baseUrl);
  } else {
    // 레퍼런스 URL 계산 (로그용, Replicate payload에는 포함 안 함)
    const { url: refUrl, isDefault } = await safeResolveReferenceUrl(answers, baseUrl);
    console.log(`[hair-transform] 레퍼런스(미사용): ${isDefault ? "default_style.jpg" : refUrl.split("/references/")[1] ?? refUrl}`);
    // 공개 https URL인지 2차 방어 검증
    if (!isPublicUrl(refUrl)) {
      console.warn("[hair-transform] ⚠️ 레퍼런스 URL이 공개 절대경로가 아님 → 무시:", refUrl);
    }
  }

  // 5. 프롬프트 생성 ("img" 트리거 워드 포함)
  const prompt = buildHairStylePrompt(answers);

  // Replicate에 전송할 payload 로그 (base64 제외)
  const payloadForLog = {
    prompt,
    input_image:          `[base64 ${normalizedPhoto.length} chars, prefix: ${normalizedPhoto.slice(0, 30)}]`,
    num_steps:            30,
    num_outputs:          1,
    guidance_scale:       5.0,
    style_strength_ratio: 20,
  };
  console.log(`[hair-transform] → Replicate payload:`, JSON.stringify(payloadForLog));
  console.log(`[hair-transform] 모델: ${MODEL_OWNER}/${MODEL_NAME}`);

  // 6. Replicate API 호출
  try {
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=55",
      },
      body: JSON.stringify({
        input: buildReplicateInput(normalizedPhoto, prompt),
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      const debugError = `Replicate HTTP ${res.status}: ${errText.slice(0, 400)}`;
      console.error("[hair-transform] Replicate HTTP error:", res.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, reason: "api_error", debugError });
    }

    const data = await res.json() as {
      output?: string | string[];
      error?:  string;
      status?: string;
      urls?:   { get?: string };
    };

    // 아직 processing 중 → polling
    if (data.status === "processing" && data.urls?.get) {
      const pollResult = await pollUntilDone(data.urls.get, token);
      if (!pollResult) {
        return NextResponse.json({
          ok: false,
          reason: "poll_timeout",
          debugError: "Replicate 폴링 타임아웃: 50초 내에 이미지가 생성되지 않았습니다",
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
      const debugError = `Replicate 응답에 output이 없습니다. 응답 전체: ${JSON.stringify(data).slice(0, 300)}`;
      console.error("[hair-transform] No output:", data);
      return NextResponse.json({ ok: false, reason: "no_output", debugError });
    }

    return NextResponse.json({ ok: true, imageUrl });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hair-transform] Exception:", msg);
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
      if (data.status === "failed" || data.error) return null;
    } catch { return null; }
  }
  return null;
}
