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

export function collectBlock(
  domain: CopyDomain,
  block: string,
  ids: readonly string[],
  env: CopyEnv,
  issues: ResolutionIssue[],
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
