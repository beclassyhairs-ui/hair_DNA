// ============================================================================
// 어뷰티 — 셀프 손상도 자가진단 채점 엔진 (2026-08 개편 · 확정 68·80·81·85·104·115·116)
//
// 설계:
//  · Level(심각도) = 시술이력 점수(주축) + 물리테스트 Q1~Q3 ±보정.
//    - 물리테스트 단독으로는 Lv4 불가(확정80·85) — 보정 상한이 낮게 설계됨.
//    - 탈색 2회+ 는 점수 무관 Lv4 강제.
//  · Type(유형) = 마지막 시술(h_recent) 기준 3버킷(확정68): 건조형 / 경직형 / 건강모.
//    - 화학(염색·뿌리염색·탈색) → 건조형 / 펌계열(매직·열펌·일반펌) → 경직형
//    - 없음 & Lv1 → 건강모(유형 태그 없음) / 없음 & Lv2↑ → 건조형 흡수(// TODO 전용칸 보류)
//  · 축(heat/chem/perm) 시스템·DRY_HEAT_BONUS 폐기 — 유형을 시술이력이 정하므로 불필요.
//
// ⚠️ 점수·경계는 PM-임시(손님 10명 검산 후 조정). 전부 const로 격리한다.
// ============================================================================

import type { DamageSurveyAnswers, PullTest, FrictionTest, DryTest, DamageTreatment } from "./surveyData";

export type DamageLevel = 1 | 2 | 3 | 4;
export type DamageType  = "DRY" | "RIGID" | "HEALTHY"; // 건조형 / 경직형 / 건강모

export interface Product {
  emoji: string;
  name: string;
  description: string;
  link: string; // 제품 노출은 자체 커머스(/items)로만
}

export interface LevelInfo {
  level: DamageLevel;
  label: string;         // "손상모"
  careIntensity: string;
  summary: string;       // 확정81 4단계 문구
}

export interface TypeInfo {
  type: DamageType;
  label: string;         // "건조형"
  causeExplain: string;  // 유형 설명(확정 카피 · AI 초안)
}

export interface DamageResult {
  resultCode:    string; // 예: "L3_DRY"
  level:         LevelInfo;
  typeInfo:      TypeInfo;
  score:         number;
  prophecy:      string | null; // C2 예언(조건 충족 시만 · 확정116)
  prophecyAha:   string | null;
  grayHairStory: string | null; // 흰머리 원고(새치 체크 시만 · 확정104)
  products:      Product[];
  concernTags:   string[];
}

// ─── 점수 상수 (PM-임시 · 튜닝 대상) ─────────────────────────────────────────
const TREAT_SCORE: Record<DamageTreatment, number> = {
  bleach: 4.5, straight_perm: 1.5, heat_perm: 1.5, normal_perm: 1, dye: 1, root_dye: 1, none: 0,
};
const ROOT_DYE_CYCLE_BONUS = 0.5; // 뿌염 주기 가중(6개월↑ 상당) — 회당, 단독 최대 ~1.3
const MORE_BONUS: Record<"none" | "few" | "many", number> = { none: 0, few: 1, many: 2.5 };
// 물리테스트 ±보정 (테스트 단독 Lv4 불가 — 상한 합 3.5)
const PULL_ADJ: Record<PullTest, number>     = { snap: 1.5, stretch: 1, elastic: 0, unsure: 0, "": 0 };
const FRICTION_ADJ: Record<FrictionTest, number> = { tangled: 1, loosens: 0.5, smooth: 0, unsure: 0, "": 0 };
const DRY_ADJ: Record<DryTest, number>       = { slow: 1, normal: 0, fast: 0, "": 0 }; // 오래(slow)만 손상, 빨리=중립
// 레벨 컷 (PM-임시)
const LV2_MIN = 2, LV3_MIN = 4.5, LV4_MIN = 8.5;

// ─── Level 정의 (확정81 4단계 문구) ──────────────────────────────────────────
const LEVEL_INFO: Record<DamageLevel, LevelInfo> = {
  1: { level: 1, label: "건강모",     careIntensity: "예방 위주 관리",
       summary: "시술을 거의 안 했거나 오래됐습니다. 원하는 색도 컬도 잘 나옵니다." },
  2: { level: 2, label: "경미 손상모", careIntensity: "홈케어 강화 필요",
       summary: "시술이 쌓이기 시작했습니다. 아직 괜찮지만 다음 한 번이 중요해집니다." },
  3: { level: 3, label: "손상모",     careIntensity: "전문 클리닉 권장",
       summary: "원하는 결과가 안 나올 확률이 높아집니다. 색은 생각보다 어둡게 먹고, 컬은 예쁘게 나와도 오래 안 갑니다." },
  4: { level: 4, label: "극손상모",   careIntensity: "즉시 집중 관리 + 시술 자제",
       summary: "여기서부터는 잘라내는 게 최고의 트리트먼트입니다. 새로 뭘 얹는 것보다 정리하면서 기르는 쪽이 빠릅니다." },
};

