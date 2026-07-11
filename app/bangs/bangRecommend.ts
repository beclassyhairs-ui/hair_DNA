// ============================================================================
// 어뷰티 인생뱅 — 점수 기반 추천 엔진 (v3, 2축 분리 구조)
//
// v2(얼굴형 1개로 밀어붙이는 단일 축)의 문제를 해결하기 위해 재설계:
//  1) "선택 얼굴형 기준 추천"과 "답변 신호 기반 보정 추천"을 완전히 분리된
//     두 개의 결과로 각각 계산한다 — 하나로 합쳐서 밀어붙이지 않는다.
//  2) signalBasedFaceShape 추론 후보에는 diamond(다이아몬드형)를 부활시킨다
//     (Q1 선택지에는 없지만, 답변 신호만으로는 나올 수 있다).
//  3) selectedFaceBang은 선택 얼굴형의 기본 적합도 + "위험 신호(감점)만" 반영한다
//     — 답변 신호가 다른 얼굴형을 가리키더라도 그 얼굴형의 장점 쪽으로는 안 끌리고,
//     "이 선택 기준으로 봤을 때 안 맞는 스타일만 피하는" 순수한 축을 유지한다.
//  4) signalBasedBang은 신호로 추론된 얼굴형의 기본 적합도 + 답변 신호 전체(가점+감점)
//     를 반영한다 — 답변이 실제로 가리키는 방향을 가장 강하게 반영하는 축이다.
//  5) primaryBang은 두 축이 같으면 그대로, 다르면 신호가 충분히 강할 때만
//     signalBasedBang을 1순위로 올린다(SIGNAL_PROMOTE_THRESHOLD).
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
  | "hippy"        // 히피뱅 — 아직 취향 질문 없어 비활성(서술용만)
  | "block"        // 블록뱅 — 추천 후보 아님, NG 전용
  | "face_line"    // 애교머리 / 페이스라인뱅
  | "round_bang"   // 라운드뱅
  | "volume_bang"  // 볼륨뱅 / 롤뱅 (구 bardot)
  | "side_bang";   // 사이드뱅 — long_side(여신 앞머리)와 역할 분리된 실용적 사이드 앞머리

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
  face_line:   "애교머리 / 페이스라인뱅",
  round_bang:  "라운드뱅",
  volume_bang: "볼륨뱅 / 롤뱅",
  side_bang:   "사이드뱅",
};

// ─── Q1 설문에 실제로 있는 얼굴형만 자가선택 후보로 사용 ───────────────────────

export const SELECTABLE_FACE_SHAPES: FaceShapeKey[] = [
  "oval", "round", "square", "oblong", "heart", "peanut",
];

// 답변 신호만으로 추론할 때는 diamond까지 후보에 포함(자가선택엔 없지만 신호로는 나올 수 있음).
// hexagon은 아직 사용하지 않는다.
const SIGNAL_FACE_SHAPES: FaceShapeKey[] = [
  "oval", "round", "square", "oblong", "heart", "peanut", "diamond",
];

// 활성 추천 후보 11종 — 순서 그대로 유지(동점 시 앞쪽이 우선순위를 가짐).
// hippy: 아직 대응하는 취향 질문이 없어 후보 제외(서술 텍스트에만 등장).
// block: 추천 결과로 내보내지 않음 — NG 스타일 전용.
export type ActiveBangType =
  | "see_through" | "curtain" | "long_side" | "side_swept" | "soft_full"
  | "wisp" | "inner" | "face_line" | "round_bang" | "volume_bang" | "side_bang";

export const ACTIVE_BANG_TYPES: ActiveBangType[] = [
  "see_through", "curtain", "long_side", "side_swept", "soft_full",
  "wisp", "inner", "face_line", "round_bang", "volume_bang", "side_bang",
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
  face_line:   "얼굴선을 다 가리는 무겁고 빽빽한 일자 뱅",
  round_bang:  "각지고 뻣뻣하게 딱 떨어지는 일자 뱅",
  volume_bang: "볼륨감 없이 납작 붙는 가벼운 시스루뱅",
  side_bang:   "이마를 완전히 가리는 무겁고 각진 일자 뱅",
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
  face_line:   "얼굴 옆선과 애교살 부분만 가볍게 감싸줘서 묶었을 때도 여백을 보완해줘요",
  round_bang:  "끝을 둥글게 굴린 라인이 부드럽고 어려 보이는 인상을 만들어줘요",
  volume_bang: "풀뱅보다 가볍고 커튼뱅보다 볼륨감 있는 롤리한 볼륨 앞머리예요",
  side_bang:   "옆으로 가볍게 흐르는 라인이 얼굴 옆선을 자연스럽고 실용적으로 보완해줘요",
};

