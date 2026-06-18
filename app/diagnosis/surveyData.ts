// ============================================================================
// 어뷰티 — 린(Lean) 설문 v2  |  2-Step × 4문항 = 총 8문항
// 기존 키값 유지 (DB/추천 엔진 호환)
// ============================================================================

export type IllustrationKey =
  | "design-straight"
  | "design-curl"
  | "design-wave"
  | "layer-none"
  | "layer-soft"
  | "layer-rich"
  | "layer-face"
  | "volume-top"
  | "volume-all"
  | "volume-front"
  | "volume-back";

export interface Option {
  id: string;
  label: string;
  desc?: string;
  illustration?: IllustrationKey;
  imageSrc?: string;
}

export interface Question {
  id: string;
  no: string;
  title: string;
  hint?: string;
  type: "single" | "multi";
  illustrated?: boolean;
  options: Option[];
  priority?: Record<string, number>;
  maxSelect?: number;
}

export interface SurveyStep {
  page: number;
  section: string;
  subtitle: string;
  questions: Question[];
}

// ----------------------------------------------------------------------------
// STEP 1: 스타일 결정 (4문항)
// STEP 2: 모질 파악   (4문항)
// ----------------------------------------------------------------------------

export const SURVEY: SurveyStep[] = [
  // ===== STEP 1: 스타일 결정 =====
  {
    page: 1,
    section: "스타일 결정",
    subtitle: "원하는 헤어 스타일을 골라주세요.",
    questions: [
      // Q1 — 연령대
      {
        id: "q1_age",
        no: "Q1",
        title: "연령대를 알려주세요.",
        type: "single",
        options: [
          { id: "10s", label: "10대" },
          { id: "20s", label: "20대" },
          { id: "30s", label: "30대" },
          { id: "40s", label: "40대" },
          { id: "50s", label: "50대" },
          { id: "60s", label: "60대 이상" },
        ],
      },
      // Q2 — 기장 (단일선택으로 변경)
      {
        id: "q11_length",
        no: "Q2",
        title: "원하는 기장을 골라주세요.",
        type: "single",
        options: [
          { id: "short",     label: "숏",       desc: "귀 위까지" },
          { id: "bob",       label: "단발",      desc: "턱선~어깨 위" },
          { id: "shoulder",  label: "어깨선",    desc: "어깨에 닿는 기장" },
          { id: "collarbone",label: "쇄골선",    desc: "쇄골을 덮는 기장" },
          { id: "chest",     label: "가슴선 이하", desc: "롱 헤어" },
        ],
      },
      // Q3 — 레이어드 (이미지 카드)
      {
        id: "q14_layer",
        no: "Q3",
        title: "레이어드(층)를 넣을까요?",
        type: "single",
        illustrated: true,
        options: [
          {
            id: "none",
            label: "층 없음",
            desc: "원랭스·일자",
            imageSrc: "/icons/layer-none.jpg.png",
          },
          {
            id: "soft",
            label: "약한 레이어",
            desc: "은은한 층",
            imageSrc: "/icons/layer-little.jpg.png",
          },
          {
            id: "rich",
            label: "풍성한 레이어",
            desc: "볼륨감 있는 층",
            imageSrc: "/icons/layer-much.jpg.png",
          },
        ],
      },
      // Q4 — 웨이브/컬 디자인 (이미지 카드)
      {
        id: "q13_design",
        no: "Q4",
        title: "웨이브·컬은 어떻게 하고 싶으세요?",
        type: "single",
        illustrated: true,
        options: [
          {
            id: "straight",
            label: "생머리",
            desc: "찰랑이는 직모",
            imageSrc: "/icons/style-straight.png",
          },
          {
            id: "c_curl",
            label: "C컬",
            desc: "굵게 말린 컬",
            imageSrc: "/icons/style-ccurl.png",
          },
          {
            id: "s_curl",
            label: "S컬",
            desc: "자연스러운 S라인",
            imageSrc: "/icons/style-scurl.png",
          },
          {
            id: "wave",
            label: "웨이브",
            desc: "풍성한 물결",
            imageSrc: "/icons/style-wave.png",
          },
        ],
      },
    ],
  },

  // ===== STEP 2: 모질 파악 =====
  {
    page: 2,
    section: "모질 파악",
    subtitle: "맞춤 제품 추천을 위한 모발 상태예요.",
    questions: [
      // Q5 — 곱슬 정도
      {
        id: "q3_curl",
        no: "Q5",
        title: "타고난 곱슬 정도는 어떤가요?",
        type: "single",
        options: [
          { id: "straight",   label: "생머리",    desc: "찰랑이는 직모" },
          { id: "semi",       label: "반곱슬",    desc: "살짝 휘어있음" },
          { id: "curly",      label: "곱슬",      desc: "구불구불함" },
          { id: "very_curly", label: "악성 곱슬", desc: "강한 곱슬·푸석함" },
        ],
      },
      // Q6 — 숱
      {
        id: "q8_density",
        no: "Q6",
        title: "머리 숱은 어떤 편인가요?",
        type: "single",
        options: [
          { id: "low",    label: "적은 편",   desc: "두피가 비쳐요" },
          { id: "normal", label: "보통이에요" },
          { id: "high",   label: "많은 편",   desc: "숱이 풍성해요" },
        ],
      },
      // Q7 — 굵기
      {
        id: "q7_thickness",
        no: "Q7",
        title: "모발 한 올의 굵기는요?",
        type: "single",
        options: [
          { id: "thin",   label: "얇은 편", desc: "가늘고 힘이 없어요" },
          { id: "normal", label: "보통이에요" },
          { id: "thick",  label: "굵은 편", desc: "힘 있고 빳빳해요" },
        ],
      },
      // Q8 — 손상도 + 시술이력 통합
      {
        id: "q9_damage",
        no: "Q8",
        title: "현재 모발 상태는 어떤가요?",
        hint: "최근 시술 이력을 포함해 가장 가까운 것을 선택해 주세요.",
        type: "single",
        options: [
          { id: "healthy", label: "건강해요",    desc: "시술 이력 거의 없음" },
          { id: "slight",  label: "살짝 손상",   desc: "염색·펌 경험 있음" },
          { id: "damaged", label: "꽤 손상됐어요", desc: "잦은 시술 또는 탈색 경험" },
          { id: "severe",  label: "심하게 손상", desc: "끊어짐·갈라짐이 심함" },
        ],
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// 타입 & 헬퍼 — 추천 엔진과의 호환성 유지
// ----------------------------------------------------------------------------

export type Answers = Record<string, string | string[]>;

export const TOTAL_QUESTIONS = SURVEY.reduce(
  (sum, step) => sum + step.questions.length,
  0,
); // = 8

export const QUESTION_MAP: Record<string, Question> = SURVEY.reduce(
  (acc, step) => {
    step.questions.forEach((q) => (acc[q.id] = q));
    return acc;
  },
  {} as Record<string, Question>,
);

export function prioritize(questionId: string, selected: string[]): string[] {
  const priority = QUESTION_MAP[questionId]?.priority;
  if (!priority) return selected;
  return [...selected].sort((a, b) => {
    const ra = priority[a] ?? Number.MAX_SAFE_INTEGER;
    const rb = priority[b] ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}

export function rankedSelections(
  questionId: string,
  selected: string[],
): { rank: number; id: string; label: string }[] {
  const q = QUESTION_MAP[questionId];
  const ordered = prioritize(questionId, selected);
  return ordered.map((id, idx) => ({
    rank: idx + 1,
    id,
    label: q?.options.find((o) => o.id === id)?.label ?? id,
  }));
}

export function isStepComplete(_step: SurveyStep, _answers: Answers): boolean {
  return true;
}
