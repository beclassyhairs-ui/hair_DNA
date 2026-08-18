// ============================================================================
// POST /api/hair-transform/warmup  —  faceswap GPU 선점 예열(warm-up) · B안 재이식(확정125)
//
// 배경: ddvinh1/face-swap-gpu 는 실제 run 은 ~1초지만 저트래픽이라 GPU 콜드스타트(부팅 큐)가
//   ~4분이다. 손님이 설문(≈4분)·로그인·사진 단계를 지나는 동안 이 라우트를 백그라운드로 쏘면,
//   합성 단계에 닿을 즈음 GPU 가 미리 깨어나 체감 대기가 사라진다(부팅 자체는 못 줄이고, 손님의
//   설문 소요로 가려질 뿐 — 원리 메모: 부팅 중 추가 신호는 같은 부팅에 합류할 뿐이다).
//
// 발사 지점(클라):
//   · 주발사   = /style/survey 마운트 시 1회(sessionStorage 플래그, 세션당 1회)
//   · 보조발사 = /style/upload 마운트 시, 직전 발사 180초 초과일 때만(유휴 GPU 재수면 대비 재점화)
//
// 동작: 더미 예측을 "생성만" 하고 즉시 반환한다(결과 폴링·출력 fetch 없음 → GPU 부팅만 유발).
//   입력은 공개 alias(배포보호 없는 hair-dna.vercel.app)의 대표 이미지 default_style.jpg 를
//   두 입력에 그대로 넣는다 — 얼굴 포함 실이미지라 모델 파이프라인이 실제로 돌아 GPU 가 웜된다.
//   ★ 이 파일은 앱의 지정 폴백 자산이라 항상 존재한다(레포·200 검증). VERCEL_URL(배포보호 302)
//     대신 공개 alias 고정 → 302 교훈 재발 방지.
//   ★ 입력 스키마는 모델 단일출처의 buildFaceswapInput 이 흡수(롤백 시 자동 정합).
//
// 가드레일(§0-6 유지):
//   · bump_hair_usage(손님 일일한도)를 절대 호출하지 않는다 → 손님 무료횟수는 예열로 절대 안 깎인다.
//     대신 전역(유저 무관) warmup_usage 카운터로 하드캡한다(완전 별개 테이블·집계 겸용).
//   · 셀카를 받지도 저장하지도 않는다(공개 이미지만) → "서버 미저장" 유지.
//   · 로그인 불필요(설문 중, 로그인 前 시점). fire-and-forget: 실패해도 설문 흐름 안 막음.
//   · 손님 응답에 에러/성공 여부를 노출하지 않는다 — 모든 경로가 조용히 204(No Content).
//
// 남용 방어(미인증 공개 엔드포인트):
//   1) 동일 출처(Origin/Referer) 요청만 통과 — 브라우저 크로스사이트 남용 차단.
//   2) 인스턴스별 90초 쿨다운 — 쿨다운 내 요청은 예측 생성 없이 스킵(1차 필터, 무료·DB 왕복 없음).
//   3) 전역(다중 인스턴스) 원자적 쿨다운(try_acquire_warmup_cooldown) — 2026-08-16 D-2 감사 ③:
//      인스턴스별 변수는 서버리스 동시 인스턴스 앞에서 무력하다(Origin 위조 후 burst 요청을
//      서로 다른 콜드 인스턴스가 나눠 받으면 각자 쿨다운을 통과해버림) → DB 단일 행에 원자적으로
//      직렬화해, 몇 대의 인스턴스가 동시에 맞아도 90초당 "딱 1번"만 실제 예열이 나가게 한다.
//      SQL 미실행 시 fail-open(2번 인스턴스별 쿨다운만 적용, 기존과 동일 — 회귀 없음).
//   4) 전역 일일 상한(bump_warmup_usage) — 다중 인스턴스 우회까지 하드캡(비용 상한). fail-open.
//   완전한 IP별 rate-limit 은 인프라 레벨이 필요 → 🔴 사장님: Vercel Firewall 권장.
// ============================================================================

export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HAIRSYNTH_MODEL_VERSION,
  REPLICATE_PREDICTIONS_ENDPOINT,
  buildFaceswapInput,
} from "@/lib/hairSynthModel";

