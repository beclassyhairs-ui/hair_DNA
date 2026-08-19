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

import type { DamageSurveyAnswers, PullTest, FrictionTest, DryTest, DamageTreatment, RootDyeInterval } from "./surveyData";

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
  prophecy:      string | null; // 예언(門) — 시술이력 기반 14종 중 우선순위 첫 하나(2026-08-13 지시서)
  prophecyAha:   string | null; // 아하 — 왜 그런지
  prophecyTip:   string | null; // 관리 — 그럼 어떻게 (3번째 덩어리)
  grayHairStory: string | null; // 흰머리 원고(새치 체크 시만 · 확정104)
  products:      Product[];
  concernTags:   string[];
}

// ─── 점수 상수 (2026-08-13 확정 — 시술 카테고리별 회수 티어[1회/2회 체감]) ──────────
//   가산(슬롯 단순합산) → "카테고리별 회수 티어"로 전환(2회가 1회의 2배 아님 = 체감 감소).
const BLEACH_SCORE = [0, 4.5, 8.0] as const;   // 탈색 0/1/2회+ — 2회+는 천장(8.0=Lv4)
const PERM_SCORE   = [0, 1.5, 2.25] as const;  // 열펌·매직 0/1/2회
const DYE_SCORE    = [0, 1.0, 1.5] as const;   // 염색·일반펌 0/1/2회
const MORE_BONUS: Record<"none" | "few" | "many", number> = { none: 0, few: 0.5, many: 1.2 };
// 뿌리염색(주기 기반 · 뿌리염색 선택 손님만): 3개월 0.2 / 한달 0.5 / 2~3주 0.8. 6개월↑ +0.5, 최대 1.3.
//   설문 하위질문(h_root_interval + h_root_over6m)으로 실제 주기를 받는다(새치 주고객 2~3주=0.8).
//   미응답("")은 방어적으로 한달(0.5). 회수와 무관하게 "주기"라 뿌리염색 있으면 1회만 가산.
const ROOT_DYE_BY_INTERVAL: Record<RootDyeInterval, number> = { over_3m: 0.2, m1: 0.5, w2_3: 0.8, "": 0.5 };
const ROOT_DYE_OVER6M_BONUS = 0.5;
const ROOT_DYE_MAX = 1.3;
// 물리테스트 ±보정. 확정124: Q1 4단계(firm=단단·건강 −0.3 추가). 물리 상한 합 3.0(snap1.0+tangled1+slow1)
//   → 물리 단독 Lv3(4.5)·Lv4 도달 불가 유지(확정80·85). firm은 유일한 음수(건강 신호).
const PULL_ADJ: Record<PullTest, number>     = { snap: 1.0, stretch: 0.7, elastic: 0.3, firm: -0.3, unsure: 0, "": 0 };
const FRICTION_ADJ: Record<FrictionTest, number> = { tangled: 1, loosens: 0.5, smooth: 0, unsure: 0, "": 0 };
const DRY_ADJ: Record<DryTest, number>       = { slow: 1, normal: 0, fast: 0, "": 0 }; // 오래(slow)만 손상, 빨리=중립
// 레벨 컷 (2026-08-13 확정): Lv1 0~1.5 / Lv2 1.6~4.4 / Lv3 4.5~7.9 / Lv4 8.0+
const LV2_MIN = 1.6, LV3_MIN = 4.5, LV4_MIN = 8.0;
// ★ 안전장치: 탈색이 없으면 총점이 7.9를 넘지 않는다(무탈색은 어떤 경우도 Lv4 불가). 문항이 늘어도 천장 유지.
const NO_BLEACH_CAP = 7.9;

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

// ─── 예언(門) 14종 — 2026-08-13 지시서 원문 그대로. 문장 재작성 금지. ─────────────
//   노출 규칙(selectProphecy): ① 1~10번(두 시술 겹침) 위에서부터 첫 매칭. ② 안 걸리면
//     "마지막 시술" 기준 11~14번 폴백(빈칸 방지 · 지시서 [2] 보강). 시술 전무면 미노출.
//   ⚠️ 8번(긴 길이×반복시술): 데미지 설문에 길이 문항이 없어 match=false 유지(오픈 급해 문항 추가 안 함).
//   6번(셀프염색): 염색/뿌리염색 하위체크 h_self_dye로 활성(2026-08-14). selfDye AND anyDye. 점수 영향 없음.
//   ⚠️ 1번은 "열펌"이라 못 박지 않는다(일반펌도 걸림) — 지시서 §4-4.
interface ProphecyCtx {
  perm: boolean; heat: boolean; magic: boolean;
  rootDye: boolean; fullDye: boolean; anyDye: boolean; bleach: boolean;
  selfDye: boolean; // 집에서 직접(셀프염색) 체크 — 6번 트리거
}
function prophecyCtx(a: DamageSurveyAnswers): ProphecyCtx {
  const slots: DamageTreatment[] = [a.h_recent, a.h_prev].filter((t) => t !== "none");
  const has = (t: DamageTreatment) => slots.includes(t);
  const bleach = has("bleach") || a.h_bleach_2plus; // 탈색 2회+ 체크도 탈색 있음으로 취급
  return {
    perm: has("heat_perm") || has("normal_perm"),
    heat: has("heat_perm"),
    magic: has("straight_perm"),
    rootDye: has("root_dye"),
    fullDye: has("dye"),
    anyDye: has("root_dye") || has("dye"),
    bleach,
    selfDye: a.h_self_dye === true, // 옛 세션(undefined)은 false
  };
}

