// ============================================================================
// copy-drafts/resolver/types.ts — resolver 출력 계약
//
// resolver는 "엔진 출력을 읽어 블록에 들어갈 copy entry를 고르는" 역할만 한다.
//   판정을 다시 계산하지 않고, 엔진 판정 로직도 건드리지 않는다.
// ============================================================================

import type { CopyDomain, CopyStatus, SourceGrade } from "../types";

/** 렌더 직전 형태 — refId는 이미 원본 본문으로 풀려 있다. */
export interface ResolvedCopy {
  id: string;
  text: string;
  status: CopyStatus;
  sourceGrade: SourceGrade;
  /** refId entry였으면 원본 id. 직접 본문을 가진 entry면 undefined. */
  via?: string;
  /**
   * 게이트 차단 상태에서 나가는 시술 지시 문장(§ 수정3 · PM 확정 2026-08-20).
   * 지금 하라는 뜻이 아니라 "회복 후에 하신다면"이라는 조건부다.
   * 바로 앞에 `style.safety.blocked_procedure_prefix` 전제 문구가 놓인다.
   * 렌더러는 이 표시가 붙은 문장을 단정형 지시처럼 보이지 않게 묶어서 그려야 한다.
   */
  conditional?: boolean;
}

export interface ResolvedBlock {
  domain: CopyDomain;
  block: string;
  entries: ResolvedCopy[];
}

/** 해석 과정에서 생긴 문제. 조용히 삼키지 않고 호출부로 올린다. */
export interface ResolutionIssue {
  kind: "missing_entry" | "broken_ref" | "ambiguous_text" | "unmapped_value";
  detail: string;
}

export interface Resolution {
  blocks: ResolvedBlock[];
  issues: ResolutionIssue[];
  /**
   * 이 해석에서 실제로 도달한 copy id 전량.
   * §7-1 production 게이트가 요구하는 "reachable copyRef"의 표본이 된다.
   */
  reachedIds: string[];
}
