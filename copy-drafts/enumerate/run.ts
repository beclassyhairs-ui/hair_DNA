// ============================================================================
// copy-drafts/enumerate/run.ts — §7-3 V2 전수 덤프 생성기  (npm run dump:v2)
//
// 산출물: DAMAGE_ENUMERATION_V2.md · RESULT_ENUMERATION_V2.md
//
// 방법론은 기존 ENUMERATION과 동일하다 — **실함수 호출**. 손으로 재작성한 카피가
// 아니라 diagnoseDamage()·resolveCrossBranch()·evaluateStyleGate()를 실제로 돌린
// 결과를 resolver가 블록으로 조립한 값을 그대로 받아쓴다.
// 달라진 점: 생성 스크립트를 scratchpad가 아니라 **레포에 둔다**(재현 가능해야
// §7-3의 "실행 개수·생성 방식·seed"를 검증할 수 있다).
//
// §7-3 "전수"의 3정의를 각각 계산해 보고한다:
//   ① copy registry의 모든 copy entry 100%
//   ② 모든 resolver branch·state·riskFamily·grayFlag·volumeState 100%
//   ③ 유효 입력공간 실행으로 발생한 unique rendered signature 전량
// 못 채운 항목은 exhaustive라고 쓰지 않고 미커버로 명시한다.
// ============================================================================

import { writeFileSync } from "fs";
import { join } from "path";

import { resolveDamage } from "../resolver/damage";
import { resolveStyle } from "../resolver/style";
import { allReachableCopyIds } from "../resolver";
import { allEntries } from "../registry";
import { resolveCrossBranch, type BranchKey } from "../../app/style/crossBranch";
import { evaluateStyleGate } from "../../app/style/styleGate";
import type { StyleAnswers } from "../../app/style/surveyData";
import type { DamageSurveyAnswers } from "../../app/damage-check/surveyData";
import {
  damageSpace, DAMAGE_RAW_CARTESIAN,
  styleHairSpace, styleTreatmentSpace,
  AGE, CURL, THICKNESS, DENSITY, LENGTH, DESIGN, ST_TREATMENT, ST_MORE,
} from "./space";

// npm 스크립트는 패키지 루트에서 돌기 때문에 cwd가 곧 레포 루트다.
const REPO_ROOT = process.cwd();

/** 재현 가능한 난수(mulberry32) — §7-3이 요구하는 seed 명시용. */
const SEED = 20260819;
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ENV = "development" as const; // draft 카피까지 보이는 검수용 환경(§7-1)

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
}

// ============================================================================
// Damage
// ============================================================================

function runDamage() {
  const seenEntries = new Set<string>();
  const signatures = new Map<string, DamageSurveyAnswers>();
  const resultCodes = new Set<string>();
  const levels = new Set<number>();
  const grayFlags = new Set<boolean>();
  const riskIds = new Set<string>();
  const blockValueCoverage = new Map<string, Set<string>>();
  const issues: string[] = [];
  let executed = 0;

  for (const answers of damageSpace()) {
    executed += 1;
    const r = resolveDamage(answers, ENV);
    for (const i of r.issues) issues.push(`${i.kind}: ${i.detail}`);

    for (const id of r.reachedIds) {
      seenEntries.add(id);
      if (id.startsWith("damage.risk.")) riskIds.add(id);
      const block = id.split(".")[1]!;
      const set = blockValueCoverage.get(block) ?? new Set<string>();
      set.add(id);
      blockValueCoverage.set(block, set);
    }

    resultCodes.add(r.resultCode);
    levels.add(r.severity.level);
    grayFlags.add(answers.h_root_gray);

    const sig = `${r.resultCode}|${r.reachedIds.join(",")}`;
    if (!signatures.has(sig)) signatures.set(sig, answers);
  }

  return { executed, seenEntries, signatures, resultCodes, levels, grayFlags, riskIds, blockValueCoverage, issues };
}

// ============================================================================
// Style — 시술이력 축 축약(등가성 근거는 보고서에 명시)
// ============================================================================

/**
 * resolver가 시술이력 키에서 **실제로 읽는 것**은 네 가지뿐이다:
 *   gateLevel · usedRootDye · usedPerm · q8_root_gray
 * (deriveBranches의 탐침은 시술이력을 비우고, 갈래 발동 조건은 모질 축만 읽는다.)
 * 그래서 같은 4-튜플을 만드는 시술이력 조합은 resolver 관점에서 구별되지 않는다.
 * 아래에서 그 4-튜플별 대표 입력 1개씩만 남긴다 — 표본이 아니라 등가류 축약이다.
 * 등가성은 seed 고정 무작위 표본으로 실제로 검증한다(verifyStyleReduction).
 */
