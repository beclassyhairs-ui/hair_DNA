// ============================================================================
// copy-drafts/check.ts — 레지스트리 구조 검사 CLI  (npm run copy:check)
//
// 검사 항목
//   1) §7-1 블록 11개(style 5 + damage 6)가 전부 존재하는가 · id 전역 고유한가
//   2) 모든 entry의 evidenceKeys가 실존 설문 키인가
//   3) 환경 게이트가 규정대로 동작하는가 (합성 entry로 자체 검증)
//   4) status 분포 리포트 (§7-2 sourceGrade 분포 포함)
//   5) production 승인 게이트 — resolver 미배선이면 "검증됨"이라 하지 않는다
//
// ⚠️ 5번: reachable 집합은 resolver가 정한다. 아직 배선 전이라 이 CLI는 게이트를
//    통과시키지 않고 **미검증 상태임을 명시**한다(§7-3: exhaustive라고 표기 금지).
// ============================================================================

import { ALL_BLOCKS, allEntries, assertRegistryShape, registryStats } from "./registry";
import { allowedEvidenceKeys } from "./evidenceKeys";
import { isRenderable, renderableStatuses } from "./env";
import { findUnapprovedReachable } from "./guard";
import { findVerbatimMismatches } from "./verbatim";
import type { CopyEntry } from "./types";
import { join } from "path";

const problems: string[] = [];
const notes: string[] = [];

// ─── 1) 구조 ────────────────────────────────────────────────────────────────
problems.push(...assertRegistryShape());

// ─── 2) evidenceKeys 실존 검증 ──────────────────────────────────────────────
for (const block of ALL_BLOCKS) {
  const allowed = allowedEvidenceKeys(block.domain);
  for (const entry of block.entries as CopyEntry[]) {
    for (const key of entry.evidenceKeys) {
      if (!allowed.has(key as string)) {
        problems.push(`${entry.id}: 존재하지 않는 evidenceKey "${String(key)}" (${block.domain})`);
      }
    }
  }
}

// ─── 3) 환경 게이트 자체 검증 ───────────────────────────────────────────────
// 레지스트리가 비어 있어도 게이트 로직이 §7-1대로 동작하는지 증명한다.
{
  const cases: [Parameters<typeof isRenderable>[0], boolean, boolean][] = [
    // status,          production,  dev/preview
    ["draft", false, true],
    ["owner_reviewed", false, true],
    ["approved", true, true],
  ];
  for (const [status, prodExpected, devExpected] of cases) {
    if (isRenderable(status, "production") !== prodExpected) {
      problems.push(`게이트 오동작: production에서 ${status} → ${!prodExpected} 이어야 함`);
    }
    if (isRenderable(status, "preview") !== devExpected || isRenderable(status, "development") !== devExpected) {
      problems.push(`게이트 오동작: dev/preview에서 ${status} 렌더 허용이어야 함`);
    }
  }
  if (renderableStatuses("production").length !== 1) {
    problems.push("게이트 오동작: production 렌더 허용 status는 approved 1종이어야 함");
  }
}

// ─── 3-b) "원문 그대로" 주장 기계 검증 ──────────────────────────────────────
// 손으로 옮긴 재배치 카피에 오타가 굳지 않도록 원본 파일과 문자열 대조한다.
// __dirname = <root>/copy-drafts/.build/copy-drafts → 3단계 올라가야 레포 루트다
// (outDir=copy-drafts/.build, rootDir=레포 루트라 출력 경로가 한 겹 더 깊다).
const repoRoot = join(__dirname, "..", "..", "..");
const verbatim = findVerbatimMismatches(repoRoot);
for (const m of verbatim.mismatches) {
  problems.push(`${m.id}: 원문 대조 실패 — 원본 파일에서 동일 문자열을 못 찾음 (${m.sourceRef})`);
}

// ─── 4) 리포트 ──────────────────────────────────────────────────────────────
const stats = registryStats();

// ─── 5) production 승인 게이트 상태 ─────────────────────────────────────────
// resolver 미배선 = reachable 집합 계산 불가. 빈 집합으로 "통과"시키면 거짓 신호다.
const RESOLVER_WIRED = false; // resolver 배선 시 true로 바꾸고 도달 집합을 넘긴다.
if (!RESOLVER_WIRED) {
  notes.push(
    "production 승인 게이트: 미검증 (resolver 미배선 → reachable 집합 계산 불가).\n" +
      "    guard.assertProductionCopyReady(reachableIds)는 구현·자체검증 완료 상태이며,\n" +
      "    resolver가 생기는 즉시 도달 집합만 넘기면 발동한다. 지금은 통과로 간주하지 않는다.",
  );
} else {
  const failures = findUnapprovedReachable([]);
  if (failures.length > 0) problems.push(`production 승인 게이트 위반 ${failures.length}건`);
}

// ─── 출력 ───────────────────────────────────────────────────────────────────
console.log("\n📋 copy registry check (§7)\n");
console.log(`  블록: ${ALL_BLOCKS.length}개 (style ${ALL_BLOCKS.filter((b) => b.domain === "style").length} · damage ${ALL_BLOCKS.filter((b) => b.domain === "damage").length})`);
console.log(`  entry: ${stats.total}개`);
console.log(`  status: draft ${stats.byStatus.draft} · owner_reviewed ${stats.byStatus.owner_reviewed} · approved ${stats.byStatus.approved}`);
console.log(`  sourceGrade: 재배치 ${stats.bySourceGrade.재배치} · 파생 ${stats.bySourceGrade.파생} · 신규 ${stats.bySourceGrade.신규}`);
console.log(`  원문 대조: ${verbatim.checked}건 검사 · 불일치 ${verbatim.mismatches.length}건`);
console.log("\n  블록별 entry 수:");
for (const b of stats.byBlock) console.log(`    ${b.domain}/${b.block}: ${b.count}`);

if (allEntries().length === 0) {
  notes.push("레지스트리가 비어 있음 — 구조 수립 단계이며 카피 채우기는 다음 단계다(의도된 상태).");
}

if (notes.length > 0) {
  console.log("\n  ℹ️  미커버·주의:");
  for (const n of notes) console.log(`    · ${n}`);
}

if (problems.length > 0) {
  console.error(`\n❌ copy registry FAIL — ${problems.length}건\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("");
  process.exit(1);
}

console.log("\n✅ copy registry 구조 OK\n");
