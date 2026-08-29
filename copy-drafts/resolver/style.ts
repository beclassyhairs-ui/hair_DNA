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
import { collectBlock, defaultEnv, newSeenOrigins } from "./collect";
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

// ─── [PHASE2] 원답 직접 매핑 — 갈래가 못 덮는 조합까지 전 손님 블록을 채운다 ─────
//   모질 매트릭스(q7×q8)·곱슬 modifier(q3)·디자인 차등 궁합(b2/b7×q13)·기장 커트(q11).
//   전건 draft라 production은 collectBlock의 env 게이트가 렌더를 막고(회귀 0),
//   dev/preview에서만 나가 실화면 프리뷰가 된다. 판정(crossBranch·styleGate)은 무수정 —
//   여기서 읽는 건 손님이 **직접 답한** 굵기/숱/곱슬/디자인/기장이지 재계산이 아니다.
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
const CURL_MOD: Record<string, string> = {
  wavy_hair: "style.hair_structure.curlmod_wavy",
  curly_hair_mid: "style.hair_structure.curlmod_mid",
  curly_hair: "style.hair_structure.curlmod_strong",
};
const B2_DESIGN: Record<string, string> = {
  c_curl: "style.curl_fit.b2_c_curl", s_curl: "style.curl_fit.b2_s_curl", wave: "style.curl_fit.b2_wave",
};
const B7_DESIGN: Record<string, string> = {
  c_curl: "style.curl_fit.b7_c_curl", s_curl: "style.curl_fit.b7_s_curl", wave: "style.curl_fit.b7_wave",
};
// §4 2단 미용실 주문 멘트 — 겉(_say) + 더보기(_why). 갈래 발동 시 함께 나감.
const ORDER_B2 = ["style.curl_fit.order_b2_say", "style.curl_fit.order_b2_why"];
const ORDER_B7 = ["style.curl_fit.order_b7_say", "style.curl_fit.order_b7_why"];
const LEN_CUT: Record<string, string> = {
  short: "style.cut.len_short", short_bob: "style.cut.len_short_bob", bob: "style.cut.len_bob",
  collarbone: "style.cut.len_collarbone", chest: "style.cut.len_chest",
};
// §4 2단 커트 주문 멘트 — 숏 계열(두상)만. 겉(_say)+더보기(_why).
const ORDER_CUT = ["style.cut.order_short_say", "style.cut.order_short_why"];
const SHORT_LENGTHS = ["short", "short_bob"];

/** §6-6 시술 안전. */
const SAFETY_CAUTION = ["style.safety.caution_notice"];
const SAFETY_BLOCK = [
  "style.safety.b9_stamp", "style.safety.b9_door", "style.safety.b9_aha",
  "style.safety.b9_detail", "style.safety.b9_tip", "style.safety.b9_procedure",
];
/** 차단 시 시술 지시 문장 앞에 놓이는 전제 문구(§ 수정3). */
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

  // 같은 화면에 같은 문장이 두 번 나가지 않게 원본 id를 추적한다(§ 수정2).
  //   insight가 먼저 나가므로 b3/b6/b10의 aha는 insight에서 1회만 나가고,
  //   hair-structure의 refId 참조는 건너뛴다. 차단으로 insight가 비면 참조가 살아난다.
  const seen = newSeenOrigins();

  // ── [PHASE2] 원답 매핑 추가 id — 매트릭스가 먼저(모질 기본 서술), 그 뒤 곱슬 modifier,
  //   마지막에 기존 aha-ref(비-차단 손님은 insight와 중복돼 dedup으로 자동 제외됨). ──
  const curlMod = CURL_MOD[answers.q3_curl ?? ""];
  const hairStructureIds = [
    hairMatrixId(answers),
    ...(curlMod ? [curlMod] : []),
    ...pick(HAIR_STRUCTURE),
  ];

  const designCurl: string[] = [];
  if (fired.includes("b2")) { const d = B2_DESIGN[answers.q13_design ?? ""]; if (d) designCurl.push(d); designCurl.push(...ORDER_B2); }
  if (fired.includes("b7")) { const d = B7_DESIGN[answers.q13_design ?? ""]; if (d) designCurl.push(d); designCurl.push(...ORDER_B7); }
  const curlFitIds = [...pick(CURL_FIT), ...designCurl];

  const lenCut = LEN_CUT[answers.q11_length ?? ""];
  const shortOrder = SHORT_LENGTHS.includes(answers.q11_length ?? "") ? ORDER_CUT : [];
  const cutIds = [...pick(CUT), ...(lenCut ? [lenCut] : []), ...shortOrder];

  const blocks: ResolvedBlock[] = [
    collectBlock("style", "insight", insightIds, e, issues, seen),
    collectBlock("style", "volume", volumeIds, e, issues, seen),
    collectBlock("style", "hair-structure", hairStructureIds, e, issues, seen),
    collectBlock("style", "curl-fit", curlFitIds, e, issues, seen),
    collectBlock("style", "cut", cutIds, e, issues, seen),
    collectBlock("style", "safety", safetyIds, e, issues, seen),
  ];

  // ── 차단 시 시술 지시를 조건부로 전환(§ 수정3) ──────────────────────────
  //   숨기지 않는다. "지금 하라"가 아니라 "회복 뒤에 하신다면"으로 프레임만 바꾼다.
  //   전제 문구는 화면에 한 번만 놓이고(첫 procedure 앞), 나머지 지시 문장에는
  //   conditional 표시를 달아 렌더러가 같은 묶음으로 그리게 한다.
  if (gateLevel === "block") {
    let prefixPlaced = false;
    for (const b of blocks) {
      if (b.block !== "curl-fit" && b.block !== "cut") continue;
      const procIdx = b.entries.findIndex((x) => x.id.endsWith("_procedure"));
      if (procIdx === -1) continue;
      for (const entry of b.entries) {
        if (entry.id.endsWith("_procedure")) entry.conditional = true;
      }
      if (!prefixPlaced) {
        const prefix = collectBlock("style", b.block, [BLOCKED_PROCEDURE_PREFIX], e, issues, seen);
        if (prefix.entries.length > 0) {
          b.entries.splice(procIdx, 0, ...prefix.entries);
          prefixPlaced = true;
        }
      }
    }
  }

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
    BLOCKED_PROCEDURE_PREFIX,
    // [PHASE2] 원답 매핑 도달 집합 — 전 조합 도달(죽은칸 0). 전건 draft라 gate는 예외 처리.
    ...ALL_HAIR_MATRIX_IDS,
    ...Object.values(CURL_MOD),
    ...Object.values(B2_DESIGN),
    ...Object.values(B7_DESIGN),
    ...ORDER_B2,
    ...ORDER_B7,
    ...Object.values(LEN_CUT),
    ...ORDER_CUT,
  ];
}

/** 참고: 볼륨 갈래 목록(§6-4 판정 축) — 덤프·테스트에서 상태 열거에 쓴다. */
export { VOLUME_BRANCHES };
