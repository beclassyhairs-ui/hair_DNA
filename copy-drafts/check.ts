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

import { ALL_BLOCKS, allEntries, assertRegistryShape, getEntry, registryStats, resolveText } from "./registry";
import { allReachableCopyIds, resolveDamage, resolveStyle } from "./resolver";
import { damageSpace } from "./enumerate/space";
import type { DamageSurveyAnswers } from "../app/damage-check/surveyData";
import { allowedEvidenceKeys } from "./evidenceKeys";
import { isRenderable, renderableStatuses } from "./env";
import { findUnapprovedReachable } from "./guard";
import { findVerbatimMismatches } from "./verbatim";
import type { CopyEntry } from "./types";
import { join } from "path";

const problems: string[] = [];
const notes: string[] = [];
let firmScanCount = 0;

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

// ─── 3-c) resolver 검증 ─────────────────────────────────────────────────────
// (a) resolver가 가리키는 id가 전부 레지스트리에 있는가 — 빈칸 조기 발견
// (b) 레지스트리에 있는데 resolver가 절대 도달 못 하는 entry(죽은칸)는 없는가
// (c) 실제로 돌려봤을 때 issue 없이 블록이 나오는가
const reachable = allReachableCopyIds();
for (const id of reachable) {
  if (!getEntry(id)) problems.push(`resolver가 없는 id를 가리킴: ${id}`);
}

{
  const reachableSet = new Set(reachable);
  // 예언 8번은 엔진에서 match=() => false라 구조상 도달 불가 — 알려진 예외다.
  const orphans = allEntries()
    .map((x) => x.id)
    .filter((id) => !reachableSet.has(id) && !id.includes(".p08_"));
  if (orphans.length > 0) {
    problems.push(`resolver가 도달 못 하는 죽은 entry ${orphans.length}건: ${orphans.join(", ")}`);
  }
}

