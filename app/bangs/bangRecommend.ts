// ============================================================================
// 어뷰티 인생뱅 — 레고 블록식 추천 엔진
// 얼굴형 × Q1~Q4 → 점수 기반 뱅 추천
// Q2~Q4 고민 → 독립 멘트 블록 생성
// Q5 → 맞춤 제품 추천
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

// ─── 8대 얼굴형 기본 정보 ─────────────────────────────────────────────────────

export interface FaceShapeInfo {
  title: string;
  summary: string; // 2줄 요약 (기본 정의 카드)
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

// ─── 점수 기반 뱅 추천 시스템 ────────────────────────────────────────────────

type ScoreMap = Partial<Record<BangType, number>>;

function faceShapeScores(face: FaceShapeKey): ScoreMap {
  const db: Record<FaceShapeKey, ScoreMap> = {
    oval:    { see_through: 2, wisp: 3, curtain: 2, side_swept: 1 },
    round:   { see_through: 4, side_swept: 3, curtain: 3, long_side: 1, soft_full: -2, block: -3 },
    oblong:  { soft_full: 4, see_through: 3, curtain: 3, inner: 2 },
    square:  { curtain: 4, side_swept: 3, long_side: 2, block: -2 },
    heart:   { curtain: 4, side_swept: 3, see_through: 3, wisp: 1 },
    diamond: { long_side: 4, block: 3, curtain: 2, see_through: 2 },
    hexagon: { see_through: 4, hippy: 3, wisp: 2, inner: 1 },
    peanut:  { side_swept: 4, inner: 3, curtain: 2, see_through: 2 },
  };
  return db[face] ?? {};
}

function q2Scores(q2: Q2ForeheadConcern | ""): ScoreMap {
  if (q2 === "narrow_brow")   return { wisp: 3, see_through: 2, inner: 2, soft_full: -2 };
  if (q2 === "wide_forehead") return { curtain: 4, see_through: 4, side_swept: 3, soft_full: 2 };
  return {};
}
function q3Scores(q3: Q3MidfaceConcern | ""): ScoreMap {
  if (q3 === "cheekbone") return { long_side: 4, side_swept: 3, curtain: 2 };
  if (q3 === "long_mid")  return { see_through: 4, curtain: 3, wisp: 2 };
  return {};
}
function q4Scores(q4: Q4JawConcern | ""): ScoreMap {
  if (q4 === "round_jaw")   return { wisp: 3, inner: 3, see_through: 2, block: -3, soft_full: -2 };
  if (q4 === "angular_jaw") return { curtain: 4, long_side: 3, side_swept: 3 };
  return {};
}

function mergeMaps(...maps: ScoreMap[]): Record<BangType, number> {
  const result: Partial<Record<BangType, number>> = {};
  for (const map of maps) {
    for (const [k, v] of Object.entries(map) as [BangType, number][]) {
      result[k] = (result[k] ?? 0) + v;
    }
  }
  return result as Record<BangType, number>;
}

export interface BangRecommendation {
  primary:        BangType;
  secondary:      BangType;
  primaryLabel:   string;
  secondaryLabel: string;
  reasonText:     string; // 추천 이유 (Bold 마크다운 포함)
}

export function recommendBang(
  face: FaceShapeKey,
  answers: BangsSurveyAnswers,
): BangRecommendation {
  const scores = mergeMaps(
    faceShapeScores(face),
    q2Scores(answers.q2),
    q3Scores(answers.q3),
    q4Scores(answers.q4),
  );

  const sorted = (Object.entries(scores) as [BangType, number][])
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .map(([k]) => k);

  const primary   = sorted[0] ?? "see_through";
  const secondary = sorted[1] ?? "curtain";

  return {
    primary,
    secondary,
    primaryLabel:   BANG_LABELS[primary],
    secondaryLabel: BANG_LABELS[secondary],
    reasonText: buildReasonText(face, primary, answers.q2, answers.q3, answers.q4),
  };
}

function buildReasonText(
  face: FaceShapeKey,
  bang: BangType,
  q2: Q2ForeheadConcern | "",
  q3: Q3MidfaceConcern | "",
  q4: Q4JawConcern | "",
): string {
  const label = BANG_LABELS[bang];
  const parts: string[] = [];

  if (q2 === "wide_forehead") parts.push("넓은 이마 여백을 자연스럽게 채우는");
  else if (q2 === "narrow_brow") parts.push("이마를 가볍게 드러내며 눈썹뼈 라인을 정리해주는");

  if (q3 === "cheekbone") parts.push("광대 옆을 자연스럽게 커버하는");
  else if (q3 === "long_mid") parts.push("중안부 세로 시선을 가로로 끊어주는");

  if (q4 === "angular_jaw") parts.push("각진 턱선을 부드럽게 감싸주는");
  else if (q4 === "round_jaw") parts.push("얼굴을 세로로 길어 보이게 하는");

  if (parts.length === 0) {
    const faceReasons: Record<FaceShapeKey, string> = {
      oval:    "황금비율 계란형의 아름다움에 포인트를 더하는",
      round:   "얼굴을 세로로 길고 갸름하게 보정하는",
      oblong:  "세로 길이를 시각적으로 줄여 이상적인 비율을 완성하는",
      square:  "각진 인상을 부드럽고 여성스럽게 중화하는",
      heart:   "넓은 이마를 자연스럽게 커버하고 균형을 잡아주는",
      diamond: "광대 위아래를 채워 얼굴 비율을 균형 있게 보정하는",
      hexagon: "강한 골격에 부드러운 공기감을 더해주는",
      peanut:  "울퉁불퉁한 얼굴 라인을 매끈하게 보정하는",
    };
    parts.push(faceReasons[face]);
  }

  return `${parts.join(", ")} **${label}**이 고객님에게 가장 잘 어울립니다.`;
}

// ─── 블록 2: Q1 팩트체크 ──────────────────────────────────────────────────────

const Q1_LABELS: Record<Q1CurrentStyle, string> = {
  side_part:   "옆가르마",
  center_part: "가운데 가르마 (5:5)",
  allback:     "앞머리 없음 (올백)",
  has_bangs:   "앞머리 있음",
};

export function getQ1FactBlock(
  q1: Q1CurrentStyle | "",
  face: FaceShapeKey,
): { label: string; text: string } {
  const label = Q1_LABELS[q1 as Q1CurrentStyle] ?? "현재 스타일";

  // center_part × 얼굴형
  const centerTexts: Record<FaceShapeKey, string> = {
    square:  `현재 [가운데 가르마]를 하고 계시네요. 각진형 얼굴에 5:5 가르마는 턱의 각을 그대로 노출합니다. 자로 잰 듯 무거운 일자 앞머리는 절대 피해주세요!`,
    round:   `현재 [가운데 가르마]를 하고 계시네요. 둥근형에 5:5 가르마는 얼굴의 가로 폭을 더 넓어 보이게 합니다. 사선 가르마나 시스루뱅으로 변화를 줘보세요!`,
    heart:   `현재 [가운데 가르마]를 하고 계시네요. 하트형에 넓은 이마를 드러내면 얼굴 상부가 더 강조됩니다. 커튼뱅이나 사이드 스웹 뱅이 필요해요!`,
    oblong:  `현재 [가운데 가르마]를 하고 계시네요. 긴 얼굴에 이마를 드러내면 세로 길이가 더 강조됩니다. 소프트 풀뱅으로 이마를 살짝 덮어주세요!`,
    diamond: `현재 [가운데 가르마]를 하고 계시네요. 다이아몬드형에 이마를 드러내면 광대의 강한 인상이 더 강조될 수 있어요. 롱 사이드뱅으로 커버해드릴게요!`,
    hexagon: `현재 [가운데 가르마]를 하고 계시네요. 강한 골격에 가운데 가르마는 뼈대를 선명하게 부각합니다. 시스루뱅이나 히피뱅으로 부드럽게 변화를 줘보세요!`,
    peanut:  `현재 [가운데 가르마]를 하고 계시네요. 땅콩형에 5:5 가르마는 얼굴 굴곡을 여과 없이 드러냅니다. 사이드뱅으로 자연스럽게 커버해드릴게요!`,
    oval:    `현재 [가운데 가르마]를 하고 계시네요. 계란형에 가운데 가르마는 깔끔하지만 약간 단조롭습니다. 가닥뱅이나 가벼운 시스루뱅으로 생기를 더해보세요!`,
  };

  // allback × 얼굴형
  const allbackTexts: Record<FaceShapeKey, string> = {
    round:   `현재 이마를 완전히 드러내고 계시네요. 둥근형에 올백은 얼굴이 더 커 보일 수 있어요. 시스루뱅이나 사이드뱅으로 옆선을 자연스럽게 감싸주세요!`,
    square:  `현재 이마와 얼굴선을 모두 드러내고 계시네요. 각진형에 올백은 강한 인상을 더욱 부각합니다. 커튼뱅이나 사이드뱅으로 부드럽게 변화를 줘보세요!`,
    oblong:  `현재 이마를 완전히 드러내고 계시네요. 긴 얼굴에 올백은 세로 길이를 더 강조합니다. 소프트 풀뱅이나 시스루뱅으로 이마를 가려 비율을 보정해주세요!`,
    heart:   `현재 이마를 완전히 드러내고 계시네요. 하트형에 넓은 이마를 드러내면 역삼각형이 강조됩니다. 커튼뱅으로 이마를 부드럽게 덮어 균형을 맞춰주세요!`,
    diamond: `현재 이마와 얼굴선을 모두 드러내고 계시네요. 광대가 돌출된 얼굴에 올백은 골격을 여과 없이 드러냅니다. 롱 사이드뱅이나 블록뱅으로 균형을 맞춰주세요!`,
    hexagon: `현재 이마와 얼굴선을 모두 드러내고 계시네요. 육각형의 강한 골격에 올백은 인상이 더 강해 보일 수 있어요. 시스루뱅이나 히피뱅으로 공기감을 채워주세요!`,
    peanut:  `현재 이마와 관자놀이를 모두 드러내고 계시네요. 땅콩형에 올백은 얼굴 굴곡이 강조됩니다. 사이드뱅이나 잔머리컷으로 자연스럽게 커버해주세요!`,
    oval:    `현재 이마를 완전히 드러내고 계시네요. 계란형이라 올백도 아름다워요! 앞머리를 더하면 더욱 입체적인 분위기를 낼 수 있어요.`,
  };

  const sideTexts: Record<FaceShapeKey, string> = {
    oval:    `현재 [옆가르마]를 하고 계시네요. 계란형에 옆가르마는 이미 훌륭한 조합이에요! 가닥뱅이나 시스루뱅을 추가하면 더욱 완벽해집니다.`,
    round:   `현재 [옆가르마]를 하고 계시네요. 좋은 선택이에요! 시스루뱅이나 사이드뱅을 더하면 갸름한 얼굴로 완벽하게 보정됩니다.`,
    oblong:  `현재 [옆가르마]를 하고 계시네요. 긴 얼굴에 옆가르마는 무난한 선택이에요. 이마를 살짝 덮는 시스루뱅을 더하면 비율이 훨씬 좋아집니다.`,
    square:  `현재 [옆가르마]를 하고 계시네요. 각진형에 옆가르마는 좋은 선택이에요! 커튼뱅이나 사이드뱅을 더하면 각진 인상이 훨씬 부드러워집니다.`,
    heart:   `현재 [옆가르마]를 하고 계시네요. 하트형에 옆가르마는 무난한 선택이에요! 커튼뱅을 더하면 넓은 이마가 자연스럽게 커버됩니다.`,
    diamond: `현재 [옆가르마]를 하고 계시네요. 다이아몬드형에 옆가르마는 좋은 선택이에요! 롱 사이드뱅을 더하면 광대 인상이 부드러워집니다.`,
    hexagon: `현재 [옆가르마]를 하고 계시네요. 강한 카리스마를 가진 육각형에 옆가르마는 기본 조합이에요! 시스루뱅이나 히피뱅을 더하면 부드러워집니다.`,
    peanut:  `현재 [옆가르마]를 하고 계시네요. 땅콩형에 옆가르마는 무난한 선택이에요! 사이드뱅을 더하면 얼굴 라인이 매끈하게 커버됩니다.`,
  };

  const hasBangsTexts: Record<FaceShapeKey, string> = {
    oval:    `현재 [앞머리]가 있으시네요. 계란형에 앞머리는 어떤 스타일도 잘 어울려요! AI가 분석한 최적 앞머리 디자인으로 업그레이드해보세요.`,
    round:   `현재 [앞머리]가 있으시네요. 둥근형에는 이마 중심을 비워주는 시스루뱅이나 사이드 스웹 뱅으로 바꾸면 더욱 갸름해 보입니다. 빽빽한 풀뱅은 피해주세요!`,
    oblong:  `현재 [앞머리]가 있으시네요. 긴 얼굴에 앞머리는 적극 추천이에요! 소프트 풀뱅이나 시스루뱅이 비율을 완벽하게 잡아줍니다.`,
    square:  `현재 [앞머리]가 있으시네요. 각진형에 앞머리는 인상을 부드럽게 만드는 핵심이에요! 커튼뱅이나 사이드 스웹 뱅으로 업그레이드하면 변신 효과가 극대화돼요.`,
    heart:   `현재 [앞머리]가 있으시네요. 하트형에 앞머리는 넓은 이마를 커버하는 핵심 솔루션이에요! 커튼뱅이나 사이드 스웹 뱅으로 업그레이드해보세요.`,
    diamond: `현재 [앞머리]가 있으시네요. 다이아몬드형에 앞머리는 광대 인상을 중화하는 역할을 해요! 롱 사이드뱅이나 블록뱅으로 최적화해드릴게요.`,
    hexagon: `현재 [앞머리]가 있으시네요. 육각형에 앞머리는 강한 인상을 부드럽게 만드는 핵심이에요! 시스루뱅이나 히피뱅으로 업그레이드해보세요.`,
    peanut:  `현재 [앞머리]가 있으시네요. 땅콩형에 앞머리는 얼굴 굴곡을 커버하는 역할을 해요! 사이드뱅이나 잔머리컷 스타일로 최적화해드릴게요.`,
  };

  const textMap: Record<Q1CurrentStyle, Record<FaceShapeKey, string>> = {
    center_part: centerTexts,
    allback:     allbackTexts,
    side_part:   sideTexts,
    has_bangs:   hasBangsTexts,
  };

  const text = textMap[q1 as Q1CurrentStyle]?.[face]
    ?? `현재 [${label}] 스타일이시네요. AI 분석을 바탕으로 최적의 앞머리를 처방해드릴게요!`;

  return { label, text };
}

// ─── 블록 3: Q2+Q3+Q4 고민 분석 (Additive) ────────────────────────────────────

export interface ConcernBlock {
  key: string;
  label: string;
  text: string;
}

export function buildConcernBlocks(
  q2: Q2ForeheadConcern | "",
  q3: Q3MidfaceConcern | "",
  q4: Q4JawConcern | "",
): ConcernBlock[] {
  const blocks: ConcernBlock[] = [];

  if (q2 === "narrow_brow") {
    blocks.push({
      key: "narrow_brow",
      label: "좁은 이마 / 눈썹뼈",
      text: "좁은 이마(또는 돌출된 눈썹뼈)는 무거운 앞머리가 답답한 인상을 만들 수 있어요. 이마를 시원하게 드러내되, 가닥뱅이나 가벼운 시스루뱅으로 골격을 자연스럽게 정리해드릴게요.",
    });
  } else if (q2 === "wide_forehead") {
    blocks.push({
      key: "wide_forehead",
      label: "넓은 이마 / M자 라인",
      text: "넓은 이마(또는 M자 헤어라인)는 이마 여백을 자연스럽게 채우는 처방이 필요해요. 시스루뱅이나 커튼뱅이 이마 라인을 부드럽게 채워 넓어 보이는 느낌을 줄여줍니다.",
    });
  }

  if (q3 === "cheekbone") {
    blocks.push({
      key: "cheekbone",
      label: "도드라진 옆광대",
      text: "도드라진 옆광대는 사이드뱅이 핵심이에요. 광대 쪽에서 자연스럽게 흘러내리는 롱 사이드뱅이 광대를 시각적으로 커버해 골격을 부드럽게 보정해줍니다.",
    });
  } else if (q3 === "long_mid") {
    blocks.push({
      key: "long_mid",
      label: "긴 중안부 / 긴 코",
      text: "중안부가 길거나 코가 길어 보이신다면, 이마와 코끝 사이의 세로 시선을 가로로 끊어주는 처방이 효과적이에요. 가벼운 시스루뱅이나 커튼뱅이 정확히 이 역할을 해줍니다.",
    });
  }

  if (q4 === "round_jaw") {
    blocks.push({
      key: "round_jaw",
      label: "둥글고 통통한 볼살",
      text: "둥글고 통통한 볼살은 얼굴 아래쪽 가로 폭을 최소화하는 것이 핵심이에요. 세로로 길어 보이는 효과를 주는 가닥뱅이나 이너뱅으로 볼륨을 위로 집중시켜 드릴게요.",
    });
  } else if (q4 === "angular_jaw") {
    blocks.push({
      key: "angular_jaw",
      label: "각지거나 뾰족한 턱선",
      text: "각지거나 뾰족한 턱선은 롱 사이드뱅이나 커튼뱅으로 부드럽게 감싸주는 것이 효과적이에요. 얼굴 아래쪽으로 풍성하게 흐르는 컬과 함께 매치하면 완성도가 높아집니다.",
    });
  }

  return blocks;
}

// ─── 블록 5: Q5 맞춤 제품 추천 ───────────────────────────────────────────────

export interface ProductRecommendation {
  emoji:       string;
  headline:    string;
  productName: string;
  description: string;
  link:        string;
}

export function getProductRecommendation(q5: Q5HairTexture | ""): ProductRecommendation {
  if (q5 === "flat_oily") {
    return {
      emoji:       "💨",
      headline:    "오후만 되면 떡지는 앞머리에 딱!",
      productName: "어뷰티 뽀송 볼륨 픽서",
      description: "세범 흡착 + 뿌리 볼륨 동시 케어. 아침에 한 번 뿌리면 하루 종일 빵빵한 앞머리 유지!",
      link:        "https://link.coupang.com/a/eEnVGyip64",
    };
  }
  if (q5 === "flyaway") {
    return {
      emoji:       "🪄",
      headline:    "삐져나오는 잔머리 때문에 매일 스트레스?",
      productName: "어뷰티 잔머리 정리 왁스 스틱",
      description: "샤르르 발리는 미니 왁스로 잔머리를 착착 눌러주세요. 헬멧·마스크 착용 후에도 OK!",
      link:        "https://link.coupang.com/a/eEnVGyip64",
    };
  }
  return {
    emoji:       "✨",
    headline:    "건강한 앞머리, 완성도만 더 높여볼까요?",
    productName: "어뷰티 앞머리 전용 세팅 스프레이",
    description: "가볍게 고정되는 자연스러운 마무리. 뻣뻣함 없이 찰랑찰랑한 앞머리가 하루 종일!",
    link:        "https://link.coupang.com/a/eEn2zPHXye",
  };
}
