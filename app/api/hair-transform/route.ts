// ============================================================================
// POST /api/hair-transform
// 유저 셀카 + 설문 답변 → 레퍼런스 이미지 동적 매핑 → Replicate IP-Adapter 호출
//
// 환경변수 (Vercel 대시보드에서 설정):
//   REPLICATE_API_TOKEN     — Replicate API 키 (필수)
//   REPLICATE_MODEL_OWNER   — 모델 소유자 (기본값: "tencentarc")
//   REPLICATE_MODEL_NAME    — 모델 이름   (기본값: "photomaker-style")
//
// 모델 교체 방법:
//   REPLICATE_MODEL_OWNER=zsxkib  REPLICATE_MODEL_NAME=instant-id
//   REPLICATE_MODEL_OWNER=fofr    REPLICATE_MODEL_NAME=face-to-many
//
// ※ 레퍼런스 이미지 URL은 백엔드 내부에서만 사용 — 클라이언트 미노출
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getRandomReferenceUrl, buildHairStylePrompt } from "@/lib/styleReference";
import type { StyleAnswers } from "@/app/style/surveyData";

// ─── 모델 설정 ────────────────────────────────────────────────────────────────

const MODEL_OWNER = process.env.REPLICATE_MODEL_OWNER ?? "tencentarc";
const MODEL_NAME  = process.env.REPLICATE_MODEL_NAME  ?? "photomaker-style";

// v1/models/{owner}/{name}/predictions → 항상 최신 배포 버전 사용 (버전 해시 불필요)
const REPLICATE_ENDPOINT =
  `https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`;

// ─── 입력 포맷 빌더 ───────────────────────────────────────────────────────────
// PhotoMaker-Style, InstantID, IP-Adapter SDXL 등 주요 모델의 입력 키를 모두 포함
// 모델이 인식하지 못하는 키는 자동 무시됨

function buildReplicateInput(
  userPhoto:    string,  // 유저 셀카 (base64 data URL)
  referenceUrl: string,  // 레퍼런스 이미지 절대 URL (내부 전용)
  prompt:       string,
) {
  return {
    // ── 프롬프트 ──────────────────────────────────────────────────────────────
    prompt,
    negative_prompt:
      "blurry, low quality, distorted face, ugly, disfigured, watermark, " +
      "bad anatomy, multiple people, extra limbs, deformed, nsfw",

    // ── 유저 얼굴 정체성 보존 (모델별 키 이름 중복 포함) ───────────────────────
    input_image:  userPhoto,   // PhotoMaker-Style
    image:        userPhoto,   // InstantID / IP-Adapter SDXL
    face_image:   userPhoto,   // 일부 face ID 모델

    // ── 헤어 스타일 레퍼런스 이미지 (백엔드 전용 — 절대 클라이언트 미노출) ─────
    style_image:      referenceUrl,   // PhotoMaker-Style
    ip_adapter_image: referenceUrl,   // IP-Adapter 계열
    style_reference:  referenceUrl,   // 일부 커스텀 모델

    // ── 생성 파라미터 ─────────────────────────────────────────────────────────
    num_outputs:        1,
    num_inference_steps: 30,
    guidance_scale:     7.0,

    // ── 얼굴 정체성 강도 (높을수록 원본 얼굴 보존) ────────────────────────────
    face_strength:                 0.8,
    ip_adapter_scale:              0.7,
    controlnet_conditioning_scale: 0.8,

    // ── 스타일 레퍼런스 전이 강도 ──────────────────────────────────────────────
    style_strength_radio: 0.5,  // PhotoMaker (0=face only, 1=style only)
    strength:             0.55, // img2img 강도
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

  // 3. 레퍼런스 이미지 URL 동적 조립 (4차원 디렉토리 매핑 + 랜덤 픽)
  //    서버 baseUrl: 로컬 http://localhost:3001 / 프로덕션 https://your-domain.com
  const protocol = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host     = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const baseUrl  = `${protocol}://${host}`;
  const referenceUrl = getRandomReferenceUrl(answers, baseUrl);

  // 4. 프롬프트 생성
  const prompt = buildHairStylePrompt(answers);

  console.log(
    `[hair-transform] 모델: ${MODEL_OWNER}/${MODEL_NAME} | ` +
    `레퍼런스: ${referenceUrl.split("/references/")[1] ?? referenceUrl}`,
  );

  // 5. Replicate API 호출
  try {
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=55",  // 최대 55초 동기 대기
      },
      body: JSON.stringify({
        input: buildReplicateInput(userPhoto, referenceUrl, prompt),
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      console.error("[hair-transform] Replicate HTTP error:", res.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, reason: "api_error", status: res.status });
    }

    const data = await res.json() as {
      output?: string | string[];
      error?:  string;
      status?: string;
      urls?:   { get?: string };
    };

    // 아직 processing 중 (Prefer: wait 초과 시 polling URL 반환)
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

// ─── Replicate polling (Prefer: wait 초과 시 후속 처리) ─────────────────────

async function pollUntilDone(
  pollUrl: string,
  token: string,
  maxMs = 50_000,
): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await sleep(2_500);
    try {
      const res  = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as { status?: string; output?: string | string[]; error?: string };
      if (data.status === "succeeded") {
        return Array.isArray(data.output) ? data.output[0] : (data.output ?? null);
      }
      if (data.status === "failed" || data.error) return null;
    } catch { return null; }
  }
  return null;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
