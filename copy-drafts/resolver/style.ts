// ============================================================================
// copy-drafts/resolver/style.ts — Style 결과지 블록 해석
//
// 엔진(crossBranch·styleGate)의 **출력만** 읽는다. styleGate.ts는 무수정.
//
// 2026-09-15 원고 전면 교체 라운드 — 칸 구성 재정의:
//   [스탬프] insight.b*_stamp
//   [혹시, 이런 적 있다면] insight.b*_door (b5·b8 없음)
//   [왜 그런가요] insight.b*_aha
//   [내 모발 구조] hair-structure 매트릭스 m_* (곱슬 modifier·aha-ref 폐지)
//   [시술할 때 지킬 것] procedure.b* (b8 없음, b6는 곱슬 조건 b6_curl 추가)
//   [집에서는] care.b* (b6 없음, b3·b4·b5·b10 은 정수리 드라이 카드=scalp 이어붙임)
//   [기장은 이렇게 봅니다] cut.len_*
//   제품
//   구 볼륨 블록 렌더 · 궁합(curl-fit)·주문(_say/_why)·곱슬 한 줄(curlmod)은 retired.
//   §6-6: 게이트 block 이어도 모질/시술/집에서는/커트는 정상 출력한다.
// ============================================================================

import { resolveCrossBranch, type BranchKey } from "../../app/style/crossBranch";
import { evaluateStyleGate } from "../../app/style/styleGate";
import type { StyleAnswers } from "../../app/style/surveyData";
import type { CopyEnv } from "../env";
import { collectBlock, defaultEnv, newSeenOrigins } from "./collect";
import type { Resolution, ResolutionIssue, ResolvedBlock } from "./types";

// ─── 갈래 → 블록별 copy id 표 ───────────────────────────────────────────────

/** [스탬프]·[혹시]·[왜 그런가요]. b5·b8 은 door(혹시)가 없다. b9(차단)는 여기 없고 safety 소관. */
const INSIGHT: Partial<Record<BranchKey, string[]>> = {
  b1:  ["style.insight.b1_stamp",  "style.insight.b1_door",  "style.insight.b1_aha"],
  b2:  ["style.insight.b2_stamp",  "style.insight.b2_door",  "style.insight.b2_aha"],
  b3:  ["style.insight.b3_stamp",  "style.insight.b3_door",  "style.insight.b3_aha"],
  b4:  ["style.insight.b4_stamp",  "style.insight.b4_door",  "style.insight.b4_aha"],
  b5:  ["style.insight.b5_stamp",  "style.insight.b5_aha"],
  b6:  ["style.insight.b6_stamp",  "style.insight.b6_door",  "style.insight.b6_aha"],
  b7:  ["style.insight.b7_stamp",  "style.insight.b7_door",  "style.insight.b7_aha"],
  b8:  ["style.insight.b8_stamp",  "style.insight.b8_aha"],
  b10: ["style.insight.b10_stamp", "style.insight.b10_door", "style.insight.b10_aha"],
};

/** [시술할 때 지킬 것] — b8(문제없음)은 없다. */
const PROCEDURE: Partial<Record<BranchKey, string[]>> = {
  b1: ["style.procedure.b1"], b2: ["style.procedure.b2"], b3: ["style.procedure.b3"],
  b4: ["style.procedure.b4"], b5: ["style.procedure.b5"], b6: ["style.procedure.b6"],
  b7: ["style.procedure.b7"], b10: ["style.procedure.b10"],
};
/** b6 곱슬 조건 줄 — q3_curl 이 직모가 아닐 때만. */
const PROCEDURE_B6_CURL = "style.procedure.b6_curl";

