// ============================================================================
// tests/invariant/engine-invariants.ts — 결과지 V2 리팩터링 behavior invariant
//
// 목적(지시문 §8): 파일 위치가 아니라 "행동"을 보호한다 (동일 입력 → 동일 판정).
//   V2 블록 조립 리팩터링 전에 먼저 작성하고, 전 과정 green을 유지한다.
//
// 실행: npm run test:invariant  (typescript로 CJS 컴파일 후 node 실행 — 프레임워크 무설치)
//   스냅샷 갱신(의도된 판정 변경 시에만): UPDATE_SNAPSHOT=1 npm run test:invariant
//
// ⚠️ styleGate.ts 는 이번 Phase 수정 금지(§8-6). 이 테스트가 그 판정을 고정한다.
// ⚠️ 레거시 q10_history_count 는 이번 Phase 손대지 않는다(§ PM 승인 4 — 게이트 영향 우려).
// ============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert";

import { diagnoseDamage } from "../../app/damage-check/damageRecommend";
import type { DamageSurveyAnswers } from "../../app/damage-check/surveyData";
import { evaluateStyleGate } from "../../app/style/styleGate";
import { resolveCrossBranch } from "../../app/style/crossBranch";
import { getStyleEntry } from "../../app/style/recommend";
import type { StyleAnswers } from "../../app/style/surveyData";

// ─── 테스트 러너 (초경량) ────────────────────────────────────────────────────
let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (e) {
    failures.push(`  ✗ ${name}\n      ${(e as Error).message.replace(/\n/g, "\n      ")}`);
  }
}

// ─── 입력 헬퍼 ────────────────────────────────────────────────────────────────
function dmg(partial: Partial<DamageSurveyAnswers>): DamageSurveyAnswers {
  return {
    q1_pull: "", q2_friction: "", q3_dry: "",
    h_recent: "none", h_prev: "none", h_more: "none",
    h_bleach_2plus: false, h_root_gray: false, h_self_dye: false,
    h_root_interval: "", h_root_over6m: false,
    ...partial,
  };
}
function sty(partial: StyleAnswers): StyleAnswers {
  return { ...partial };
}

// ============================================================================
// §8 하드 invariant (판정 불변 — 확정 근거 재현)
// ============================================================================

// 1. 탈색 2회+ (h_bleach_2plus) → 무조건 Lv4 (Q1 답·물리테스트와 무관하게 강제)
test("INV1 탈색 2회+ → Lv4", () => {
  const r = diagnoseDamage(dmg({ h_recent: "bleach", h_bleach_2plus: true }));
  assert.strictEqual(r.level.level, 4, `기대 Lv4, 실제 Lv${r.level.level} (score=${r.score})`);
  // ★ 반례(옛 엔진 미검출): firm(−0.3) → 점수 8.0−0.3=7.7 → 강제 없으면 Lv3로 낙하했다.
  //   Lv4 강제 규칙(calcLevel bleachCount>=2)이 이 조합을 Lv4로 고정하는지 직접 증명한다.
  const firm = diagnoseDamage(dmg({ h_recent: "bleach", h_bleach_2plus: true, q1_pull: "firm" }));
  assert.strictEqual(firm.level.level, 4, `firm 반례 기대 Lv4, 실제 Lv${firm.level.level} (score=${firm.score})`);
});

// 2. 무탈색 → 물리 최악 + 강한 시술이력이어도 Lv4 도달 불가 (NO_BLEACH_CAP=7.9)
test("INV2 무탈색 최악 조합도 Lv4 불가 + score<=7.9", () => {
  const worst = dmg({
    q1_pull: "snap", q2_friction: "tangled", q3_dry: "slow",
    h_recent: "heat_perm", h_prev: "straight_perm", h_more: "many",
  });
  const r = diagnoseDamage(worst);
  assert.ok(r.level.level < 4, `무탈색인데 Lv${r.level.level} (score=${r.score})`);
  assert.ok(r.score <= 7.9 + 1e-9, `NO_BLEACH_CAP 위반: score=${r.score}`);
});

// 3. 물리 테스트 단독으로 Lv3 이상 불가 (물리 상한 3.0 < LV3_MIN 4.5)
test("INV3 물리 단독 Lv3 이상 불가", () => {
  const r = diagnoseDamage(dmg({ q1_pull: "snap", q2_friction: "tangled", q3_dry: "slow" }));
  assert.ok(r.level.level <= 2, `물리 단독인데 Lv${r.level.level} (score=${r.score})`);
});

