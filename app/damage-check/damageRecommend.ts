// ============================================================================
// 어뷰티 — 셀프 손상도 자가진단 채점 엔진
//
// 설계 원칙 (bangRecommend.ts 감사에서 발견된 문제를 반복하지 않기 위해):
//  1) "심각도(Level)"와 "원인(Type)"을 완전히 분리된 두 축으로 채점한다.
//  2) Level×Type 16개 조합을 하드코딩하지 않고, Level 정보 4개 × Type 정보 6개를
//     조합(headline 템플릿)해서 만든다.
//  3) 최종 결과에 resultCode/concernTags를 반드시 포함해 영속 저장이 가능하게 한다.
//
// 확정된 도메인 규칙(기획자 승인):
//  - Level = Q1(당김) + Q2(마찰) + Q3(건조시간 severity) 합산
//  - Q3 "순식간에 마름"은 열손상 축에 보너스를 준다 (수분 증발형 = 열 손상 신호)
//  - Type = Q4(습관 다중선택) 축 점수 + Q3 열보너스 중 최댓값 축
//  - Type 동점 시 우선순위: 화학(CHEM) > 구조/펌(PERM) > 열(HEAT)
//  - Level 1(건강모)이면 습관과 무관하게 Type은 HEALTHY로 고정
//  - Level 2 이상인데 원인 축이 전부 0점(습관에서 "해당 없음"만 고름)이면
//    ENV(환경·노화성 손상형)로 폴백
// ============================================================================

import type {
  DamageSurveyAnswers,
  PullTest,
  FrictionTest,
  DryTest,
  HabitFlag,
} from "./surveyData";

export type DamageLevel = 1 | 2 | 3 | 4;
export type DamageType  = "HEAT" | "CHEM" | "PERM" | "MIXED" | "ENV" | "HEALTHY";

export interface Product {
  emoji: string;
  name: string;
  description: string;
  link: string; // TODO: 실제 쿠팡 파트너스 링크로 교체
}

export interface LevelInfo {
  level: DamageLevel;
  label: string;         // "손상모"
  careIntensity: string; // "전문 클리닉 권장"
  summary: string;
}

export interface TypeInfo {
  type: DamageType;
  label: string;        // "열 손상형"
  causeExplain: string; // "고데기·매직 등 고열 스타일링으로 모발 단백질이 변성"
  avoid: string;
  products: Product[];
  /** Level 라벨을 받아 사용자 예시("Level 3: 고데기로 인해...")와 동일한 형태의 헤드라인을 만든다 */
  buildHeadline: (levelLabel: string) => string;
}

export interface DamageResult {
  resultCode: string; // 예: "L3_HEAT"
  level: LevelInfo;
  typeInfo: TypeInfo;
  headline: string;
  concernTags: string[]; // /home abeauty_user_profile.hairTags 호환 포맷 ("#열손상" 등)
}

// ─── Level 정의 ───────────────────────────────────────────────────────────────

const LEVEL_INFO: Record<DamageLevel, LevelInfo> = {
  1: {
    level: 1, label: "건강모", careIntensity: "예방 위주 관리",
    summary: "현재는 손상 신호가 거의 없어요. 지금 하시는 관리 루틴을 유지하면서 예방에 집중하면 충분해요.",
  },
  2: {
    level: 2, label: "경미 손상모", careIntensity: "홈케어 강화 필요",
    summary: "아직 눈에 띄게 심하진 않지만, 손상이 시작된 신호가 보여요. 지금부터 홈케어를 강화하면 되돌릴 수 있는 단계예요.",
  },
  3: {
    level: 3, label: "손상모", careIntensity: "전문 클리닉 권장",
    summary: "손상이 꽤 진행됐어요. 홈케어만으론 부족할 수 있어서, 전문 클리닉 케어와 병행하는 걸 추천해요.",
  },
  4: {
    level: 4, label: "극손상모", careIntensity: "즉시 집중 관리 + 시술 자제",
    summary: "모발 손상이 심각한 단계예요. 추가 시술(염색·펌·탈색)은 잠시 멈추고, 집중 복구 케어가 먼저 필요해요.",
  },
};

// ─── Type 정의 ────────────────────────────────────────────────────────────────

