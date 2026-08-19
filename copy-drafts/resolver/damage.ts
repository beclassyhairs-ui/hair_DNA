// ============================================================================
// copy-drafts/resolver/damage.ts — Damage 결과지 블록 해석
//
// 엔진(damageRecommend)의 **출력만** 읽는다. 판정을 다시 계산하지 않는다.
//
// 블록 노출 조건은 각 블록 파일 헤더 주석·evidenceKeys를 그대로 따른다:
//   elasticity ← q1_pull / friction ← q2_friction / drying ← q3_dry
//   cause ← h_recent / gray ← h_root_gray / risk ← 엔진이 고른 예언
// ============================================================================

import { diagnoseDamage } from "../../app/damage-check/damageRecommend";
import type { DamageSurveyAnswers } from "../../app/damage-check/surveyData";
import type { CopyEnv } from "../env";
import { allEntries } from "../registry";
import { collectBlock, defaultEnv } from "./collect";
import type { Resolution, ResolutionIssue, ResolvedBlock } from "./types";

// ─── 값 → copy id 매핑표 ────────────────────────────────────────────────────
// 표로 두는 이유: 도달 가능한 id 전량(reachable)을 표에서 그대로 뽑아낼 수 있어야
//   §7-1 production 게이트가 추측 없이 발동한다.

const PULL_MAP: Record<string, string> = {
  snap: "damage.elasticity.snap",
  stretch: "damage.elasticity.stretch",
  elastic: "damage.elasticity.elastic",
  firm: "damage.elasticity.firm",
  unsure: "damage.elasticity.unsure",
};
/** firm은 마지막 시술이 매직이면 다른 문장을 쓴다(확정124 코팅 규칙과 정합). */
const PULL_FIRM_AFTER_MAGIC = "damage.elasticity.firm_after_magic";

const FRICTION_MAP: Record<string, string> = {
  tangled: "damage.friction.tangled",
  loosens: "damage.friction.loosens",
  smooth: "damage.friction.smooth",
  unsure: "damage.friction.unsure",
};
/** 확정94 빗질 조언 — 신호가 있는 손님(걸림이 실제로 있는 답)에게만. */
const FRICTION_TIP = "damage.friction.brush_tip";
const FRICTION_TIP_VALUES = ["tangled", "loosens"];

const DRY_MAP: Record<string, string> = {
  slow: "damage.drying.slow",
  normal: "damage.drying.normal",
  fast: "damage.drying.fast",
};

const CAUSE_MAP: Record<string, string> = {
  dye: "damage.cause.dye",
  root_dye: "damage.cause.root_dye",
  bleach: "damage.cause.bleach",
  straight_perm: "damage.cause.straight_perm",
  heat_perm: "damage.cause.heat_perm",
  normal_perm: "damage.cause.normal_perm",
  none: "damage.cause.none",
};

const GRAY_STORY = "damage.gray.story";

// ─── 예언 역방향 조회 ───────────────────────────────────────────────────────
// 엔진은 예언 **문자열**만 돌려주고 id는 module-private다(selectProphecy 비공개).
//   엔진에 export를 추가하는 건 이번 세션 경계 밖이라, 레지스트리의 risk 카피가
//   원문과 **한 글자도 다르지 않음이 기계로 증명돼 있다는 점**(verbatim 115건 불일치 0)을
//   이용해 문자열로 원본 entry를 되찾는다.
//   ⚠️ 같은 문자열이 두 entry에 있으면 되찾기가 모호해지므로 issue로 올린다.
function buildRiskIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const e of allEntries()) {
    if (!e.id.startsWith("damage.risk.")) continue;
    if (e.text === undefined) continue;
    const list = index.get(e.text) ?? [];
    list.push(e.id);
    index.set(e.text, list);
  }
  return index;
}

function lookupRisk(
  index: Map<string, string[]>,
  text: string | null,
  part: string,
  issues: ResolutionIssue[],
): string | null {
  if (text === null) return null;
  const hit = index.get(text);
  if (!hit || hit.length === 0) {
    issues.push({ kind: "missing_entry", detail: `risk(${part}): 엔진이 낸 문장을 레지스트리에서 못 찾음` });
    return null;
  }
  if (hit.length > 1) {
    issues.push({ kind: "ambiguous_text", detail: `risk(${part}): 같은 문장이 ${hit.length}개 entry에 있음 — ${hit.join(", ")}` });
    return null;
  }
  return hit[0]!;
}

