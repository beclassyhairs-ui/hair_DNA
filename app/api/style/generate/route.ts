// ============================================================================
// POST /api/style/generate
// 유저 사진 + 8문항 답변 → Replicate SDXL img2img → 헤어 변환 이미지 URL 반환
//
// 환경변수:
//   REPLICATE_API_TOKEN   — Replicate API 키 (필수)
//   REPLICATE_MODEL_VER   — 모델 버전 해시 (선택, 기본값: SDXL img2img)
//
// 토큰 미설정 시: { ok: false, reason: "no_token" } 반환 → 프론트는 레퍼런스 이미지 폴백
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API = "https://api.replicate.com/v1/predictions";

// Stability AI SDXL img2img (공개 버전)
const DEFAULT_MODEL_VER =
  process.env.REPLICATE_MODEL_VER ??
  "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc";

// ─── 헤어 스타일 프롬프트 빌더 ────────────────────────────────────────────────

function buildHairPrompt(answers: Record<string, string>): string {
  const LENGTH: Record<string, string> = {
    short:       "pixie cut, ultra short hair above ears",
    bob:         "bob haircut, chin length hair",
    shoulder:    "shoulder length hair, lob style",
    collarbone:  "collarbone length hair, medium length",
    chest:       "long hair, chest length",
  };
  const DESIGN: Record<string, string> = {
    straight:  "sleek straight hair, no waves",
    c_curl:    "C-curl perm, ends curled inward softly",
    s_curl:    "natural S-wave perm, flowing waves",
    wave:      "loose beach waves, wavy texture",
  };
  const LAYER: Record<string, string> = {
    heavy:  "blunt one-length cut, no layers",
    medium: "soft textured feathered layers",
    light:  "heavy hush-cut layers, lots of layers",
  };

  const l = LENGTH[answers.q11_length ?? ""] ?? "medium length hair";
  const d = DESIGN[answers.q13_design ?? ""] ?? "natural hair";
  const y = LAYER[answers.q14_layer   ?? ""] ?? "layered hair";

  return (
    `professional hair salon portrait of an Asian woman, ${l}, ${d}, ${y}, ` +
    `studio lighting, sharp focus, high quality photography, natural skin tones`
  );
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, reason: "no_token" });
  }

  let photoDataUrl: string;
  let answers: Record<string, string>;

  try {
    const body = await req.json();
    photoDataUrl = body.photoDataUrl as string;
    answers      = (body.answers ?? {}) as Record<string, string>;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  if (!photoDataUrl) {
    return NextResponse.json({ ok: false, reason: "missing_photo" }, { status: 400 });
  }

  const prompt = buildHairPrompt(answers);

  try {
    const res = await fetch(REPLICATE_API, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=30", // 최대 30초 동기 대기
      },
      body: JSON.stringify({
        version: DEFAULT_MODEL_VER,
        input: {
          image:              photoDataUrl,
          prompt,
          negative_prompt:    "blurry, low quality, distorted face, ugly, disfigured, watermark",
          num_inference_steps: 30,
          guidance_scale:      7.5,
          strength:            0.55,
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.status.toString());
      console.error("[style/generate] Replicate HTTP error:", res.status, err);
      return NextResponse.json({ ok: false, reason: "api_error" });
    }

    const data = (await res.json()) as {
      output?: string | string[];
      error?:  string;
      status?: string;
    };

    if (data.error) {
      console.error("[style/generate] Prediction error:", data.error);
      return NextResponse.json({ ok: false, reason: "prediction_error" });
    }

    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imageUrl) {
      return NextResponse.json({ ok: false, reason: "no_output" });
    }

    return NextResponse.json({ ok: true, imageUrl });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[style/generate] Exception:", msg);
    return NextResponse.json({ ok: false, reason: "exception" });
  }
}