// 4. 확정124 매직 코팅: 마지막=매직 + Q1 firm → 건강보정(−0.3) 무효 / 마지막≠매직이면 적용.
//    firm 무효/적용은 레벨 경계(1.6)를 넘기지 않으므로 레벨이 아니라 score 기여로 고정한다
//    (firm 유무를 unsure(=0 보정)와 대조 → 매직은 차이 0, 열펌은 정확히 −0.3).
test("INV4a 마지막=매직 + firm → 건강보정 무효 (firm 기여 0)", () => {
  const magicFirm   = diagnoseDamage(dmg({ h_recent: "straight_perm", q1_pull: "firm" }));
  const magicUnsure = diagnoseDamage(dmg({ h_recent: "straight_perm", q1_pull: "unsure" }));
  assert.ok(Math.abs(magicFirm.score - magicUnsure.score) < 1e-9,
    `매직+firm 은 무보정과 같아야 함: firm=${magicFirm.score} vs unsure=${magicUnsure.score}`);
});
test("INV4b 마지막=열펌(≠매직) + firm → 건강보정 적용 (정확히 −0.3)", () => {
  const heatFirm   = diagnoseDamage(dmg({ h_recent: "heat_perm", q1_pull: "firm" }));
  const heatUnsure = diagnoseDamage(dmg({ h_recent: "heat_perm", q1_pull: "unsure" }));
  assert.ok(Math.abs((heatUnsure.score - heatFirm.score) - 0.3) < 1e-9,
    `열펌+firm 은 −0.3 적용돼야 함: unsure=${heatUnsure.score}, firm=${heatFirm.score} (차 ${heatUnsure.score - heatFirm.score})`);
});

// 5. 숏·숏보브 + s_curl → wave 강제치환 (getStyleEntry)
test("INV5 숏/숏보브 + s_curl → wave 간판명 치환", () => {
  const short   = getStyleEntry(sty({ q11_length: "short",     q13_design: "s_curl", q14_layer: "medium" }));
  const shortBb = getStyleEntry(sty({ q11_length: "short_bob", q13_design: "s_curl", q14_layer: "medium" }));
  const bobKeep = getStyleEntry(sty({ q11_length: "bob",       q13_design: "s_curl", q14_layer: "medium" }));
  assert.strictEqual(short.name,   "젤리펌", `숏+s_curl 기대 wave(젤리펌), 실제 ${short.name}`);
  assert.strictEqual(shortBb.name, "젤리펌", `숏보브+s_curl 기대 wave(젤리펌), 실제 ${shortBb.name}`);
  assert.strictEqual(bobKeep.name, "그레이스펌", `단발+s_curl 은 s_curl 유지(그레이스펌), 실제 ${bobKeep.name}`);
});

// 6. styleGate 대표 입력 세트 pass/caution/block 판정 불변 (§8-6 · styleGate.ts 동결 보증)
test("INV6 styleGate 대표 판정 불변", () => {
  const pass    = evaluateStyleGate(sty({ q8a_recent: "dye",    q8b_prev: "none" }));
  const caution = evaluateStyleGate(sty({ q8a_recent: "bleach", q8b_prev: "none" }));
  const blockT  = evaluateStyleGate(sty({ q8a_recent: "dye",    q8b_prev: "none", q8_bleach_2plus: "1" }));
  const blockS  = evaluateStyleGate(sty({ q8a_recent: "bleach", q8b_prev: "heat_perm", q8c_more: "many" }));
  assert.strictEqual(pass.level,    "pass",    `dye 단일 기대 pass, 실제 ${pass.level} (score=${pass.score})`);
  assert.strictEqual(caution.level, "caution", `bleach 단일 기대 caution, 실제 ${caution.level} (score=${caution.score})`);
  assert.strictEqual(blockT.level,  "block",   `탈색2회+ 기대 block, 실제 ${blockT.level}`);
  assert.strictEqual(blockS.level,  "block",   `고점수 기대 block, 실제 ${blockS.level} (score=${blockS.score})`);
});

// ============================================================================
// 스냅샷 — 기존 판정(resultCode/score/level/prophecy, 갈래) 전후 동일 증명
//   파일 없으면 기록(record), 있으면 비교. 의도된 변경은 UPDATE_SNAPSHOT=1 로만.
// ============================================================================

// 대표 페르소나 — damage resultCode 9종 + 예언 다양성 커버
const DAMAGE_PERSONAS: Record<string, DamageSurveyAnswers> = {
  d_healthy:        dmg({}),                                                              // L1_HEALTHY
  d_dye_l1:         dmg({ h_recent: "dye" }),                                             // L1_DRY
  d_perm_l1:        dmg({ h_recent: "normal_perm" }),                                     // L1_RIGID
  d_dye_l2:         dmg({ h_recent: "dye", h_prev: "heat_perm", h_more: "few" }),         // L2_DRY
  d_perm_l2:        dmg({ h_recent: "heat_perm", h_prev: "dye", h_more: "few" }),         // L2_RIGID
  d_bleach_l3:      dmg({ h_recent: "bleach", h_prev: "none" }),                          // L3_DRY (4.5)
  d_perm_l3:        dmg({ h_recent: "heat_perm", h_prev: "straight_perm", h_more: "many", q1_pull: "snap", q2_friction: "tangled" }), // RIGID 고점
  d_bleach2_l4:     dmg({ h_recent: "bleach", h_bleach_2plus: true }),                    // L4_DRY
  d_bleach2_firm:   dmg({ h_recent: "bleach", h_bleach_2plus: true, q1_pull: "firm" }),   // INV1 반례: firm이어도 Lv4 강제
  d_none_l2:        dmg({ q1_pull: "snap", q2_friction: "tangled", h_recent: "none", h_prev: "none", h_more: "many" }), // none+Lv2 흡수→DRY
  d_root_gray:      dmg({ h_recent: "root_dye", h_root_gray: true, h_root_interval: "w2_3", h_root_over6m: true }),     // 새치
  d_self_dye:       dmg({ h_recent: "dye", h_prev: "root_dye", h_self_dye: true, h_root_interval: "m1" }),             // 예언6
  d_magic_firm:     dmg({ h_recent: "straight_perm", q1_pull: "firm" }),                  // 확정124
  d_bleach_heat:    dmg({ h_recent: "heat_perm", h_prev: "bleach" }),                     // 예언10
};

