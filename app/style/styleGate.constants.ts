// ============================================================================
// app/style/styleGate.constants.ts — 스타일 손상 게이트 상수 (지시서 A-2)
//
// ⚠️ PM-임시 · 튜닝 대상 ⚠️
//   이 파일의 점수·경계는 전부 PM 임시값이다(형님 분포 시뮬 검증 전). 튜닝 시 "이 파일만"
//   고치면 되도록 격리한다 — styleGate.ts 로직은 이 상수만 참조하고 숫자를 하드코딩하지 않는다.
//
// 데미지체크(app/damage-check)와는 별개 스키마다(스타일 전용). 나중에 통합 예정.
//   하나의 시술이력 점수가 ① 게이트 3단(통과/주의/차단) ② 매트릭스 modifier 4단(HistoryKey)
//   둘 다를 구동한다 — 같은 점수에서 나오므로 일관성이 유지된다.
// ============================================================================

import type { HistoryKey } from "./hairTypeMatrix";

/** 시술 종류(Q8-a/Q8-b 선택지) */
export type TreatmentId = "bleach" | "straight_perm" | "normal_perm" | "dye" | "root_dye" | "none";
/** "작년에 더 하신 거"(Q8-c) */
export type MoreLevel = "none" | "few" | "many";
/** 게이트 판정 3단 */
export type GateLevel = "pass" | "caution" | "block";

// ── 시술별 점수 (PM-임시) ──────────────────────────────────────────────────
//   탈색 4.5 / 매직·열펌 1.5 / 일반펌 1 / 염색 1 / 뿌리(새치)염색 1
export const TREATMENT_SCORE: Record<TreatmentId, number> = {
  bleach:        4.5,
  straight_perm: 1.5,
  normal_perm:   1,
  dye:           1,
  root_dye:      1,
  none:          0,
};

// ── 뿌리(새치)염색 주기 가중 (PM-임시) — 지시서 A-2 "뿌염 주기 가중" ─────────────
//   뿌리염색은 주기적으로 반복하는 시술이라 회당 +0.5를 얹는다.
export const ROOT_DYE_PERIODIC_BONUS = 0.5;

// ── "작년에 더 하신 거"(Q8-c) 가산 (PM-임시) ────────────────────────────────
//   없어요 +0 / 한두 번 더 +1 / 꽤 여러 번 +2.5
export const MORE_BONUS: Record<MoreLevel, number> = { none: 0, few: 1, many: 2.5 };

// ── 게이트 판정 경계 (PM-임시) ──────────────────────────────────────────────
//   합산 < 4.5 = 통과 / 4.5 ~ 6.9 = 주의 / 7.0 이상 = 차단
//   단, 탈색 2회+ 는 점수 무관 무조건 차단.
export const GATE_CAUTION_MIN = 4.5;
export const GATE_BLOCK_MIN   = 7.0;

// ── 점수 → HistoryKey 어댑터 경계 (PM-임시) ─────────────────────────────────
//   0~1.4 → count_1_2 / 1.5~4.4 → count_3_4 / 4.5~6.9 → count_5_6 / 7.0+ 또는 탈색2회+ → count_7plus
export const HISTORY_BOUNDARIES: { max: number; key: HistoryKey }[] = [
  { max: 1.4, key: "count_1_2" },
  { max: 4.4, key: "count_3_4" },
  { max: 6.9, key: "count_5_6" },
];
export const HISTORY_MAX_KEY: HistoryKey = "count_7plus";