// ─── Type 정의 (확정 카피 · AI 초안 — 빨간펜 대상) ────────────────────────────
const TYPE_INFO: Record<DamageType, TypeInfo> = {
  DRY: {
    type: "DRY", label: "건조형",
    causeExplain: "마지막에 하신 게 염색 계열이네요. 염색은 색을 넣는 과정에서 머릿결 속 수분과 유분이 같이 빠져나갑니다. 그래서 만졌을 때 뻑뻑하고 부스스한 걸로 보입니다. → 채우기보다, 빠져나가는 걸 막아주는 쪽이 먼저입니다.",
  },
  RIGID: {
    type: "RIGID", label: "경직형",
    causeExplain: "마지막에 하신 게 펌·매직 계열이네요. 이건 머릿결 안쪽 결합을 끊었다 다시 붙이는 시술이라, 반복될수록 힘없이 처지거나 반대로 뻣뻣해지는 걸로 보입니다. → 유연하게 풀어주는 관리가 맞습니다. 단백질을 너무 세게 채우면 오히려 딱딱해지니 주의.",
  },
  HEALTHY: {
    type: "HEALTHY", label: "건강모",
    causeExplain: "지금은 시술 손상이 거의 없는 상태예요. 뭘 해도 잘 나오는, 선택의 폭이 가장 넓은 시기입니다.",
  },
};

// ─── 흰머리 원고 (확정104 · 새치 체크 손님만) ────────────────────────────────
const GRAY_HAIR_STORY =
  "흰머리는 검은 머리에서 색만 빠진 게 아닙니다. 머리카락 안에 있던 멜라닌 색소가 없어진 채로 자라 나온 겁니다. 그런데 이 색소는 색만 내던 게 아니라, 자극이 들어올 때 단백질 대신 맞아주던 방패이기도 했습니다. 그 방패 없이 나온 머리라, 흰머리는 염색하기 전부터 이미 약한 구조입니다. 여기에 나이가 더해지면 겉을 감싸던 기름 성분도 줄어, 굵고 뻣뻣한데 뻑뻑하게 느껴집니다. 굵어진 게 아니라 기름기가 빠져 거칠어진 겁니다. 게다가 흰머리는 색이 잘 안 들어가 새치 염색약은 더 세게, 시간도 더 오래, 3~4주마다 반복됩니다. 그래서 새치 염색을 오래 하신 분들의 머리는 단백질이 부족하다기보다, 기름기가 빠져나간 상태에 가깝습니다. 여기서 트리트먼트를 잡으시는데, 넣어준 기름 성분은 물로 헹구는 자리에서 상당 부분 다시 씻겨 나갑니다. 염색은 3~4주에 한 번이지만 머리는 그 사이 스무 번을 감고, 기름기는 시간이 아니라 감을 때 씻겨 나갑니다. 그래서 채우는 것보다, 덜 씻겨 나가게 하는 게 먼저입니다. 그 바깥 기름 성분의 이름이 18-MEA이고, 원래 손님 머리에 있던 겁니다. 그래서 18-MEA가 들어간 약산성 샴푸를 권해드립니다. 한 번 감아보시면 뻑뻑한 느낌이 덜한 걸 바로 아실 겁니다.";

// ─── C2 예언 (확정116 · 열펌 AND (뿌리염색+새치) 겹칠 때만) ───────────────────
const PROPHECY_C2 =
  "펌한 지 얼마 안 됐는데 컬이 금방 축 처지지 않던가요? 자주 하는 새치 염색으로 속이 약해진 머리에 열펌이 더해져서 그런 걸로 보입니다.";
const PROPHECY_C2_AHA =
  "열펌은 컬을, 새치 염색은 결을 갉아먹거든요. 둘이 겹치면 배로 빨리 옵니다.";

