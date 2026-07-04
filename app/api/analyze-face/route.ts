// ============================================================================
// POST /api/analyze-face
// 얼굴형 판정 메인(유일) 엔진 — 2026-07-04 전면 재도입
// MediaPipe(lib/faceAnalysis.ts)는 랜드마크 시각화(초록 점 오버레이) 전용으로 격하,
// 실제 판정(shape) 결과에는 절대 개입하지 않는다. 정확도 최우선 — 비용 타협 없음.
// 유저 셀카(base64, 1024px/detail:high) → GPT-4o Vision → 얼굴형(FaceShapeKey) 반환
//
// 환경변수: OPENAI_API_KEY (필수)
// ============================================================================

export const runtime    = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const VALID_SHAPES = new Set([
  "oval", "round", "oblong", "square",
  "heart", "diamond", "hexagon", "peanut",
]);

// CoT(Chain-of-Thought) + JSON 응답 — 현업 헤어 디자이너의 실제 판정 기준을 그대로 주입
const PROMPT = `You are a professional face shape analyst trained by a senior hair salon director with years of in-person face-shape consultations for East Asian women.

CRITICAL: Completely IGNORE all hair, bangs, and forehead coverage — hair often hides the true hairline/forehead width, so infer the underlying skull shape instead of what's visually covered.
Analyze ONLY the underlying skeletal bone structure — jawline, cheekbones, temples, chin tip, forehead, and overall proportions.

Think step by step, then respond ONLY in this exact JSON format:
{
  "jaw": "<angular|rounded|pointed|narrow>",
  "cheek": "<wide|moderate|narrow>",
  "temple": "<concave|flat|wide>",
  "chinTip": "<protruding|rounded|pointed>",
  "length": "<longer-than-wide|similar|wider-than-long>",
  "shape": "<oval|round|oblong|square|heart|diamond|hexagon|peanut>"
}

Expert criteria (real-world hairstylist judgment — use these, not textbook geometry):
- square  : BOTH jaw corners clearly protrude outward creating a strong boxy look. Jaw width is close to cheekbone width.
- oblong  : The face is noticeably LONGER vertically than it is wide — the dominant impression is length, not angularity.
- round   : Full, soft rounded cheeks; width and height feel similar; jawline is soft/curved, NOT angular.
- peanut  : Cheekbones are prominent and stick out, while the temples are noticeably CONCAVE/indented compared to the cheekbones — the side silhouette looks pinched-in or hourglass-shaped, not smooth.
- heart   : Forehead is wide (wider than or equal to the jaw), and the face narrows steadily down to a pointed chin — classic V-line.
- diamond : Cheekbones are the widest point of the face; BOTH forehead and jaw are narrower than the cheekbones (unlike heart, the forehead is NOT wide).
- hexagon : The jaw is angular/square-ish AND the chin tip itself also protrudes/juts out, so the outline is angular overall — but jaw dominance is slightly softer than a pure square because the chin adds its own facet.
- oval    : Balanced, gently tapered from cheekbone to jaw, no single feature dominates — use this only when nothing else clearly fits.

JSON only. No extra text.`;

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("[analyze-face] OPENAI_API_KEY 없음");
    return NextResponse.json({ ok: false, shape: "oval", error: "OPENAI_API_KEY not set" });
  }

  // 1. 요청 파싱
  let image: string;
  let promptOverride: string | undefined;
  try {
    const body = await req.json();
    image = body.image as string;
    promptOverride = typeof body.debugPrompt === "string" ? body.debugPrompt : undefined; // 임시 진단용 — refusal 원인 파악 후 제거
    if (!image || !image.startsWith("data:image")) throw new Error("invalid image");
  } catch {
    return NextResponse.json({ ok: false, shape: "oval", error: "Invalid request" }, { status: 400 });
  }

  // 2. GPT-4o Vision 호출 — 메인 판정 엔진, 화질/비용 타협 없음
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:           "gpt-4o",
        max_tokens:      300,             // CoT JSON 필드 추가(temple/chinTip)로 출력 공간 확장
        temperature:     0,
        response_format: { type: "json_object" }, // JSON 형식 강제
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image, detail: "high" } }, // 최대 해상도 강제 — 턱선·광대·관자놀이 디테일 정확도 최우선
            { type: "text",      text: promptOverride ?? PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[analyze-face] OpenAI HTTP", res.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, shape: "oval", error: `OpenAI ${res.status}` });
    }

    const data = await res.json() as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string | null; refusal?: string | null };
      }>;
    };

    const choice   = data.choices?.[0];
    const content  = choice?.message?.content?.trim() ?? "";
    const refusal  = choice?.message?.refusal ?? null;
    const finishReason = choice?.finish_reason ?? "unknown";

    // 빈 응답/거부 응답 진단 로그 — content가 비었을 때 원인 파악용
    if (!content) {
      console.error(
        `[analyze-face] ⚠️ 빈 content — finish_reason=${finishReason} refusal=${refusal ?? "없음"} raw=${JSON.stringify(data).slice(0, 500)}`
      );
      return NextResponse.json({
        ok: false,
        shape: "oval",
        error: `GPT 빈 응답 (finish_reason=${finishReason}${refusal ? `, refusal=${refusal}` : ""})`,
      });
    }

    // CoT JSON에서 shape 필드 추출
    let shape: string | null = null;
    try {
      const parsed = JSON.parse(content) as Record<string, string>;
      const candidate = (parsed.shape ?? "").toLowerCase().replace(/[^a-z]/g, "");
      if (VALID_SHAPES.has(candidate)) shape = candidate;
    } catch {
      // JSON 파싱 실패 시 첫 단어로 fallback
      const raw = content.toLowerCase().split(/\s/)[0].replace(/[^a-z]/g, "");
      if (VALID_SHAPES.has(raw)) shape = raw;
    }

    if (!shape) {
      console.error(`[analyze-face] ⚠️ shape 파싱 실패 — content=${content.slice(0, 300)}`);
      return NextResponse.json({ ok: false, shape: "oval", error: `GPT 응답 파싱 실패: ${content.slice(0, 200)}` });
    }

    console.log(`[analyze-face] ✅ GPT 판정: ${shape} | CoT: ${content.slice(0, 200)}`);
    return NextResponse.json({ ok: true, shape, rawContent: content });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyze-face] 예외:", msg);
    return NextResponse.json({ ok: false, shape: "oval", error: msg });
  }
}