interface ProphecyEntry { id: number; door: string; aha: string; tip: string; match: (c: ProphecyCtx) => boolean; }

const PROPHECIES: ProphecyEntry[] = [
  { id: 1, // 펌 × 뿌리염색
    door: "펌한 지 얼마 안 되셨는데, 뿌리 쪽 볼륨이 먼저 가라앉는 느낌이 들지 않던가요?",
    aha:  "염색약이 뿌리에 닿으면 펌으로 잡아둔 결합이 느슨해집니다. 그래서 컬 전체가 늘어져 보이고, 약이 닿은 부분은 펌 유지력이 약해질 수 있어요.",
    tip:  "펌을 먼저 하고 염색을 하면 염색약이 닿은 부분이 가라앉을 수 있고, 염색을 먼저 하고 펌을 하면 색이 퇴색될 수 있습니다. 가장 좋은 건 두 시술 사이에 기간을 두는 거예요. 너무 자주 겹쳐서 하시면 어느 쪽도 예쁘게 나오기 어렵습니다.",
    match: (c) => c.perm && c.rootDye },
  { id: 2, // 매직 × 뿌리염색
    door: "매직을 하셔서 겉보기엔 매끈한데, 감을 때나 말릴 때 보면 부스스하고 손에 많이 걸리지 않던가요?",
    aha:  "매직은 결을 펴서 정돈돼 보이게 하는 거지, 머릿결이 진짜 좋아진 건 아니에요. 새치 염색이 반복되면 속은 계속 상하는데 겉이 매끈해서 헷갈리게 만듭니다.",
    tip:  "젖었을 때 손으로 만져보시고 상했다는 느낌이 드시면, 머릿결 관리는 필수고 잦은 시술은 자제하시는 게 좋습니다. 머릿결이 좋아진 것 같아서 시술을 또 하시면 위험해요.",
    match: (c) => c.magic && c.rootDye },
  { id: 3, // 뿌리염색 × 전체염색
    door: "염색하고 나서, 생각보다 색이 빨리 빠지고 금방 밝아지지 않던가요?",
    aha:  "손상된 머리는 색은 잘 들어갑니다. 색감도 잘 잡히고요. 다만 원래 색으로 돌아오는 시간이 빨라져요. 상할수록 유지 기간이 짧아집니다.",
    tip:  "색을 오래 두시려고 염색을 자주 하시면, 그럴수록 유지 기간이 더 짧아지는 쪽으로 갑니다. 차라리 컬러 샴푸나 보색 샴푸로 색상 유지력을 늘려가시는 게 효과적이에요.",
    match: (c) => c.rootDye && c.fullDye },
  { id: 4, // 염색 × 열펌
    door: "펌하고 났더니 머리색이 오히려 밝아 보이거나 상해 보이지 않던가요?",
    aha:  "가장 마지막에 한 시술이 이전 시술에 영향을 끼칩니다. 염색 후에 열펌을 하면 색이 퇴색돼서 원래 가지고 있던 밝기로 돌아가려는 습성이 있어요. 머리색이 밝아지면 컬도 부스스해 보일 수 있습니다.",
    tip:  "두 시술을 같이 하셔야 한다면, 열펌을 먼저 하시고 나중에 염색으로 색감만 입혀주는 게 좋습니다. 색감만 넣는 토닝 염색으로 조절하시면 손상을 줄이면서 색을 낼 수 있어요.",
    match: (c) => c.fullDye && c.heat },
  { id: 5, // 염색 × 매직
    door: "매직하고 났는데 결은 매끈해졌는데, 색이 더 밝아 보이고 상해 보이지 않던가요?",
    aha:  "매직은 퇴색이 심합니다. 색이 빠져서 상해 보이는 건 감출 수가 없어요.",
    tip:  "이 경우도 매직을 먼저 하시고 나중에 색감만 입혀주는 순서가 낫습니다. 밝기를 조절하는 염색보다 색감을 넣어주는 토닝 쪽이 부담이 적어요.",
    match: (c) => c.fullDye && c.magic },
  { id: 6, // 셀프염색 × 미용실 염색 — 셀프 체크(h_self_dye) AND (전체염색 OR 뿌리염색)
    door: "앞쪽이나 헤어라인부터 색이 얼룩덜룩하지 않던가요?",
    aha:  "뿌리 염색을 직접 하시거나 여기저기 다른 미용실에서 받으시면, 레벨 톤이 한두 톤씩 어긋나면서 얼룩이 쌓이게 됩니다.",
    tip:  "자기 레벨을 기억해두시는 편이 가장 편해요. 평소 8레벨로 하셨다면 직접 쓰시는 약도 8레벨로 맞추시는 게 좋고, 미용실에서도 미리 말씀해두시면 얼룩질 확률이 많이 줄어듭니다. 혹시 블랙을 하신다면, 그 부분은 다시 밝아지지 않습니다.",
    match: (c) => c.selfDye && c.anyDye }, // ⚠️ 1~5번보다 아래 — 펌·매직 겹치면 그쪽이 먼저(순서 고정)
  { id: 7, // 열펌 × 매직
    door: "펌을 하시고 나중에 매직을 하셨는데, 끝머리가 지저분하거나 유난히 엉키는 느낌이 들지 않던가요?",
    aha:  "잦은 열펌과 화학 시술은 결합을 많이 끊기게 합니다. 매직으로 깔끔하게 펴도 끝머리는 부스스하게 올라올 확률이 있어요.",
    tip:  "그렇게 부스스해지거나 회색빛으로 보이는 부분은 어느 정도 정리해주면서 다듬어 가셔야 합니다. 매직을 하셔서 머리가 깔끔해 보인다고 다시 컬을 넣으시면, 기존 시술에 영향을 받아 좋은 결과가 안 나올 수 있어요.",
    match: (c) => c.heat && c.magic },
  { id: 8, // 긴 길이 × 반복 시술 — ⚠️ 길이 문항 없음 → 구조상 미노출(문구 보존)
    door: "기를수록 끝이 더 상해 보이고 얇아 보이지 않던가요?",
    aha:  "긴 머리 끝은 몇 년치 시술이 쌓인 자리예요.",
    tip:  "어느 정도 정리해주면서 지저분한 부분을 다듬고 가셔야 오히려 효과적으로 기를 수 있습니다.",
    match: () => false },
  { id: 9, // 탈색 × 매직
    door: "탈색하고 매직을 하셨는데, 오히려 매직 효과가 잘 안 났던 적 있지 않던가요?",
    aha:  "탈색모에 하는 매직은 복구 매직이라고 하는 고난도 시술입니다. 디자이너에 따라 결과 차이가 크고, 약이 잘못 들어가면 되돌릴 수 없는 결과가 나올 수 있어요.",
    tip:  "하시게 된다면 pH를 잘 아는 분께 받으셔야 합니다.",
    match: (c) => c.bleach && c.magic },
  { id: 10, // 탈색 × 열펌
    door: "탈색한 머리에 펌을 하셨다면, 컬이 아예 안 나오거나 부스스해지지 않던가요?",
    aha:  "탈색모에 열펌은 사실상 불가능합니다. 컬을 걸어둘 뼈대가 남아 있지 않아서요.",
    tip:  "지금은 새로 뭘 얹기보다, 있는 걸 지키면서 정리하는 쪽이 결과가 빠릅니다.",
    match: (c) => c.bleach && c.heat },
  { id: 11, // 펌만
    door: "펌하고 한 달쯤 지나면, 컬이 늘어지기보다 지저분하고 부스스해 보이지 않던가요?",
    aha:  "원래 곱슬기가 있는 머리에 펌으로 컬이 한 겹 더 얹히면, 두 개가 섞이면서 부스스해 보일 수 있어요.",
    tip:  "트리트먼트나 마스크로 관리해주시고, 말리실 때 끝까지 완전히 건조해주시면 훨씬 깔끔한 컬을 유지하실 수 있습니다.",
    match: (c) => c.perm }, // '다른 시술 없음' 제거(폴백 겸함) — 실제 선택은 selectProphecy가 마지막 시술로
  { id: 12, // 매직만
    door: "매직하고 시간이 지나면 뿌리 쪽부터 다시 뜨지 않던가요?",
    aha:  "새로 자라 나오는 뿌리는 원래 성질 그대로 올라옵니다.",
    tip:  "전체를 다시 펴기보다 뿌리만 정리하시는 편이 머릿결에 훨씬 낫고요. 그 사이에는 곱슬기를 완화해주는 케라틴 미스트 같은 제품을 쓰시는 것도 좋은 방법입니다.",
    match: (c) => c.magic }, // '다른 시술 없음' 제거(폴백 겸함)
  { id: 13, // 염색만
    door: "염색하고 두세 주 지나면 색이 확 빠져 보이지 않던가요?",
    aha:  "색은 감을 때마다 조금씩 빠져나갑니다.",
    tip:  "염색을 다시 하시는 것보다 컬러 샴푸로 사이를 버티시는 게 머릿결에는 훨씬 낫습니다.",
    match: (c) => c.anyDye }, // '다른 시술 없음' 제거(폴백 겸함)
  { id: 14, // 탈색만
    door: "탈색하고 나서 머리가 유난히 잘 엉키고, 젖으면 늘어나지 않던가요?",
    aha:  "탈색은 색소를 빼내면서 머리 속을 비워냅니다. 비워진 자리는 다시 채워지지 않아요.",
    tip:  "지금은 새로 뭘 얹기보다 있는 걸 지키면서 정리하는 쪽이 결과가 빠릅니다.",
    match: (c) => c.bleach }, // '다른 시술 없음' 제거(폴백 겸함)
];

