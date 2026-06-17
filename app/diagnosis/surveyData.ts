// ============================================================================
// 동안비법 — 정밀 사전 문진 데이터 모델 (5페이지 / 전 연령 대상)
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
  /** 실사 이미지 경로 (public/ 기준). 설정 시 SVG 일러스트·이모지보다 우선 사용 */
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
// 5페이지 설문 정의
// ----------------------------------------------------------------------------

export const SURVEY: SurveyStep[] = [
  // ===== PAGE 1 : 기본 정보 & 평소 습관 =====
  {
    page: 1,
    section: "기본 정보 & 평소 습관",
    subtitle: "고객님을 이해하기 위한 첫걸음이에요.",
    questions: [
      {
        id: "q1_age",
        no: "Q1",
        title: "연령대를 선택해 주세요.",
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
      {
        id: "q4_part",
        no: "Q2",
        title: "평소 머리 넘김·가르마는 어떤가요?",
        type: "single",
        options: [
          { id: "left", label: "왼쪽 가르마" },
          { id: "right", label: "오른쪽 가르마" },
          { id: "center", label: "가운데 가르마" },
          { id: "allback", label: "가르마 없이 올백·넘김" },
          { id: "bangs_no_part", label: "앞머리가 있어서 가르마 없음" },
          { id: "undecided", label: "정해진 가르마 없음" },
        ],
      },
      {
        id: "q5_dry",
        no: "Q3",
        title: "머리 말리는 습관은 어떤가요?",
        type: "single",
        options: [
          { id: "natural", label: "자연 건조하는 편" },
          { id: "rough", label: "드라이기로 대충 말림" },
          { id: "careful", label: "드라이기로 말리고 약간의 손질 가능" },
          { id: "rarely", label: "거의 안 말리고 다님" },
        ],
      },
      {
        id: "q6_bangs",
        no: "Q4",
        title: "앞머리는 어떻게 하고 싶으세요?",
        type: "single",
        options: [
          { id: "keep_yes", label: "앞머리 있음 — 유지할래요" },
          { id: "keep_no", label: "앞머리 없음 — 유지할래요" },
          { id: "new", label: "새로 앞머리를 만들 계획이에요" },
          { id: "grow", label: "앞머리를 기를 계획이에요" },
          { id: "thinking", label: "아직 고민 중이에요" },
        ],
      },
    ],
  },

  // ===== PAGE 2 : 모발 상태 & 현재 고민 =====
  {
    page: 2,
    section: "모발 상태 & 현재 고민",
    subtitle: "정확한 처방을 위한 모발 진단이에요.",
    questions: [
      {
        id: "q3_curl",
        no: "Q5",
        title: "타고난 모발의 곱슬 정도는 어떤가요?",
        type: "single",
        options: [
          { id: "straight", label: "생머리", desc: "찰랑이는 직모" },
          { id: "semi", label: "반곱슬", desc: "살짝 휘어있음" },
          { id: "curly", label: "곱슬", desc: "전체적으로 구불거림" },
          { id: "very_curly", label: "악성곱슬", desc: "강한 곱슬·푸석함" },
        ],
      },
      {
        id: "q7_thickness",
        no: "Q6",
        title: "모발 한 올의 굵기는 어떤가요?",
        type: "single",
        options: [
          { id: "thin", label: "얇은 편", desc: "가늘고 힘이 없음" },
          { id: "normal", label: "보통" },
          { id: "thick", label: "굵은 편", desc: "힘 있고 빳빳함" },
        ],
      },
      {
        id: "q8_density",
        no: "Q7",
        title: "전체적인 모발 숱은 어떤가요?",
        type: "single",
        options: [
          { id: "low", label: "적은 편", desc: "두피가 비쳐요" },
          { id: "normal", label: "보통" },
          { id: "high", label: "많은 편", desc: "숱이 풍성해요" },
        ],
      },
      {
        id: "q9_damage",
        no: "Q8",
        title: "모발 손상도는 어느 정도인가요?",
        type: "single",
        options: [
          { id: "healthy", label: "건강모", desc: "손상 거의 없음" },
          { id: "slight", label: "약간 손상", desc: "린스·트리트먼트 안 하면 뻣뻣함" },
          { id: "damaged", label: "많이 손상", desc: "물에 젖으면 빗질이 아예 안 되고 늘어남" },
          { id: "severe", label: "심한 손상", desc: "끊어짐·갈라짐 심함" },
        ],
      },
      {
        id: "q10_history",
        no: "Q9",
        title: "최근 1년간 받은 시술 이력을 알려주세요.",
        hint: "해당하는 것을 모두 선택해 주세요. 선택 시 연간 횟수를 입력할 수 있어요.",
        type: "multi",
        options: [
          { id: "color_regular", label: "일반 염색" },
          { id: "color_root", label: "새치/뿌리 염색" },
          { id: "bleach", label: "탈색" },
          { id: "perm_regular", label: "일반 펌" },
          { id: "magic_perm", label: "매직/볼륨매직" },
          { id: "heat_perm", label: "열펌 (셋팅/디지털 등)" },
          { id: "none_history", label: "해당 사항 없음" },
        ],
      },
      {
        id: "q2_concern",
        no: "Q10",
        title: "헤어 볼륨 및 스타일 고민 중 해결하고 싶은 것을 골라주세요.",
        type: "multi",
        maxSelect: 2,
        options: [
          { id: "crown_volume", label: "정수리 볼륨 꺼짐" },
          { id: "forehead_wide", label: "넓은 이마" },
          { id: "side_volume", label: "옆두상 볼륨 꺼짐" },
          { id: "too_fluffy", label: "전체적으로 많이 떠서 가라앉히고 싶음" },
          { id: "length_change", label: "길이 변화(기르거나 자르거나) 스타일 고민" },
          { id: "none_concern", label: "해당 사항 없음" },
        ],
      },
      {
        id: "q2b_extra_concern",
        no: "Q11",
        title: "모발·두피 추가 고민이 있으신가요?",
        hint: "최대 2개까지 선택할 수 있어요.",
        type: "multi",
        maxSelect: 2,
        options: [
          { id: "tangle_damage", label: "모발 엉킴 및 손상 고민" },
          { id: "gray_root", label: "잦은 새치·뿌리 염색 고민" },
          { id: "scalp", label: "두피 고민 (열감, 각질 등)" },
          { id: "styling_hard", label: "평소 스타일 손질의 어려움" },
          { id: "none_extra", label: "해당 사항 없음" },
        ],
      },
    ],
  },

  // ===== PAGE 3 : 희망 스타일 & 디자인 선택 =====
  {
    page: 3,
    section: "희망 스타일 & 디자인 선택",
    subtitle: "마지막 단계예요. 원하는 스타일을 골라주세요.",
    questions: [
      {
        id: "q11_length",
        no: "Q12",
        title: "원하는 기장을 골라주세요.",
        hint: "최대 2개까지 선택할 수 있어요.",
        type: "multi",
        maxSelect: 2,
        options: [
          { id: "short", label: "숏" },
          { id: "short_bob", label: "숏단발", desc: "턱선 위에서 숏 사이, 숏보브 길이감" },
          { id: "bob", label: "단발", desc: "턱선 길이에서 어깨선 위 정도" },
          { id: "shoulder", label: "어깨선" },
          { id: "collarbone", label: "쇄골선" },
          { id: "chest", label: "가슴선" },
        ],
      },
      {
        id: "q12_mood",
        no: "Q13",
        title: "원하는 전체 분위기는 어떤가요?",
        type: "single",
        options: [
          { id: "elegant", label: "우아함 / 여성스러움" },
          { id: "chic", label: "시크함 / 세련됨" },
          { id: "natural", label: "자연스러움 / 내추럴 (꾸안꾸)" },
          { id: "professional", label: "단정함 / 프로페셔널" },
        ],
      },
      {
        id: "q13_design",
        no: "Q14",
        title: "선호하는 헤어 디자인을 골라주세요.",
        type: "single",
        illustrated: true,
        options: [
          {
            id: "straight",
            label: "스트레이트/생머리",
            desc: "찰랑이는 직모 라인",
            illustration: "design-straight",
            imageSrc: "/icons/style-straight.png",
          },
          {
            id: "c_curl",
            label: "C컬",
            desc: "부드럽게 말린 굵은 컬",
            imageSrc: "/icons/style-ccurl.png",
          },
          {
            id: "s_curl",
            label: "S컬",
            desc: "자연스럽게 흐르는 S라인",
            imageSrc: "/icons/style-scurl.png",
          },
          {
            id: "wave",
            label: "웨이브",
            desc: "풍성한 물결 웨이브",
            illustration: "design-wave",
            imageSrc: "/icons/style-wave.png",
          },
        ],
      },
      {
        id: "q14_layer",
        no: "Q15",
        title: "원하는 층·레이어를 골라주세요.",
        type: "single",
        illustrated: true,
        options: [
          {
            id: "none",
            label: "층 없음",
            desc: "원랭스·일자",
            illustration: "layer-none",
            imageSrc: "/icons/layer-none.jpg.png",
          },
          {
            id: "soft",
            label: "약한 레이어",
            desc: "은은한 층",
            illustration: "layer-soft",
            imageSrc: "/icons/layer-little.jpg.png",
          },
          {
            id: "rich",
            label: "풍성한 레이어",
            desc: "볼륨감 있는 층",
            illustration: "layer-rich",
            imageSrc: "/icons/layer-much.jpg.png",
          },
        ],
      },
      {
        id: "q15_volume",
        no: "Q16",
        title: "어디에 볼륨을 살리고 싶으세요?",
        hint: "최대 2개까지 선택할 수 있어요.",
        type: "multi",
        maxSelect: 2,
        options: [
          { id: "front",    label: "앞머리 볼륨",              imageSrc: "/icons/volume-front.jpg.png" },
          { id: "part",     label: "가르마 볼륨",              imageSrc: "/icons/volume-part.jpg.png" },
          { id: "top",      label: "정수리 볼륨",              imageSrc: "/icons/volume-top.jpg.png" },
          { id: "side",     label: "옆볼륨",                   imageSrc: "/icons/volume-side.jpg.png" },
          { id: "back",     label: "뒤통수 볼륨",              imageSrc: "/icons/volume-back.jpg.png" },
          { id: "add_much", label: "전체적으로 많이 추가",     desc: "풍성한 볼륨감",         imageSrc: "/icons/balance-add-much.jpg.png" },
          { id: "reduce",   label: "전체적으로 차분하게 감소", desc: "슬릭하고 차분하게",     imageSrc: "/icons/balance-reduce.jpg.png" },
          { id: "none_volume", label: "해당 없음",             imageSrc: "/icons/volume-none.jpg.png" },
        ],
        priority: {
          front: 3,
          part: 2,
          top: 1,
          side: 4,
          back: 5,
        },
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// 상태(State) 타입 & 우선순위 정렬 로직
// ----------------------------------------------------------------------------

export type Answers = Record<string, string | string[]>;

export const TOTAL_QUESTIONS = SURVEY.reduce(
  (sum, step) => sum + step.questions.length,
  0,
);

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

/** 모든 스텝은 Optional — 선택 없이도 다음으로 이동 가능 */
export function isStepComplete(_step: SurveyStep, _answers: Answers): boolean {
  return true;
}
