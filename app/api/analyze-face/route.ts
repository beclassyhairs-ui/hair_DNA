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

const PROMPT = `Analyze the face shape in this photo and respond with EXACTLY ONE word from:
oval / round / oblong / square / heart / diamond / hexagon / peanut

Definitions (for East Asian faces):
- oval    : balanced egg shape, slightly longer than wide, jaw slightly narrower than cheeks
- round   : short and wide, full cheeks, similar width and height
- oblong  : clearly long and narrow face
- square  : strong wide jaw, jaw width close to cheek width
- heart   : wide forehead, narrow pointed chin (inverted triangle)
- diamond : prominent wide cheekbones, narrow BOTH forehead AND chin
- hexagon : wide at forehead, cheekbones, AND jaw simultaneously
- peanut  : narrow temples creating a pinched look at the sides

ONE word only. No punctuation. No explanation.`;

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
        model:      "gpt-4o-mini",
        max_tokens: 10,
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image, detail: "low" } },
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

    const raw   = data.choices?.[0]?.message?.content?.trim().toLowerCase().split(/\s/)[0] ?? "";
    const shape = VALID_SHAPES.has(raw) ? raw : "oval";

    console.log(`[analyze-face] ✅ GPT 판정: ${shape} (raw: "${raw}")`);
    return NextResponse.json({ ok: true, shape });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analyze-face] 예외:", msg);
    return NextResponse.json({ ok: false, shape: "oval", error: msg });
  }
}