/**
 * 예언 선택: ① 1~10번(두 시술 겹침)을 위에서부터 검사해 첫 매칭. ② 안 걸리면 "마지막 시술"
 * 기준으로 11~14번 중 하나를 폴백으로 띄운다(2026-08-13 지시서 [2] 보강 — 빈칸 방지).
 *   마지막=열펌/일반펌→11, 매직→12, 전체염색/뿌리염색→13, 탈색→14. 시술 전무면 null.
 *   ★ 11~14의 "다른 시술 없음" 조건은 제거(이제 폴백 역할 겸함) — selectProphecy가 직접 고른다.
 */
function selectProphecy(a: DamageSurveyAnswers): ProphecyEntry | null {
  const c = prophecyCtx(a);
  const paired = PROPHECIES.filter((p) => p.id <= 10).find((p) => p.match(c));
  if (paired) return paired;
  // 폴백: 마지막에 한 시술(h_recent 우선, none이면 h_prev)로 단일 예언 매핑.
  const last = a.h_recent !== "none" ? a.h_recent : a.h_prev;
  const fallbackId =
    last === "heat_perm" || last === "normal_perm" ? 11 :
    last === "straight_perm" ? 12 :
    last === "dye" || last === "root_dye" ? 13 :
    last === "bleach" ? 14 : null;
  return fallbackId ? PROPHECIES.find((p) => p.id === fallbackId) ?? null : null;
}