// ─── 제품 (§5 · 정수리·볼륨 제외 · 새치 마스카라 최상단 · 18-MEA 간판) ───────────
const P_18MEA: Product = { emoji: "🧴", name: "18-MEA 약산성 샴푸", description: "채우는 게 아니라, 안 빼앗기는 겁니다.", link: "#" };
const P_GRAY_MASCARA: Product = { emoji: "🖊️", name: "새치 커버 마스카라", description: "다음 염색까지 뿌리만 자연스럽게 가려줘요", link: "#" };
const PRODUCTS_DRY: Product[]  = [P_18MEA, { emoji: "💧", name: "리브인 모이스처 세럼", description: "헹구지 않고 남겨 수분이 덜 빠져나가게 해요", link: "#" }];
const PRODUCTS_RIGID: Product[] = [{ emoji: "🌿", name: "유연 케어 트리트먼트", description: "뻣뻣해진 결을 부드럽게 풀어줘요", link: "#" }, { emoji: "🧴", name: "약산성 데일리 샴푸", description: "결합이 약해진 모발을 자극 없이 세정해요", link: "#" }];
const PRODUCTS_HEALTHY: Product[] = [{ emoji: "✨", name: "데일리 보습 라인", description: "지금의 건강한 상태를 유지해줘요", link: "#" }];

// ─── 채점 ────────────────────────────────────────────────────────────────────
function bleachTwicePlus(a: DamageSurveyAnswers): boolean {
  return a.h_bleach_2plus || (a.h_recent === "bleach" && a.h_prev === "bleach");
}

function calcScore(a: DamageSurveyAnswers): number {
  let s = TREAT_SCORE[a.h_recent] + TREAT_SCORE[a.h_prev] + MORE_BONUS[a.h_more];
  if (a.h_recent === "root_dye") s += ROOT_DYE_CYCLE_BONUS;
  if (a.h_prev === "root_dye")   s += ROOT_DYE_CYCLE_BONUS;
  s += PULL_ADJ[a.q1_pull] + FRICTION_ADJ[a.q2_friction] + DRY_ADJ[a.q3_dry];
  return s;
}

function calcLevel(a: DamageSurveyAnswers): DamageLevel {
  if (bleachTwicePlus(a)) return 4; // 탈색 2회+ 강제
  const s = calcScore(a);
  if (s < LV2_MIN) return 1;
  if (s < LV3_MIN) return 2;
  if (s < LV4_MIN) return 3;
  return 4;
}

// 유형 = 마지막 시술(h_recent) 기준 3버킷 (확정68)
function pickType(level: DamageLevel, a: DamageSurveyAnswers): DamageType {
  const last = a.h_recent;
  if (last === "none") {
    return level === 1 ? "HEALTHY" : "DRY"; // 없음+Lv2↑ 건조형 흡수 (// TODO 전용칸 보류)
  }
  if (last === "dye" || last === "root_dye" || last === "bleach") return "DRY";   // 화학 → 건조형
  return "RIGID"; // straight_perm(매직) / heat_perm(열펌) / normal_perm(일반펌) → 경직형
}

function buildConcernTags(level: DamageLevel, type: DamageType): string[] {
  const levelTag: Record<DamageLevel, string> = { 1: "#건강모", 2: "#경미손상", 3: "#손상모", 4: "#극손상모" };
  const typeTag: Partial<Record<DamageType, string>> = { DRY: "#건조손상", RIGID: "#경직손상" };
  const tags = [levelTag[level]];
  const t = typeTag[type];
  if (t) tags.push(t);
  return tags;
}

// ─── 메인 엔트리 ──────────────────────────────────────────────────────────────
export function diagnoseDamage(a: DamageSurveyAnswers): DamageResult {
  const score = calcScore(a);
  const level = calcLevel(a);
  const type  = pickType(level, a);

  // C2 예언: 열펌(heat_perm) AND (뿌리염색 & 새치 체크) 둘 다 겹칠 때만 (확정116·61).
  //   FIX2: 매직(straight_perm)은 펴는 시술이라 '컬 처짐' 예언 대상 아님 — 열펌만.
  const hasHeatPerm = a.h_recent === "heat_perm" || a.h_prev === "heat_perm";
  const hasGrayRootDye = (a.h_recent === "root_dye" || a.h_prev === "root_dye") && a.h_root_gray;
  const showProphecy = hasHeatPerm && hasGrayRootDye;

  // 제품: 유형별 + 새치 체크 시 마스카라 최상단 (§5)
  const base = type === "DRY" ? PRODUCTS_DRY : type === "RIGID" ? PRODUCTS_RIGID : PRODUCTS_HEALTHY;
  const products = a.h_root_gray ? [P_GRAY_MASCARA, ...base] : base;

  return {
    resultCode:    `L${level}_${type}`,
    level:         LEVEL_INFO[level],
    typeInfo:      TYPE_INFO[type],
    score,
    prophecy:      showProphecy ? PROPHECY_C2 : null,
    prophecyAha:   showProphecy ? PROPHECY_C2_AHA : null,
    grayHairStory: a.h_root_gray ? GRAY_HAIR_STORY : null,
    products,
    concernTags:   buildConcernTags(level, type),
  };
}
