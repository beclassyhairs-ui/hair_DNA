// ============================================================================
// app/style/styleGate.ts — 스타일 손상 게이트 (지시서 A-2)
//
// 순수 함수. 시술이력 answers → 하나의 점수 → ① 게이트 3단(통과/주의/차단)
//   ② 매트릭스 modifier 4단(HistoryKey). 데미지 엔진과 별개 스키마(나중 통합).
//   점수·경계는 전부 styleGate.constants.ts(PM-임시)에서만 온다.
//
// 시술이력 answers 키(A-1②에서 설문이 기록):
//   q8a_recent / q8b_prev : TreatmentId (가장 최근 / 그 전 시술)
//   q8c_more              : MoreLevel ("작년에 더 하신 거")
//   q8_bleach_2plus       : "1" = 탈색 2회+ 하위체크
//   q8_root_gray          : "1" = 뿌리염색이 새치염색 (게이트 점수엔 미반영 — 새치 커머스/데미지용)
// ============================================================================

import type { StyleAnswers } from "./surveyData";
import type { HistoryKey } from "./hairTypeMatrix";
import {
  TREATMENT_SCORE,
  ROOT_DYE_PERIODIC_BONUS,
  MORE_BONUS,
  GATE_CAUTION_MIN,
  GATE_BLOCK_MIN,
  HISTORY_BOUNDARIES,
  HISTORY_MAX_KEY,
  type TreatmentId,
  type MoreLevel,
  type GateLevel,
} from "./styleGate.constants";

const TREATMENTS: TreatmentId[] = ["bleach", "straight_perm", "heat_perm", "normal_perm", "dye", "root_dye", "none"];
function asTreatment(v: string | undefined): TreatmentId {
  return (TREATMENTS as string[]).includes(v ?? "") ? (v as TreatmentId) : "none";
}
function asMore(v: string | undefined): MoreLevel {
  return v === "few" || v === "many" ? v : "none";
}

export interface StyleGateResult {
  score:           number;
  level:           GateLevel;   // pass / caution / block (게이트 3단)
  historyKey:      HistoryKey;  // 매트릭스 손상 modifier 입력(4단)
  bleachTwicePlus: boolean;     // 탈색 2회+ (무조건 차단 사유)
}

export function evaluateStyleGate(answers: StyleAnswers): StyleGateResult {
  const a    = asTreatment(answers.q8a_recent);
  const b    = asTreatment(answers.q8b_prev);
  const more = asMore(answers.q8c_more);

  // 탈색 2회+ : 하위체크 명시 OR 최근·그전 둘 다 탈색
  const bleachTwicePlus = answers.q8_bleach_2plus === "1" || (a === "bleach" && b === "bleach");

  // 하나의 점수 — 게이트와 어댑터 둘 다 여기서 파생
  let score = TREATMENT_SCORE[a] + TREATMENT_SCORE[b] + MORE_BONUS[more];
  if (a === "root_dye") score += ROOT_DYE_PERIODIC_BONUS;
  if (b === "root_dye") score += ROOT_DYE_PERIODIC_BONUS;

  // ① 게이트 3단
  let level: GateLevel;
  if (bleachTwicePlus || score >= GATE_BLOCK_MIN) level = "block";
  else if (score >= GATE_CAUTION_MIN) level = "caution";
  else level = "pass";

  // ② HistoryKey 4단 (같은 점수). 탈색2회+ 또는 경계 초과는 최상단.
  let historyKey: HistoryKey = HISTORY_MAX_KEY;
  if (!bleachTwicePlus) {
    for (const b2 of HISTORY_BOUNDARIES) {
      if (score <= b2.max) { historyKey = b2.key; break; }
    }
  }

  return { score, level, historyKey, bleachTwicePlus };
}
