// ============================================================================
// copy-drafts/guard.ts — production 승인 게이트 (지시서 §7-1 환경 규칙)
//
//   "production build 시 reachable copyRef 중 status≠approved가 1건이라도
//    있으면 build/test FAIL 처리."
//
// reachable = resolver가 실제로 도달시킬 수 있는 copyRef 집합. resolver가 아직
// 배선되지 않았으므로 이 파일은 reachable 집합을 **인자로 받는다**. resolver가
// 생기면 그 도달 집합을 넘겨주기만 하면 게이트가 즉시 발동한다.
//
// ⚠️ reachable 집합을 스스로 추측하지 않는다. 추측한 집합으로 통과시키면
//    "검증했다"는 거짓 신호가 되기 때문이다(§7-3의 미커버 명시 원칙과 동일).
// ============================================================================

import { getEntry, resolveStatus } from "./registry";
import type { CopyStatus } from "./types";

export interface CopyGateFailure {
  id: string;
  /** 레지스트리에 있으면 그 status, 없으면 null(= 아예 빠진 copyRef). */
  status: CopyStatus | null;
  reason: "not_approved" | "missing_from_registry";
}

/** reachable copyRef 중 production에 나가면 안 되는 것들. */
export function findUnapprovedReachable(reachableIds: Iterable<string>): CopyGateFailure[] {
  const failures: CopyGateFailure[] = [];
  for (const id of new Set(reachableIds)) {
    const entry = getEntry(id);
    if (!entry) {
      failures.push({ id, status: null, reason: "missing_from_registry" });
      continue;
    }
    // 참조 entry는 원본에서 상속한 실효 상태로 판정한다.
    const status = resolveStatus(entry);
    if (status !== "approved") {
      failures.push({ id, status, reason: "not_approved" });
    }
  }
  return failures;
}

export class CopyGateError extends Error {
  readonly failures: CopyGateFailure[];
  constructor(failures: CopyGateFailure[]) {
    const lines = failures.map((f) =>
      f.reason === "missing_from_registry"
        ? `  · ${f.id} — 레지스트리에 없음`
        : `  · ${f.id} — status=${f.status} (approved 아님)`,
    );
    super(
      `[copy-gate] production 렌더 불가 카피 ${failures.length}건 (§7-1):\n${lines.join("\n")}\n` +
        `사장님 승인(status="approved") 후에만 production 빌드가 통과합니다.`,
    );
    this.name = "CopyGateError";
    this.failures = failures;
  }
}

/**
 * production 빌드/테스트용 하드 게이트. 위반 1건이라도 있으면 throw.
 * resolver 배선 시 호출부에서 도달 가능한 copyRef 전량을 넘긴다.
 */
export function assertProductionCopyReady(reachableIds: Iterable<string>): void {
  const failures = findUnapprovedReachable(reachableIds);
  if (failures.length > 0) throw new CopyGateError(failures);
}
