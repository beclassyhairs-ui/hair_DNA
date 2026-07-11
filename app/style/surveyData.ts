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
          { id: "short",      label: "숏",         desc: "귀 위로 올라오는 길이" },
          { id: "short_bob",  label: "숏단발",     desc: "귀 아래~턱 선" },
          { id: "bob",        label: "단발 (턱선)", desc: "턱선 길이" },
          { id: "shoulder",   label: "어깨선 길이", desc: "어깨에 닿는 길이" },
          { id: "collarbone", label: "쇄골선 길이", desc: "쇄골 라인" },
          { id: "chest",      label: "가슴 길이",   desc: "가슴에 닿는 길이" },
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
          { id: "straight_hair", label: "직모",    desc: "곱슬기 없이 매끈한 편" },
          { id: "wavy_hair",     label: "반곱슬",  desc: "습하면 약간 부스스해지는 편" },
          { id: "curly_hair",    label: "악성곱슬", desc: "뻣뻣하거나 곱슬이 강한 편" },
        ],
      },
      {
        id:    "q10_history_count",
        no:    "Q8",
        title: "1년에 헤어 시술을 몇 번 받으세요?",
        hint:  "펌, 염색, 탈색 등 전체 시술 횟수",
        options: [
          { id: "count_1_2",   label: "1~2회",    desc: "전체 펌·염색 위주" },
          { id: "count_3_4",   label: "3~4회",    desc: "주기적인 전체 시술" },
          { id: "count_5_6",   label: "5~6회",    desc: "잦은 스타일 체인지" },
          { id: "count_7plus", label: "7회 이상", desc: "⚠️ 잦은 새치·뿌리 염색" },
        ],
      },
    ],
  },
];

export const ALL_STYLE_QUESTIONS: StyleQuestion[] = STYLE_SURVEY.flatMap(
  (s) => s.questions,
);
export const STYLE_TOTAL = ALL_STYLE_QUESTIONS.length; // 8

// ─── 기장(Q2) id → 한글 라벨, 단일 진실 공급원(SSOT) ─────────────────────────
// styleReference.ts(폴더 매칭)·recommend.ts(스타일명)·result/page.tsx·my-diary가
// 전부 이 맵을 가져다 쓴다. 위 options 배열 하나만 고치면 전체가 자동으로 동기화된다
// — id/label이 여러 파일에 따로 하드코딩되어 서로 어긋나는 문제를 원천 차단.
const LENGTH_QUESTION = ALL_STYLE_QUESTIONS.find((q) => q.id === "q11_length");
export const LENGTH_LABEL_MAP: Record<string, string> = Object.fromEntries(
  (LENGTH_QUESTION?.options ?? []).map((o) => [o.id, o.label]),
);