// ─── 얼굴형별 앞머리 기본 적합도 (7형 × 11종) ─────────────────────────────────
// long_side(여신 앞머리)와 side_bang(실용적 사이드뱅)은 역할을 분리한다 —
// long_side는 광대·턱선을 길게 감싸는 강한 보정(diamond/square/peanut/cheekbone
// 신호에 반응), side_bang은 옆가르마 사용자를 위한 가벼운 기본 옵션으로
// narrow_brow/cheekbone 같은 강한 보정 신호에는 반응하지 않는다.

type BangSignalMap = Partial<Record<BangType, number>>;

const FACE_BANG_AFFINITY: Record<FaceShapeKey, BangSignalMap> = {
  oval:    { wisp: 3, see_through: 2, curtain: 2, side_swept: 1, face_line: 1, side_bang: 2 },
  round:   { see_through: 3, inner: 3, side_swept: 2, face_line: 2, curtain: 1, side_bang: 1, soft_full: -2, round_bang: -2 },
  square:  { curtain: 3, long_side: 3, face_line: 2, see_through: 1, soft_full: -2, round_bang: -1 },
  oblong:  { soft_full: 3, volume_bang: 3, round_bang: 2, see_through: 2, wisp: 1, long_side: 1 },
  heart:   { curtain: 3, volume_bang: 2, see_through: 2, side_swept: 2, side_bang: 1, long_side: 1, soft_full: 0 },
  peanut:  { side_swept: 3, long_side: 3, face_line: 2, curtain: 1, wisp: 1, side_bang: 2 },
  diamond: { long_side: 4, face_line: 3, side_swept: 2, curtain: 2, wisp: 1, soft_full: -3, round_bang: -2 },
  hexagon: {},
};

// ─── 답변 보정 신호 (bang 점수용) — Q1(현재 스타일)·Q2~Q4(고민)·Q5(모질) ──────

const CURRENT_STYLE_BANG_SIGNAL: Partial<Record<Q1CurrentStyle | "", BangSignalMap>> = {
  side_part:   { side_bang: 2 }, // 이미 옆가르마 습관 → 실용적 사이드뱅과 자연스럽게 연결
  center_part: { curtain: 1, side_swept: 1, face_line: 1 },
  allback:     { wisp: 2, face_line: 2, side_swept: 1 },
  // has_bangs: 기존 앞머리 업그레이드 느낌 유지 원칙(점수 관여 없음) — 별도 델타 없음
};
const FOREHEAD_BANG_SIGNAL: Partial<Record<Q2ForeheadConcern | "", BangSignalMap>> = {
  narrow_brow:   { side_swept: 3, wisp: 2, long_side: 2, face_line: 2, soft_full: -4, volume_bang: -2, round_bang: -2 },
  wide_forehead: { curtain: 3, volume_bang: 3, soft_full: 2, see_through: 2, round_bang: 1 },
};
const MIDFACE_BANG_SIGNAL: Partial<Record<Q3MidfaceConcern | "", BangSignalMap>> = {
  cheekbone: { long_side: 4, face_line: 3, side_swept: 2, curtain: 1, soft_full: -2, round_bang: -1 },
  long_mid:  { see_through: 3, soft_full: 2, round_bang: 2, volume_bang: 1 },
};
const JAW_BANG_SIGNAL: Partial<Record<Q4JawConcern | "", BangSignalMap>> = {
  round_jaw:   { inner: 3, see_through: 2, face_line: 2, side_swept: 1, soft_full: -2, round_bang: -2 },
  angular_jaw: { curtain: 3, long_side: 3, face_line: 2, see_through: 1 },
  pointed_jaw: { long_side: 2, curtain: 2, volume_bang: 1, face_line: 1 },
};
const TEXTURE_BANG_SIGNAL: Partial<Record<Q5HairTexture | "", BangSignalMap>> = {
  flat_oily: { see_through: -1, soft_full: -1, wisp: 1, side_swept: 1 },
  flyaway:   { inner: 2, face_line: 2, curtain: 1 },
  // healthy: 별도 보정 없음
};

// ─── 얼굴형 신호(답변 → signalBasedFaceShape) ─────────────────────────────────

