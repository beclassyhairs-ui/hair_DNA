// ============================================================================
// POST /api/analyze-face
// 얼굴형 판정 메인(유일) 엔진 — 2026-07-04 전면 재도입
// MediaPipe(lib/faceAnalysis.ts)는 랜드마크 시각화(초록 점 오버레이) 전용으로 격하,
// 실제 판정(shape) 결과에는 절대 개입하지 않는다. 정확도 최우선 — 비용 타협 없음.
// 유저 셀카(base64, 1024px/detail:high) → GPT-4o Vision → 얼굴형(FaceShapeKey) 반환
//
// [중요 — refusal 이슈, 2026-07-04] 실제 인물 사진에 대해 jaw/cheek/temple/chinTip처럼
// 얼굴 부위별로 항목화된 JSON 라벨을 요구하면 GPT-4o가 생체 측정성 판정으로 인식해
// "I'm sorry, I can't assist with that."로 거부(finish_reason=stop, refusal 필드)한다.
// content가 빈 문자열로 와서 예전 코드는 이걸 감지 못하고 "oval"을 성공으로 위장했었음.
// → 해결: 항목별 라벨링 요구를 없애고, 자유문장 reasoning 한 줄 + 최종 shape 하나만
// 요구하는 구조로 변경. 거부 발생 안 함 확인(테스트 10장). 대신 content가 비거나
// 파싱 실패 시 ok:false로 정직하게 에러 반환(절대 silently oval로 위장하지 않음).
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

// CoT(자유문장 reasoning 한 줄) + JSON 응답 — 항목별 생체 라벨링 요구 금지(refusal 유발 확인됨)
const PROMPT = `You are a hairstylist helping a client choose a flattering fringe/bang style, similar to a typical "find your face shape for a haircut" quiz.

Category guide (real-world hairstylist judgment, not textbook geometry):
- square  : jaw looks wide and boxy, close to cheekbone width
- oblong  : face looks clearly longer than it is wide
- round   : soft full cheeks, width and height feel similar, jawline is curved not angular
- peanut  : cheekbones stick out while the sides near the temple look pinched in, so the outline looks a bit hourglass-shaped
- heart   : forehead looks wide, and the outline narrows down to a pointed chin
- diamond : cheekbones are the widest part, forehead and jaw both look narrower than the cheekbones
- hexagon : jaw looks angular AND the chin looks pointed/protruding too, so the overall outline looks angular
- oval    : balanced outline, gently tapered, use only if nothing else fits well

Ignore hair/bangs covering the forehead — judge the outline you can actually see.
First write one short sentence comparing the general outline proportions you see. Then respond ONLY in this JSON format:
{"reasoning": "<one short sentence>", "shape": "<oval|round|oblong|square|heart|diamond|hexagon|peanut>"}`;

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
        max_tokens:      150,
        temperature:     0,
        response_format: { type: "json_object" }, // JSON 형식 강제
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image, detail: "high" } }, // 최대 해상도 강제 — 턱선·광대·관자놀이 디테일 정확도 최우선
            { type: "text",      text: PROMPT },
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