// ─── 제품 (§5 · 정수리·볼륨 제외 · 새치 마스카라 최상단 · 18-MEA 간판) ───────────
const P_18MEA: Product = { emoji: "🧴", name: "18-MEA 약산성 샴푸", description: "채우는 게 아니라, 안 빼앗기는 겁니다.", link: "#" };
const P_GRAY_MASCARA: Product = { emoji: "🖊️", name: "새치 커버 마스카라", description: "다음 염색까지 뿌리만 자연스럽게 가려줘요", link: "#" };
const PRODUCTS_DRY: Product[]  = [P_18MEA, { emoji: "💧", name: "리브인 모이스처 세럼", description: "헹구지 않고 남겨 수분이 덜 빠져나가게 해요", link: "#" }];
const PRODUCTS_RIGID: Product[] = [{ emoji: "🌿", name: "유연 케어 트리트먼트", description: "뻣뻣해진 결을 부드럽게 풀어줘요", link: "#" }, { emoji: "🧴", name: "약산성 데일리 샴푸", description: "결합이 약해진 모발을 자극 없이 세정해요", link: "#" }];
const PRODUCTS_HEALTHY: Product[] = [{ emoji: "✨", name: "데일리 보습 라인", description: "지금의 건강한 상태를 유지해줘요", link: "#" }];

// ─── 채점 ────────────────────────────────────────────────────────────────────
// 회수 티어 조회 — 회수를 표 인덱스로(상한 clamp). 표: [0회, 1회, 2회+].
function tier(table: readonly number[], n: number): number {
  return table[Math.min(Math.max(n, 0), table.length - 1)] ?? 0;
}

