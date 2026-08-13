// ============================================================================
// POST /api/hair-transform/warmup  —  faceswap GPU 예열(warm-up)
//
// 배경: Replicate face-swap-gpu 는 실제 run 은 ~1초지만 콜드스타트(GPU 부팅 큐)가 3~5분이라
//   식은 날 첫 합성이 오래 걸린다. 설문 4번 문항 진입 시(+사진 화면 진입 시 2차) 이 라우트를
//   백그라운드로 쏘면, 손님이 사진 단계에 닿을 즈음 GPU 가 미리 깨어나 대기시간이 사라진다.
//
// 동작: 더미 예측을 "생성만" 하고 즉시 반환한다(결과 폴링·출력 fetch 없음 → GPU 부팅만 유발).
//   입력은 공개 alias(배포보호 없는 hair-dna.vercel.app)의 대표 이미지 1장을 두 입력에 그대로
//   넣는다 — 얼굴 포함 실이미지라 모델 파이프라인이 실제로 돌아 GPU 가 확실히 웜된다.
//   ★ 이 이미지는 앱의 지정 폴백 자산(DEFAULT_REFERENCE_PATH)이라 항상 존재한다(200 검증).
//     VERCEL_URL(배포보호 302) 대신 공개 alias 고정 → 오늘의 302 교훈 재발 방지.
//
// 가드레일(§0-6 유지):
//   · bump_hair_usage(손님 일일한도)를 절대 호출하지 않는다. 대신 "전역(유저 무관) 예열 카운터"
//     bump_warmup_usage 로 하드캡한다 → 손님 무료횟수는 예열로 절대 안 깎인다. (완전 별개 테이블)
//   · 셀카를 받지도 저장하지도 않는다(공개 이미지만) → "서버 미저장" 유지.
//   · 로그인 불필요(설문 중, 로그인 前 시점). fire-and-forget: 실패해도 설문 흐름 안 막음.
//
// 남용 방어(미인증 공개 엔드포인트):
//   1) 동일 출처(Origin/Referer) 요청만 통과 — 브라우저 크로스사이트 남용 차단.
//   2) 인스턴스별 60초 스로틀 — 이미 웜이면 재부팅 무의미, 중복 발사 억제(DB 호출 전 컷).
//   3) 전역 일일 상한(bump_warmup_usage) — 다중 인스턴스 우회까지 하드캡(비용 상한). fail-open.
//   완전한 IP별 rate-limit 은 인프라 레벨이 필요 → 🔴 사장님: Vercel Firewall 권장.
// ============================================================================

export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HAIRSYNTH_MODEL_VERSION,
  HAIRSYNTH_ENHANCE,
  REPLICATE_PREDICTIONS_ENDPOINT,
} from "@/lib/hairSynthModel";

// 예열용 입력 이미지 — 공개 alias(배포보호 없음)의 지정 폴백 자산. 항상 200(검증), 얼굴 포함.
const WARM_IMAGE = "https://hair-dna.vercel.app/references/default_style.jpg";

// 전역 예열 일일 상한(유저 무관). 정상 트래픽(세션당 1~2회)엔 절대 안 걸리고 폭주만 하드캡한다.
// 회당 ~$0.0002 → 이 상한이 하루 최대 예열 비용을 ~$1 아래로 묶는다. 조정은 이 상수 하나로.
const WARMUP_DAILY_MAX = 5_000;

// 인스턴스별 스로틀 — 60초 내 재요청은 실제 발사 스킵. (Date.now 는 라우트 런타임에서 정상 사용.)
let lastWarmAt = 0;

// 동일 출처(브라우저 same-origin) 요청만 통과 — scheme+host+port 전체(origin) 비교.
// Origin 우선, 없으면 Referer. 둘 다 없으면 거부한다(브라우저는 same-origin POST 에도 Origin 을
// 보내므로 정상 설문 흐름엔 영향이 없고, 헤더 없는 curl/bot 직접 호출을 차단한다).
function sameOrigin(req: NextRequest): boolean {
  const self = req.nextUrl.origin; // 이 요청의 canonical origin
  const origin = req.headers.get("origin");
  if (origin) {
    try { return new URL(origin).origin === self; } catch { return false; }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === self; } catch { return false; }
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: true, skipped: "origin" });

  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) return NextResponse.json({ ok: true, skipped: "no_token" });

  const now = Date.now();
  if (now - lastWarmAt < 60_000) return NextResponse.json({ ok: true, skipped: "throttled" });
  lastWarmAt = now;

  // 전역 일일 상한(손님 일일한도와 완전 별개). RPC 미배포/오류 시 fail-open(상한만 미적용).
  try {
    const { data, error } = await supabaseAdmin.rpc("bump_warmup_usage", { p_max: WARMUP_DAILY_MAX });
    if (error) {
      console.error("[hair-transform/warmup] 전역상한 RPC 오류(상한 미적용):", error.message);
    } else if (data === -1) {
      // 상한 도달 → 스킵. lastWarmAt 은 리셋하지 않는다(리셋하면 이후 모든 요청이 DB까지 진입해
      //   60초 스로틀의 DB 보호가 무력화됨 — Codex). 다음날 최대 60초 뒤 자동 재개된다.
      return NextResponse.json({ ok: true, skipped: "global_cap" });
    }
  } catch (e) {
    console.error("[hair-transform/warmup] 전역상한 예외(상한 미적용):", e instanceof Error ? e.message : String(e));
  }

  try {
    // 예측 "생성"만 — 결과는 폴링/수신하지 않고 버린다. 목적은 GPU 콜드부팅 유발뿐.
    const res = await fetch(REPLICATE_PREDICTIONS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version: HAIRSYNTH_MODEL_VERSION,
        input: { swap_image: WARM_IMAGE, input_image: WARM_IMAGE, enhance: HAIRSYNTH_ENHANCE },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      console.log("[hair-transform/warmup] 예열 예측 발사(결과 버림)");
    } else {
      lastWarmAt = 0; // 실패 시 스로틀 해제 — 다음 시도가 재부팅을 노릴 수 있게.
      console.warn("[hair-transform/warmup] 예열 예측 생성 실패:", res.status);
    }
  } catch (e) {
    lastWarmAt = 0;
    console.warn("[hair-transform/warmup] 예열 요청 예외(무시):", e instanceof Error ? e.message : String(e));
  }
  return NextResponse.json({ ok: true });
}