const TYPE_INFO: Record<DamageType, TypeInfo> = {
  HEAT: {
    type: "HEAT", label: "열 손상형",
    causeExplain: "고데기·매직기 등 고열 스타일링으로 모발 속 단백질이 타버린",
    avoid: "열 보호제 없이 180°C 이상 고온 기구 사용",
    products: [
      { emoji: "🛡️", name: "어뷰티 열보호 크림", description: "스타일링 전 필수, 단백질 변성을 막아줘요", link: "#" },
      { emoji: "🧬", name: "어뷰티 단백질 팩",   description: "타버린 단백질을 채워 탄력을 되살려요", link: "#" },
    ],
    buildHeadline: (lv) => `${lv} — 고데기로 인해 단백질이 타버린 열 손상모`,
  },
  CHEM: {
    type: "CHEM", label: "화학 손상형",
    causeExplain: "잦은 염색·탈색으로 큐티클이 녹아내린",
    avoid: "뿌리부터 전체 염색·탈색을 짧은 주기로 반복",
    products: [
      { emoji: "🧴", name: "약산성 컬러 샴푸", description: "손상된 큐티클을 자극 없이 진정시켜요", link: "#" },
      { emoji: "💧", name: "본드 앰플",        description: "끊어진 모발 결합을 화학적으로 재생시켜요", link: "#" },
    ],
    buildHeadline: (lv) => `${lv} — 잦은 염색·탈색으로 큐티클이 녹아내린 화학 손상모`,
  },
  PERM: {
    type: "PERM", label: "구조 손상형",
    causeExplain: "잦은 펌·매직으로 모발 구조 자체가 무너진",
    avoid: "펌과 매직을 단기간에 번갈아 시술",
    products: [
      { emoji: "🧫", name: "프로틴 리컨스트럭터", description: "붕괴된 모발 구조를 단백질로 재건축해요", link: "#" },
      { emoji: "💦", name: "노워시 리페어 앰플",   description: "헹구지 않고 매일 발라 구조를 보강해요", link: "#" },
    ],
    buildHeadline: (lv) => `${lv} — 잦은 펌·매직으로 모발 구조가 무너진 구조 손상모`,
  },
  MIXED: {
    type: "MIXED", label: "복합 손상형",
    causeExplain: "열·화학·구조 손상이 동시에 겹쳐 손상된",
    avoid: "여러 시술을 동시에 또는 연달아 진행",
    products: [
      { emoji: "🩹", name: "어뷰티 올인원 리페어 앰플", description: "여러 손상 원인을 한 번에 케어해요", link: "#" },
      { emoji: "🛡️", name: "어뷰티 열보호 크림",        description: "추가 손상을 막는 기본 방어선이에요", link: "#" },
    ],
    buildHeadline: (lv) => `${lv} — 여러 원인이 겹쳐 손상이 누적된 복합 손상모`,
  },
  ENV: {
    type: "ENV", label: "환경·노화성 손상형",
    causeExplain: "특별한 시술 없이도 자외선·수질·노화 등으로 자연스럽게 손상된",
    avoid: "자외선 차단 없이 장시간 외출, 염소·미네랄 많은 물에 장시간 노출",
    products: [
      { emoji: "☀️", name: "UV 케어 헤어 미스트", description: "자외선으로부터 모발을 보호해요", link: "#" },
      { emoji: "💧", name: "데일리 보습 세럼",    description: "매일 가볍게 수분·영양을 채워줘요", link: "#" },
    ],
    buildHeadline: (lv) => `${lv} — 특별한 시술 없이도 환경 요인으로 손상이 진행된 환경 손상모`,
  },
  HEALTHY: {
    type: "HEALTHY", label: "예방관리형",
    causeExplain: "현재 눈에 띄는 손상 신호 없이 건강하게 유지되고 있는",
    avoid: "특별히 피할 것 없음 — 지금 루틴 유지",
    products: [
      { emoji: "✨", name: "데일리 보습 라인",   description: "지금의 건강한 상태를 유지해줘요", link: "#" },
      { emoji: "🛡️", name: "예방용 열보호 스프레이", description: "앞으로 시술·스타일링을 하더라도 미리 방어해요", link: "#" },
    ],
    buildHeadline: (lv) => `${lv} — 지금은 건강하게 유지되고 있는 예방관리형 모발`,
  },
};

// ─── Q1~Q3 개별 채점 테이블 ───────────────────────────────────────────────────

