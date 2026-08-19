// ============================================================================
// copy-drafts/resolver/style.ts — Style 결과지 블록 해석
//
// 엔진(crossBranch·styleGate)의 **출력만** 읽는다. styleGate.ts는 무수정(§8-6).
//
// §6-6: gate가 block이어도 모질/궁합/커트 블록은 정상 출력한다.
// §6-4: Volume 블록은 primary가 무엇이든 항상 존재한다.
// ============================================================================

import { resolveCrossBranch, type BranchKey } from "../../app/style/crossBranch";
import { evaluateStyleGate } from "../../app/style/styleGate";
import type { StyleAnswers } from "../../app/style/surveyData";
import type { CopyEnv } from "../env";
import { collectBlock, defaultEnv } from "./collect";
import type { Resolution, ResolutionIssue, ResolvedBlock } from "./types";

// ─── 갈래 → 블록별 copy id 표 ───────────────────────────────────────────────

/** §6-3 Primary Insight. b9는 여기 없다 — §6-6에 따라 safety가 갖는다. */
const INSIGHT: Partial<Record<BranchKey, string[]>> = {
  b1: ["style.insight.b1_stamp", "style.insight.b1_door", "style.insight.b1_aha"],
  b2: ["style.insight.b2_stamp", "style.insight.b2_door", "style.insight.b2_aha"],
  b3: ["style.insight.b3_stamp", "style.insight.b3_door", "style.insight.b3_aha"],
  b4: ["style.insight.b4_stamp", "style.insight.b4_door", "style.insight.b4_aha"],
  b5: ["style.insight.b5_stamp", "style.insight.b5_door", "style.insight.b5_aha"],
  b6: ["style.insight.b6_stamp", "style.insight.b6_door", "style.insight.b6_aha"],
  b7: ["style.insight.b7_stamp", "style.insight.b7_door", "style.insight.b7_aha"],
  // b8은 폴백이라 detail·tip·procedure까지 여기 있다(§6 보정 2).
  b8: [
    "style.insight.b8_stamp", "style.insight.b8_door", "style.insight.b8_aha",
    "style.insight.b8_detail", "style.insight.b8_tip", "style.insight.b8_procedure",
  ],
  b10: ["style.insight.b10_stamp", "style.insight.b10_door", "style.insight.b10_aha"],
};

/** 갈래2 door는 희망 디자인에 따라 갈린다(FIX-C②). 기본(C컬)은 insight의 b2_door. */
const B2_DOOR_BY_DESIGN: Record<string, string> = {
  wave: "style.curl_fit.b2_door_wave",
  s_curl: "style.curl_fit.b2_door_s_curl",
};

/** §6-4 볼륨 상세 원재료. */
const VOLUME_BY_BRANCH: Partial<Record<BranchKey, string[]>> = {
  b3: ["style.volume.b3_detail", "style.volume.b3_tip"],
  b4: ["style.volume.b4_detail", "style.volume.b4_tip"],
  b5: ["style.volume.b5_detail", "style.volume.b5_tip", "style.volume.b5_procedure"],
  b6: ["style.volume.b6_tip"],
  b10: ["style.volume.b10_detail", "style.volume.b10_tip"],
};
const VOLUME_BRANCHES: BranchKey[] = ["b3", "b4", "b5", "b6", "b10"];
const VOLUME_BALANCED = "style.volume.balanced";
const SCALP_ROUTINE = [
  "style.volume.scalp_title",
  "style.volume.scalp_step1", "style.volume.scalp_step2", "style.volume.scalp_step3",
  "style.volume.scalp_step4", "style.volume.scalp_step5", "style.volume.scalp_step6",
  "style.volume.scalp_note",
];
/** 정수리 카드를 항상 붙이는 갈래(최종본 §5) — crossBranch 부가 트리거와 별개. */
const SCALP_ALWAYS: BranchKey[] = ["b3", "b5", "b10"];

/** §6-5(1) 모질 판단. 전부 insight의 aha를 refId로 가리키는 entry다. */
const HAIR_STRUCTURE: Partial<Record<BranchKey, string[]>> = {
  b3: ["style.hair_structure.b3_aha_ref"],
  b6: ["style.hair_structure.b6_aha_ref"],
  b10: ["style.hair_structure.b10_aha_ref"],
};

/** §6-5(2) 스타일 궁합. */
const CURL_FIT: Partial<Record<BranchKey, string[]>> = {
  b1: ["style.curl_fit.b1_detail", "style.curl_fit.b1_tip", "style.curl_fit.b1_procedure"],
  b2: ["style.curl_fit.b2_detail", "style.curl_fit.b2_tip", "style.curl_fit.b2_procedure"],
  b7: ["style.curl_fit.b7_detail", "style.curl_fit.b7_tip", "style.curl_fit.b7_procedure"],
  // 걸침 배치(§6 보정 2): 펴기 시술 설계가 주(主)라 curl-fit.
  b3: ["style.curl_fit.b3_procedure"],
};

/** §6-5(3) 커트 설계. */
const CUT: Partial<Record<BranchKey, string[]>> = {
  b4: ["style.cut.b4_procedure"],
  b6: ["style.cut.b6_detail", "style.cut.b6_procedure"],
  b10: ["style.cut.b10_procedure"],
};

