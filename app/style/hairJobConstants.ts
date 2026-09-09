// ============================================================================
// app/style/hairJobConstants.ts — faceswap 합성 job 타이밍 상수 단일 출처.
//
// ★ 왜 별도 plain 모듈인가:
//   ① loading 페이지·useHairTransformJob 훅·결과지가 "같은 상수 객체"를 참조해야 한다
//      (복사하면 한쪽만 바뀌어 폴백이 죽는 2026-09-08 회귀가 재발). 여기 한 곳에서만 정의한다.
//   ② tests/invariant 하네스(node)가 이 값을 직접 import 해 정합을 기계로 검증한다 — "use client"
//      페이지는 node 에서 import 불가라, 예전엔 하네스가 290초를 손으로 미러했다. 이 모듈로 옮겨
//      미러를 실제 import 로 승격한다(1-5).
//   ⚠️ 값·동작 불변(이번 라운드 불가침). 위치만 옮긴다.
// ============================================================================

// 전체 대기 상한. 5분(300s). "최대 N분" 로딩 문구도 이 값에서 파생.
export const POLL_BUDGET_MS = 300_000;

// status 폴링 간격.
export const POLL_INTERVAL_MS = 2_500;

// 폴 1회 타임아웃.
export const PER_POLL_TIMEOUT = 15_000;

// ⑤ 폴백(lucataco) 폴링 예산 — 폴백은 상시 warm(초 단위)이라 짧게. 소소한 큐 여유 2분.
export const FALLBACK_POLL_BUDGET_MS = 120_000;

// ⑤ 폴백 트리거 시점 — 5:00 상한 소진 전, 4:50(290s) 경과 시 상시-warm 루카타코로 조기 전환.
//   ★★ 서버 문턱 FALLBACK_MIN_ELAPSED_MS(240s, lib/fallbackEligibility)보다 반드시 커야 한다.
//      이 값을 당기면(예: 4:00 미만) 서버 문턱을 못 넘어 정상 콜드미스 폴백이 전건 거부된다
//      (2026-09-08 회귀). 바꾸면 서버 문턱도 함께 확인. 정합은 하네스가 기계로 강제한다.
export const FALLBACK_TRIGGER_MS = 290_000; // 4:50
