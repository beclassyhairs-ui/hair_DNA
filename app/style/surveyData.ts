// ============================================================================
// 어뷰티 스타일 서비스 — 4×4 마이크로 설문 데이터
// STEP 1: 희망 스타일 결정 (4문항)
// STEP 2: 모질 및 시술 상태 파악 (4문항)
// ============================================================================

export type StyleAnswers = Record<string, string>;

export interface StyleOption {
  id:    string;
  label: string;
  desc?: string;
}

export interface StyleQuestion {
  id:      string;
  no:      string;
  title:   string;
  hint?:   string;
  options: StyleOption[];
  // "single"(기본, 단일선택 자동넘김) | "treatment_history"(시술이력 전용 다단계 렌더러, A-1②)
  kind?:   "single" | "treatment_history";
}

export interface StyleStep {
  label:     string;
  questions: StyleQuestion[];
}

export const STYLE_SURVEY: StyleStep[] = [
  {
    label: "STEP 1 · 희망 스타일",
    questions: [
      {
        id:    "q1_age",
        no:    "Q1",
        title: "연령대를 선택해 주세요",
        hint:  "나이대에 맞는 최적의 스타일을 추천해 드려요",
        options: [
          { id: "age_20", label: "20대" },
          { id: "age_30", label: "30대" },
          { id: "age_40", label: "40대" },
          { id: "age_50", label: "50대" },
          { id: "age_60plus", label: "60대 이상" },
        ],
      },
      {
        id:    "q11_length",
        no:    "Q2",
        title: "원하는 머리 기장을 골라주세요",
        options: [
          { id: "short",      label: "숏",   desc: "귀 위로 올라오는 길이" },
          { id: "short_bob",  label: "숏보브", desc: "귀 아래~턱 선" },
          { id: "bob",        label: "단발", desc: "턱선 길이" },
          { id: "collarbone", label: "쇄골", desc: "쇄골 라인" },
          { id: "chest",      label: "롱",   desc: "가슴에 닿는 길이" },
        ],
      },
      {
        id:    "q14_layer",
        no:    "Q3",
        title: "레이어드 정도를 선택해 주세요",
        hint:  "층을 얼마나 넣을지 결정해요",
        options: [
          { id: "heavy", label: "무거움 (일자)",  desc: "층 없이 무게감 있는 스타일" },
          { id: "medium", label: "중간 (소프트)", desc: "자연스럽게 가벼운 레이어" },
          { id: "light",  label: "가벼움 (허쉬)", desc: "허쉬컷처럼 각도 있는 레이어" },
        ],
      },
      {
        id:    "q13_design",
        no:    "Q4",
        title: "원하는 웨이브를 골라주세요",
        options: [
          { id: "straight", label: "생머리",  desc: "자연스럽고 깔끔한 직모" },
          { id: "c_curl",   label: "C컬",    desc: "부드럽게 안으로 말리는 컬" },
          { id: "s_curl",   label: "S컬",    desc: "S자로 흐르는 자연 웨이브" },
          { id: "wave",     label: "웨이브",  desc: "굵고 풍성한 웨이브" },
        ],
      },
    ],
  },
  {
    label: "STEP 2 · 모질 파악",
    questions: [
      {
        id:    "q8_density",
        no:    "Q5",
        title: "모발 숱은 어느 정도인가요?",
        options: [
          { id: "thick_density", label: "많음",  desc: "숱이 많아 볼륨감 있는 편" },
          { id: "medium_density", label: "보통", desc: "평균적인 숱" },
          { id: "thin_density",   label: "적음",  desc: "숱이 적어 볼륨이 부족한 편" },
        ],
      },
      {
        id:    "q7_thickness",
        no:    "Q6",
        title: "모발 굵기는 어떤가요?",
        options: [
          { id: "coarse",  label: "두꺼움",  desc: "모발이 굵고 강한 편" },
          { id: "medium_thickness", label: "보통", desc: "일반적인 굵기" },
          { id: "fine",    label: "얇음",   desc: "모발이 가늘고 약한 편" },
        ],
      },
      {
        id:    "q3_curl",
        no:    "Q7",
        title: "곱슬기가 있나요?",
        options: [
          // 판별 멘트 확정(지시서 A-1① · 확정 115·134). curly_hair_mid는 신설(곱슬·중간).
          { id: "straight_hair",  label: "직모",    desc: "곱슬기 없이 매끈한 편" },
          { id: "wavy_hair",      label: "반곱슬",  desc: "평소엔 괜찮은데 비 오는 날·습한 날 부스스해져요" },
          { id: "curly_hair_mid", label: "곱슬",    desc: "말리면 곱슬기가 올라와서, 펴는 기구 없이는 못 나가요" },
          { id: "curly_hair",     label: "악성곱슬", desc: "누가 봐도 곱슬, 어릴 때부터요" },
        ],
      },
      {
        // A-1②: 구 q10_history_count(횟수 단일선택) 폐기 → 시술이력 다단계 문항으로 교체.
        // 저장 키: q8a_recent/q8b_prev/q8c_more/q8_bleach_2plus/q8_root_gray (styleGate가 소비).
        // 화면은 "1문항 UX"로 묶어 전용 렌더러(TreatmentHistoryStep)가 처리 → 8문항 감각 유지.
        id:    "q8_treatment_history",
        no:    "Q8",
        kind:  "treatment_history",
        title: "최근 1년, 어떤 시술을 받으셨어요?",
        hint:  "가장 최근에 한 것부터 순서대로 알려주세요",
        options: [],
      },
    ],
  },
];