type FaceSignalMap = Partial<Record<FaceShapeKey, number>>;

const FOREHEAD_FACE_SIGNAL: Partial<Record<Q2ForeheadConcern | "", FaceSignalMap>> = {
  narrow_brow:   { diamond: 2, peanut: 1 },
  wide_forehead: { heart: 3, oblong: 1 },
};
const MIDFACE_FACE_SIGNAL: Partial<Record<Q3MidfaceConcern | "", FaceSignalMap>> = {
  cheekbone: { diamond: 3, peanut: 2 },
  long_mid:  { oblong: 3 },
};
const JAW_FACE_SIGNAL: Partial<Record<Q4JawConcern | "", FaceSignalMap>> = {
  round_jaw:   { round: 3 },
  angular_jaw: { square: 3 },
  pointed_jaw: { diamond: 2, heart: 2 },
};

// ─── 디버그용 신호 설명 문구 ───────────────────────────────────────────────────

const SIGNAL_NOTE_SHORT: Record<string, string> = {
  narrow_brow: "좁은 이마", wide_forehead: "넓은 이마",
  cheekbone: "옆광대", long_mid: "긴 중안부",
  round_jaw: "둥근 턱", angular_jaw: "각진 턱선", pointed_jaw: "뾰족한 V라인",
};
const SIGNAL_NOTE_DEBUG: Record<string, string> = {
  narrow_brow:   "좁은 이마 → 다이아몬드형 +2·땅콩형 +1 신호, 사이드 스웹뱅 계열 강화",
  wide_forehead: "넓은 이마 → 하트형 +3·긴형 +1 신호, 커튼뱅·바르도뱅 계열 강화",
  cheekbone:     "옆광대 도드라짐 → 다이아몬드형 +3·땅콩형 +2 신호, 롱 사이드뱅 계열 강화",
  long_mid:      "긴 중안부 → 긴형 +3 신호, 시스루뱅 계열 강화",
  round_jaw:     "둥근 턱 → 둥근형 +3 신호, 이너뱅·시스루뱅 계열 강화",
  angular_jaw:   "각진 턱선 → 각진형 +3 신호, 커튼뱅·롱 사이드뱅 계열 강화",
  pointed_jaw:   "뾰족한 V라인 → 다이아몬드형 +2·하트형 +2 신호, 롱 사이드뱅·커튼뱅 계열 강화",
};

function collectSignalAnswerIds(answers: BangsSurveyAnswers): string[] {
  return [answers.q2, answers.q3, answers.q4].filter((v) => Boolean(v) && v !== "none") as string[];
}

function collectShortSignalLabels(answers: BangsSurveyAnswers): string[] {
  return collectSignalAnswerIds(answers).map((id) => SIGNAL_NOTE_SHORT[id]).filter(Boolean);
}

function collectDebugSignalNotes(answers: BangsSurveyAnswers): string[] {
  return collectSignalAnswerIds(answers).map((id) => SIGNAL_NOTE_DEBUG[id]).filter(Boolean);
}

// ─── 얼굴형 신호 추론 ─────────────────────────────────────────────────────────

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

/** 신호만으로 추론한 얼굴형 — 신호가 하나도 없으면 선택 얼굴형을 그대로 반영(score 0)한다. */
function inferSignalBasedFaceShape(
  answers: BangsSurveyAnswers, selectedShape: FaceShapeKey,
): { shape: FaceShapeKey; score: number } {
  const scores = collectFaceSignals(answers);
  let best = selectedShape;
  let bestScore = 0;
  for (const key of SIGNAL_FACE_SHAPES) {
    if (scores[key] > bestScore) { best = key; bestScore = scores[key]; }
  }
  return { shape: best, score: bestScore };
}

// ─── bang 점수 계산 ───────────────────────────────────────────────────────────

function zeroBangScores(): Record<BangType, number> {
  return {
    see_through: 0, curtain: 0, side_swept: 0, long_side: 0, soft_full: 0,
    wisp: 0, inner: 0, hippy: 0, block: 0, face_line: 0, round_bang: 0,
    volume_bang: 0, side_bang: 0,
  };
}

function addBangSignal(scores: Record<BangType, number>, signal: BangSignalMap | undefined) {
  if (!signal) return;
  for (const key of Object.keys(signal) as BangType[]) {
    scores[key] += signal[key] ?? 0;
  }
}