/** [집에서는] 본문 — b6 없음, b10 은 본문 없이 정수리 카드만. */
const CARE_BODY: Partial<Record<BranchKey, string[]>> = {
  b1: ["style.care.b1"], b2: ["style.care.b2"], b3: ["style.care.b3"],
  b4: ["style.care.b4"], b5: ["style.care.b5"], b7: ["style.care.b7"], b8: ["style.care.b8"],
};
/** 정수리 드라이 6단계 카드(구 volume.scalp_*). 집에서는 안, 본문 뒤에 이어 붙인다. */
const SCALP_ROUTINE = [
  "style.volume.scalp_title",
  "style.volume.scalp_step1", "style.volume.scalp_step2", "style.volume.scalp_step3",
  "style.volume.scalp_step4", "style.volume.scalp_step5", "style.volume.scalp_step6",
  "style.volume.scalp_note",
];
/** 정수리 카드를 붙이는 갈래(최종본 §3·4·5·9). */
const SCALP_CARE_BRANCHES: BranchKey[] = ["b3", "b4", "b5", "b10"];

/** [내 모발 구조] — 굵기(q7)×숱(q8) 매트릭스 9칸. 곱슬 modifier·aha-ref 폐지(retired). */
const HAIR_MATRIX_THICK: Record<string, string> = { coarse: "coarse", medium_thickness: "med", fine: "fine" };
const HAIR_MATRIX_DENS: Record<string, string> = { thick_density: "thick", medium_density: "med", thin_density: "thin" };
function hairMatrixId(a: StyleAnswers): string {
  const t = HAIR_MATRIX_THICK[a.q7_thickness ?? "medium_thickness"] ?? "med";
  const d = HAIR_MATRIX_DENS[a.q8_density ?? "medium_density"] ?? "med";
  return `style.hair_structure.m_${t}_${d}`;
}
const ALL_HAIR_MATRIX_IDS = ["coarse", "med", "fine"].flatMap((t) =>
  ["thick", "med", "thin"].map((d) => `style.hair_structure.m_${t}_${d}`),
);

/** [기장은 이렇게 봅니다] — 기장별 커트 조언. */
const LEN_CUT: Record<string, string> = {
  short: "style.cut.len_short", short_bob: "style.cut.len_short_bob", bob: "style.cut.len_bob",
  collarbone: "style.cut.len_collarbone", chest: "style.cut.len_chest",
};

/** §6-6 시술 안전. */
const SAFETY_CAUTION = ["style.safety.caution_notice"];
const SAFETY_BLOCK = [
  "style.safety.b9_stamp", "style.safety.b9_door", "style.safety.b9_aha",
  "style.safety.b9_detail", "style.safety.b9_tip", "style.safety.b9_procedure",
];
/** 차단 시 시술 지시 문장 앞에 놓이는 전제 문구. */
const BLOCKED_PROCEDURE_PREFIX = "style.safety.blocked_procedure_prefix";

// ─── 갈래 도출 ──────────────────────────────────────────────────────────────

/** 게이트를 무력화하는 탐침 입력 — 시술 이력 키만 비운다. */
const GATE_NEUTRAL: Partial<StyleAnswers> = {
  q8a_recent: "none",
  q8b_prev: "none",
  q8c_more: "none",
  q8_bleach_2plus: "",
};

/**
 * 모질 갈래(발동 순서대로) 도출. crossBranch 는 block 이면 갈래 목록을 버리므로,
 * 시술 이력 키만 비운 탐침 입력으로 갈래를 다시 얻는다(§6-6 · 엔진 무수정 우회).
 */
function deriveBranches(answers: StyleAnswers, gateBlocked: boolean): {
  primary: BranchKey | null;
  fired: BranchKey[];
} {
  const real = resolveCrossBranch(answers);
  if (!gateBlocked) {
    return { primary: real.primary, fired: [real.primary, ...real.absorbed] };
  }
  const probe = resolveCrossBranch({ ...answers, ...GATE_NEUTRAL } as StyleAnswers);
  const fired = probe.primary === "b8" ? [] : [probe.primary, ...probe.absorbed];
  return { primary: null, fired };
}

// ─── 해석 ───────────────────────────────────────────────────────────────────

export interface StyleResolution extends Resolution {
  gateLevel: "pass" | "caution" | "block";
  primary: BranchKey | null;
  firedBranches: BranchKey[];
  scalpRoutineCard: boolean;
}