const STYLE_PERSONAS: Record<string, StyleAnswers> = {
  s_curl_straight:  sty({ q3_curl: "curly_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob", q14_layer: "medium" }), // b1
  s_wavy_curl:      sty({ q3_curl: "wavy_hair", q13_design: "c_curl", q11_length: "bob", q14_layer: "medium", q7_thickness: "medium_thickness", q8_density: "medium_density" }),    // b2
  s_thick_fine_curl:sty({ q3_curl: "wavy_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thick_density", q11_length: "bob", q14_layer: "medium" }),               // b3
  s_fine_thin_long: sty({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thin_density", q11_length: "chest", q14_layer: "medium" }),          // b4
  s_fine_thin_short:sty({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thin_density", q11_length: "short", q14_layer: "medium" }),          // b5
  s_thick_coarse:   sty({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "coarse", q8_density: "thick_density", q11_length: "bob", q14_layer: "medium" }),         // b6
  s_fine_straight_curl: sty({ q3_curl: "straight_hair", q13_design: "c_curl", q7_thickness: "fine", q8_density: "medium_density", q11_length: "bob", q14_layer: "medium" }),        // b7
  s_plain:          sty({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob", q14_layer: "medium" }), // b8
  s_gate_block:     sty({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob", q14_layer: "medium", q8a_recent: "bleach", q8b_prev: "heat_perm", q8c_more: "many" }), // b9 차단
  s_thick_fine_str: sty({ q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thick_density", q11_length: "bob", q14_layer: "medium" }),           // b10
};

function buildSnapshot(): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const [k, a] of Object.entries(DAMAGE_PERSONAS)) {
    const r = diagnoseDamage(a);
    snap[`damage.${k}`] = {
      resultCode: r.resultCode,
      score: Math.round(r.score * 1000) / 1000,
      level: r.level.level,
      type: r.typeInfo.type,
      prophecy: r.prophecy ? r.prophecy.slice(0, 24) : null,
      grayStory: r.grayHairStory !== null,
    };
  }
  for (const [k, a] of Object.entries(STYLE_PERSONAS)) {
    const gate = evaluateStyleGate(a);
    const br = resolveCrossBranch(a);
    const entry = getStyleEntry(a);
    snap[`style.${k}`] = {
      name: entry.name,
      gateLevel: gate.level,
      gateScore: Math.round(gate.score * 1000) / 1000,
      historyKey: gate.historyKey,
      primary: br.primary,
      absorbed: br.absorbed,
      gateBlocked: br.gateBlocked,
      scalp: br.scalpRoutineCard,
    };
  }
  return snap;
}

test("SNAPSHOT 기존 판정 전후 동일", () => {
  const snap = buildSnapshot();
  // 스냅샷은 소스 트리(tests/invariant)에 커밋한다 — 빌드 산출물(.build, gitignore)에 두면
  //   세션마다 사라져 "전후 비교"가 성립하지 않는다. npm 스크립트 cwd = repo root 이므로 그 기준.
  const file = path.join(process.cwd(), "tests", "invariant", "engine.snapshot.json");
  const update = process.env.UPDATE_SNAPSHOT === "1";
  if (update || !fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(snap, null, 2) + "\n", "utf8");
    console.log(`  · 스냅샷 ${update ? "갱신" : "최초 기록"}: ${file}`);
    return;
  }
  const prev = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  const diffs: string[] = [];
  const keys = new Set([...Object.keys(prev), ...Object.keys(snap)]);
  for (const key of keys) {
    const a = JSON.stringify(prev[key]);
    const b = JSON.stringify(snap[key]);
    if (a !== b) diffs.push(`      ${key}\n        기존: ${a}\n        현재: ${b}`);
  }
  if (diffs.length > 0) {
    throw new Error(`스냅샷 불일치 ${diffs.length}건 (의도된 변경이면 UPDATE_SNAPSHOT=1):\n${diffs.join("\n")}`);
  }
});

// ─── 결과 출력 ────────────────────────────────────────────────────────────────
const total = passed + failures.length;
if (failures.length > 0) {
  console.error(`\n❌ invariant FAIL — ${passed}/${total} passed\n`);
  console.error(failures.join("\n\n"));
  console.error("");
  process.exit(1);
}
console.log(`\n✅ invariant PASS — ${passed}/${total}\n`);
