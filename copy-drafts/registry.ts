// ============================================================================
// copy-drafts/registry.ts — 카피 레지스트리 집계·조회 (지시서 §7-1)
//
// 블록 모듈 11개(style 5 + damage 6)를 한 곳에 모아 하류가 쓸 단일 진입점을
// 제공한다. §7-3 전수 덤프 정의 ①("copy registry의 모든 copy entry 100%")이
// 성립하려면 레지스트리가 열거 가능해야 하므로 allEntries()가 계약의 핵심이다.
//
// ⚠️ resolver·렌더 배선은 별도 단계. 여기서는 아무도 소비하지 않는다.
// ============================================================================

import type { CopyBlockModule, CopyEntry, CopyStatus, SourceGrade } from "./types";
import { STYLE_BLOCKS, DAMAGE_BLOCKS } from "./types";
import { currentCopyEnv, isRenderable, type CopyEnv } from "./env";

import styleVolume from "./style/volume";
import styleHairStructure from "./style/hair-structure";
import styleCurlFit from "./style/curl-fit";
import styleCut from "./style/cut";
import styleSafety from "./style/safety";

import damageElasticity from "./damage/elasticity";
import damageFriction from "./damage/friction";
import damageDrying from "./damage/drying";
import damageCause from "./damage/cause";
import damageGray from "./damage/gray";
import damageRisk from "./damage/risk";

/** §7-1 저장 구조 그대로. 블록 누락은 assertRegistryShape()이 잡는다. */
export const ALL_BLOCKS: readonly CopyBlockModule[] = [
  styleVolume,
  styleHairStructure,
  styleCurlFit,
  styleCut,
  styleSafety,
  damageElasticity,
  damageFriction,
  damageDrying,
  damageCause,
  damageGray,
  damageRisk,
];

/** 레지스트리 전체 entry (§7-3 ① 전수 정의의 모수). */
export function allEntries(): CopyEntry[] {
  return ALL_BLOCKS.flatMap((b) => b.entries as CopyEntry[]);
}

/** id → entry. 없으면 undefined(하류가 빈칸을 알아채도록 던지지 않는다). */
export function getEntry(id: string): CopyEntry | undefined {
  return allEntries().find((e) => e.id === id);
}

/** 이 환경에서 렌더 가능한 entry만. production이면 approved만 통과(§7-1). */
export function renderableEntries(env: CopyEnv = currentCopyEnv()): CopyEntry[] {
  return allEntries().filter((e) => isRenderable(e.status, env));
}

export interface RegistryStats {
  total: number;
  byStatus: Record<CopyStatus, number>;
  bySourceGrade: Record<SourceGrade, number>;
  byBlock: { domain: string; block: string; count: number }[];
}

export function registryStats(): RegistryStats {
  const entries = allEntries();
  const byStatus: Record<CopyStatus, number> = { draft: 0, owner_reviewed: 0, approved: 0 };
  const bySourceGrade: Record<SourceGrade, number> = { 재배치: 0, 파생: 0, 신규: 0 };
  for (const e of entries) {
    byStatus[e.status] += 1;
    bySourceGrade[e.sourceGrade] += 1;
  }
  return {
    total: entries.length,
    byStatus,
    bySourceGrade,
    byBlock: ALL_BLOCKS.map((b) => ({ domain: b.domain, block: b.block, count: b.entries.length })),
  };
}

/** 구조 무결성: §7-1이 규정한 블록이 전부 있고, id가 전역 고유한가. */
export function assertRegistryShape(): string[] {
  const problems: string[] = [];

  const have = new Set(ALL_BLOCKS.map((b) => `${b.domain}/${b.block}`));
  for (const b of STYLE_BLOCKS) if (!have.has(`style/${b}`)) problems.push(`§7-1 블록 누락: style/${b}`);
  for (const b of DAMAGE_BLOCKS) if (!have.has(`damage/${b}`)) problems.push(`§7-1 블록 누락: damage/${b}`);

  const seen = new Map<string, number>();
  for (const e of allEntries()) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) problems.push(`id 중복 ${n}건: ${id}`);

  return problems;
}
