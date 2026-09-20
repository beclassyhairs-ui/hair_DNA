// ============================================================================
// 미알팁 — 셀프 손상도 자가진단 ("미용실 가기 전 1분 팩트체크") 설문 데이터
// Q1~Q3: 현업 미용사 시크릿 테스트(물리/마찰/관찰) — 손상 심각도(Level) ±보정 축
// Q4: 시술이력(최근/그전/추가) — 손상 점수(Level) 주축 + 유형(Type) 결정 (확정68·72·77)
// 채점 로직은 이 파일에 두지 않고 damageRecommend.ts에서 전부 처리한다.
//
// 2026-08 개편(확정 115·116): 건조 문항 "오래 걸림=손상"으로 뒤집음(자연건조), Q4 습관
//   다중선택 폐기 → 시술이력 문항(스타일 styleGate와 같은 설계·별도 구현, 나중 통합).
// ============================================================================

export type PullTest     = "snap" | "stretch" | "elastic" | "firm" | "unsure" | ""; // 확정124: firm(단단=건강) 추가
export type FrictionTest = "tangled" | "loosens" | "smooth" | "unsure" | "";
export type DryTest      = "slow" | "normal" | "fast" | "";
// 시술 종류(확정68·77). 스타일 styleGate.constants의 TreatmentId와 값 정렬(통합 대비).
// FIX2(확정116): '매직·열펌' 단일 → '매직'(straight_perm) / '열펌'(heat_perm) 분리.
//   예언 C2는 열펌(heat_perm)만 트리거(매직은 펴는 시술이라 '컬 처짐' 안 맞음). 점수는 둘 다 1.5.
export type DamageTreatment = "bleach" | "straight_perm" | "heat_perm" | "normal_perm" | "dye" | "root_dye" | "none";
export type DamageMore      = "none" | "few" | "many";
// 뿌리염색 주기(뿌리염색 선택 손님에게만 하위질문). 점수: 3개월 0.2 / 한달 0.5 / 2~3주 0.8.
export type RootDyeInterval = "over_3m" | "m1" | "w2_3" | "";

export interface DamageSurveyAnswers {
  q1_pull:        PullTest;
  q2_friction:    FrictionTest;
  q3_dry:         DryTest;
  // 시술이력 (확정72·77) — 최근/그전/추가 + 하위체크
  h_recent:       DamageTreatment; // 가장 최근 시술 (= 마지막 시술, 유형 결정)
  h_prev:         DamageTreatment; // 그 전 시술
  h_more:         DamageMore;      // 작년에 더 하신 것
  h_bleach_2plus: boolean;         // 탈색 → 2회 이상 (확정: Lv4 강제)
  h_root_gray:    boolean;         // 뿌리염색 → 새치 염색 (확정95, 흰머리 원고 노출)
  h_self_dye?:    boolean;         // 염색/뿌리염색 → 집에서 직접(셀프염색) (예언 6번 트리거 · 점수 영향 없음). 옛 세션 호환 위해 옵셔널.
  h_root_interval: RootDyeInterval; // 뿌리염색 주기 (뿌리염색 선택 시만) — 새치 주고객 2~3주 반영
  h_root_over6m:   boolean;         // 뿌리염색 6개월↑ 지속 (+0.5, 합계 최대 1.3)
  // 2026-09 Q4 복수선택(옵션①): 최근 1년 받은 시술 "종류 집합"(무손실 기록). 옛 세션엔 없음(옵셔널).
  //   엔진은 h_all 이 없으면 [h_recent, h_prev]에서 파생해 동일 동작(하위호환). 점수·유형은 2슬롯 유지,
  //   예언 조합만 h_all 로 확장(셋+ 조합 포착). ※ 서로 다른 시술을 '같은 시술 2회'로 세지 않는다.
  h_all?:          DamageTreatment[];
}

// 뿌리염색 주기 옵션(뿌리염색 선택 손님 하위질문) — id는 RootDyeInterval와 1:1.
export const ROOT_DYE_INTERVAL_OPTIONS: { id: Exclude<RootDyeInterval, "">; label: string }[] = [
  { id: "over_3m", label: "3개월쯤" },
  { id: "m1",      label: "한 달쯤" },
  { id: "w2_3",    label: "2~3주쯤" },
];

export interface SurveyOption {
  id: string;
  icon: string;
  label: string;
  desc: string;
}

export interface SingleQuestion {
  qKey: "q1_pull" | "q2_friction" | "q3_dry";
  kind: "single";
  no: string;
  stepTag: string;
  title: string;
  hint?: string;
  options: SurveyOption[];
}

export interface TreatmentQuestion {
  qKey: "h_history";
  kind: "treatment_history";
  no: string;
  stepTag: string;
  title: string;
  hint?: string;
}

