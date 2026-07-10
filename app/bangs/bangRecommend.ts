// ============================================================================
// 어뷰티 인생뱅 — 점수 기반 추천 엔진 (v2)
//
// v1(하드게이트+override 캐스케이드, 단일 결과)의 문제를 해결하기 위해 재설계:
//  1) 얼굴형(FaceShape)과 앞머리(BangStyle)를 각각 독립적인 "점수" 축으로 계산한다.
//  2) Q1(자가선택 얼굴형)에 기본 가산점을 주고, Q3~Q5의 답변을 보정 신호(가중치
//     델타)로 더해서 최종 얼굴형을 정한다 — 신호가 강할 때만 자가선택을 뒤집는다.
//  3) bangStyle도 "얼굴형별 기본 적합도 + 답변 보정 델타" 합산 점수로 계산해
//     1위(primary)·2위(secondary)를 함께 제시한다. 점수 차가 크면 어색한 2위 대신
//     미리 정의한 "자연스러운 짝"으로 secondary를 보정한다.
//  4) Q2(현재 스타일)는 점수에 관여하지 않고 결과지 설명력(현재 스타일 체크)에만 쓴다.
//  5) Q6(모질)도 점수에 관여하지 않고 /home 연동용 태그로만 저장한다.
// ============================================================================

import type {
  BangsSurveyAnswers,
  Q1CurrentStyle,
  Q2ForeheadConcern,
  Q3MidfaceConcern,
  Q4JawConcern,
  Q5HairTexture,
} from "./surveyData";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type FaceShapeKey =
  | "oval" | "round" | "oblong" | "square"
  | "heart" | "diamond" | "hexagon" | "peanut";

export type BangType =
  | "see_through"  // 시스루뱅
  | "curtain"      // 커튼뱅
  | "side_swept"   // 사이드 스웹 뱅
  | "long_side"    // 롱 사이드뱅
  | "wisp"         // 가닥뱅
  | "soft_full"    // 소프트 풀뱅
  | "inner"        // 이너뱅
  | "hippy"        // 히피뱅
  | "block";       // 블록뱅

export type FaceMatchStatus = "matched" | "partial" | "adjusted";

export const BANG_LABELS: Record<BangType, string> = {
  see_through: "시스루뱅",
  curtain:     "커튼뱅",
  side_swept:  "사이드 스웹 뱅",
  long_side:   "롱 사이드뱅",
  wisp:        "가닥뱅",
  soft_full:   "소프트 풀뱅",
  inner:       "이너뱅",
  hippy:       "히피뱅",
  block:       "블록뱅",
};

// ─── Q1 설문에 실제로 있는 얼굴형만 후보로 사용 ────────────────────────────────
// (다이아몬드·육각형은 설문 선택지에 없어 자가선택으로도, 보정으로도 절대 나오지
// 않는다 — 이전엔 타입에만 존재하고 입력경로가 없는 "도달 불가 얼굴형"이었음)

export const SELECTABLE_FACE_SHAPES: FaceShapeKey[] = [
  "oval", "round", "square", "oblong", "heart", "peanut",
];

// bangRecommend v1에서 실제로 도달 가능했던 5종만 점수 후보로 사용
export type SelectableBangType = "see_through" | "curtain" | "side_swept" | "long_side" | "soft_full";
export const SELECTABLE_BANG_TYPES: SelectableBangType[] = [
  "see_through", "curtain", "side_swept", "long_side", "soft_full",
];

// ─── 8대 얼굴형 기본 정보 ─────────────────────────────────────────────────────

export interface FaceShapeInfo {
  title: string;
  summary: string;
}