export const ALL_STYLE_QUESTIONS: StyleQuestion[] = STYLE_SURVEY.flatMap(
  (s) => s.questions,
);
export const STYLE_TOTAL = ALL_STYLE_QUESTIONS.length; // 8

// ─── 시술이력(Q8) 전용 선택지 (A-1②) ─────────────────────────────────────────
// 전용 렌더러(survey/TreatmentHistoryStep)와 styleGate.ts가 함께 참조하는 단일 출처.
// id는 styleGate.constants의 TreatmentId / MoreLevel과 1:1로 일치시킨다.
export const TREATMENT_OPTIONS: StyleOption[] = [
  { id: "bleach",        label: "탈색" },
  { id: "straight_perm", label: "매직" },
  { id: "heat_perm",     label: "열펌(세팅·디지털)" },
  { id: "normal_perm",   label: "일반펌" },
  { id: "dye",           label: "염색" },
  { id: "root_dye",      label: "뿌리염색" },
  { id: "none",          label: "없음" },
];
export const MORE_OPTIONS: StyleOption[] = [
  { id: "none", label: "없어요" },
  { id: "few",  label: "한두 번 더" },
  { id: "many", label: "꽤 여러 번" },
];

// ─── 기장(Q2) id → 한글 라벨, 단일 진실 공급원(SSOT) ─────────────────────────
// styleReference.ts(폴더 매칭)·recommend.ts(스타일명)·result/page.tsx·my-diary가
// 전부 이 맵을 가져다 쓴다. 위 options 배열 하나만 고치면 전체가 자동으로 동기화된다
// — id/label이 여러 파일에 따로 하드코딩되어 서로 어긋나는 문제를 원천 차단.
const LENGTH_QUESTION = ALL_STYLE_QUESTIONS.find((q) => q.id === "q11_length");
export const LENGTH_LABEL_MAP: Record<string, string> = Object.fromEntries(
  (LENGTH_QUESTION?.options ?? []).map((o) => [o.id, o.label]),
);
// shoulder(2026-07 새 설문 화면에서 제거된 구 옵션) — 과거 저장된 다이어리/세션 값을
// 위해 collarbone과 동일 라벨로 별칭만 유지한다. 새 설문에는 절대 노출되지 않는다.
LENGTH_LABEL_MAP.shoulder = LENGTH_LABEL_MAP.collarbone ?? "쇄골";

// ─── 기장 id → "짧은 기장(레이어드 질문 숨김 + s_curl 제외)" 판별 ─────────────
// survey/page.tsx(화면 필터)와 recommend.ts(정규화)가 함께 참조하는 단일 기준.
export function isShortLength(id?: string): boolean {
  return id === "short" || id === "short_bob";
}