function filterNegative(signal: BangSignalMap | undefined): BangSignalMap | undefined {
  if (!signal) return undefined;
  const out: BangSignalMap = {};
  for (const [key, value] of Object.entries(signal)) {
    if ((value ?? 0) < 0) out[key as BangType] = value;
  }
  return out;
}

/**
 * mode="full": 얼굴형 기본 적합도 + 답변 보정(가점+감점) 전체 반영 — signalBasedBang용.
 * mode="negativeOnly": 얼굴형 기본 적합도는 그대로 두고, 답변 보정 중 "위험 신호(감점)"만
 * 반영 — selectedFaceBang용. 선택 얼굴형의 장점은 유지하면서 안 맞는 스타일만 피한다.
 */
function calcBangScores(
  shape: FaceShapeKey, answers: BangsSurveyAnswers, mode: "full" | "negativeOnly",
): Record<BangType, number> {
  const scores = zeroBangScores();
  addBangSignal(scores, FACE_BANG_AFFINITY[shape]);

  const corrections = [
    CURRENT_STYLE_BANG_SIGNAL[answers.q1],
    FOREHEAD_BANG_SIGNAL[answers.q2],
    MIDFACE_BANG_SIGNAL[answers.q3],
    JAW_BANG_SIGNAL[answers.q4],
    TEXTURE_BANG_SIGNAL[answers.q5],
  ];
  for (const c of corrections) {
    addBangSignal(scores, mode === "full" ? c : filterNegative(c));
  }
  return scores;
}

function rankBangs(scores: Record<BangType, number>): { bang: BangType; score: number }[] {
  return [...ACTIVE_BANG_TYPES]
    .sort((a, b) => scores[b] - scores[a])
    .map((bang) => ({ bang, score: scores[bang] }));
}

// 답변 신호가 얼굴형 자체를 뒤집을 만큼 강할 때만 signalBasedBang을 1순위로 승격
const SIGNAL_PROMOTE_THRESHOLD = 4;

// ─── 결과 문구 ────────────────────────────────────────────────────────────────

function buildSelectedFaceReason(selectedShape: FaceShapeKey, selectedBang: BangType): string {
  const title = FACE_SHAPE_INFO[selectedShape].title;
  return `선택하신 "${title}" 기준으로는 ${BANG_LABELS[selectedBang]}이 잘 맞아요. ${BANG_CORE_REASON[selectedBang]}.`;
}

function buildSignalBasedReason(
  selectedShape: FaceShapeKey, signalShape: FaceShapeKey, signalBang: BangType, shortNotes: string[],
): string {
  if (selectedShape === signalShape) {
    return `추가 답변에서도 비슷한 특징이 확인돼서 ${BANG_LABELS[signalBang]}도 함께 추천드려요. ${BANG_CORE_REASON[signalBang]}.`;
  }
  const noteText = shortNotes.length > 0 ? shortNotes.join("·") : "몇 가지 답변";
  const signalTitle = FACE_SHAPE_INFO[signalShape].title;
  return `다만 추가 답변에서는 ${noteText} 신호가 함께 보여, ${signalTitle} 특징을 반영한 보정 추천도 함께 드릴게요. ${BANG_LABELS[signalBang]}이 이 신호에 가장 잘 맞아요.`;
}

function buildDebugReasonSummary(
  selectedShape: FaceShapeKey, signalShape: FaceShapeKey, primaryBang: BangType, promoted: boolean,
): string {
  const selTitle = FACE_SHAPE_INFO[selectedShape].title;
  const sigTitle = FACE_SHAPE_INFO[signalShape].title;
  if (selectedShape === signalShape) {
    return `선택하신 "${selTitle}"과 답변 신호가 일치해요. 두 기준을 함께 봤을 때 최종적으로는 ${BANG_LABELS[primaryBang]}이 가장 자연스러워요.`;
  }
  if (promoted) {
    return `선택값은 "${selTitle}"이지만, 답변 신호는 "${sigTitle}" 쪽이 더 강하게 나타났어요. 두 기준을 함께 봤을 때 최종적으로는 ${BANG_LABELS[primaryBang]}이 가장 자연스러워요.`;
  }
  return `선택값은 "${selTitle}"이고, 답변에서 "${sigTitle}" 신호도 일부 보였지만 크게 두드러지진 않아 선택 얼굴형 기준을 우선했어요. 최종적으로는 ${BANG_LABELS[primaryBang]}을 추천드려요.`;
}