// 예열용 입력 이미지 — 공개 alias(배포보호 없음)의 지정 폴백 자산. 항상 200(검증), 얼굴 포함.
//   두 입력(넣을 얼굴·레퍼런스 헤어)에 같은 이미지를 넣어 파이프라인 전체를 돌린다.
const WARM_IMAGE = "https://hair-dna.vercel.app/references/default_style.jpg";

// 전역 예열 일일 상한(유저 무관). 정상 트래픽(세션당 1~2회)엔 절대 안 걸리고 폭주만 하드캡한다.
// 회당 ~$0.0002 → 이 상한이 하루 최대 예열 비용을 ~$1 아래로 묶는다. 조정은 이 상수 하나로.
const WARMUP_DAILY_MAX = 5_000;

// 인스턴스별 쿨다운 — 90초 내 재요청은 실제 발사 스킵. (Date.now 는 라우트 런타임에서 정상 사용.)
const WARM_COOLDOWN_MS = 90_000;
const WARM_COOLDOWN_SECONDS = Math.round(WARM_COOLDOWN_MS / 1000); // 전역 RPC 는 초 단위 인자
let lastWarmAt = 0;

// 모든 응답은 본문 없는 204 — 손님(클라)은 결과를 읽지 않는다(fire-and-forget). 성공·스킵·실패 무구분.
const noContent = () => new NextResponse(null, { status: 204 });

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
  if (!sameOrigin(req)) return noContent();

  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) return noContent();

  const now = Date.now();
  if (now - lastWarmAt < WARM_COOLDOWN_MS) return noContent(); // 1차: 인스턴스별 쿨다운(무료 필터)
  lastWarmAt = now;

  // 2차: 전역(다중 인스턴스) 원자적 쿨다운 — burst 가 인스턴스별 필터를 우회해 90초 창을
  //   무력화하는 것을 막는다(2026-08-16 D-2 감사 ③). RPC 미배포/오류 시 fail-open(1차 필터만 적용,
  //   기존과 동일 — 회귀 없음).
  try {
    const { data: acquired, error } = await supabaseAdmin.rpc("try_acquire_warmup_cooldown", {
      p_cooldown_seconds: WARM_COOLDOWN_SECONDS,
    });
    if (error) {
      console.error("[hair-transform/warmup] 전역쿨다운 RPC 오류(전역보호 미적용):", error.message);
    } else if (acquired !== true) {
      return noContent(); // 다른 인스턴스가 최근 90초 내 이미 예열을 획득 → 스킵
    }
  } catch (e) {
    console.error("[hair-transform/warmup] 전역쿨다운 예외(전역보호 미적용):", e instanceof Error ? e.message : String(e));
  }

  // 전역 일일 상한(손님 일일한도와 완전 별개). RPC 미배포/오류 시 fail-open(상한만 미적용).
  try {
    const { data, error } = await supabaseAdmin.rpc("bump_warmup_usage", { p_max: WARMUP_DAILY_MAX });
    if (error) {
      console.error("[hair-transform/warmup] 전역상한 RPC 오류(상한 미적용):", error.message);
    } else if (data === -1) {
      // 상한 도달 → 스킵. lastWarmAt 은 리셋하지 않는다(리셋하면 이후 모든 요청이 DB까지 진입해
      //   쿨다운의 DB 보호가 무력화됨). 다음날 최대 쿨다운 시간 뒤 자동 재개된다.
      return noContent();
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
        input: buildFaceswapInput(WARM_IMAGE, WARM_IMAGE),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      console.log("[hair-transform/warmup] 예열 예측 발사(결과 버림)");
    } else {
      // ★ 실패해도 lastWarmAt 을 리셋하지 않는다(쿨다운 유지). 리셋하면 Origin 을 위조한 봇이
      //   실패를 유발하며 반복 호출해 90초 브레이크 없이 Replicate·전역상한을 태울 수 있다
      //   (쿨다운=잔액 태우기 방어의 핵심 — 확정125 §2). 정상 손님은 보조발사(180초 후)로 재시도됨.
      console.warn("[hair-transform/warmup] 예열 예측 생성 실패(쿨다운 유지):", res.status);
    }
  } catch (e) {
    // 위와 동일 — timeout/네트워크 실패에도 쿨다운 유지(남용 방어 우선).
    console.warn("[hair-transform/warmup] 예열 요청 예외(쿨다운 유지·무시):", e instanceof Error ? e.message : String(e));
  }
  return noContent();
}