// ─── 해석 ───────────────────────────────────────────────────────────────────

export interface DamageResolution extends Resolution {
  /** 엔진 판정 그대로. 레벨 카피는 레지스트리가 아니라 엔진(LEVEL_INFO)이 갖고 있다. */
  severity: {
    level: number;
    label: string;
    careIntensity: string;
    summary: string;
  };
  typeLabel: string;
  score: number;
  resultCode: string;
}

export function resolveDamage(answers: DamageSurveyAnswers, env?: CopyEnv): DamageResolution {
  const e = defaultEnv(env);
  const issues: ResolutionIssue[] = [];
  const result = diagnoseDamage(answers);

  // ① 물리테스트 3블록 — 미응답("")은 읽을 답이 없으므로 아무것도 내지 않는다.
  //    "잘 모르겠어요"(unsure)는 **답을 한 것**이라 반드시 안내 문구가 나간다(PM 확정).
  const pullId =
    answers.q1_pull === "firm" && answers.h_recent === "straight_perm"
      ? PULL_FIRM_AFTER_MAGIC
      : PULL_MAP[answers.q1_pull];

  const frictionIds: string[] = [];
  const frictionId = FRICTION_MAP[answers.q2_friction];
  if (frictionId) frictionIds.push(frictionId);
  if (FRICTION_TIP_VALUES.includes(answers.q2_friction)) frictionIds.push(FRICTION_TIP);

  const dryId = DRY_MAP[answers.q3_dry];

  // ② 원인 블록 — 마지막 시술 기준(엔진의 유형 판정과 같은 축).
  const causeId = CAUSE_MAP[answers.h_recent];
  if (!causeId) {
    issues.push({ kind: "unmapped_value", detail: `cause: h_recent="${answers.h_recent}" 에 대응하는 카피 없음` });
  }

  // ③ 새치 — 뿌리염색 위에서만 켜지는 하위체크라 단독으로 참일 수 없다(설문이 보장).
  const grayIds = answers.h_root_gray ? [GRAY_STORY] : [];

  // ④ 예언 — Phase 1.0은 첫 매칭 1개만(secondary는 1.5 flag). 엔진이 고른 그 1개를 쓴다.
  const riskIndex = buildRiskIndex();
  const riskIds = [
    lookupRisk(riskIndex, result.prophecy, "door", issues),
    lookupRisk(riskIndex, result.prophecyAha, "aha", issues),
    lookupRisk(riskIndex, result.prophecyTip, "tip", issues),
  ].filter((x): x is string => x !== null);

  const blocks: ResolvedBlock[] = [
    collectBlock("damage", "elasticity", pullId ? [pullId] : [], e, issues),
    collectBlock("damage", "friction", frictionIds, e, issues),
    collectBlock("damage", "drying", dryId ? [dryId] : [], e, issues),
    collectBlock("damage", "cause", causeId ? [causeId] : [], e, issues),
    collectBlock("damage", "gray", grayIds, e, issues),
    collectBlock("damage", "risk", riskIds, e, issues),
  ];

  return {
    severity: {
      level: result.level.level,
      label: result.level.label,
      careIntensity: result.level.careIntensity,
      summary: result.level.summary,
    },
    typeLabel: result.typeInfo.label,
    score: result.score,
    resultCode: result.resultCode,
    blocks,
    issues,
    reachedIds: blocks.flatMap((b) => b.entries.map((x) => x.id)),
  };
}

/**
 * Damage resolver가 **낼 수 있는** copy id 전량.
 * §7-1 production 게이트에 넘길 reachable 집합의 damage 몫이다.
 * ⚠️ 예언 8번은 엔진에서 match=() => false라 도달 불가 → 제외한다.
 */
export function damageReachableIds(): string[] {
  const risk = allEntries()
    .filter((x) => x.id.startsWith("damage.risk.") && !x.id.includes(".p08_"))
    .map((x) => x.id);

  return [
    ...Object.values(PULL_MAP),
    PULL_FIRM_AFTER_MAGIC,
    ...Object.values(FRICTION_MAP),
    FRICTION_TIP,
    ...Object.values(DRY_MAP),
    ...Object.values(CAUSE_MAP),
    GRAY_STORY,
    ...risk,
  ];
}