// 탈색 회수: "2회 이상" 체크(h_bleach_2plus)가 있으면 2로 고정(천장), 없으면 슬롯 내 회수.
//   calcScore(점수)·calcLevel(INV1 Lv4 강제) 두 경로가 같은 정의를 공유하도록 단일화.
function bleachCount(a: DamageSurveyAnswers): number {
  const slots: DamageTreatment[] = [a.h_recent, a.h_prev];
  return a.h_bleach_2plus ? 2 : slots.filter((t) => t === "bleach").length;
}

function calcScore(a: DamageSurveyAnswers): number {
  // 시술 슬롯 2칸(h_recent=마지막, h_prev=그전)에서 카테고리별 회수를 센다.
  const slots: DamageTreatment[] = [a.h_recent, a.h_prev];
  const cnt = (pred: (t: DamageTreatment) => boolean) => slots.filter(pred).length;

  const bleachN = bleachCount(a);
  const permN   = cnt((t) => t === "heat_perm" || t === "straight_perm"); // 열펌·매직
  const dyeN    = cnt((t) => t === "dye" || t === "normal_perm");         // 염색·일반펌
  const rootN   = cnt((t) => t === "root_dye");                           // 뿌리염색(간격 문항 대기)

  let s = tier(BLEACH_SCORE, bleachN) + tier(PERM_SCORE, permN) + tier(DYE_SCORE, dyeN);
  // 뿌리염색은 "주기" 점수라 회수와 무관하게 1회만 가산(간격 + 6개월↑ 가중, 최대 1.3).
  if (rootN > 0) {
    const base = ROOT_DYE_BY_INTERVAL[a.h_root_interval] ?? 0.5; // 옛 세션 등 미정의 방어
    s += Math.min(base + (a.h_root_over6m ? ROOT_DYE_OVER6M_BONUS : 0), ROOT_DYE_MAX);
  }
  s += MORE_BONUS[a.h_more];
  // 확정124 당김 코팅 규칙: 마지막 시술이 매직이면 Q1 'firm(단단=건강, −0.3)' 신호를 무시(0).
  //   매직은 겉을 코팅해 속 손상을 가려 firm을 '건강'으로 오판시킴 → 건강 감점만 무효화.
  //   ①②③(+보정)과 시술이력 손상 점수는 그대로 신뢰. 매직에만·마지막 슬롯(h_recent)일 때만.
  let pullAdj = PULL_ADJ[a.q1_pull];
  if (a.q1_pull === "firm" && a.h_recent === "straight_perm") pullAdj = 0;
  s += pullAdj + FRICTION_ADJ[a.q2_friction] + DRY_ADJ[a.q3_dry];

  if (bleachN === 0) s = Math.min(s, NO_BLEACH_CAP); // ★ 무탈색 천장 7.9 (Lv4 불가)
  return s;
}

function calcLevel(a: DamageSurveyAnswers): DamageLevel {
  // ★ INV1 강제 규칙(§8 · 확정124 매직 코팅과 동형 논리): 탈색 2회+ 는 Q1 답·물리테스트와
  //   무관하게 최종 Lv4로 고정한다. "특정 시술(2회+ 탈색)에서는 firm의 '건강' 신호를 신뢰하지 않는다."
  //   점수 감점이 아니라 레벨 강제 — 반례(firm −0.3으로 8.0−0.3=7.7 → Lv3 낙하)를 원천 차단.
  //   무탈색·탈색 1회 등 다른 경로는 이 분기를 타지 않으므로 점수·판정 완전 불변.
  if (bleachCount(a) >= 2) return 4;
  const s = calcScore(a);
  if (s >= LV4_MIN) return 4;
  if (s >= LV3_MIN) return 3;
  if (s >= LV2_MIN) return 2;
  return 1;
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

  // 예언(門): 시술이력 14종 중 위에서부터 첫 매칭 하나(2026-08-13 지시서). 시술 전무면 null.
  const prophecy = selectProphecy(a);

  // 제품: 유형별 + 새치 체크 시 마스카라 최상단 (§5)
  const base = type === "DRY" ? PRODUCTS_DRY : type === "RIGID" ? PRODUCTS_RIGID : PRODUCTS_HEALTHY;
  const products = a.h_root_gray ? [P_GRAY_MASCARA, ...base] : base;

  return {
    resultCode:    `L${level}_${type}`,
    level:         LEVEL_INFO[level],
    typeInfo:      TYPE_INFO[type],
    score,
    prophecy:      prophecy ? prophecy.door : null,
    prophecyAha:   prophecy ? prophecy.aha : null,
    prophecyTip:   prophecy ? prophecy.tip : null,
    grayHairStory: a.h_root_gray ? GRAY_HAIR_STORY : null,
    products,
    concernTags:   buildConcernTags(level, type),
  };
}