export function resolveStyle(answers: StyleAnswers, env?: CopyEnv): StyleResolution {
  const e = defaultEnv(env);
  const issues: ResolutionIssue[] = [];

  const gate = evaluateStyleGate(answers);
  const gateLevel = gate.level as "pass" | "caution" | "block";
  const cross = resolveCrossBranch(answers);
  const { primary, fired } = deriveBranches(answers, gateLevel === "block");

  const pick = (table: Partial<Record<BranchKey, string[]>>): string[] =>
    fired.flatMap((b) => table[b] ?? []);

  // ── [스탬프·혹시·왜] insight — 대표 판정 1개. 차단이면 safety 가 그 자리(§6-6). ──
  const insightIds: string[] = primary ? (INSIGHT[primary] ?? []) : [];

  // ── [내 모발 구조] 굵기×숱 매트릭스 1칸 ──────────────────────────────────
  const hairStructureIds = [hairMatrixId(answers)];

  // ── [시술할 때 지킬 것] procedure — b6 은 곱슬(직모 아님) 조건 줄 추가 ────
  const procedureIds = [...pick(PROCEDURE)];
  if (fired.includes("b6") && (answers.q3_curl ?? "") !== "" && answers.q3_curl !== "straight_hair") {
    procedureIds.push(PROCEDURE_B6_CURL);
  }

  // ── [집에서는] care — 본문 + 정수리 드라이 카드(3·4·5·9) ─────────────────
  const careScalp = fired.some((b) => SCALP_CARE_BRANCHES.includes(b)) ? SCALP_ROUTINE : [];
  const careIds = [...pick(CARE_BODY), ...careScalp];

  // ── [기장은 이렇게 봅니다] cut — 기장 조언만 ─────────────────────────────
  const lenCut = LEN_CUT[answers.q11_length ?? ""];
  const cutIds = lenCut ? [lenCut] : [];

  // ── safety — §6-6 ─────────────────────────────────────────────────────
  const safetyIds =
    gateLevel === "block" ? SAFETY_BLOCK : gateLevel === "caution" ? SAFETY_CAUTION : [];

  const seen = newSeenOrigins();

  const blocks: ResolvedBlock[] = [
    collectBlock("style", "insight", insightIds, e, issues, seen),
    collectBlock("style", "hair-structure", hairStructureIds, e, issues, seen),
    collectBlock("style", "procedure", procedureIds, e, issues, seen),
    collectBlock("style", "care", careIds, e, issues, seen),
    collectBlock("style", "cut", cutIds, e, issues, seen),
    collectBlock("style", "safety", safetyIds, e, issues, seen),
  ];

  // ── 차단 시 시술 지시를 조건부로 전환 ──────────────────────────────────
  //   "시술할 때 지킬 것"(procedure 블록) 문장에 conditional 표시를 달고, 그 앞에
  //   전제 문구(blocked_procedure_prefix)를 한 번 놓는다. 숨기지 않고 프레임만 바꾼다.
  if (gateLevel === "block") {
    const procBlock = blocks.find((b) => b.block === "procedure");
    if (procBlock && procBlock.entries.length > 0) {
      for (const entry of procBlock.entries) entry.conditional = true;
      const prefix = collectBlock("style", "procedure", [BLOCKED_PROCEDURE_PREFIX], e, issues, seen);
      if (prefix.entries.length > 0) procBlock.entries.unshift(...prefix.entries);
    }
  }

  return {
    gateLevel,
    primary,
    firedBranches: fired,
    scalpRoutineCard: cross.scalpRoutineCard,
    blocks,
    issues,
    reachedIds: blocks.flatMap((b) => b.entries.map((x) => x.id)),
  };
}

/** Style resolver가 낼 수 있는 copy id 전량(§7-1 게이트용). */
export function styleReachableIds(): string[] {
  const flat = (t: Partial<Record<BranchKey, string[]>>) => Object.values(t).flat() as string[];
  return [
    ...flat(INSIGHT),
    ...flat(PROCEDURE),
    PROCEDURE_B6_CURL,
    ...flat(CARE_BODY),
    ...SCALP_ROUTINE,
    ...ALL_HAIR_MATRIX_IDS,
    ...Object.values(LEN_CUT),
    ...SAFETY_CAUTION,
    ...SAFETY_BLOCK,
    BLOCKED_PROCEDURE_PREFIX,
  ];
}
