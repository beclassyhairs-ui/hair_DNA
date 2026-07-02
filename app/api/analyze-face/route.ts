// ============================================================================
// POST /api/analyze-face
// 유저 셀카(base64) → GPT-4o-mini Vision → 얼굴형(FaceShapeKey) 반환
//
// 환경변수: OPENAI_API_KEY (필수)
// 비용: $0.0002~0.0005 / 1회 (gpt-4o-mini + detail:low)
// ============================================================================

export const runtime    = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const VALID_SHAPES = new Set([
  "oval", "round", "oblong", "square",
  "heart", "diamond", "hexagon", "peanut",
]);

// CoT(Chain-of-Thought) + JSON 응답 — 낮은 화질을 강한 추론으로 보완
const PROMPT = `You are a professional face shape analyst for East Asian women.

CRITICAL: Completely IGNORE all hair, bangs, and forehead coverage.
Analyze ONLY the underlying skeletal bone structure — jaw, cheekbones, chin, face proportions.

Think step by step, then respond ONLY in this exact JSON format:
{
  "jaw": "<angular|rounded|pointed|narrow>",
  "cheek": "<wide|moderate|narrow>",
  "length": "<longer-than-wide|similar|wider-than-long>",
  "shape": "<oval|round|oblong|square|heart|diamond|hexagon|peanut>"
}

Shape definitions:
- oval    : balanced egg, jaw slightly narrower than cheekbones, moderate length
- round   : short and wide, full rounded cheeks
- oblong  : clearly longer than wide
- square  : strong ANGULAR jaw nearly as wide as cheekbones
- heart   : wide forehead+cheekbones, narrow pointed chin (V-line)
- diamond : widest at cheekbones, narrow BOTH forehead AND chin
- hexagon : wide at forehead, cheekbones, AND jaw all similarly wide
- peanut  : narrow temples creating pinched look at sides

JSON only. No extra text.`;

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("[analyze-face] OPENAI_API_KEY 없음");
    return NextResponse.json({ ok: false, shape: "oval", error: "OPENAI_API_KEY not set" });
  }

  // 1. 요청 파싱
  let image: string;
  try {
    const body = await req.json();
    image = body.image as string;
    if (!image || !image.startsWith("data:image")) throw new Error("invalid image");
  } catch {
    return NextResponse.json({ ok: false, shape: "oval", error: "Invalid request" }, { status: 400 });
  }

  // 2. GPT-4o-mini Vision 호출
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:           "gpt-4o",        // 미니→4o: 강한 추론으로 낮은 화질 보완
        max_tokens:      200,             // CoT JSON 출력 공간 확보
        temperature:     0,
        response_format: { type: "json_object" }, // JSON 형식 강제
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image, detail: "auto" } }, // 해상도에 맞게 자동 선택 — 턱선·광대 디테일 인식 향상
            { type: "text",      text: PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[analyze-face] OpenAI HTTP", res.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, shape: "oval", error: `OpenAI ${res.status}` });
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    // CoT JSON에서 shape 필드 추출
    let shape = "oval";
    try {
      const parsed = JSON.parse(content) as Record<string, string>;
      const candidate = (parsed.shape ?? "").toLowerCase().replace(/[^a-z]/g, "");
      shape = VALID_SHAPES.has(candidate) ? candidate : "oval";
    } catch {
      // JSON 파싱 실패 시 첫 단어로 fallback
      const raw = content.toLowerCase().split(/\s/)[0].replace(/[^a-z]/g, "");
      shape = VALID_SHAPES.has(raw) ? raw : "oval";
    }

    console.log(`[analyze-face] ✅ GPT 판정: ${shape} | CoT: ${content.slice(0, 120)}`);
    return NextResponse.json({ ok: true, shape, rawContent: content });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyze-face] 예외:", msg);
    return NextResponse.json({ ok: false, shape: "oval", error: msg });
  }
}