export const FACE_SHAPE_INFO: Record<FaceShapeKey, FaceShapeInfo> = {
  oval: {
    title: "황금비율 계란형",
    summary: "어떤 앞머리도 완벽하게 소화하는 이상적인 얼굴형이에요. 선택의 폭이 넓어 트렌디한 개성을 마음껏 표현할 수 있어요.",
  },
  round: {
    title: "부드러운 동안 둥근형",
    summary: "'동안'의 정석! 귀엽고 사랑스러운 매력을 가졌어요. 앞머리 선택 하나로 갸름함이 크게 달라지는 얼굴형이에요.",
  },
  oblong: {
    title: "지적이고 세련된 긴형",
    summary: "지적이고 세련된 분위기를 자아내는 얼굴형이에요. 앞머리 하나로 이상적인 황금비율이 완성되는 잠재력이 있어요.",
  },
  square: {
    title: "매력적인 입체감 각진형",
    summary: "신뢰감과 카리스마를 주는 글로벌 트렌드 골격이에요. 커튼뱅 하나로 인상이 완전히 달라지는 가장 극적인 변신이 가능해요.",
  },
  heart: {
    title: "날렵한 V라인 하트형",
    summary: "도회적이고 트렌디한 요정 같은 분위기를 가진 얼굴형이에요. 커튼뱅 하나만으로 완벽한 균형미가 완성됩니다.",
  },
  diamond: {
    title: "엣지 넘치는 다이아몬드형",
    summary: "입체감이 살아있는 개성 넘치는 얼굴형이에요. 앞머리 디자인으로 강한 인상을 세련된 매력으로 전환할 수 있어요.",
  },
  hexagon: {
    title: "고혹적인 카리스마 육각형",
    summary: "압도적인 카리스마와 귀족적인 분위기를 가진 얼굴형이에요. 앞머리로 강한 인상에 부드러운 공기감을 더하면 완벽해요.",
  },
  peanut: {
    title: "오묘한 매력의 유니크 땅콩형",
    summary: "한국 여성에게 특화된 오묘한 매력의 얼굴형이에요. 사이드뱅 하나로 완벽한 계란형으로 보정되는 놀라운 변신이 기다려요.",
  },
};

// 저장 태그(hairTags)용 짧은 얼굴형 라벨 — surveyData.ts Q1 옵션의 label과 동일한 표기
export const FACE_SHAPE_SHORT_LABEL: Record<FaceShapeKey, string> = {
  oval: "계란형", round: "둥근형", square: "각진형", oblong: "긴 얼굴형",
  heart: "역삼각형/하트형", peanut: "땅콩형",
  diamond: "다이아몬드형", hexagon: "육각형",
};

// 처방된 bang에 대응하는 NG 스타일 (피해야 할 앞머리)
const NG_STYLES: Record<BangType, string> = {
  see_through: "무겁고 빽빽한 일자 풀뱅·블록뱅",
  curtain:     "이마를 완전히 드러내는 올백·5:5 가운데 가르마 스타일",
  side_swept:  "이마를 꽉 덮는 무거운 일자 풀뱅",
  long_side:   "짧고 무거운 일자 뱅·블록뱅",
  wisp:        "빽빽하고 무거운 일자 풀뱅·블록뱅",
  soft_full:   "너무 짧은 미니뱅·가벼운 시스루뱅",
  inner:       "이마 전체를 덮는 무거운 일자 뱅",
  hippy:       "빽빽하고 무거운 일자 뱅·블록뱅",
  block:       "가볍고 얇은 시스루뱅·가닥뱅",
};

// 각 bang의 핵심 효과 한 줄 — 얼굴형과 조합해 이유 문구를 만드는 재료
const BANG_CORE_REASON: Record<BangType, string> = {
  see_through: "이마를 가볍게 드러내면서도 세로 시선을 살려주는 스타일이에요",
  curtain:     "양옆으로 자연스럽게 갈라지는 결이 얼굴 옆선을 부드럽게 감싸줘요",
  side_swept:  "한쪽으로 흐르는 라인이 얼굴 옆면을 자연스럽게 커버해줘요",
  long_side:   "길게 흘러내리는 라인이 얼굴 옆면을 슬림하게 보정해줘요",
  soft_full:   "이마를 폭넓게 덮어 세로 길이를 확실하게 줄여주는 스타일이에요",
  wisp:        "가볍게 떨어지는 가닥이 산뜻한 느낌을 더해줘요",
  inner:       "안쪽으로 자연스럽게 말리며 볼륨을 살려줘요",
  hippy:       "자유분방하게 흐르는 결이 개성 있는 무드를 더해줘요",
  block:       "일자로 딱 떨어지는 라인이 또렷한 인상을 만들어줘요",
};

