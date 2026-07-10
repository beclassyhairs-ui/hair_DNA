// ============================================================================
// 어뷰티 — 셀프 손상도 자가진단 ("미용실 가기 전 1분 팩트체크") 설문 데이터
// Q1~Q3: 현업 미용사 시크릿 테스트(물리/마찰/관찰) — 손상 심각도(Level) 축
// Q4: 시술·스타일링 습관 다중선택 — 손상 원인(Type) 축
// 채점 로직은 이 파일에 두지 않고 damageRecommend.ts에서 전부 처리한다
// (surveyData는 순수 화면 표시용 콘텐츠만 담는다 — bangs/style과 동일한 컨벤션).
// ============================================================================

export type PullTest     = "snap" | "stretch" | "elastic" | "";
export type FrictionTest = "tangled" | "loosens" | "smooth" | "";
export type DryTest      = "fast" | "slow" | "normal" | "";
export type HabitFlag    =
  | "heat_daily"      // 고열 스타일링 자주 함
  | "heat_noprotect"  // 열 보호제 없이 사용
  | "chem_repeat"     // 염색 반복
  | "chem_bleach"     // 탈색 경험
  | "perm_repeat"     // 펌·매직 반복
  | "multi_combo"     // 복합 시술
  | "none";           // 해당 없음

export interface DamageSurveyAnswers {
  q1_pull:     PullTest;
  q2_friction: FrictionTest;
  q3_dry:      DryTest;
  q4_habits:   HabitFlag[];
}

export interface SurveyOption {
  id: string;
  icon: string;
  label: string;
  desc: string;
}

export interface SingleQuestion {
  qKey: "q1_pull" | "q2_friction" | "q3_dry";
  multi: false;
  no: string;
  stepTag: string;
  title: string;
  hint?: string;
  options: SurveyOption[];
}

export interface MultiQuestion {
  qKey: "q4_habits";
  multi: true;
  no: string;
  stepTag: string;
  title: string;
  hint?: string;
  options: SurveyOption[];
  noneOptionId: string; // 선택 시 다른 항목을 전부 해제하는 "해당 없음" id
}

export type SurveyQuestion = SingleQuestion | MultiQuestion;

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // ── Q1: 물리 테스트 — 젖은 모발 당김 ────────────────────────────────────────
  {
    qKey: "q1_pull",
    multi: false,
    no: "Q1",
    stepTag: "물리 테스트",
    title: "샤워 후 젖은 머리카락 한 올을\n살짝 당겨보면?",
    hint: "미용사들이 손상도를 볼 때 가장 먼저 하는 테스트예요",
    options: [
      { id: "snap",    icon: "💥", label: "힘없이 툭 끊어진다",       desc: "당기자마자 바로 끊어지는 느낌" },
      { id: "stretch", icon: "🔗", label: "고무줄처럼 늘어나다 끊어진다", desc: "늘어나긴 하는데 결국 끊어짐" },
      { id: "elastic", icon: "✨", label: "탄력 있게 늘어났다 돌아온다", desc: "당겨도 원래 길이로 복원됨" },
    ],
  },
  // ── Q2: 마찰 테스트 — 샴푸만 하고 빗질 ───────────────────────────────────────
  {
    qKey: "q2_friction",
    multi: false,
    no: "Q2",
    stepTag: "마찰 테스트",
    title: "트리트먼트 없이 샴푸만 하고\n빗질해보면?",
    hint: "큐티클이 얼마나 살아있는지 알 수 있어요",
    options: [
      { id: "tangled", icon: "🪢", label: "엉켜서 잘 안 풀리고 뜯긴다", desc: "빗질할 때 뭉텅이로 뽑히는 느낌" },
      { id: "loosens", icon: "〜", label: "좀 엉키지만 몇 번 빗으면 풀린다", desc: "처음엔 걸리는데 곧 부드러워짐" },
      { id: "smooth",  icon: "🌊", label: "뽀득거리고 잘 빗긴다",     desc: "빗질이 걸림 없이 매끄러움" },
    ],
  },
  // ── Q3: 관찰 테스트 — 드라이 시간 ────────────────────────────────────────────
  {
    qKey: "q3_dry",
    multi: false,
    no: "Q3",
    stepTag: "관찰 테스트",
    title: "드라이기로 머리를 말릴 때\n보통 어떤가요?",
    hint: "마르는 속도로 모발 상태의 다른 면을 볼 수 있어요",
    options: [
      { id: "fast",   icon: "⚡", label: "순식간에 마른다",         desc: "수분이 금방 날아가는 느낌" },
      { id: "slow",   icon: "🐌", label: "유독 오래 걸린다",         desc: "속까지 마르는 데 시간이 많이 걸림" },
      { id: "normal", icon: "🙂", label: "적당히 보통으로 마른다",   desc: "특별히 빠르거나 느리지 않음" },
    ],
  },
  // ── Q4: 원인 파악 — 시술·스타일링 습관 (다중선택) ────────────────────────────
  {
    qKey: "q4_habits",
    multi: true,
    no: "Q4",
    stepTag: "습관 체크",
    title: "평소 자주 하는 시술이나\n습관을 모두 골라주세요",
    hint: "해당하는 걸 전부 선택해 주세요 (복수 선택 가능)",
    noneOptionId: "none",
    options: [
      { id: "heat_daily",     icon: "🔥", label: "고데기·매직기를 자주 쓴다",     desc: "주 3회 이상 고열 스타일링" },
      { id: "heat_noprotect", icon: "🌡️", label: "열 보호제 없이 스타일링한다",   desc: "열 기구 사용 전 보호 제품 안 바름" },
      { id: "chem_repeat",    icon: "🎨", label: "염색·새치커버를 자주 한다",     desc: "2~3개월 주기로 반복" },
      { id: "chem_bleach",    icon: "🧪", label: "탈색(블리치)을 받아본 적 있다", desc: "톤업·탈색 시술 경험" },
      { id: "perm_repeat",    icon: "🌀", label: "펌·매직을 자주 한다",          desc: "디지털펌 포함, 6개월 내 반복" },
      { id: "multi_combo",    icon: "🧷", label: "여러 시술을 한꺼번에 받았다",   desc: "예: 탈색 + 펌을 연달아 진행" },
      { id: "none",           icon: "✓",  label: "해당 없음",                    desc: "최근 특별한 시술·스타일링 안 함" },
    ],
  },
];