export type SurveyQuestion = SingleQuestion | TreatmentQuestion;

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // ── Q1: 물리 테스트 — 한 줌 당김 (확정73: "한 줌 잡아서" + "잘 모르겠어요") ─────
  {
    qKey: "q1_pull", kind: "single", no: "Q1", stepTag: "물리 테스트",
    // 2026-09 문구 쉽게 교체(사장님 확정). 값(enum)은 불변 — 점수·판정 그대로.
    title: "머리 감고 젖은 상태에서,\n머리카락 한 가닥을 양쪽으로 살살 당겨보세요",
    hint: "미용사들이 손상도를 볼 때 제일 먼저 하는 방법이에요",
    // 2026-09 보기 재편(값/enum 유지): '늘어나다 끊어짐'(stretch)은 '조금만 당겨도 끊어져요'(snap)로
    //   통합해 UI 보기에서 제거. stretch enum 값은 옛 저장 호환 위해 타입에 남기고, resolver가 snap
    //   되읽기로 remap한다(되읽기도 통합 1문장). firm 라벨은 '늘어나지도 끊어지지도 않아요'로 교체.
    options: [
      { id: "snap",    icon: "01", label: "조금만 당겨도 끊어져요",       desc: "" },
      { id: "elastic", icon: "02", label: "늘어났다가 다시 돌아와요",     desc: "" },
      { id: "firm",    icon: "03", label: "늘어나지도 끊어지지도 않아요", desc: "" },
      { id: "unsure",  icon: "04", label: "잘 모르겠어요",               desc: "" },
    ],
  },
  // ── Q2: 마찰 테스트 — 빗질 (매듭·엉킴) + "잘 모르겠어요" (확정73) ────────────────
  {
    qKey: "q2_friction", kind: "single", no: "Q2", stepTag: "마찰 테스트",
    title: "트리트먼트 없이 샴푸만 하고\n빗질해보면?",
    hint: "큐티클이 얼마나 살아있는지 알 수 있어요",
    options: [
      { id: "tangled", icon: "01", label: "엉켜서 잘 안 풀리고 빗질이 전혀 안 돼요", desc: "빗이 걸려서 넘어가질 않는 느낌" },
      { id: "loosens", icon: "02", label: "좀 엉키지만 몇 번 빗으면 풀린다", desc: "처음엔 걸리는데 곧 부드러워짐" },
      { id: "smooth",  icon: "03", label: "잘 빗긴다",                     desc: "빗질이 걸림 없이 매끄러움" },
      { id: "unsure",  icon: "04", label: "잘 모르겠어요",                desc: "해보기 어렵거나 판단이 안 서요" },
    ],
  },
  // ── Q3: 관찰 테스트 — 자연건조 시간 (확정115: 오래 걸림=손상, 물 머금음) ──────────
  //   2026-09 시간 선택지로 교체(확정): 5분 안쪽→fast / 5~10분→normal / 10분 이상→slow.
  //   ★ id(slow/normal/fast)는 불변 — 옛 저장값·점수 로직·되읽기(drying.*) 그대로 매핑. 라벨·순서만 변경.
  {
    qKey: "q3_dry", kind: "single", no: "Q3", stepTag: "관찰 테스트",
    title: "감고 나서 다 마르는 데\n얼마나 걸리세요?",
    hint: "물을 머금는 정도로 모발 상태를 볼 수 있어요",
    options: [
      { id: "fast",   icon: "01", label: "5분 안쪽",   desc: "가늘거나 수분이 적은 편일 수 있어요" },
      { id: "normal", icon: "02", label: "5~10분",     desc: "특별히 빠르거나 느리지 않음" },
      { id: "slow",   icon: "03", label: "10분 이상",  desc: "속까지 마르는 데 시간이 많이 걸림" },
    ],
  },
  // ── Q4: 시술이력 (전용 다단계 렌더러 — 최근/그전/추가 + 하위체크) ─────────────────
  {
    qKey: "h_history", kind: "treatment_history", no: "Q4", stepTag: "시술 이력",
    title: "최근 1년, 어떤 시술을 받으셨어요?",
    hint: "받으신 걸 모두 골라주세요 (여러 개 선택 가능)",
  },
];

// ─── 시술이력(Q4) 전용 선택지 — 전용 렌더러와 damageRecommend가 함께 참조 ─────────
// id는 DamageTreatment / DamageMore와 1:1. 값은 스타일 styleGate와 정렬(통합 대비).
export const TREATMENT_OPTIONS: { id: DamageTreatment; label: string }[] = [
  { id: "bleach",        label: "탈색" },
  { id: "straight_perm", label: "매직" },
  { id: "heat_perm",     label: "열펌(세팅·디지털)" },
  { id: "normal_perm",   label: "일반펌" },
  { id: "dye",           label: "염색" },
  { id: "root_dye",      label: "뿌리염색" },
  { id: "none",          label: "없음" },
];
export const MORE_OPTIONS: { id: DamageMore; label: string }[] = [
  { id: "none", label: "없어요" },
  { id: "few",  label: "한두 번 더" },
  { id: "many", label: "꽤 여러 번" },
];
