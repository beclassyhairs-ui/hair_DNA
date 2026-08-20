// ============================================================================
// copy-drafts/resolver/collect.ts — id 목록 → ResolvedBlock 공통 조립
//
// 모든 블록이 같은 경로로 만들어지도록 한 곳에 모은다:
//   ① 레지스트리에서 entry를 찾고(없으면 issue)
//   ② refId면 resolveText()로 원본을 따라가고(끊겼으면 issue)
//   ③ 환경 게이트를 적용한다(production은 approved만 — §7-1)
// ============================================================================

import { getEntry, resolveText } from "../registry";
import { currentCopyEnv, isRenderable, type CopyEnv } from "../env";
import type { CopyDomain } from "../types";
import type { ResolvedBlock, ResolvedCopy, ResolutionIssue } from "./types";

/**
 * 한 손님 화면 안에서 이미 나간 원본 문장을 기억한다(§ 수정2 · PM 확정 2026-08-20).
 *
 * refId는 "원문을 한 벌로 유지"하려고 만든 장치인데, 원본 블록과 참조 블록이 **동시에
 * 노출되면 같은 문장이 화면에 두 번 나간다**(b3/b6/b10 손님 전원). 그래서 해석 한 번당
 * 원본 id를 추적해, 이미 나간 문장을 가리키는 참조는 건너뛴다.
 * 원본이 안 나간 경우(예: 게이트 차단으로 insight가 비는 경우)에는 참조가 그대로 나간다.
 */
export function newSeenOrigins(): Set<string> {
  return new Set<string>();
}

export function collectBlock(
  domain: CopyDomain,
  block: string,
  ids: readonly string[],
  env: CopyEnv,
  issues: ResolutionIssue[],
  seenOrigins?: Set<string>,
): ResolvedBlock {
  const entries: ResolvedCopy[] = [];

  for (const id of ids) {
    const entry = getEntry(id);
    if (!entry) {
      issues.push({ kind: "missing_entry", detail: `${block}: "${id}" 가 레지스트리에 없음` });
      continue;
    }

    const text = resolveText(entry);
    if (text === null) {
      issues.push({ kind: "broken_ref", detail: `${block}: "${id}" 의 refId 참조가 끊김` });
      continue;
    }

    // §7-1 환경 규칙: production은 approved만. dev/preview는 draft·owner_reviewed도 렌더.
    //   production에서 draft가 걸러져 블록이 비는 건 정상 동작이며, 애초에 그런 상태로
    //   빌드가 나가지 못하도록 막는 건 guard.assertProductionCopyReady 쪽 역할이다.
    if (!isRenderable(entry.status, env)) continue;

    // 원본 문장의 실제 주인 id — 직접 본문을 가진 entry면 자기 자신, 참조면 원본.
    const originId = entry.text === undefined ? entry.refId : entry.id;
    if (seenOrigins) {
      if (seenOrigins.has(originId)) continue; // 같은 화면에 이미 나간 문장 — 중복 노출 방지
      seenOrigins.add(originId);
    }

    entries.push({
      id: entry.id,
      text,
      status: entry.status,
      sourceGrade: entry.sourceGrade,
      ...(entry.text === undefined ? { via: entry.refId } : {}),
    });
  }

  return { domain, block, entries };
}

export function defaultEnv(env?: CopyEnv): CopyEnv {
  return env ?? currentCopyEnv();
}