// ─── 블록: Q(현재 스타일) 팩트체크 (결과지 "현재 스타일 체크" 섹션용) ───────────

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
  q1: Q1CurrentStyle | "", shape: FaceShapeKey,
): { label: string; text: string } {
  const label = Q1_LABELS[q1 as Q1CurrentStyle] ?? "현재 스타일";
  const textMap: Partial<Record<Q1CurrentStyle, Record<FaceShapeKey, string>>> = {
    center_part: CENTER_PART_TEXT,
    allback:     ALLBACK_TEXT,
    side_part:   SIDE_PART_TEXT,
    has_bangs:   HAS_BANGS_TEXT,
  };
  const text = textMap[q1 as Q1CurrentStyle]?.[shape]
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
  selectedFaceBang: BangType;
  selectedFaceBangLabel: string;
  selectedFaceReason: string;

  signalBasedFaceShape: FaceShapeKey;
  signalBasedBang: BangType;
  signalBasedBangLabel: string;
  signalBasedReason: string;

  primaryBang: BangType;
  primaryBangLabel: string;
  secondaryBang: BangType;
  secondaryBangLabel: string;

  ngStyle: string;
  currentStyleCheck: { label: string; text: string };
  concernTags: string[];
  hairTextureTag: string;
  diagnosisSummary: string;

  debugReasonSummary: string;
  debugSignalNotes: string[];
  topBangScores: { bang: BangType; label: string; score: number }[];
}

export function diagnoseBangs(answers: BangsSurveyAnswers): BangsDiagnosisResult {
  const selectedFaceShape: FaceShapeKey =
    answers.qFaceShape && SELECTABLE_FACE_SHAPES.includes(answers.qFaceShape)
      ? answers.qFaceShape
      : "oval";

  const { shape: signalBasedFaceShape, score: signalScore } =
    inferSignalBasedFaceShape(answers, selectedFaceShape);

  const selectedRanked = rankBangs(calcBangScores(selectedFaceShape, answers, "negativeOnly"));
  const signalRanked   = rankBangs(calcBangScores(signalBasedFaceShape, answers, "full"));

  const selectedFaceBang = selectedRanked[0].bang;
  const signalBasedBang  = signalRanked[0].bang;

  const shapesAgree = selectedFaceShape === signalBasedFaceShape;
  const bangsAgree  = selectedFaceBang === signalBasedBang;
  const promoted    = !shapesAgree && signalScore >= SIGNAL_PROMOTE_THRESHOLD;

  let primaryBang: BangType;
  let secondaryBang: BangType;
  if (bangsAgree) {
    primaryBang = selectedFaceBang;
    secondaryBang = (signalRanked.find((r) => r.bang !== primaryBang) ?? selectedRanked[1]).bang;
  } else if (promoted) {
    primaryBang = signalBasedBang;
    secondaryBang = selectedFaceBang;
  } else {
    primaryBang = selectedFaceBang;
    secondaryBang = signalBasedBang;
  }

  const shortNotes = collectShortSignalLabels(answers);

  return {
    resultId: uid(),

    selectedFaceShape,
    selectedFaceBang,
    selectedFaceBangLabel: BANG_LABELS[selectedFaceBang],
    selectedFaceReason: buildSelectedFaceReason(selectedFaceShape, selectedFaceBang),

    signalBasedFaceShape,
    signalBasedBang,
    signalBasedBangLabel: BANG_LABELS[signalBasedBang],
    signalBasedReason: buildSignalBasedReason(selectedFaceShape, signalBasedFaceShape, signalBasedBang, shortNotes),

    primaryBang,
    primaryBangLabel: BANG_LABELS[primaryBang],
    secondaryBang,
    secondaryBangLabel: BANG_LABELS[secondaryBang],

    ngStyle: NG_STYLES[primaryBang],
    currentStyleCheck: buildCurrentStyleCheck(answers.q1, selectedFaceShape),
    concernTags: buildConcernTags(answers),
    hairTextureTag: buildHairTextureTag(answers.q5),
    diagnosisSummary: `${FACE_SHAPE_INFO[selectedFaceShape].title} 기준 + 신호 보정 → 추천 앞머리 ${BANG_LABELS[primaryBang]}`,

    debugReasonSummary: buildDebugReasonSummary(selectedFaceShape, signalBasedFaceShape, primaryBang, promoted),
    debugSignalNotes: collectDebugSignalNotes(answers),
    topBangScores: signalRanked.slice(0, 5).map((r) => ({ bang: r.bang, label: BANG_LABELS[r.bang], score: r.score })),
  };
}