// secondary가 primary와 점수 차가 클 때 대신 꺼내오는 "자연스러운 짝"
const COMPLEMENTARY_BANG: Record<SelectableBangType, SelectableBangType> = {
  see_through: "curtain",
  curtain:     "see_through",
  side_swept:  "long_side",
  long_side:   "side_swept",
  soft_full:   "curtain",
};

// ─── 얼굴형 점수 ──────────────────────────────────────────────────────────────

const Q1_SELF_BONUS = 4; // 자가선택 얼굴형 기본 가산점 — 단일 보정 신호(최대 3점)로는 못 뒤집도록

type FaceSignalMap = Partial<Record<FaceShapeKey, number>>;

const FOREHEAD_FACE_SIGNAL: Partial<Record<Q2ForeheadConcern | "", FaceSignalMap>> = {
  wide_forehead: { heart: 2, square: 2 }, // 넓은 이마 → 하트형/역삼각형, 각진형 신호
};
const MIDFACE_FACE_SIGNAL: Partial<Record<Q3MidfaceConcern | "", FaceSignalMap>> = {
  cheekbone: { peanut: 3 }, // 옆광대 도드라짐 → 땅콩형 신호
  long_mid:  { oblong: 3 }, // 긴 중안부 → 긴형 신호
};
const JAW_FACE_SIGNAL: Partial<Record<Q4JawConcern | "", FaceSignalMap>> = {
  round_jaw:   { round: 3 },
  angular_jaw: { square: 3 },
  pointed_jaw: { heart: 3 }, // V라인/좁은 턱끝 → 하트형 신호
};

function zeroFaceScores(): Record<FaceShapeKey, number> {
  return { oval: 0, round: 0, square: 0, oblong: 0, heart: 0, peanut: 0, diamond: 0, hexagon: 0 };
}

function addFaceSignal(scores: Record<FaceShapeKey, number>, signal: FaceSignalMap | undefined) {
  if (!signal) return;
  for (const key of Object.keys(signal) as FaceShapeKey[]) {
    scores[key] += signal[key] ?? 0;
  }
}

function collectFaceSignals(answers: BangsSurveyAnswers): Record<FaceShapeKey, number> {
  const scores = zeroFaceScores();
  addFaceSignal(scores, FOREHEAD_FACE_SIGNAL[answers.q2]);
  addFaceSignal(scores, MIDFACE_FACE_SIGNAL[answers.q3]);
  addFaceSignal(scores, JAW_FACE_SIGNAL[answers.q4]);
  return scores;
}

function argMaxFaceShape(scores: Record<FaceShapeKey, number>, preferred?: FaceShapeKey): FaceShapeKey {
  let best = SELECTABLE_FACE_SHAPES[0];
  let bestScore = -Infinity;
  for (const key of SELECTABLE_FACE_SHAPES) {
    const s = scores[key];
    if (s > bestScore || (s === bestScore && key === preferred)) {
      best = key;
      bestScore = s;
    }
  }
  return best;
}

interface FaceInference {
  selectedFaceShape: FaceShapeKey;
  inferredFaceShape: FaceShapeKey; // 답변 신호만으로 봤을 때의 얼굴형 (신호 없으면 자가선택과 동일)
  finalFaceShape: FaceShapeKey;    // 자가선택 가산점까지 포함한 최종 확정 얼굴형
  faceMatchStatus: FaceMatchStatus;
}