/** §6-6 시술 안전. */
const SAFETY_CAUTION = ["style.safety.caution_notice"];
const SAFETY_BLOCK = [
  "style.safety.b9_stamp", "style.safety.b9_door", "style.safety.b9_aha",
  "style.safety.b9_detail", "style.safety.b9_tip", "style.safety.b9_procedure",
];

// ─── 갈래 도출 ──────────────────────────────────────────────────────────────

/** 게이트를 무력화하는 탐침 입력 — 시술 이력 키만 비운다. */
const GATE_NEUTRAL: Partial<StyleAnswers> = {
  q8a_recent: "none",
  q8b_prev: "none",
  q8c_more: "none",
  q8_bleach_2plus: "",
};

/**
 * 모질 갈래(발동 순서대로) 도출.
 *
 * ⚠️ 구조적 제약 — resolveCrossBranch는 gate가 block이면 `primary:"b9", absorbed:[]`를
 *   돌려주고 **실제로 발동한 모질 갈래 목록을 버린다.** 그런데 §6-6은 block이어도
 *   모질/궁합/커트를 정상 출력하라고 한다. 엔진 수정이 이번 세션 경계 밖이라,
 *   시술 이력 키만 비운 탐침 입력으로 같은 함수를 한 번 더 호출해 갈래를 얻는다.
 *
 *   이 방식이 성립하는 근거: 갈래 발동 조건(crossBranch.ts:67-78)은 q3_curl·q13_design·
 *   q8_density·q7_thickness·q11_length만 읽고 시술 이력 키는 읽지 않는다. 따라서 탐침이
 *   갈래 판정을 바꾸지 않는다. scalpRoutineCard는 시술 이력을 읽으므로 **실제 호출값**을 쓴다.
 *
 *   🔴 이건 임시 우회다. 올바른 해법은 crossBranch가 block일 때도 firedList를 함께
 *   돌려주는 것(엔진 1줄)이며, 별도 승인 후 처리해야 한다.
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
  // 탐침에서도 아무 갈래가 안 걸리면 b8(폴백)이 나온다 — 모질 블록은 비게 된다.
  const fired = probe.primary === "b8" ? [] : [probe.primary, ...probe.absorbed];
  return { primary: null, fired };
}

// ─── 해석 ───────────────────────────────────────────────────────────────────

export interface StyleResolution extends Resolution {
  gateLevel: "pass" | "caution" | "block";
  /** 대표 판정 갈래. 차단이면 null(대표 자리를 safety가 대신한다). */
  primary: BranchKey | null;
  firedBranches: BranchKey[];
  scalpRoutineCard: boolean;
  volumeState: "ISSUE" | "BALANCED";
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

  // ── insight — 대표 판정 1개만. 차단이면 safety가 그 자리를 갖는다(§6-6). ──
  let insightIds: string[] = primary ? (INSIGHT[primary] ?? []) : [];
  // 갈래2 door 디자인 분기: 기본 door를 빼고 디자인용 door로 갈아끼운다(치환, 추가 아님).
  if (primary === "b2") {
    const variant = B2_DOOR_BY_DESIGN[answers.q13_design ?? ""];
    if (variant) insightIds = insightIds.map((id) => (id === "style.insight.b2_door" ? variant : id));
  }

  // ── volume — §6-4 항상 존재 ────────────────────────────────────────────
  const volumeBranchIds = pick(VOLUME_BY_BRANCH);
  const scalpNeeded = cross.scalpRoutineCard || fired.some((b) => SCALP_ALWAYS.includes(b));
  const volumeIssueActive = volumeBranchIds.length > 0 || scalpNeeded;
  const volumeIds = volumeIssueActive
    ? [...volumeBranchIds, ...(scalpNeeded ? SCALP_ROUTINE : [])]
    : [VOLUME_BALANCED];

  // ── safety — §6-6 ─────────────────────────────────────────────────────
  const safetyIds =
    gateLevel === "block" ? SAFETY_BLOCK : gateLevel === "caution" ? SAFETY_CAUTION : [];

  const blocks: ResolvedBlock[] = [
    collectBlock("style", "insight", insightIds, e, issues),
    collectBlock("style", "volume", volumeIds, e, issues),
    collectBlock("style", "hair-structure", pick(HAIR_STRUCTURE), e, issues),
    collectBlock("style", "curl-fit", pick(CURL_FIT), e, issues),
    collectBlock("style", "cut", pick(CUT), e, issues),
    collectBlock("style", "safety", safetyIds, e, issues),
  ];

  return {
    gateLevel,
    primary,
    firedBranches: fired,
    scalpRoutineCard: cross.scalpRoutineCard,
    volumeState: volumeIssueActive ? "ISSUE" : "BALANCED",
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
    ...Object.values(B2_DOOR_BY_DESIGN),
    ...flat(VOLUME_BY_BRANCH),
    VOLUME_BALANCED,
    ...SCALP_ROUTINE,
    ...flat(HAIR_STRUCTURE),
    ...flat(CURL_FIT),
    ...flat(CUT),
    ...SAFETY_CAUTION,
    ...SAFETY_BLOCK,
  ];
}

/** 참고: 볼륨 갈래 목록(§6-4 판정 축) — 덤프·테스트에서 상태 열거에 쓴다. */
export { VOLUME_BRANCHES };