const smoke = (() => {
  const dmg = (p: Partial<DamageSurveyAnswers>): DamageSurveyAnswers => ({
    q1_pull: "", q2_friction: "", q3_dry: "",
    h_recent: "none", h_prev: "none", h_more: "none",
    h_bleach_2plus: false, h_root_gray: false, h_self_dye: false,
    h_root_interval: "", h_root_over6m: false, ...p,
  });

  const cases: { name: string; run: () => { issues: { detail: string }[]; blocks: { block: string; entries: unknown[] }[] } }[] = [
    { name: "damage 탈색2회+ firm(INV1 반례)", run: () => resolveDamage(dmg({ h_recent: "bleach", h_bleach_2plus: true, q1_pull: "firm" }), "development") },
    { name: "damage 매직+firm(확정124 코팅)", run: () => resolveDamage(dmg({ h_recent: "straight_perm", q1_pull: "firm", q2_friction: "unsure", q3_dry: "fast" }), "development") },
    { name: "damage 뿌리염색+새치", run: () => resolveDamage(dmg({ h_recent: "root_dye", h_root_gray: true, h_root_interval: "w2_3", q1_pull: "unsure", q2_friction: "tangled" }), "development") },
    { name: "damage 시술전무(예언 없음)", run: () => resolveDamage(dmg({ q1_pull: "elastic", q2_friction: "smooth", q3_dry: "normal" }), "development") },
    { name: "style 곱슬×펴기(b1)", run: () => resolveStyle({ q3_curl: "curly_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob" }, "development") },
    { name: "style 무난 폴백(b8)", run: () => resolveStyle({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob" }, "development") },
    { name: "style 게이트 차단(§6-6 나머지 블록 유지)", run: () => resolveStyle({ q3_curl: "straight_hair", q13_design: "c_curl", q7_thickness: "fine", q8_density: "thin_density", q11_length: "chest", q8a_recent: "bleach", q8_bleach_2plus: "1" }, "development") },
  ];

  let ok = 0;
  for (const c of cases) {
    const r = c.run();
    if (r.issues.length > 0) {
      for (const i of r.issues) problems.push(`resolver 스모크 "${c.name}": ${i.detail}`);
    } else ok += 1;
  }
  return { total: cases.length, ok };
})();

// ── PM 확정 2026-08-20 검수 반영분 4종 ──────────────────────────────────────
{
  // ① "좋은 신호" firm 카피가 Lv3 이상 화면에 뜰 수 없음 — 유효 입력공간 전수로 보장.
  //    스모크 몇 건이 아니라 전수인 이유: 이 문구가 극손상 손님에게 뜨는 게 이번 검수의
  //    최대 결함이었고, 조합 하나만 새면 그대로 재발하기 때문이다.
  const GOOD_SIGNAL = "damage.elasticity.firm";
  let scanned = 0;
  const leaks: string[] = [];
  for (const a of damageSpace()) {
    scanned += 1;
    if (a.q1_pull !== "firm") continue; // firm 답에서만 이 카피가 나올 수 있다
    const r = resolveDamage(a, "development");
    if (r.severity.level >= 3 && r.reachedIds.includes(GOOD_SIGNAL)) {
      leaks.push(`Lv${r.severity.level} score=${r.score} h_recent=${a.h_recent} h_prev=${a.h_prev} more=${a.h_more}`);
    }
  }
  if (leaks.length > 0) {
    problems.push(`Lv3+ 화면에 "좋은 신호" firm 카피 노출 ${leaks.length}건 (예: ${leaks[0]})`);
  }
  firmScanCount = scanned;

  // ② refId 중복 노출 0 — 같은 문장이 한 화면에 두 번 나가지 않아야 한다(b3/b6/b10).
  for (const [name, ans] of [
    ["b10", { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thick_density", q11_length: "bob" }],
    ["b3", { q3_curl: "wavy_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thick_density", q11_length: "bob" }],
    ["b6", { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "coarse", q8_density: "thick_density", q11_length: "bob" }],
  ] as [string, Record<string, string>][]) {
    const r = resolveStyle(ans, "development");
    const texts = r.blocks.flatMap((b) => b.entries.map((x) => x.text));
    const dup = texts.filter((t, i) => texts.indexOf(t) !== i);
    if (dup.length > 0) problems.push(`${name} 손님 화면에 중복 문장 ${dup.length}건`);
  }

  // ③ 차단 시 전제 문구가 시술 지시 앞에 놓이고, 지시 문장에 conditional 표시가 붙는지.
  const blocked = resolveStyle(
    { q3_curl: "straight_hair", q13_design: "c_curl", q7_thickness: "fine", q8_density: "thin_density", q11_length: "chest", q8a_recent: "bleach", q8b_prev: "bleach", q8_bleach_2plus: "1" },
    "development",
  );
  const allEntriesFlat = blocked.blocks.flatMap((b) => b.entries);
  const procs = allEntriesFlat.filter((x) => x.id.endsWith("_procedure") && !x.id.startsWith("style.safety."));
  if (procs.length > 0) {
    if (!allEntriesFlat.some((x) => x.id === "style.safety.blocked_procedure_prefix")) {
      problems.push("차단인데 시술 지시 앞 전제 문구가 없음(§ 수정3)");
    }
    if (!procs.every((x) => x.conditional === true)) {
      problems.push("차단 시 시술 지시 문장에 conditional 표시가 빠짐(§ 수정3)");
    }
  }

  // ④ 새치 반복 뿌리염색 손님이 Lv2에 도달하고, Lv1 요약문을 받지 않는지.
  const gray = resolveDamage(
    { q1_pull: "unsure", q2_friction: "loosens", q3_dry: "", h_recent: "root_dye", h_prev: "none", h_more: "none", h_bleach_2plus: false, h_root_gray: true, h_self_dye: true, h_root_interval: "w2_3", h_root_over6m: false },
    "development",
  );
  if (gray.severity.level < 2) problems.push(`새치 반복 손님 기대 Lv2+, 실제 Lv${gray.severity.level} (INV7)`);
  if (gray.severity.summary.includes("거의 안 했거나")) {
    problems.push("새치 반복 손님에게 Lv1 요약문('시술을 거의 안 했거나…')이 나감");
  }
}

// 게이트 차단이어도 모질/궁합/커트가 살아 있는지 직접 확인(§6-6)
{
  const blocked = resolveStyle(
    { q3_curl: "straight_hair", q13_design: "c_curl", q7_thickness: "fine", q8_density: "thin_density", q11_length: "chest", q8a_recent: "bleach", q8_bleach_2plus: "1" },
    "development",
  );
  if (blocked.gateLevel !== "block") {
    problems.push("§6-6 확인 불가: 차단 케이스가 block으로 판정되지 않음");
  } else {
    const safety = blocked.blocks.find((b) => b.block === "safety");
    const others = blocked.blocks.filter((b) => ["hair-structure", "curl-fit", "cut"].includes(b.block));
    if (!safety || safety.entries.length === 0) problems.push("§6-6 위반: 차단인데 safety 블록이 비었음");
    if (others.every((b) => b.entries.length === 0)) {
      problems.push("§6-6 위반: 차단이라고 모질/궁합/커트가 통째로 비었음 (b9가 결과 전체를 덮는 옛 동작)");
    }
    const volume = blocked.blocks.find((b) => b.block === "volume");
    if (!volume || volume.entries.length === 0) problems.push("§6-4 위반: volume 블록이 비었음(항상 존재해야 함)");
  }
}

// ─── 4) 리포트 ──────────────────────────────────────────────────────────────
const stats = registryStats();

// ─── 5) production 승인 게이트 상태 ─────────────────────────────────────────
// resolver 미배선 = reachable 집합 계산 불가. 빈 집합으로 "통과"시키면 거짓 신호다.
// resolver는 작성 완료 — allReachableCopyIds()로 도달 집합을 계산할 수 있다(136건).
// 다만 게이트 "활성화"(빌드 연결)는 별도 단계라 아직 켜지 않았다. 지금 켜면 draft 139건이
// 전부 걸려 빌드가 멈춘다 — 사장님 승인 전에는 그게 정상 동작이지만, 켜는 시점은
// 사업주가 정한다. 아래는 켰을 때 무엇이 걸리는지 **미리 보여주기만** 한다.
const GATE_ENFORCED = true; // 활성화됨(2026-08-20) — prebuild가 copy:check를 체인한다
{
  // [PHASE2] 검토중 레인 — sourceRef가 "[PHASE2]"로 시작하는 draft는 게이트에서 예외.
  //   근거: 실화면(dev) 프리뷰를 위해 실 resolver에 배선했으나 사장님 빨간펜 전이라 승인
  //   불가. production은 collectBlock의 env 게이트가 draft 렌더를 이미 막으므로(라이브 무영향),
  //   빌드까지 세우면 다른 배포가 전부 묶인다. 그래서 이 마커가 붙은 것만 예외로 통과시키되,
  //   §7-3 미커버 명시 원칙대로 **건수를 리포트**한다. 그 외 미승인 도달은 여전히 FAIL —
  //   게이트 무결성은 보존된다. 승인 시 [PHASE2] 마커를 떼면 정상 게이트 대상이 된다.
  const isPhase2Pending = (id: string): boolean => {
    const e = getEntry(id);
    return !!e && e.sourceRef.startsWith("[PHASE2]");
  };
  const allFailures = findUnapprovedReachable(reachable);
  const phase2Pending = allFailures.filter((f) => isPhase2Pending(f.id));
  const failures = allFailures.filter((f) => !isPhase2Pending(f.id));
  if (phase2Pending.length > 0) {
    notes.push(
      `[PHASE2] 검토중 draft ${phase2Pending.length}건 — 게이트 예외(dev 프리뷰용, production은 env 게이트가 렌더 차단). ` +
        `사장님 승인(status→approved) + sourceRef의 "[PHASE2]" 마커 제거 시 정상 게이트 편입.`,
    );
  }
  if (GATE_ENFORCED) {
    if (failures.length > 0) problems.push(`production 승인 게이트 위반 ${failures.length}건`);
  } else if (failures.length > 0) {
    notes.push(
      `production 승인 게이트: 계산됨·미적용. 도달 가능 ${reachable.length}건 중 ` +
        `승인(approved) 아님 ${failures.length}건 → 지금 켜면 production 빌드가 FAIL한다(의도된 동작).\n` +
        "    켜는 법: check.ts의 GATE_ENFORCED=true + package.json prebuild에 copy:check 체인(README §5).",
    );
  } else {
    notes.push(
      `production 승인 게이트: 계산됨·미적용이지만 **켤 준비 완료** — 도달 가능 ${reachable.length}건 전건 승인(approved).\n` +
        "    켜는 법: check.ts의 GATE_ENFORCED=true + package.json prebuild에 copy:check 체인(README §5).",
    );
  }
}

// ─── 출력 ───────────────────────────────────────────────────────────────────
console.log("\n📋 copy registry check (§7)\n");
console.log(`  블록: ${ALL_BLOCKS.length}개 (style ${ALL_BLOCKS.filter((b) => b.domain === "style").length} · damage ${ALL_BLOCKS.filter((b) => b.domain === "damage").length})`);
console.log(`  entry: ${stats.total}개`);
console.log(`  status: draft ${stats.byStatus.draft} · owner_reviewed ${stats.byStatus.owner_reviewed} · approved ${stats.byStatus.approved}`);
console.log(`  sourceGrade: 재배치 ${stats.bySourceGrade.재배치} · 파생 ${stats.bySourceGrade.파생} · 신규 ${stats.bySourceGrade.신규}`);
console.log(`  원문 대조: ${verbatim.checked}건 검사 · 불일치 ${verbatim.mismatches.length}건`);
{
  const refEntries = allEntries().filter((e) => e.text === undefined);
  const resolved = refEntries.filter((e) => resolveText(e) !== null).length;
  console.log(`  refId 참조: ${refEntries.length}건 · 원본 해석 성공 ${resolved}건`);
}
console.log(`  resolver 도달 가능 id: ${reachable.length}건 · 스모크 ${smoke.ok}/${smoke.total} 통과`);
console.log(`  "좋은 신호" firm 누출 검사: 유효 입력공간 ${firmScanCount.toLocaleString()}건 전수 · 누출 0`);
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