function inferFaceShape(answers: BangsSurveyAnswers): FaceInference {
  const selected = (answers.qFaceShape && SELECTABLE_FACE_SHAPES.includes(answers.qFaceShape))
    ? answers.qFaceShape
    : "oval";

  const signalScores = collectFaceSignals(answers);
  const hasSignal = SELECTABLE_FACE_SHAPES.some((k) => signalScores[k] > 0);
  const inferredFaceShape = hasSignal ? argMaxFaceShape(signalScores, selected) : selected;

  const fullScores = { ...signalScores };
  fullScores[selected] += Q1_SELF_BONUS;
  const finalFaceShape = argMaxFaceShape(fullScores, selected);

  let faceMatchStatus: FaceMatchStatus;
  if (inferredFaceShape === selected) faceMatchStatus = "matched";
  else if (finalFaceShape === selected) faceMatchStatus = "partial";
  else faceMatchStatus = "adjusted";

  return { selectedFaceShape: selected, inferredFaceShape, finalFaceShape, faceMatchStatus };
}

// ─── bangStyle 점수 ───────────────────────────────────────────────────────────

type BangSignalMap = Partial<Record<BangType, number>>;

// 얼굴형별 기본 적합도 — 예전 v1의 "얼굴형→bang 1개 확정" 맵을 점수 테이블로 확장
const FACE_BANG_AFFINITY: Record<FaceShapeKey, BangSignalMap> = {
  oval:    { see_through: 3, curtain: 2, side_swept: 2, long_side: 1, soft_full: 1 },
  round:   { see_through: 3, side_swept: 2, curtain: 1, long_side: 1, soft_full: 0 },
  square:  { curtain: 3, long_side: 2, see_through: 2, side_swept: 1, soft_full: 0 },
  oblong:  { soft_full: 3, curtain: 2, see_through: 2, side_swept: 1, long_side: 1 },
  heart:   { curtain: 3, side_swept: 2, see_through: 2, long_side: 1, soft_full: 0 },
  peanut:  { side_swept: 3, long_side: 2, curtain: 1, see_through: 1, soft_full: 0 },
  diamond: {},
  hexagon: {},
};

const FOREHEAD_BANG_SIGNAL: Partial<Record<Q2ForeheadConcern | "", BangSignalMap>> = {
  narrow_brow:   { side_swept: 3 },                              // 좁은 이마 → 사이드 계열 적합도 강화
  wide_forehead: { see_through: 2, curtain: 2, soft_full: 1 },    // 넓은 이마 → 이마를 채워주는 계열
};
const MIDFACE_BANG_SIGNAL: Partial<Record<Q3MidfaceConcern | "", BangSignalMap>> = {
  cheekbone: { long_side: 3, side_swept: 2 },  // 옆광대 커버
  long_mid:  { see_through: 2, curtain: 2 },   // 세로 시선 차단
};
const JAW_BANG_SIGNAL: Partial<Record<Q4JawConcern | "", BangSignalMap>> = {
  round_jaw:   { see_through: 2, side_swept: 1, soft_full: -2, curtain: -1 }, // 세로 효과 유지, 가로폭 강조 스타일 감점
  angular_jaw: { curtain: 2, long_side: 2, see_through: 1 },                  // 각진 턱선 완화
  pointed_jaw: { curtain: 2, long_side: 1 },                                  // 좁은 턱끝을 부드럽게 감싸는 계열
};

function zeroBangScores(): Record<BangType, number> {
  return {
    see_through: 0, curtain: 0, side_swept: 0, long_side: 0, soft_full: 0,
    wisp: 0, inner: 0, hippy: 0, block: 0,
  };
}

function addBangSignal(scores: Record<BangType, number>, signal: BangSignalMap | undefined) {
  if (!signal) return;
  for (const key of Object.keys(signal) as BangType[]) {
    scores[key] += signal[key] ?? 0;
  }
}

