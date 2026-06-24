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

// ─── Replicate 입력 빌더 ─────────────────────────────────────────────────────
// PhotoMaker-Style, InstantID, IP-Adapter 등 주요 모델의 입력 키를 모두 포함
// 모델이 인식하지 못하는 키는 자동 무시됨

function buildReplicateInput(
  userPhoto:    string,  // 유저 셀카 (base64 data URL)
  referenceUrl: string,  // 레퍼런스 이미지 절대 URL (내부 전용)
  prompt:       string,
) {
  return {
    prompt,
    negative_prompt:
      "blurry, low quality, distorted face, ugly, disfigured, watermark, " +
      "bad anatomy, multiple people, extra limbs, deformed, nsfw",

    // 유저 얼굴 정체성 보존 (모델별 키 이름 중복 포함)
    input_image: userPhoto,   // PhotoMaker-Style
    image:       userPhoto,   // InstantID / IP-Adapter SDXL
    face_image:  userPhoto,   // 일부 face ID 모델

    // 헤어 스타일 레퍼런스 (백엔드 전용 — 절대 클라이언트 미노출)
    style_image:      referenceUrl,
    ip_adapter_image: referenceUrl,
    style_reference:  referenceUrl,

    // 생성 파라미터
    num_outputs:         1,
    num_inference_steps: 30,
    guidance_scale:      7.0,

    // 얼굴 정체성 강도
    face_strength:                 0.8,
    ip_adapter_scale:              0.7,
    controlnet_conditioning_scale: 0.8,

    // 스타일 전이 강도
    style_strength_radio: 0.5,
    strength:             0.55,
  };
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. 인증 토큰 확인
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.warn("[hair-transform] REPLICATE_API_TOKEN 미설정 — 생성 건너뜀");
    return NextResponse.json({ ok: false, reason: "no_token" });
  }

  // 2. 요청 파싱
  let userPhoto: string;
  let answers: StyleAnswers;
  try {
    const body = await req.json();
    userPhoto = body.userPhoto as string;
    answers   = (body.answers ?? {}) as StyleAnswers;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!userPhoto) {
    return NextResponse.json({ ok: false, reason: "missing_photo" }, { status: 400 });
  }

  // 3. 절대 base URL 조립 (NEXT_PUBLIC_SITE_URL → VERCEL_URL → 요청 헤더 순)
  const baseUrl = getBaseUrl(req);

  // 4. 레퍼런스 이미지 URL 확정 (빈 폴더 안전 방어 포함)
  //    baseUrl이 반드시 https:// 로 시작하는 공개 URL 이어야 Replicate가 접근 가능
  const { url: referenceUrl, isDefault } = await safeResolveReferenceUrl(answers, baseUrl);

  // 5. 프롬프트 생성
  const prompt = buildHairStylePrompt(answers);

  console.log(
    `[hair-transform] 모델: ${MODEL_OWNER}/${MODEL_NAME} | ` +
    `레퍼런스: ${isDefault ? "default_style.jpg (폴백)" : referenceUrl.split("/references/")[1]}`,
  );

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
        input: buildReplicateInput(userPhoto, referenceUrl, prompt),
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      console.error("[hair-transform] Replicate HTTP error:", res.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, reason: "api_error" });
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
        return NextResponse.json({ ok: false, reason: "poll_timeout" });
      }
      return NextResponse.json({ ok: true, imageUrl: pollResult });
    }

    if (data.error) {
      console.error("[hair-transform] Prediction error:", data.error);
      return NextResponse.json({ ok: false, reason: "prediction_error" });
    }

    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imageUrl) {
      return NextResponse.json({ ok: false, reason: "no_output" });
    }

    return NextResponse.json({ ok: true, imageUrl });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hair-transform] Exception:", msg);
    return NextResponse.json({ ok: false, reason: "exception" });
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
