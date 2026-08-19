// ============================================================================
// copy-drafts/types.ts — 카피 레지스트리 타입 (지시서 §7-1 · §7-2)
//
// §7-1이 규정한 copy entry 필수 메타데이터를 타입으로 고정한다.
//   { id, status, sourceGrade, sourceRef, evidenceKeys }
// 여기에 카피 본문(text)이 실린다 — §7-1의 목록은 "필수 메타데이터"라서 본문은
//   별도 명시가 없었다. 메타데이터가 수식하는 대상이 본문이므로 payload로 둔다.
//
// ⚠️ 이 파일은 하류(resolver·렌더)가 쓸 계약이다. 실제 배선은 별도 단계.
// ============================================================================

import type { DamageSurveyAnswers } from "../app/damage-check/surveyData";

// ─── §7-1 status ───────────────────────────────────────────────────────────
//   draft          : 초안. dev/preview에서만 렌더.
//   owner_reviewed : 사장님이 봤으나 아직 승인 전. dev/preview에서만 렌더.
//   approved       : 승인 완료. production 렌더 가능한 유일한 상태.
export type CopyStatus = "draft" | "owner_reviewed" | "approved";

// ─── §7-2 sourceGrade ──────────────────────────────────────────────────────
//   재배치 : 원문 판단 그대로, 위치·분량만 재편 → 검수 부담 최소
//   파생   : 원문 논리를 다른 조합에 적용한 확장 → 논리 확인 검수
//   신규   : 원문 어디에도 없는 전문 판단 → 최우선 정독 검수 대상
//            (V2_NEW_COPY_REVIEW.md 상단 배치 대상 — §7-2)
export type SourceGrade = "재배치" | "파생" | "신규";

// ─── 도메인·블록 (§7-1 저장 구조) ───────────────────────────────────────────
// insight는 §6 보정 1(2026-08-19 PM)로 §7-1 목록에 추가됐다 — §6-3 Primary Insight
//   (stamp·door·aha)를 담을 칸이 원래 목록에 없었다.
export const STYLE_BLOCKS = ["insight", "volume", "hair-structure", "curl-fit", "cut", "safety"] as const;
export const DAMAGE_BLOCKS = ["elasticity", "friction", "drying", "cause", "gray", "risk"] as const;

export type StyleBlock = (typeof STYLE_BLOCKS)[number];
export type DamageBlock = (typeof DAMAGE_BLOCKS)[number];
export type CopyDomain = "style" | "damage";

// ─── evidenceKeys — 이 카피를 켜는 설문 답 키 ────────────────────────────────
// Damage: DamageSurveyAnswers가 명시 인터페이스라 컴파일타임 union이 나온다.
export type DamageEvidenceKey = keyof DamageSurveyAnswers;
// Style: StyleAnswers = Record<string,string>라 컴파일타임 union이 없다.
//   → string으로 두되 check.ts가 STYLE_SURVEY 실제 질문 id와 런타임 대조한다.
//   (설문 스키마 불변 원칙 때문에 surveyData를 as const로 바꾸지 않는다.)
export type StyleEvidenceKey = string;
export type EvidenceKey = DamageEvidenceKey | StyleEvidenceKey;

// ─── copy entry (§7-1 필수 메타데이터) ──────────────────────────────────────
interface CopyEntryMeta<E extends EvidenceKey = EvidenceKey> {
  /** 레지스트리 전역 고유 id. 규약: `<domain>.<block>.<slug>` (§7이 형식을 규정하지 않아 이 저장소 규약으로 고정 — README 참조) */
  id: string;
  status: CopyStatus;
  sourceGrade: SourceGrade;
  /** 원문 추적자. 예: "b10-aha", "확정124", "예언8". 신규는 근거 메모. */
  sourceRef: string;
  /** 이 카피를 켜는 설문 답 키. 빈 배열 = 무조건 노출(설문 답에 의존하지 않음). */
  evidenceKeys: readonly E[];
}

/**
 * copy entry는 둘 중 하나다 — 본문을 직접 갖거나(text), 다른 entry의 본문을
 * 가리키거나(refId). 둘 다 갖거나 둘 다 없는 상태는 타입이 막는다.
 *
 * refId(§6 보정 1 · 2026-08-19 PM): 같은 문장이 두 블록에서 필요할 때 **문장을
 *   복사하지 않는다.** 원본은 한 곳에만 두고 다른 블록은 id로 가리킨다. 복사본을
 *   만들면 원문 대조가 두 벌이 되고, 사장님이 한쪽만 고쳤을 때 화면에 두 문장이
 *   갈라진다. 예: b3/b6/b10의 aha 원본은 style.insight, hair-structure는 refId 재사용.
 */
export type CopyEntry<E extends EvidenceKey = EvidenceKey> =
  | (CopyEntryMeta<E> & { text: string; refId?: never })
  | (CopyEntryMeta<E> & { text?: never; refId: string });

export type StyleCopyEntry = CopyEntry<StyleEvidenceKey>;
export type DamageCopyEntry = CopyEntry<DamageEvidenceKey>;

// ─── 블록 모듈 계약 ─────────────────────────────────────────────────────────
export interface CopyBlockModule<E extends EvidenceKey = EvidenceKey> {
  domain: CopyDomain;
  block: StyleBlock | DamageBlock;
  entries: readonly CopyEntry<E>[];
}

export type StyleCopyBlockModule = CopyBlockModule<StyleEvidenceKey> & {
  domain: "style";
  block: StyleBlock;
};
export type DamageCopyBlockModule = CopyBlockModule<DamageEvidenceKey> & {
  domain: "damage";
  block: DamageBlock;
};