function calcBangScores(finalFace: FaceShapeKey, answers: BangsSurveyAnswers): Record<BangType, number> {
  const scores = zeroBangScores();
  addBangSignal(scores, FACE_BANG_AFFINITY[finalFace]);
  addBangSignal(scores, FOREHEAD_BANG_SIGNAL[answers.q2]);
  addBangSignal(scores, MIDFACE_BANG_SIGNAL[answers.q3]);
  addBangSignal(scores, JAW_BANG_SIGNAL[answers.q4]);
  return scores;
}

interface BangPick {
  primary: BangType;
  secondary: BangType;
}

const SECONDARY_GAP_THRESHOLD = 3; // 1위-2위 점수차가 이보다 크면 자연스러운 짝으로 대체

function pickPrimarySecondary(scores: Record<BangType, number>): BangPick {
  const ranked = [...SELECTABLE_BANG_TYPES].sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0];
  const naturalSecond = ranked[1];
  const gap = scores[primary] - scores[naturalSecond];

  const secondary = gap <= SECONDARY_GAP_THRESHOLD
    ? naturalSecond
    : COMPLEMENTARY_BANG[primary];

  return { primary, secondary };
}

// ─── 결과 문구 ────────────────────────────────────────────────────────────────

function buildFaceAnalysisText(
  selected: FaceShapeKey, final: FaceShapeKey, status: FaceMatchStatus,
): string {
  const selectedTitle = FACE_SHAPE_INFO[selected].title;
  const finalTitle    = FACE_SHAPE_INFO[final].title;

  if (status === "matched")
    return `지금 선택하신 "${selectedTitle}"과 답변 신호가 잘 맞아요.`;
  if (status === "partial")
    return `"${selectedTitle}"을 기준으로 분석했어요. 답변에서 다른 신호도 조금 보였지만 크게 벗어나지 않아 그대로 반영했어요.`;
  return `"${selectedTitle}"을 선택하셨지만, 답변에서 ${finalTitle} 특징이 더 강하게 나타나서 이를 반영해 보정했어요.`;
}

function buildPrimaryReason(finalFace: FaceShapeKey, primary: BangType): string {
  const faceTitle = FACE_SHAPE_INFO[finalFace].title;
  return `${faceTitle}에는 ${BANG_LABELS[primary]}이 가장 잘 맞아요. ${BANG_CORE_REASON[primary]}.`;
}

function buildSecondaryReason(primary: BangType, secondary: BangType): string {
  return `${BANG_LABELS[secondary]}도 함께 고려해보세요. ${BANG_CORE_REASON[secondary]}. ${BANG_LABELS[primary]}과 분위기를 바꿔보고 싶을 때 시도하기 좋아요.`;
}

// ─── 블록: Q2 현재 스타일 팩트체크 (결과지 "현재 스타일 체크" 섹션용) ─────────

const Q1_LABELS: Record<Q1CurrentStyle, string> = {
  side_part:   "옆가르마",
  center_part: "가운데 가르마 (5:5)",
  allback:     "앞머리 없음 (올백)",
  has_bangs:   "앞머리 있음",
};

