// ============================================================================
// copy-drafts/evidenceKeys.ts — evidenceKeys 유효성의 단일 출처
//
// copy entry의 evidenceKeys가 "실제로 존재하는 설문 답 키"인지 검증하기 위한
// 허용 목록. 오타·폐기된 키를 참조하는 카피를 check 단계에서 잡는다.
//
// Damage: DamageSurveyAnswers 인터페이스와 컴파일타임으로 결속된다(아래 Record).
//         인터페이스에 키가 추가/삭제되면 tsc가 이 파일에서 에러를 낸다.
// Style : StyleAnswers가 Record<string,string>이라 타입 결속이 불가능하므로
//         STYLE_SURVEY의 실제 질문 id를 런타임으로 읽어 만든다.
// ============================================================================

// ⚠️ 상대경로 고정. tsconfig paths(@/)는 컴파일타임에만 해석되고 emit된 require는
//    그대로 남아 node가 못 찾는다(invariant 하네스가 상대경로를 쓰는 이유와 동일).
import { STYLE_SURVEY } from "../app/style/surveyData";
import type { DamageEvidenceKey } from "./types";

// ─── Damage ────────────────────────────────────────────────────────────────
// Record<DamageEvidenceKey, true>라서 인터페이스와 어긋나면 컴파일 실패한다.
const DAMAGE_KEY_TABLE: Record<DamageEvidenceKey, true> = {
  q1_pull: true,
  q2_friction: true,
  q3_dry: true,
  h_recent: true,
  h_prev: true,
  h_more: true,
  h_bleach_2plus: true,
  h_root_gray: true,
  h_self_dye: true,
  h_root_interval: true,
  h_root_over6m: true,
};

export const DAMAGE_EVIDENCE_KEYS: ReadonlySet<string> = new Set(Object.keys(DAMAGE_KEY_TABLE));

// ─── Style ─────────────────────────────────────────────────────────────────
// 시술이력 문항(q8_treatment_history)은 전용 렌더러가 하위 키로 쪼개 저장한다.
// 아래 5개는 그 렌더러가 실제로 쓰는 키(styleGate.ts·crossBranch.ts에서 확인).
const STYLE_TREATMENT_SUBKEYS = [
  "q8a_recent",
  "q8b_prev",
  "q8c_more",
  "q8_bleach_2plus",
  "q8_root_gray",
] as const;

// 레거시. style/result.tsx의 isDamageBlock이 아직 참조한다.
// Phase 2 이관 대상이라 이번 Phase에서 제거·수정하지 않는다(PM 승인 ④).
const STYLE_LEGACY_KEYS = ["q10_history_count"] as const;

export function styleEvidenceKeys(): ReadonlySet<string> {
  const ids = STYLE_SURVEY.flatMap((step) => step.questions.map((q) => q.id));
  return new Set<string>([...ids, ...STYLE_TREATMENT_SUBKEYS, ...STYLE_LEGACY_KEYS]);
}

/** 도메인별 허용 키 집합. */
export function allowedEvidenceKeys(domain: "style" | "damage"): ReadonlySet<string> {
  return domain === "damage" ? DAMAGE_EVIDENCE_KEYS : styleEvidenceKeys();
}