const PULL_SCORE: Record<PullTest, number> = { snap: 3, stretch: 2, elastic: 0, "": 0 };
const FRICTION_SCORE: Record<FrictionTest, number> = { tangled: 3, loosens: 1, smooth: 0, "": 0 };
// Q3: 전반적 손상 severity는 "오래 걸림(다공성/전반적 손상)" 쪽이 더 크고,
// "순식간에 마름"은 severity는 약하게, 대신 열손상 축에 강한 보너스를 준다.
const DRY_SEVERITY: Record<DryTest, number>  = { fast: 1, slow: 2, normal: 0, "": 0 };
const DRY_HEAT_BONUS: Record<DryTest, number> = { fast: 2, slow: 0, normal: 0, "": 0 };

// ─── Q4 습관 다중선택 → 축별 가중치 ───────────────────────────────────────────

const HABIT_AXIS: Record<HabitFlag, Partial<Record<"heat" | "chem" | "perm", number>>> = {
  heat_daily:     { heat: 2 },
  heat_noprotect: { heat: 1 },
  chem_repeat:    { chem: 2 },
  chem_bleach:    { chem: 2 },
  perm_repeat:    { perm: 2 },
  multi_combo:    { chem: 1, perm: 1 },
  none:           {},
};

// ─── Level 산출 ───────────────────────────────────────────────────────────────

function calcLevel(answers: DamageSurveyAnswers): DamageLevel {
  const severity =
    PULL_SCORE[answers.q1_pull] +
    FRICTION_SCORE[answers.q2_friction] +
    DRY_SEVERITY[answers.q3_dry];

  if (severity <= 1) return 1;
  if (severity <= 4) return 2;
  if (severity <= 6) return 3;
  return 4;
}

// ─── Type 산출 ────────────────────────────────────────────────────────────────

function calcAxes(answers: DamageSurveyAnswers): { heat: number; chem: number; perm: number } {
  const axes = { heat: 0, chem: 0, perm: 0 };

  axes.heat += DRY_HEAT_BONUS[answers.q3_dry];

  for (const flag of answers.q4_habits) {
    const effect = HABIT_AXIS[flag];
    if (!effect) continue;
    axes.heat += effect.heat ?? 0;
    axes.chem += effect.chem ?? 0;
    axes.perm += effect.perm ?? 0;
  }

  return axes;
}

function pickType(
  level: DamageLevel,
  axes: { heat: number; chem: number; perm: number },
  habits: HabitFlag[],
): DamageType {
  if (level === 1) return "HEALTHY";

  const max = Math.max(axes.chem, axes.perm, axes.heat);
  if (max === 0) return "ENV";

  // MIXED는 숫자 동점이 아니라, 유저가 직접 "여러 시술을 한꺼번에 받았다"를
  // 선택했고 그로 인해 화학·구조 축이 둘 다 발생한 경우에만 적용한다
  // (자기보고 신호를 우선한다 — 순수 점수 동점은 아래 우선순위로 단일 결정).
  if (habits.includes("multi_combo") && axes.chem > 0 && axes.perm > 0) {
    return "MIXED";
  }

  // 동점 우선순위(확정): 화학 > 구조(펌) > 열 — 반드시 단일 Type으로 귀결
  if (axes.chem === max) return "CHEM";
  if (axes.perm === max) return "PERM";
  return "HEAT";
}

// ─── concernTags 빌더 (abeauty_user_profile.hairTags 호환 포맷) ──────────────

function buildConcernTags(level: DamageLevel, type: DamageType): string[] {
  const levelTag: Record<DamageLevel, string> = {
    1: "#건강모", 2: "#경미손상", 3: "#손상모", 4: "#극손상모",
  };
  const typeTag: Partial<Record<DamageType, string>> = {
    HEAT: "#열손상", CHEM: "#화학손상", PERM: "#펌손상", MIXED: "#복합손상", ENV: "#환경손상",
  };

  const tags = [levelTag[level]];
  const t = typeTag[type];
  if (t) tags.push(t);
  return tags;
}

// ─── 메인 엔트리 ──────────────────────────────────────────────────────────────

export function diagnoseDamage(answers: DamageSurveyAnswers): DamageResult {
  const level    = calcLevel(answers);
  const axes     = calcAxes(answers);
  const type     = pickType(level, axes, answers.q4_habits);
  const levelInfo = LEVEL_INFO[level];
  const typeInfo  = TYPE_INFO[type];

  return {
    resultCode:  `L${level}_${type}`,
    level:       levelInfo,
    typeInfo,
    headline:    typeInfo.buildHeadline(levelInfo.label),
    concernTags: buildConcernTags(level, type),
  };
}