const CENTER_PART_TEXT: Record<FaceShapeKey, string> = {
  square:  "각진형에 5:5 가르마는 턱의 각을 그대로 드러내요. 무거운 일자 앞머리는 피해주세요.",
  round:   "둥근형에 5:5 가르마는 가로 폭을 더 넓어 보이게 해요. 사선 가르마나 시스루뱅으로 바꿔보세요.",
  heart:   "하트형에 넓은 이마를 드러내면 얼굴 상부가 더 강조돼요. 커튼뱅이나 사이드 계열이 필요해요.",
  oblong:  "긴 얼굴에 이마를 드러내면 세로 길이가 더 강조돼요. 소프트 풀뱅으로 이마를 살짝 덮어보세요.",
  diamond: "이마를 드러내면 광대의 강한 인상이 더 강조될 수 있어요.",
  hexagon: "가운데 가르마는 골격을 선명하게 부각해요. 부드러운 계열로 변화를 줘보세요.",
  peanut:  "땅콩형에 5:5 가르마는 얼굴 굴곡을 그대로 드러내요. 사이드뱅으로 커버해보세요.",
  oval:    "계란형에 가운데 가르마는 깔끔하지만 살짝 단조로워요. 가닥뱅으로 생기를 더해보세요.",
};
const ALLBACK_TEXT: Record<FaceShapeKey, string> = {
  round:   "둥근형에 올백은 얼굴이 더 커 보일 수 있어요. 시스루뱅이나 사이드뱅으로 옆선을 감싸보세요.",
  square:  "각진형에 올백은 강한 인상을 더 부각해요. 커튼뱅으로 부드럽게 변화를 줘보세요.",
  oblong:  "긴 얼굴에 올백은 세로 길이를 더 강조해요. 소프트 풀뱅으로 비율을 보정해보세요.",
  heart:   "넓은 이마를 드러내면 역삼각형이 강조돼요. 커튼뱅으로 균형을 맞춰보세요.",
  diamond: "올백은 골격을 여과 없이 드러내요.",
  hexagon: "올백은 강한 골격을 더 강조할 수 있어요. 시스루뱅으로 공기감을 더해보세요.",
  peanut:  "땅콩형에 올백은 얼굴 굴곡이 강조돼요. 사이드뱅으로 커버해보세요.",
  oval:    "계란형이라 올백도 아름다워요. 앞머리를 더하면 더 입체적인 분위기를 낼 수 있어요.",
};
const SIDE_PART_TEXT: Record<FaceShapeKey, string> = {
  oval:    "계란형에 옆가르마는 이미 훌륭한 조합이에요. 가닥뱅을 더하면 더 완벽해져요.",
  round:   "좋은 선택이에요! 시스루뱅이나 사이드뱅을 더하면 갸름하게 보정돼요.",
  oblong:  "긴 얼굴에 옆가르마는 무난해요. 이마를 살짝 덮는 시스루뱅을 더하면 비율이 좋아져요.",
  square:  "각진형에 옆가르마는 좋은 선택이에요. 커튼뱅을 더하면 각진 인상이 부드러워져요.",
  heart:   "무난한 선택이에요. 커튼뱅을 더하면 넓은 이마가 자연스럽게 커버돼요.",
  diamond: "좋은 선택이에요. 롱 사이드뱅을 더하면 광대 인상이 부드러워져요.",
  hexagon: "기본 조합이에요. 시스루뱅을 더하면 인상이 부드러워져요.",
  peanut:  "무난한 선택이에요. 사이드뱅을 더하면 얼굴 라인이 매끈하게 커버돼요.",
};
const HAS_BANGS_TEXT: Record<FaceShapeKey, string> = {
  oval:    "계란형에 앞머리는 어떤 스타일도 잘 어울려요. 지금보다 더 잘 맞는 디자인으로 업그레이드해보세요.",
  round:   "둥근형에는 이마 중심을 비워주는 계열로 바꾸면 더 갸름해 보여요. 빽빽한 풀뱅은 피해주세요.",
  oblong:  "긴 얼굴에 앞머리는 적극 추천이에요. 지금 스타일에서 비율을 더 다듬어보세요.",
  square:  "각진형에 앞머리는 인상을 부드럽게 만드는 핵심이에요. 지금보다 더 맞는 디자인이 있어요.",
  heart:   "넓은 이마를 커버하는 핵심 솔루션이에요. 업그레이드해보세요.",
  diamond: "광대 인상을 중화하는 역할을 해요.",
  hexagon: "강한 인상을 부드럽게 만드는 핵심이에요.",
  peanut:  "얼굴 굴곡을 커버하는 역할을 해요. 최적화해보세요.",
};