function styleEffectiveStates() {
  const reps = new Map<string, Partial<StyleAnswers>>();
  let rawCombos = 0;
  for (const t of styleTreatmentSpace()) {
    rawCombos += 1;
    const probe = { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob", q1_age: "", ...t } as StyleAnswers;
    const gateLevel = evaluateStyleGate(probe).level;
    const slots = [t.q8a_recent, t.q8b_prev];
    const usedRootDye = slots.includes("root_dye");
    const usedPerm = slots.some((s) => ["straight_perm", "heat_perm", "normal_perm"].includes(s ?? ""));
    const key = `${gateLevel}|${usedRootDye}|${usedPerm}|${t.q8_root_gray ?? ""}`;
    if (!reps.has(key)) reps.set(key, t);
  }
  return { reps, rawCombos };
}

function runStyle(reps: Map<string, Partial<StyleAnswers>>) {
  const seenEntries = new Set<string>();
  const signatures = new Map<string, StyleAnswers>();
  const primaries = new Set<string>();
  const firedBranches = new Set<BranchKey>();
  const gateLevels = new Set<string>();
  const volumeStates = new Set<string>();
  const scalpFlags = new Set<boolean>();
  const issues: string[] = [];
  let executed = 0;

  for (const hair of styleHairSpace()) {
    for (const t of reps.values()) {
      executed += 1;
      const answers = { ...hair, ...t } as StyleAnswers;
      const r = resolveStyle(answers, ENV);
      for (const i of r.issues) issues.push(`${i.kind}: ${i.detail}`);

      for (const id of r.reachedIds) seenEntries.add(id);
      primaries.add(r.primary ?? "(차단)");
      for (const b of r.firedBranches) firedBranches.add(b);
      gateLevels.add(r.gateLevel);
      volumeStates.add(r.volumeState);
      scalpFlags.add(r.scalpRoutineCard);

      const sig = `${r.gateLevel}|${r.primary ?? "-"}|${r.volumeState}|${r.reachedIds.join(",")}`;
      if (!signatures.has(sig)) signatures.set(sig, answers);
    }
  }
  return { executed, seenEntries, signatures, primaries, firedBranches, gateLevels, volumeStates, scalpFlags, issues };
}

/** 축약이 결과를 바꾸지 않는지 seed 고정 무작위 표본으로 실검증. */
function verifyStyleReduction(reps: Map<string, Partial<StyleAnswers>>, samples: number) {
  const rng = makeRng(SEED);
  const treatments = Array.from(styleTreatmentSpace());
  const hairs = Array.from(styleHairSpace());
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

  let checked = 0;
  const mismatches: string[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = pick(treatments);
    const hair = pick(hairs);
    const full = { ...hair, ...t } as StyleAnswers;

    const gateLevel = evaluateStyleGate(full).level;
    const slots = [t.q8a_recent, t.q8b_prev];
    const usedRootDye = slots.includes("root_dye");
    const usedPerm = slots.some((s) => ["straight_perm", "heat_perm", "normal_perm"].includes(s ?? ""));
    const key = `${gateLevel}|${usedRootDye}|${usedPerm}|${t.q8_root_gray ?? ""}`;
    const rep = reps.get(key);
    if (!rep) { mismatches.push(`대표 없음: ${key}`); continue; }

    const a = resolveStyle(full, ENV);
    const b = resolveStyle({ ...hair, ...rep } as StyleAnswers, ENV);
    checked += 1;
    if (a.reachedIds.join(",") !== b.reachedIds.join(",")) {
      mismatches.push(`축약 불일치 key=${key} hair=${JSON.stringify(hair)}`);
    }
  }
  return { checked, mismatches };
}

// ============================================================================
// 보고서
// ============================================================================

function coverageSection(seen: Set<string>, universe: string[], label: string): string {
  const missing = universe.filter((id) => !seen.has(id));
  const lines = [
    `| 항목 | 값 |`,
    `|---|---|`,
    `| ${label} 도달 가능 id | ${universe.length} |`,
    `| 실행에서 실제 도달 | ${seen.size} (${pct(seen.size, universe.length)}) |`,
    `| 미도달 | ${missing.length} |`,
  ];
  if (missing.length > 0) {
    lines.push("", "**미도달 id (미커버 — exhaustive 아님):**", "");
    for (const id of missing) lines.push(`- \`${id}\``);
  }
  return lines.join("\n");
}

function main() {
  const startedAt = Date.now();

  const damage = runDamage();
  const { reps, rawCombos } = styleEffectiveStates();
  const style = runStyle(reps);
  const reduction = verifyStyleReduction(reps, 3000);

  const registryIds = allEntries().map((e) => e.id);
  const reachable = allReachableCopyIds();
  const allSeen = new Set<string>([...damage.seenEntries, ...style.seenEntries]);
  const unreachedRegistry = registryIds.filter((id) => !allSeen.has(id));

  const damageUniverse = reachable.filter((id) => id.startsWith("damage."));
  const styleUniverse = reachable.filter((id) => id.startsWith("style."));

  // ── DAMAGE_ENUMERATION_V2.md ─────────────────────────────────────────────
  const dmgDoc = `# DAMAGE_ENUMERATION_V2.md — 결과지 V2 damage 전수 덤프 (실함수 호출)

> 생성기: \`copy-drafts/enumerate/run.ts\` (\`npm run dump:v2\`) — 손으로 쓴 문서가 아니라
> \`diagnoseDamage()\` 실호출 결과를 \`resolveDamage()\`가 블록으로 조립한 값이다.
> 기존 \`DAMAGE_ENUMERATION.md\`와 동일 방법론(실함수 호출)이며, 생성 스크립트를 레포에 둬
> 재현 가능하게 만든 점만 다르다.
> 환경: \`${ENV}\` (draft 카피까지 보이는 검수용 — §7-1). seed: \`${SEED}\`.

## 실행 규모 (§7-3 "실행 개수·생성 방식" 명시)

| 항목 | 값 |
|---|---|
| 제약 없는 순수 Cartesian | ${DAMAGE_RAW_CARTESIAN.toLocaleString()} |
| **유효 입력공간 실행 수** | **${damage.executed.toLocaleString()}** |
| 생성 방식 | 설문이 강제하는 하위질문 규칙을 적용한 완전 열거(표본 추출 아님) |

제외한 조합은 설문 UI가 만들 수 없는 것들이다: 탈색 슬롯 없이 \`h_bleach_2plus\`,
뿌리염색 슬롯 없이 \`h_root_gray\`/\`h_root_interval\`/\`h_root_over6m\`,
염색 계열 없이 \`h_self_dye\`. → **유효 입력공간에 대해서는 전수**이며, 제약 없는
Cartesian 전체에 대한 전수가 아니다.

## ① copy entry 커버리지

${coverageSection(damage.seenEntries, damageUniverse, "damage")}

## ② resolver state 커버리지

| 상태축 | 관측된 값 | 개수 |
|---|---|---|
| resultCode | ${Array.from(damage.resultCodes).sort().join(", ")} | ${damage.resultCodes.size} |
| level | ${Array.from(damage.levels).sort().join(", ")} | ${damage.levels.size} |
| grayFlag | ${Array.from(damage.grayFlags).sort().join(", ")} | ${damage.grayFlags.size} |
| 예언 entry(riskId) | — | ${damage.riskIds.size} |

**riskFamily: 미구현.** V2 지시서에서 riskFamily 태깅은 Phase 1.5 flag(스키마만)로 유보됐고
Phase 1.0은 첫 매칭 1개만 노출한다. 따라서 이 축은 **커버리지 100%를 주장하지 않는다.**

## ③ unique rendered signature

| 항목 | 값 |
|---|---|
| 고유 signature 수 | **${damage.signatures.size.toLocaleString()}** |
| signature 정의 | \`resultCode + 도달한 copy id 순서열\` |

## 해석 issue

${damage.issues.length === 0 ? `없음 (${damage.executed.toLocaleString()}회 실행에서 0건).` : damage.issues.slice(0, 50).map((x) => `- ${x}`).join("\n")}

## 블록별 도달 id

${Array.from(damage.blockValueCoverage.entries()).sort().map(([b, s]) => `### ${b}\n\n${Array.from(s).sort().map((id) => `- \`${id}\``).join("\n")}`).join("\n\n")}
`;

  // ── RESULT_ENUMERATION_V2.md ─────────────────────────────────────────────
  const styleDoc = `# RESULT_ENUMERATION_V2.md — 결과지 V2 style 전수 덤프 (실함수 호출)

> 생성기: \`copy-drafts/enumerate/run.ts\` (\`npm run dump:v2\`) — \`resolveCrossBranch()\`·
> \`evaluateStyleGate()\` 실호출 결과를 \`resolveStyle()\`이 블록으로 조립한 값이다.
> 환경: \`${ENV}\`. seed: \`${SEED}\`.

## 실행 규모 (§7-3 "실행 개수·생성 방식·seed" 명시)

| 항목 | 값 |
|---|---|
| 모질·희망 축 전수 | ${Array.from(styleHairSpace()).length.toLocaleString()} (age ${AGE.length} × curl ${CURL.length} × thickness ${THICKNESS.length} × density ${DENSITY.length} × length ${LENGTH.length} × design ${DESIGN.length}) |
| 시술이력 축 유효 조합 | ${rawCombos.toLocaleString()} (recent ${ST_TREATMENT.length} × prev ${ST_TREATMENT.length} × more ${ST_MORE.length} × 하위체크) |
| 순수 곱 | ${(Array.from(styleHairSpace()).length * rawCombos).toLocaleString()} |
| **실제 실행 수** | **${style.executed.toLocaleString()}** |
| 시술이력 등가류 대표 | ${reps.size} |

### 시술이력 축을 줄인 근거 (표본 추출이 아니라 등가류 축약)

resolver가 시술이력 키에서 실제로 읽는 값은 네 가지뿐이다 —
\`gateLevel\` · \`usedRootDye\` · \`usedPerm\` · \`q8_root_gray\`.
갈래 발동 조건(\`crossBranch.ts:67-78\`)은 모질 축만 읽고, \`deriveBranches\`의 탐침은
시술이력을 비운다. 따라서 같은 4-튜플을 만드는 시술이력 조합은 resolver 관점에서 구별되지
않는다. 그 4-튜플별로 대표 1개만 실행했다.

**이 등가성을 코드 독해로만 주장하지 않고 실측했다:**

| 항목 | 값 |
|---|---|
| seed | \`${SEED}\` (mulberry32) |
| 무작위 표본 검증 수 | ${reduction.checked.toLocaleString()} |
| 대표와 결과 불일치 | **${reduction.mismatches.length}** |

${reduction.mismatches.length === 0
      ? "→ 표본 전건에서 대표 입력과 전체 입력의 도달 id가 동일했다. 축약이 결과를 바꾸지 않는다."
      : `→ 🔴 불일치 발견:\n\n${reduction.mismatches.slice(0, 20).map((m) => `- ${m}`).join("\n")}`}

## ① copy entry 커버리지

${coverageSection(style.seenEntries, styleUniverse, "style")}

## ② resolver branch·state 커버리지

| 상태축 | 관측된 값 | 개수 |
|---|---|---|
| primary(대표 갈래) | ${Array.from(style.primaries).sort().join(", ")} | ${style.primaries.size} |
| fired(발동 갈래 전체) | ${Array.from(style.firedBranches).sort().join(", ")} | ${style.firedBranches.size} |
| gateLevel | ${Array.from(style.gateLevels).sort().join(", ")} | ${style.gateLevels.size} |
| volumeState | ${Array.from(style.volumeStates).sort().join(", ")} | ${style.volumeStates.size} |
| scalpRoutineCard | ${Array.from(style.scalpFlags).sort().join(", ")} | ${style.scalpFlags.size} |

## ③ unique rendered signature

| 항목 | 값 |
|---|---|
| 고유 signature 수 | **${style.signatures.size.toLocaleString()}** |
| signature 정의 | \`gateLevel + primary + volumeState + 도달한 copy id 순서열\` |

## 해석 issue

${style.issues.length === 0 ? `없음 (${style.executed.toLocaleString()}회 실행에서 0건).` : style.issues.slice(0, 50).map((x) => `- ${x}`).join("\n")}
`;

  writeFileSync(join(REPO_ROOT, "DAMAGE_ENUMERATION_V2.md"), dmgDoc, "utf8");
  writeFileSync(join(REPO_ROOT, "RESULT_ENUMERATION_V2.md"), styleDoc, "utf8");

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\n📄 §7-3 V2 전수 덤프 생성\n");
  console.log(`  damage: ${damage.executed.toLocaleString()}회 실행 · 고유 signature ${damage.signatures.size.toLocaleString()} · issue ${damage.issues.length}`);
  console.log(`  style : ${style.executed.toLocaleString()}회 실행 · 고유 signature ${style.signatures.size.toLocaleString()} · issue ${style.issues.length}`);
  console.log(`  축약 검증: 표본 ${reduction.checked.toLocaleString()} · 불일치 ${reduction.mismatches.length} (seed ${SEED})`);
  console.log(`  레지스트리 ${registryIds.length}건 중 실행에서 미도달 ${unreachedRegistry.length}건`);
  if (unreachedRegistry.length > 0) {
    for (const id of unreachedRegistry) console.log(`    · ${id}`);
  }
  console.log(`\n  → DAMAGE_ENUMERATION_V2.md · RESULT_ENUMERATION_V2.md (${elapsed}s)\n`);

  const fatal = damage.issues.length > 0 || style.issues.length > 0 || reduction.mismatches.length > 0;
  if (fatal) {
    console.error("❌ 덤프 중 해석 issue 또는 축약 불일치 발생 — 위 내용을 확인하라.\n");
    process.exit(1);
  }
}

main();
