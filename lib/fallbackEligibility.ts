// ============================================================================
// lib/fallbackEligibility.ts — ⑤ 폴백 자격 "경과시간 판정식"의 순수 함수 분리.
//
// 배경(2026-09-08 회귀): 클라 폴백 트리거(FALLBACK_TRIGGER_MS=290s, /style/loading)와
//   서버 자격 문턱(FALLBACK_MIN_ELAPSED_MS)이 두 파일에 흩어져 있어, 트리거를 8분→4:50으로
//   당길 때 문턱(7분)을 함께 안 내려 정상 콜드미스 폴백이 전건 거부됐다(사람 눈으로 못 잡음).
//   → 판정식만 이 순수 함수로 떼어내 tests/invariant 하네스가 두 상수의 정합을 기계로 박제한다.
//   ★ app/api/hair-transform/route.ts 의 verifyFallbackEligibility 는 이 함수를 그대로 호출한다
//     (fetch/에러처리는 라우트에 남고, "경과시간 판정"만 이관 — 동작 불변).
//
// 판정 규칙(불변):
//   · succeeded             → false (이미 성공한 원본을 폴백으로 재시도 금지)
//   · created_at 파싱 불가   → false (fail-closed)
//   · failed | canceled     → (completed_at − created_at) >= 문턱  ("생성→실제 종결" 소요시간.
//                              즉시 cancel 은 이 값이 ~0 이라 영원히 자격 없음 = 우회 차단)
//                              completed_at 파싱 불가 → false (fail-closed)
//   · 그 외(starting/processing) → (now − created_at) >= 문턱      (진짜 콜드미스만 통과)
// ============================================================================

// ─── 자격 문턱(서버) ──────────────────────────────────────────────────────────
// ★ 240s(4분): 클라 폴백 트리거 290s(4:50, app/style/loading/page.tsx FALLBACK_TRIGGER_MS)보다
//   낮아 정상 콜드미스는 통과(now−created≈290≥240)하고, 즉시 cancel 우회(completed−created≈0)·
//   즉시 재요청(now−created≈0)은 차단한다. route.ts 가 이 값을 import 해 쓴다.
//   ★★ 클라 트리거와 상호의존 — 한쪽만 바꾸면 폴백이 죽는다(2026-09-08 회귀). 이 관계
//      (문턱 < 트리거)는 tests/invariant/fallback-eligibility.test.ts 가 기계로 강제한다.
export const FALLBACK_MIN_ELAPSED_MS = 240 * 1000;

/** Replicate 예측 조회 응답 중 판정에 쓰는 필드만. */
export interface FallbackPredictionFields {
  status?: string;
  created_at?: string;
  completed_at?: string;
}

/**
 * 폴백 자격의 "경과시간 판정"만 담당하는 순수 함수(부수효과 없음).
 * ★ now 는 값이 아니라 "공급 함수"로 받는다 — 원본 verifyFallbackEligibility 는 현재시각을
 *   오직 starting/processing 분기에서, created_at 파싱 뒤에만 구했다. 값으로 미리 받으면 모든
 *   분기에서 평가돼 (Date.now 가 던지는 극단 환경·문턱 경계 미세시점에서) 동작이 갈릴 수 있다.
 *   함수로 받아 이 분기에서만 호출하면 원본과 100% 동일하다(2026-09-08 Codex 지적 반영).
 * @param pred        Replicate 예측 조회 결과(status/created_at/completed_at)
 * @param now         현재 시각(ms) 공급 함수. 라우트는 Date.now 를 그대로 넘긴다.
 * @param minElapsedMs 자격 문턱(ms). 라우트는 FALLBACK_MIN_ELAPSED_MS 를 넘긴다.
 * @returns true = 폴백 허용(진짜 콜드미스) / false = 거부(성공·즉시우회·판정불가)
 */
export function isFallbackElapsed(
  pred: FallbackPredictionFields,
  now: () => number,
  minElapsedMs: number,
): boolean {
  if (pred.status === "succeeded") return false;

  const createdMs = pred.created_at ? Date.parse(pred.created_at) : NaN;
  if (!Number.isFinite(createdMs)) return false;

  if (pred.status === "failed" || pred.status === "canceled") {
    // 종결된 job — "생성→종결" 실제 소요시간으로 판정(즉시 cancel 우회 차단).
    const completedMs = pred.completed_at ? Date.parse(pred.completed_at) : NaN;
    if (!Number.isFinite(completedMs)) return false; // completed_at 없으면 판정 불가 → fail-closed
    return completedMs - createdMs >= minElapsedMs;
  }
  // starting/processing — 아직 진행 중이므로 "생성→지금"으로 판정(진짜 콜드미스만 통과).
  //   ★ now() 는 여기서만·created 파싱 뒤에만 호출 — 원본과 동일한 평가 시점.
  return now() - createdMs >= minElapsedMs;
}