function buildCurrentStyleCheck(
  q1: Q1CurrentStyle | "", finalFace: FaceShapeKey,
): { label: string; text: string } {
  const label = Q1_LABELS[q1 as Q1CurrentStyle] ?? "현재 스타일";
  const textMap: Partial<Record<Q1CurrentStyle, Record<FaceShapeKey, string>>> = {
    center_part: CENTER_PART_TEXT,
    allback:     ALLBACK_TEXT,
    side_part:   SIDE_PART_TEXT,
    has_bangs:   HAS_BANGS_TEXT,
  };
  const text = textMap[q1 as Q1CurrentStyle]?.[finalFace]
    ?? `현재 [${label}] 스타일이시네요. 답변을 바탕으로 최적의 앞머리를 처방해드릴게요.`;
  return { label, text };
}

// ─── /home 연동용 태그 ────────────────────────────────────────────────────────

function buildConcernTags(answers: BangsSurveyAnswers): string[] {
  const tags: string[] = [];
  if (answers.q2 === "narrow_brow")   tags.push("#좁은이마");
  if (answers.q2 === "wide_forehead") tags.push("#넓은이마");
  if (answers.q3 === "cheekbone")     tags.push("#옆광대");
  if (answers.q3 === "long_mid")      tags.push("#긴중안부");
  if (answers.q4 === "round_jaw")     tags.push("#둥근턱");
  if (answers.q4 === "angular_jaw")   tags.push("#각진턱선");
  if (answers.q4 === "pointed_jaw")   tags.push("#브이라인");
  return tags;
}

function buildHairTextureTag(q5: Q5HairTexture | ""): string {
  if (q5 === "flat_oily") return "#기름진앞머리";
  if (q5 === "flyaway")   return "#잔머리많음";
  return "#건강한앞머리";
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ─── 최종 진단 결과 ───────────────────────────────────────────────────────────

export interface BangsDiagnosisResult {
  resultId: string;
  selectedFaceShape: FaceShapeKey;
  inferredFaceShape: FaceShapeKey;
  finalFaceShape: FaceShapeKey;
  faceMatchStatus: FaceMatchStatus;
  faceAnalysisText: string;
  primaryBang: BangType;
  primaryBangLabel: string;
  primaryReason: string;
  secondaryBang: BangType;
  secondaryBangLabel: string;
  secondaryReason: string;
  ngStyle: string;
  currentStyleCheck: { label: string; text: string };
  concernTags: string[];
  hairTextureTag: string;
  diagnosisSummary: string;
}

export function diagnoseBangs(answers: BangsSurveyAnswers): BangsDiagnosisResult {
  const { selectedFaceShape, inferredFaceShape, finalFaceShape, faceMatchStatus } = inferFaceShape(answers);

  const bangScores = calcBangScores(finalFaceShape, answers);
  const { primary, secondary } = pickPrimarySecondary(bangScores);

  const finalFaceTitle = FACE_SHAPE_INFO[finalFaceShape].title;

  return {
    resultId: uid(),
    selectedFaceShape,
    inferredFaceShape,
    finalFaceShape,
    faceMatchStatus,
    faceAnalysisText: buildFaceAnalysisText(selectedFaceShape, finalFaceShape, faceMatchStatus),
    primaryBang: primary,
    primaryBangLabel: BANG_LABELS[primary],
    primaryReason: buildPrimaryReason(finalFaceShape, primary),
    secondaryBang: secondary,
    secondaryBangLabel: BANG_LABELS[secondary],
    secondaryReason: buildSecondaryReason(primary, secondary),
    ngStyle: NG_STYLES[primary],
    currentStyleCheck: buildCurrentStyleCheck(answers.q1, finalFaceShape),
    concernTags: buildConcernTags(answers),
    hairTextureTag: buildHairTextureTag(answers.q5),
    diagnosisSummary: `${finalFaceTitle} · 추천 앞머리 ${BANG_LABELS[primary]}`,
  };
}
