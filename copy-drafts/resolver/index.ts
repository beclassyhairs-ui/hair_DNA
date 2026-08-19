// ============================================================================
// copy-drafts/resolver/index.ts — resolver 진입점
//
// ⚠️ 아직 결과지(app/**)에 배선하지 않았다. 이번 단계는 resolver 작성까지이고,
//    렌더 연결·production 게이트 활성화·전수 덤프는 별도 단계다.
// ============================================================================

export type { ResolvedCopy, ResolvedBlock, ResolutionIssue, Resolution } from "./types";
export { resolveDamage, damageReachableIds, type DamageResolution } from "./damage";
export { resolveStyle, styleReachableIds, type StyleResolution } from "./style";

import { damageReachableIds } from "./damage";
import { styleReachableIds } from "./style";

/**
 * resolver가 도달시킬 수 있는 copy id 전량(중복 제거).
 *
 * §7-1의 production 게이트가 요구하는 "reachable copyRef"가 바로 이 집합이다.
 * 게이트 활성화 시 `assertProductionCopyReady(allReachableCopyIds())`로 넘긴다.
 * (활성화는 별도 단계 — 지금 넘기면 draft 139건이 전부 걸려 빌드가 멈춘다.)
 */
export function allReachableCopyIds(): string[] {
  return Array.from(new Set([...damageReachableIds(), ...styleReachableIds()]));
}
