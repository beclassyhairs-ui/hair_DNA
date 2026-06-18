// ============================================================================
// 동안비법 — 결과지 추천 엔진 (전 연령 대상)
// ============================================================================

import {
  QUESTION_MAP,
  rankedSelections,
  type Answers,
} from "../diagnosis/surveyData";
import {
  DEFAULT_REFERENCE,
  PRODUCT_CATALOG,
  REFERENCE_TABLE,
  type AgeBand,
  type BeautyProduct,
  type ReferenceStyle,
} from "./masterData";

// ----------------------------------------------------------------------------
// 결과 데이터 모델
// ----------------------------------------------------------------------------

export interface RankedItem {
  rank: number;
  id: string;
  label: string;
}

export interface CareTip {
  title: string;
  body: string;
}

export interface ConcernSolution {
  rank: number;
  concern: string;
  solution: string;
}

export interface AiPrompt {
  positive: string;
  negative: string;
  parts: { label: string; token: string }[];
}

export interface DiagnosisResult {
  headline: string;
  hashtags: string[];
  tags: string[];
  reference: ReferenceStyle;
  aiPrompt: AiPrompt;
  priority: {
    concerns: RankedItem[];
    volume: RankedItem[];
  };
  concerns: ConcernSolution[];
  style: {
    name: string;
    description: string;
    length: string;
    design: string;
    layer: string;
    mood: string;
  };
  volume: { items: RankedItem[]; advice: string };
  treatments: CareTip[];
  homecare: CareTip[];
  products: BeautyProduct[];
}

// ----------------------------------------------------------------------------
// 답변 조회 헬퍼
// ----------------------------------------------------------------------------

function single(answers: Answers, qid: string): string | undefined {
  const a = answers[qid];
  return typeof a === "string" ? a : undefined;
}

function multi(answers: Answers, qid: string): string[] {
  const a = answers[qid];
  if (Array.isArray(a)) return a;
  if (typeof a === "string") return [a]; // single-select 필드도 배열로 처리
  return [];
}

function labelOf(qid: string, optId?: string): string {
  if (!optId) return "";
  return QUESTION_MAP[qid]?.options.find((o) => o.id === optId)?.label ?? optId;
}

// ----------------------------------------------------------------------------
// 고민 통합 헬퍼
// q2_concern(단일) + q2b_extra_concern(복수) → 순위 배열
// ----------------------------------------------------------------------------

function buildConcernRanked(answers: Answers): RankedItem[] {
  const main = single(answers, "q2_concern");
  const extras = multi(answers, "q2b_extra_concern").filter(
    (id) => id !== "none_extra",
  );

  const items: RankedItem[] = [];

  if (main && main !== "none_concern") {
    items.push({
      rank: 1,
      id: main,
      label: labelOf("q2_concern", main),
    });
  }

  extras.forEach((id, idx) => {
    items.push({
      rank: items.length + idx + 1,
      id,
      label: labelOf("q2b_extra_concern", id),
    });
  });

  return items;
}

// ----------------------------------------------------------------------------
// 영문 토큰 맵 (동적 프롬프트용)
// ----------------------------------------------------------------------------

const AGE_TOKEN: Record<string, string> = {
  "10s": "a Korean teenage girl",
  "20s": "a Korean woman in her 20s",
  "30s": "a Korean woman in her 30s",
  "40s": "a Korean woman in her mid 40s",
  "50s": "a Korean woman in her mid 50s",
  "60s": "an elegant Korean woman in her 60s",
};

const CURL_TOKEN: Record<string, string> = {
  straight: "straight hair",
  semi: "slightly wavy hair",
  curly: "naturally curly hair",
  very_curly: "very curly frizzy hair",
};

const THICKNESS_TOKEN: Record<string, string> = {
  thin: "fine thin hair strands",
  normal: "medium thickness hair",
  thick: "thick strong hair strands",
};

const DENSITY_TOKEN: Record<string, string> = {
  low: "sparse low-density hair",
  normal: "normal hair density",
  high: "dense voluminous hair",
};

const LENGTH_TOKEN: Record<string, string> = {
  short: "short haircut",
  bob: "chin-length bob",
  shoulder: "shoulder-length hair",
  collarbone: "collarbone-length hair",
  chest: "long chest-length hair",
};

const DESIGN_TOKEN: Record<string, string> = {
  straight: "sleek straight style",
  c_curl: "soft thick C-curl",
  s_curl: "natural flowing S-curl",
  wave: "romantic flowing waves",
};

const MOOD_TOKEN: Record<string, string> = {
  elegant: "elegant feminine vibe",
  chic: "chic charismatic mood",
  natural: "natural effortless look",
  professional: "neat professional style",
};

const VOLUME_TOKEN: Record<string, string> = {
  top: "voluminous lifted crown roots",
  part: "lifted parting volume",
  front: "volume at the front bangs",
  side: "side head volume",
  back: "volume at the back of the head",
};

const VOLUME_BALANCE_TOKEN: Record<string, string> = {
  add_little: "slightly increased overall volume",
  add_much: "significantly boosted full volume",
  reduce: "calm reduced volume, sleek silhouette",
  keep: "natural volume as-is",
};

const CONCERN_TOKEN: Record<string, string> = {
  crown_volume: "lifted crown volume",
  forehead_wide: "side-swept bangs covering a wide forehead",
  side_volume: "side head volume enhancement",
  too_fluffy: "calm smooth volume-down",
  length_change: "fresh transformed length",
  tangle_damage: "smooth healthy repaired hair",
  gray_root: "natural even root color, no gray",
  scalp: "healthy scalp condition",
  styling_hard: "easy-to-style effortless finish",
};

const BANGS_TOKEN: Record<string, string> = {
  keep_yes: "with bangs",
  keep_no: "without bangs, forehead exposed",
  new: "new see-through bangs",
  grow: "grown-out side bangs",
  thinking: "",
};

// ----------------------------------------------------------------------------
// 가르마 정규화 — left/right → side_part 로 통합
// ----------------------------------------------------------------------------

/**
 * q4_part 원본 값을 알고리즘용 정규화 값으로 변환합니다.
 * '왼쪽 가르마(left)' 와 '오른쪽 가르마(right)' 는 방향만 다를 뿐
 * 처방 로직상 동일한 '옆가르마(side_part)' 로 취급합니다.
 */
export function normalizeParting(raw: string | undefined): string {
  if (raw === "left" || raw === "right") return "side_part";
  return raw ?? "undecided";
}

const PART_TOKEN: Record<string, string> = {
  side_part: "side-parted hair",
  center: "center-parted hair",
  allback: "hair swept all back, no visible parting",
  bangs_no_part: "with bangs covering the parting",
  undecided: "",
};

const NEGATIVE_PROMPT =
  "frizzy, messy hair, tangled, gray roots, flat hair, dull, low quality, blurry, deformed face, extra fingers, watermark, text";

// ----------------------------------------------------------------------------
// 1) 동적 프롬프트 생성 — 연령대가 스타일 방향성의 기준이 됨
// ----------------------------------------------------------------------------

export function buildPrompt(answers: Answers): AiPrompt {
  const parts: { label: string; token: string }[] = [];

  const push = (label: string, token?: string) => {
    if (token) parts.push({ label, token });
  };

  // 연령대가 첫 번째 기준 — 스타일 방향성을 결정
  push("연령", AGE_TOKEN[single(answers, "q1_age") ?? ""]);
  push("기장", LENGTH_TOKEN[multi(answers, "q11_length")[0] ?? ""]);
  push("디자인", DESIGN_TOKEN[single(answers, "q13_design") ?? ""]);
  push("앞머리", BANGS_TOKEN[single(answers, "q6_bangs") ?? ""]);
  // 가르마: left/right → side_part 정규화 후 프롬프트 주입
  const normPart = normalizeParting(single(answers, "q4_part"));
  push("가르마", PART_TOKEN[normPart]);
  push("모발 굵기", THICKNESS_TOKEN[single(answers, "q7_thickness") ?? ""]);
  push("숱", DENSITY_TOKEN[single(answers, "q8_density") ?? ""]);
  push("곱슬", CURL_TOKEN[single(answers, "q3_curl") ?? ""]);
  push("무드", MOOD_TOKEN[single(answers, "q12_mood") ?? ""]);
  push("볼륨 밸런스", VOLUME_BALANCE_TOKEN[single(answers, "q16_volume_balance") ?? ""]);

  // 볼륨 위치 (우선순위 1순위)
  const topVolume = rankedSelections(
    "q15_volume",
    multi(answers, "q15_volume").filter((id) => id !== "none_volume"),
  )[0];
  push("볼륨 위치", topVolume ? VOLUME_TOKEN[topVolume.id] : undefined);

  // 주요 고민만 AI 프롬프트에 주입 (추가 고민/시술 이력은 커머스 전용)
  const mainConcern = single(answers, "q2_concern");
  if (mainConcern && mainConcern !== "none_concern") {
    push("주요 고민", CONCERN_TOKEN[mainConcern]);
  }

  const quality =
    "soft studio lighting, salon hair photography, glossy healthy hair, photorealistic, highly detailed, 8k";

  const positive = [...parts.map((p) => p.token), quality].join(", ");

  return { positive, negative: NEGATIVE_PROMPT, parts };
}

// ----------------------------------------------------------------------------
// 2) 연령/고민별 레퍼런스 매칭
// ----------------------------------------------------------------------------

export function matchReference(answers: Answers): ReferenceStyle {
  const age = single(answers, "q1_age") as AgeBand | undefined;
  const concernRanked = buildConcernRanked(answers);
  const lengths = multi(answers, "q11_length");

  let best: ReferenceStyle = DEFAULT_REFERENCE;
  let bestScore = -1;

  for (const ref of REFERENCE_TABLE) {
    let score = 0;

    if (age && ref.ages.includes(age)) score += 3;

    concernRanked.forEach((c, idx) => {
      if (ref.concerns.includes(c.id)) {
        score += idx === 0 ? 5 : idx === 1 ? 2 : 1;
      }
    });

    if (ref.lengths && lengths.some((l) => ref.lengths!.includes(l))) score += 1;
    if (ref.concerns.length > 0 && score > 0) score += 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = ref;
    }
  }

  return best;
}

// ----------------------------------------------------------------------------
// 3) 우선순위 요약 카드
// ----------------------------------------------------------------------------

export function prioritySummary(answers: Answers): {
  concerns: RankedItem[];
  volume: RankedItem[];
} {
  return {
    concerns: buildConcernRanked(answers),
    volume: rankedSelections(
      "q15_volume",
      multi(answers, "q15_volume").filter((id) => id !== "none_volume"),
    ),
  };
}

// ----------------------------------------------------------------------------
// 4) 자사 제품 처방
// ----------------------------------------------------------------------------

export function prescribeProducts(answers: Answers): BeautyProduct[] {
  const concernRanked = buildConcernRanked(answers);
  const concernIds = concernRanked.map((c) => c.id);
  const history = multi(answers, "q10_history");
  const damage = single(answers, "q9_damage");

  const picked: BeautyProduct[] = [];
  const seen = new Set<string>();

  const add = (p?: BeautyProduct) => {
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      picked.push(p);
    }
  };

  for (const cid of concernIds) {
    const match = PRODUCT_CATALOG.find((p) => p.concerns.includes(cid));
    add(match);
  }

  for (const p of PRODUCT_CATALOG) {
    const byDamage = damage && p.damages?.includes(damage);
    const byHistory = p.histories?.some((h) => history.includes(h));
    if (byDamage || byHistory) add(p);
  }

  if (picked.length < 2) {
    for (const p of PRODUCT_CATALOG) {
      if (p.concerns.length === 0) add(p);
      if (picked.length >= 2) break;
    }
  }

  return picked.slice(0, 3);
}

// ----------------------------------------------------------------------------
// 해시태그 생성
// ----------------------------------------------------------------------------

function buildHashtags(answers: Answers): string[] {
  const tags = new Set<string>();
  const age = single(answers, "q1_age");
  const design = single(answers, "q13_design");
  const bangs = single(answers, "q6_bangs");
  const mood = single(answers, "q12_mood");
  const concernRanked = buildConcernRanked(answers);
  const volume = rankedSelections(
    "q15_volume",
    multi(answers, "q15_volume").filter((id) => id !== "none_volume"),
  )[0];
  const damage = single(answers, "q9_damage");
  const volumeBalance = single(answers, "q16_volume_balance");

  if (age) tags.add(`#${age}_recommend`);

  if (design === "straight") tags.add("#sleek_straight");
  if (design === "c_curl" || design === "s_curl") tags.add("#volume_curl");
  if (design === "wave") tags.add("#romantic_wave");

  if (bangs === "new") tags.add("#see_through");
  if (bangs === "keep_no") tags.add("#no_bangs");

  const moodTag: Record<string, string> = {
    elegant: "#elegant_feminine",
    chic: "#chic_charisma",
    natural: "#natural_mood",
    professional: "#neat_professional",
  };
  if (mood && moodTag[mood]) tags.add(moodTag[mood]);

  concernRanked.slice(0, 2).forEach((c) => {
    const t: Record<string, string> = {
      crown_volume: "#crown_volume",
      forehead_wide: "#forehead_cover",
      side_volume: "#side_volume",
      too_fluffy: "#volume_down",
      length_change: "#new_length",
      tangle_damage: "#hair_repair",
      gray_root: "#natural_black",
      scalp: "#scalp_care",
      styling_hard: "#easy_style",
    };
    if (t[c.id]) tags.add(t[c.id]);
  });

  if (volume?.id === "top") tags.add("#root_volume");
  if (volume?.id === "part") tags.add("#parting_volume");
  if (damage === "damaged" || damage === "severe") tags.add("#hair_repair");
  if (volumeBalance === "reduce") tags.add("#volume_down");
  if (volumeBalance === "add_much") tags.add("#full_volume");

  return Array.from(tags).slice(0, 7);
}

// ----------------------------------------------------------------------------
// 고민별 맞춤 해법
// ----------------------------------------------------------------------------

const CONCERN_SOLUTION: Record<string, string> = {
  crown_volume:
    "정수리 뿌리 볼륨펌과 가르마 이동으로 꺼진 볼륨을 살려 한층 어려 보이는 입체 라인을 완성해요.",
  forehead_wide:
    "사이드 뱅·시스루 앞머리로 넓은 이마를 자연스럽게 보완하고 얼굴형을 작아 보이게 연출해요.",
  side_volume:
    "옆두상 볼륨 셋팅펌으로 납작한 옆 라인을 살려 두상을 예쁘게 보정해요.",
  too_fluffy:
    "볼륨을 차분하게 가라앉히는 다운 매직·컷팅 기법으로 정돈되고 세련된 실루엣을 만들어요.",
  length_change:
    "현재 모발 상태와 얼굴형을 고려해 가장 어울리는 기장 변화 방향을 제안해 드려요.",
  tangle_damage:
    "단백질 클리닉과 큐티클 코팅으로 엉킴·손상을 회복시켜 매끈한 결을 되살려요.",
  gray_root:
    "뿌리 새치 커버 염색과 두피 저자극 컬러로 환하고 균일한 톤을 유지해 드려요.",
  scalp:
    "두피 진정 케어와 저자극 제품으로 열감·각질을 줄이고 건강한 두피 환경을 만들어요.",
  styling_hard:
    "손질이 쉬운 컷팅 라인과 유지력 높은 스타일링 기법으로 아침 시간을 확 줄여드려요.",
};

// ----------------------------------------------------------------------------
// 메인 진입점
// ----------------------------------------------------------------------------

export function recommend(answers: Answers): DiagnosisResult {
  const age = single(answers, "q1_age");
  const curl = single(answers, "q3_curl");
  const thickness = single(answers, "q7_thickness");
  const density = single(answers, "q8_density");
  const damage = single(answers, "q9_damage");
  const mood = single(answers, "q12_mood");
  const design = single(answers, "q13_design");
  const dry = single(answers, "q5_dry");

  const concernRanked = buildConcernRanked(answers);
  const volumeRanked = rankedSelections(
    "q15_volume",
    multi(answers, "q15_volume").filter((id) => id !== "none_volume"),
  );
  const lengths = multi(answers, "q11_length");
  const layers = multi(answers, "q14_layer");
  const history = multi(answers, "q10_history");
  const volumeBalance = single(answers, "q16_volume_balance");

  // ---- 헤드라인 ---
  const ageLabel = labelOf("q1_age", age);
  const curlLabel = labelOf("q3_curl", curl);
  const headline = `${ageLabel || "고객"}님은 ${curlLabel || "고유한"} 모발에 ${
    labelOf("q8_density", density) || "보통"
  } 숱을 가진 타입이에요. ${
    labelOf("q12_mood", mood) || "내추럴한"
  } 무드에 어울리는 동안 스타일을 처방해 드릴게요.`;

  // ---- 진단 태그 ---
  const tags = [
    thickness && `모발 ${labelOf("q7_thickness", thickness)}`,
    density && `숱 ${labelOf("q8_density", density)}`,
    curlLabel,
    damage && `손상 ${labelOf("q9_damage", damage)}`,
  ].filter(Boolean) as string[];

  // ---- 고민 해법 ---
  const concerns: ConcernSolution[] = concernRanked.map((c) => ({
    rank: c.rank,
    concern: c.label,
    solution: CONCERN_SOLUTION[c.id] ?? "전문 디자이너의 맞춤 상담으로 해결해 드려요.",
  }));

  // ---- 추천 스타일 스펙 ---
  const lengthLabel = lengths.length
    ? lengths.map((id) => labelOf("q11_length", id)).join(" · ")
    : "어깨선";
  const designLabel = labelOf("q13_design", design) || "내추럴 컬";
  const layerLabel = layers.length
    ? layers.map((id) => labelOf("q14_layer", id)).join(" · ")
    : "약한 레이어";
  const moodLabel = labelOf("q12_mood", mood) || "내추럴";
  const primaryLength = lengths[0] ? labelOf("q11_length", lengths[0]) : "어깨선";
  const designShort =
    design === "straight"
      ? "내추럴 스트레이트"
      : design === "wave"
        ? "로맨틱 웨이브"
        : design === "s_curl"
          ? "내추럴 S컬"
          : "볼륨 C컬";
  const hasRichLayer = layers.includes("rich");
  const styleName = `${primaryLength} ${designShort}${hasRichLayer ? " 레이어드" : ""}`;
  const styleDescription = `${moodLabel} 무드를 살린 ${primaryLength} 기장의 ${designShort} 스타일이에요. ${
    hasRichLayer
      ? "풍성한 레이어로 얼굴 라인을 부드럽게 감싸 동안 효과를 극대화해요."
      : "은은한 층으로 자연스러운 흐름과 볼륨을 살려요."
  }`;

  // ---- 볼륨 처방 ---
  const volumeBalanceLabel: Record<string, string> = {
    add_little: "조금 추가",
    add_much: "많이 추가",
    reduce: "감소",
    keep: "유지",
  };
  const topVolume = volumeRanked[0];
  const volumeAdvice = topVolume
    ? `1순위로 선택하신 '${topVolume.label}' 부위에 집중 볼륨 셋팅을 적용해요.${
        volumeBalance && volumeBalance !== "keep"
          ? ` 전체 볼륨은 '${volumeBalanceLabel[volumeBalance] ?? ""}'으로 조정해 드려요.`
          : ""
      }`
    : volumeBalance === "reduce"
      ? "전체적인 볼륨을 차분하게 줄여 정돈된 실루엣을 만들어 드려요."
      : "두상 전체의 균형을 고려한 자연스러운 볼륨 셋팅을 추천해요.";

  // ---- 추천 시술 ---
  const treatments: CareTip[] = [];
  if (curl === "very_curly" || curl === "curly") {
    treatments.push(
      design === "straight"
        ? {
            title: "볼륨 매직 + 손상 케어",
            body: "강한 곱슬을 부드럽게 펴면서 뿌리 볼륨은 살리는 셋팅으로 아침 시간을 줄여드려요.",
          }
        : {
            title: "디자인 셋팅펌",
            body: "타고난 컬을 정돈해 원하시는 컬 흐름을 자연스럽게 완성해요.",
          },
    );
  } else if (design === "wave" || design === "c_curl" || design === "s_curl") {
    treatments.push({
      title: design === "wave" ? "로맨틱 웨이브펌" : design === "c_curl" ? "볼륨 C컬펌" : "내추럴 S컬펌",
      body: "원하시는 컬 디자인을 모발 굵기에 맞춰 셋팅해, 손질이 쉬운 컬을 만들어 드려요.",
    });
  } else {
    treatments.push({
      title: "뿌리 볼륨펌",
      body: "직모의 찰랑임은 유지하면서 뿌리에만 볼륨을 더해 입체적인 라인을 살려요.",
    });
  }
  if (damage === "damaged" || damage === "severe") {
    treatments.push({
      title: "집중 단백질 클리닉",
      body: "시술 전 손상 모발을 회복시켜 펌·컬러의 지속력과 결을 동시에 살리는 필수 케어예요.",
    });
  } else if (damage === "slight") {
    treatments.push({
      title: "데일리 영양 클리닉",
      body: "약간의 손상을 케어해 윤기와 결을 한 단계 끌어올려요.",
    });
  }
  if (concernRanked.some((c) => c.id === "gray_root")) {
    treatments.push({
      title: "저자극 뿌리 새치 커버",
      body: "두피 자극을 최소화한 컬러로 새치를 자연스럽게 커버하고 환한 인상을 완성해요.",
    });
  }

  // ---- 홈케어 ---
  const homecare: CareTip[] = [];
  homecare.push(
    dry === "natural" || dry === "rarely"
      ? {
          title: "뿌리부터 말리기",
          body: "자연 건조 대신 뿌리를 세워 말리면 볼륨이 오래 유지되고 두피 건강에도 좋아요.",
        }
      : {
          title: "찬바람 마무리",
          body: "드라이 마지막에 찬바람으로 큐티클을 정돈하면 윤기와 셋팅 지속력이 올라가요.",
        },
  );
  if (damage === "damaged" || damage === "severe" || history.includes("bleach")) {
    homecare.push({
      title: "주 2회 홈 트리트먼트",
      body: "손상 모발은 단백질·유분 밸런스 케어가 핵심이에요. 모발 끝 위주로 집중 케어하세요.",
    });
  }
  if (concernRanked.some((c) => c.id === "crown_volume")) {
    homecare.push({
      title: "가르마 바꿔주기",
      body: "같은 가르마를 오래 두면 볼륨이 죽어요. 며칠에 한 번 가르마를 살짝 옮겨 주세요.",
    });
  }
  if (homecare.length < 2) {
    homecare.push({
      title: "열기구 온도 낮추기",
      body: "고데기·드라이 온도를 낮추면 손상을 줄이고 컬·볼륨을 더 오래 유지할 수 있어요.",
    });
  }

  return {
    headline,
    hashtags: buildHashtags(answers),
    tags,
    reference: matchReference(answers),
    aiPrompt: buildPrompt(answers),
    priority: prioritySummary(answers),
    concerns,
    style: {
      name: styleName,
      description: styleDescription,
      length: lengthLabel,
      design: designLabel,
      layer: layerLabel,
      mood: moodLabel,
    },
    volume: { items: volumeRanked, advice: volumeAdvice },
    treatments,
    homecare,
    products: prescribeProducts(answers),
  };
}

export const TREATMENT_COUNTS_KEY = "donganbibeop:treatment_counts";
export const RESULT_STORAGE_KEY = "donganbibeop:answers";
export const PHOTO_KEY = "donganbibeop:photo";
export const SELECTED_STYLE_KEY = "donganbibeop:selected_style";

// ============================================================================
// 얼굴형 처방전 엔진
// ============================================================================

export type FaceShapeType =
  | "oval"
  | "round"
  | "oblong"
  | "square"
  | "heart"
  | "diamond"
  | "hexagon"
  | "peanut";

export interface FacePrescriptionResult {
  title: string;
  baseDefinition: string;
  advantage: string;
  weakness: string;
  expertPrescription: string;
  volumeSolution: string;
}

export const FACE_SHAPE_BASE_DB: Record<
  FaceShapeType,
  { title: string; baseDefinition: string; advantage: string; weakness: string }
> = {
  oval: {
    title: "황금비율 계란형 (Oval)",
    baseDefinition:
      "당신의 얼굴형은 완벽에 가까운 황금비율, 계란형입니다. 가로와 세로의 비율이 이상적이며 턱선이 부드럽게 이어지는 가장 안정적인 얼굴형입니다.",
    advantage:
      "단아하고 여성스러우며 어떤 스타일이든 완벽하게 소화해 내는 만능 얼굴형입니다. 얼굴선을 가리기보다는 시원하게 드러내는 스타일을 추천하며, 자연스러운 가르마나 가벼운 묶음 머리가 아름다움을 극대화합니다.",
    weakness:
      "단점이 거의 없지만 자칫 밋밋해 보일 수 있습니다. 레이어드 컷으로 텍스처를 주거나, 눈썹 윗기장의 앞머리, 가닥뱅 등으로 무드를 더해주세요. 과도한 풀뱅이나 무거운 사이드뱅은 매력을 반감시킬 수 있으니 피하는 것이 좋습니다.",
  },
  round: {
    title: "부드러운 동안 둥근형 (Round)",
    baseDefinition:
      "당신의 얼굴형은 부드러운 곡선이 돋보이는 둥근형입니다. 가로와 세로의 비율이 비슷하며, 광대와 턱선의 뼈대가 도드라지지 않아 유연한 윤곽을 가졌습니다.",
    advantage:
      "'동안'의 정석입니다. 실제 나이보다 어리고 생기 있어 보이며 귀엽고 사랑스러운 매력을 가졌습니다. 둥근 얼굴이 갸름해 보이도록 정수리 볼륨을 풍성하게 살려 세로로 길게 연장하는 스타일이 찰떡입니다.",
    weakness:
      "얼굴 여백이 넓어 보일 수 있으니, 이마 중심을 비우는 시스루뱅이나 얼굴 옆선을 감싸는 라운드뱅/사이드뱅이 필수입니다. 빽빽한 풀뱅이나 양옆으로 퍼지는 강한 웨이브, 턱선 기장의 똑단발은 얼굴을 부해 보이게 하므로 피해주세요.",
  },
  oblong: {
    title: "지적이고 세련된 긴형 (Oblong)",
    baseDefinition:
      "당신의 얼굴형은 갸름한 선이 매력적인 긴형입니다. 가로 폭보다 세로의 비율이 더 길며, 전체적으로 날렵하고 매끄러운 윤곽을 가지고 있습니다.",
    advantage:
      "지적이고 세련된 분위기를 자아내며, 고급스러운 페미닌 무드나 모던한 오피스룩을 완벽하게 소화합니다. 옆머리(사이드) 쪽에 풍성한 볼륨감을 주어 가로 폭을 채워주는 굵은 웨이브 스타일을 강력 추천합니다.",
    weakness:
      "자칫 나이 들어 보이거나 인상이 날카로워 보일 수 있습니다. 풀뱅이나 시스루뱅, 소프트 풀뱅으로 이마를 덮어 세로 길이를 축소해 주세요. 5:5 가르마의 딱 붙는 생머리나 정수리 볼륨을 과도하게 살린 디자인은 절대 피해야 합니다.",
  },
  square: {
    title: "매력적인 입체감 각진형 (Square)",
    baseDefinition:
      "당신의 얼굴형은 매력적인 각을 가진 각진형(사각형)입니다. 이마와 턱선의 너비가 비슷하며, 하관에 안정감 있고 트렌디한 골격이 살아있습니다.",
    advantage:
      "신뢰감을 주며 당당하고 카리스마 넘치는 인상을 줍니다. 최근 글로벌 뷰티 트렌드에서 가장 사랑받는 고급스러운 골격입니다. 턱선의 단단함을 부드럽게 감싸는 소프트 레이어드 컷이나 굵은 C/S컬 웨이브가 우아함을 극대화합니다.",
    weakness:
      "하관이 도드라져 인상이 딱딱해 보일 수 있습니다. 커튼뱅이나 사이드뱅을 연출해 각진 인상을 부드럽게 중화시켜 주세요. 턱선에서 뭉툭하게 떨어지는 일자 단발(칼단발)이나 무거운 풀뱅, 슬릭컷은 하관을 부각하므로 피해야 합니다.",
  },
  heart: {
    title: "날렵한 V라인 하트형/역삼각형 (Heart)",
    baseDefinition:
      "당신의 얼굴형은 날렵한 V라인이 돋보이는 하트형(역삼각형)입니다. 상안부(이마/광대)가 넓고 하안부(턱선)로 갈수록 좁아져 갸름한 턱끝을 가지고 있습니다.",
    advantage:
      "도회적이고 트렌디하며, 묘하게 보호 본능을 자극하는 요정 같은 분위기를 자아냅니다. 사진이 가장 선명하게 나오는 얼굴형이기도 합니다. 턱선 부근에서 뻗치는 굵은 웨이브 단발이나 미디엄 기장의 펌이 아주 잘 어울립니다.",
    weakness:
      "무게중심이 위에 쏠려 다소 날카로운 인상을 줄 수 있습니다. 사선 앞머리(사이드 스웹 뱅)나 커튼뱅으로 넓은 이마를 좁혀주세요. 넓은 이마를 완전히 드러내거나 정수리만 띄운 스타일, 턱선을 다 드러내는 짧은 숏컷은 턱을 더 빈약하게 만듭니다.",
  },
  diamond: {
    title: "엣지 넘치는 다이아몬드형 (Diamond)",
    baseDefinition:
      "당신의 얼굴형은 입체감이 살아있는 다이아몬드형(마름모형)입니다. 이마와 턱 끝은 좁고 갸름하지만, 중안부(광대) 부분이 얼굴에서 가장 넓은 비율을 차지합니다.",
    advantage:
      "굉장히 개성 있고 엣지 넘치는 분위기를 가졌습니다. 적절하게 발달한 광대는 얼굴을 리프팅되어 보이게 해 입체적인 섹시함을 연출하기 좋습니다. 광대를 부드럽게 스치는 사이드뱅이나 층이 많은 레이어드/허쉬컷이 세련미를 극대화합니다.",
    weakness:
      "광대와 좁은 하관의 대비로 강한 인상을 줄 수 있습니다. 앞/옆머리를 자연스럽게 이어 튀어나온 골격을 시각적으로 깎아주는 롱 뱅이나 블록뱅 기법이 좋습니다. 광대 위치에서 뚝 끊기는 일자 앞머리나 딱 붙는 포니테일은 피해야 합니다.",
  },
  hexagon: {
    title: "고혹적인 카리스마 육각형 (Hexagon)",
    baseDefinition:
      "당신의 얼굴형은 골격의 입체감이 돋보이는 육각형입니다. 광대뼈가 매력적으로 발달함과 동시에 턱선에도 또렷한 각이 살아있어 얼굴선이 선명합니다.",
    advantage:
      "압도적인 카리스마와 귀족적인 분위기를 뿜어냅니다. 구조적인 뼈대 덕분에 드라마틱한 이미지 변신이 가능합니다. 뼈대의 직선 느낌을 중화시켜 줄 풍성한 롱 레이어드 컷과 굵은 글램 웨이브(S컬)가 입체감을 우아하게 감싸줍니다.",
    weakness:
      "자칫 기가 세 보일 수 있으니 얼굴 주변에 크고 부드러운 공기감(볼륨)을 채워 넣어야 합니다. 시스루뱅이나 히피/퍼피뱅으로 골격을 지워주세요. 얼굴 라인에 딱 붙는 슬릭 생머리나 귀 파인 숏컷, 무거운 일자 앞머리는 인상을 딱딱하게 만듭니다.",
  },
  peanut: {
    title: "오묘한 매력의 유니크 땅콩형 (Peanut)",
    baseDefinition:
      "당신의 얼굴형은 유니크한 굴곡을 가진 땅콩형입니다. 광대가 돌출되어 있으면서 그 위/아래(관자놀이, 볼)가 패여 있어 얼굴 라인에 여러 곡선이 존재합니다.",
    advantage:
      "한국 여성에게 특화된 얼굴형으로, 헤어 볼륨 조절에 따라 성숙함과 사랑스러움을 완벽히 오가는 입체적이고 오묘한 매력을 풍깁니다. 패인 관자놀이의 뿌리 볼륨을 살리고 광대를 타고 흐르는 사이드뱅/잔머리컷을 내면 완벽한 계란형으로 보정됩니다.",
    weakness:
      "얼굴선이 울퉁불퉁해 피곤해 보일 수 있습니다. 머리가 딱 달라붙지 않게 하고 굴곡을 채우는 C컬 볼륨을 더해야 합니다. 이마와 패인 관자놀이를 여과 없이 드러내는 짧은 처피뱅, 5:5 가르마, 꽉 묶는 올백 스타일은 콤플렉스를 부각하므로 피하세요.",
  },
};

// 40종 얼굴형 × 디자인 상황별 맞춤 처방 (8 face shapes × 5 scenarios)
const EXPERT_PRESCRIPTION_DB: Record<string, string> = {
  // ── oval (계란형) ──
  oval_straight:
    "황금비율 계란형에 스트레이트는 최고의 궁합이에요. 자연스러운 사선 가르마에 뿌리 볼륨만 살리면 얼굴선이 시원하게 드러나 고급스러운 페미닌 무드가 완성됩니다. 가닥뱅이나 눈썹 위 기장의 짧은 뱅으로 포인트를 더해 개성을 살려보세요.",
  oval_c_curl:
    "계란형 얼굴에 C/S컬 볼륨펌은 완벽한 것에 생기를 더하는 조합이에요. 어깨~쇄골 기장에 풍성한 C컬 볼륨을 더하면 여성스러움이 폭발합니다. 뿌리는 볼륨 있게, 끝은 부드럽게 흐르는 디자인이 포인트예요.",
  oval_wave:
    "계란형에 로맨틱 웨이브는 화보 속 주인공 같은 분위기를 완성해요. 미디엄~롱 기장 어디에서든 물결이 자연스럽게 흘러 드라마틱한 변신이 가능합니다. 가르마 부분을 시스루뱅으로 처리하면 더욱 세련돼 보여요.",
  oval_damage:
    "계란형의 장점을 제대로 살리려면 모발 건강 회복이 우선이에요. 집중 단백질 클리닉으로 탄력을 회복한 뒤 원하시는 스타일을 시술하면 결과물이 더 아름답고 오래 유지됩니다.",
  oval_volume:
    "계란형은 어떤 볼륨 방향도 아름답게 소화해요. 원하시는 볼륨 위치에 뿌리 볼륨펌을 정교하게 적용하면 입체적인 두상 라인과 사진이 잘 나오는 실루엣이 완성됩니다.",

  // ── round (둥근형) ──
  round_straight:
    "둥근형 얼굴에 스트레이트는 정수리 볼륨이 핵심이에요. 뿌리 볼륨펌으로 두상 세로 길이를 늘려 얼굴이 갸름해 보이는 마법 같은 효과를 연출하세요. 5:5 가르마보다는 사선 가르마 또는 시스루뱅을 조합하면 완성도가 높아져요.",
  round_c_curl:
    "둥근형에 C컬 볼륨펌은 최고의 조합이에요. 정수리에 볼륨을 풍성하게 살리고 사이드는 얼굴에 자연스럽게 흘러내리도록 셋팅하면 세로 실루엣이 강조되어 갸름하고 동안인 얼굴이 완성됩니다.",
  round_wave:
    "둥근형에 웨이브는 세로 길이를 확보하는 것이 관건이에요. 정수리 볼륨을 살리고 아래로 자연스럽게 흐르는 S웨이브를 연출하면 얼굴이 길어 보이는 착시 효과를 극대화할 수 있어요.",
  round_damage:
    "둥근형 얼굴형 보정을 위한 볼륨펌 전, 모발 손상 케어를 먼저 진행해야 해요. 손상된 모발로는 셋팅력이 떨어져 볼륨이 오래 유지되지 않으니 클리닉 후 시술을 권장합니다.",
  round_volume:
    "둥근형은 정수리 볼륨이 생명이에요. 뿌리 볼륨펌으로 정수리를 최대한 끌어올리고 옆머리는 납작하게 정돈하여 타원형 실루엣을 만들어 주세요. 앞머리는 시스루뱅이나 사이드뱅으로 넓은 볼을 자연스럽게 가려주는 게 포인트입니다.",

  // ── oblong (긴형) ──
  oblong_straight:
    "긴 얼굴형에 스트레이트는 뱅(앞머리) 활용이 관건이에요. 풀뱅이나 소프트 풀뱅으로 이마를 자연스럽게 커버하고, 양옆에도 약간의 볼륨을 더해 가로 폭을 채워주세요. 이마를 드러내는 올백 스타일은 피하는 게 좋아요.",
  oblong_c_curl:
    "긴형 얼굴에 C/S컬은 사이드 볼륨으로 가로 폭을 채우는 것이 핵심이에요. 양쪽 사이드에 풍성한 C컬 볼륨을 살리면 갸름한 인상이 부드럽게 중화되어 이상적인 비율로 보정됩니다.",
  oblong_wave:
    "긴 얼굴형에 풍성한 웨이브는 환상적인 조합이에요. 굵은 S웨이브가 양옆으로 펼쳐지면서 가로 폭을 채워주고, 풀뱅이나 시스루뱅을 더하면 완벽한 얼굴형 보정 효과를 볼 수 있어요.",
  oblong_damage:
    "긴형 얼굴의 보정 스타일은 볼륨감이 필수인데, 손상된 모발은 볼륨이 잘 살지 않아요. 먼저 집중 클리닉으로 모발 탄력을 회복한 뒤 사이드 볼륨 웨이브펌을 시술받으세요.",
  oblong_volume:
    "긴 얼굴형은 옆머리(사이드) 볼륨으로 가로 너비를 채우는 것이 핵심이에요. 사이드 볼륨을 최우선으로 고려하여 세로 실루엣을 단축하는 방향으로 스타일을 설계해 드릴게요.",

  // ── square (각진형) ──
  square_straight:
    "각진형 얼굴에 스트레이트는 사이드뱅이나 커튼뱅을 조합하는 것이 포인트예요. 각진 턱선을 자연스럽게 감싸는 앞머리로 부드러운 인상을 연출하고, 전체적으로 차분하게 흘러내리는 볼륨 스트레이트로 우아함을 완성하세요.",
  square_c_curl:
    "각진형 얼굴에 C/S컬은 각진 인상을 부드럽게 중화하는 최고의 방법이에요. 부드러운 C컬이 턱선을 자연스럽게 감싸면서 여성스러운 분위기를 극대화합니다. 커튼뱅이나 사이드뱅 조합을 추천해요.",
  square_wave:
    "각진형에 굵은 S/C웨이브는 단단한 인상을 로맨틱하게 변신시켜요. 턱선을 뻗치듯 감싸는 웨이브가 하관의 각을 시각적으로 부드럽게 중화시켜 줍니다. 커튼뱅으로 이마와 광대도 함께 보정하면 완성도가 더 높아요.",
  square_damage:
    "각진형 얼굴의 핵심 스타일링은 부드러운 C/S컬 웨이브인데, 손상 모발은 컬 유지력이 떨어져요. 단백질 클리닉으로 모발 강도를 높인 뒤 시술하면 매끄럽고 지속력 좋은 컬을 만들 수 있어요.",
  square_volume:
    "각진형 얼굴은 볼륨의 위치와 방향이 중요해요. 정수리 볼륨을 강조해 얼굴의 무게 중심을 위로 올리고, 하관 쪽 볼륨은 최소화하는 방향으로 셋팅하면 갸름하고 부드러운 실루엣이 완성됩니다.",

  // ── heart (하트형) ──
  heart_straight:
    "하트형 얼굴에 스트레이트는 턱선 부근에서 약간 뻗치는 볼륨이 포인트예요. 커튼뱅이나 사이드 스웹 뱅으로 넓은 이마를 자연스럽게 가리고, 아래로 갈수록 볼륨이 커지도록 레이어를 설계하면 이상적인 비율이 완성됩니다.",
  heart_c_curl:
    "하트형에 C컬 볼륨펌은 턱선 부근에 볼륨을 더해 얼굴 아래쪽 무게감을 균형 있게 만들어줘요. 미디엄~쇄골 기장에 커튼뱅을 조합하면 뾰족한 턱 주변이 볼륨감 있게 채워져 완벽한 균형미가 완성됩니다.",
  heart_wave:
    "하트형에 로맨틱 웨이브는 아래쪽 볼륨을 채우는 동시에 사랑스러운 분위기를 극대화해요. 턱선 아래에서 물결이 펼쳐지도록 셋팅하고 커튼뱅으로 이마를 자연스럽게 커버하면 환상적인 조합이 완성됩니다.",
  heart_damage:
    "하트형 얼굴의 포인트인 C컬 볼륨감을 제대로 살리려면 모발이 건강해야 해요. 손상 모발은 컬 탄력이 없어 금방 풀려버리므로, 단백질·유분 클리닉으로 모발 탄력을 먼저 회복해 주세요.",
  heart_volume:
    "하트형 얼굴은 하안부(볼/턱 주변) 볼륨 채우기가 핵심이에요. 볼륨펌 셋팅 시 아래쪽으로 볼륨이 펼쳐지도록 설계하여 위쪽이 넓은 역삼각형 얼굴의 무게 중심을 아래로 내려주세요.",

  // ── diamond (다이아몬드형) ──
  diamond_straight:
    "다이아몬드형에 스트레이트는 사이드뱅과 레이어가 핵심이에요. 광대를 자연스럽게 가리는 롱 사이드뱅이나 블록뱅을 더하고, 페이스 프레이밍 레이어로 이마와 턱을 시각적으로 채워주면 광대의 강한 인상이 부드럽게 보정됩니다.",
  diamond_c_curl:
    "다이아몬드형에 C컬은 이마와 턱선 쪽 볼륨을 채워 광대 위아래 비율을 균형 있게 만들어줘요. 이마 앞머리와 턱선 부근에 C컬 볼륨이 자연스럽게 흘러내리도록 셋팅하면 광대가 상대적으로 작아 보입니다.",
  diamond_wave:
    "다이아몬드형에 풍성한 웨이브는 광대의 강한 인상을 가장 효과적으로 중화시켜요. 굵은 C/S컬 웨이브가 이마와 턱선 주변을 채우면서 얼굴 전체가 균형 잡힌 부드러운 실루엣으로 변신합니다.",
  diamond_damage:
    "다이아몬드형 얼굴 보정에 필수인 페이스 프레이밍 레이어와 웨이브를 제대로 살리려면 모발이 건강해야 해요. 손상 모발은 레이어 컷의 윤곽이 흐릿해지므로 클리닉 후 시술을 권장합니다.",
  diamond_volume:
    "다이아몬드형은 이마 쪽 앞머리 볼륨과 턱선 쪽 끝 볼륨을 채우는 것이 핵심이에요. 광대가 가장 돌출된 부위이므로 위아래에 볼륨을 고르게 분산하는 방향으로 셋팅펌을 설계해 드릴게요.",

  // ── hexagon (육각형) ──
  hexagon_straight:
    "육각형 얼굴에 스트레이트는 공기감(볼륨) 없이는 딱딱해 보일 수 있어요. 뿌리 볼륨을 살리되 끝은 자연스럽게 흘러내리는 볼륨 스트레이트가 적합하며, 히피뱅이나 시스루뱅으로 얼굴 주변을 소프트하게 감싸주세요.",
  hexagon_c_curl:
    "육각형에 C/S컬 볼륨펌은 뼈대의 직선미를 부드럽게 중화하는 최고의 선택이에요. 풍성한 C컬이 광대와 턱선 주변을 감싸면서 고혹적인 카리스마를 부드러운 글램 분위기로 완성시켜 줍니다.",
  hexagon_wave:
    "육각형의 강한 골격에 글램 웨이브(굵은 S컬)는 카리스마적인 매력을 극대화하는 동시에 각진 선을 우아하게 감싸줘요. 롱 레이어드 컷에 굵은 웨이브를 더하면 가장 세련된 조합이 완성됩니다.",
  hexagon_damage:
    "육각형 얼굴의 핵심인 볼륨감 있는 글램 컬·웨이브는 모발 건강이 전제되어야 지속력이 유지돼요. 광대와 턱선 양쪽을 보정하는 볼륨 셋팅 전, 집중 클리닉으로 모발 탄력을 먼저 회복해 주세요.",
  hexagon_volume:
    "육각형 얼굴은 얼굴 주변 전체에 부드러운 공기감을 채우는 볼륨이 필요해요. 특히 광대와 턱선 부위를 넘어 흐르는 볼륨펌 셋팅이 선명한 골격을 자연스럽게 감싸 우아한 실루엣을 만들어 줍니다.",

  // ── peanut (땅콩형) ──
  peanut_straight:
    "땅콩형 얼굴에 스트레이트는 뿌리 볼륨이 절대적으로 중요해요. 패인 관자놀이 부분이 드러나지 않도록 뿌리 볼륨을 풍성하게 살리고, 광대 부분에서 자연스럽게 C자로 넘어가는 볼륨 스트레이트를 추천합니다.",
  peanut_c_curl:
    "땅콩형에 C컬 볼륨펌은 울퉁불퉁한 얼굴 굴곡을 채워주는 최고의 처방이에요. 패인 관자놀이에 뿌리 볼륨을 살리고, 광대를 부드럽게 타고 흐르는 C컬이 완벽한 계란형 실루엣으로 보정해 줍니다.",
  oval_s_curl:
    "굵은 S컬이 자칫 밋밋할 수 있는 완벽한 계란형에 입체적이고 화려한 페미닌 무드를 입혀줍니다. 턱선 아래부터 풍성하게 흐르도록 연출해 보세요.",
  round_s_curl:
    "둥근 얼굴에 옆으로 과하게 퍼지는 S컬은 피해주세요. 대신 끝단 위주로 굵은 S컬을 넣으면 시선이 아래로 분산되어 갸름해 보입니다.",
  oblong_s_curl:
    "긴 얼굴형에 풍성한 S컬은 환상적인 조합입니다. 옆광대와 턱선 쪽에 풍성한 S컬 볼륨을 채워 넣어 얼굴이 짧아 보이고 고급스러운 인상을 줍니다.",
  square_s_curl:
    "각진 하관을 S컬의 굵고 우아한 곡선이 감싸주어, 인상이 훨씬 부드럽고 럭셔리해지는 최고의 궁합입니다! 사이드뱅과 함께 매치하세요.",
  heart_s_curl:
    "귀 아래에서 시작되는 풍성한 S컬이 하안부에 무게감을 주어, 상/하체 밸런스를 완벽하게 맞춰줍니다. 뾰족한 턱선이 부드러워 보여요.",
  diamond_s_curl:
    "광대 옆에서 굵게 흐르는 S컬이 시선을 분산시켜 주어, 엣지 넘치는 다이아몬드형 얼굴에 우아한 페미닌 볼륨을 살려줍니다.",
  hexagon_s_curl:
    "뼈대의 직선적인 느낌을 S컬의 볼륨이 중화시켜 주어, 귀족적이고 고혹적인 분위기가 물씬 풍깁니다. 롱 레이어드 컷에 매치하면 완벽해요.",
  peanut_s_curl:
    "패이고 튀어나온 얼굴선 주변으로 굵은 S컬 파마를 만들어두시면, 모발의 곡선이 얼굴의 굴곡을 덮어 착시 효과로 얼굴이 매끈해 보입니다.",
  peanut_wave:
    "땅콩형에 굵은 웨이브는 얼굴의 굴곡을 가장 자연스럽게 채워주는 스타일이에요. 볼륨 있는 웨이브가 관자놀이와 볼 부분을 채우면서 입체적이고 사랑스러운 실루엣을 만들어 줍니다.",
  peanut_damage:
    "땅콩형 얼굴 보정에 필수인 뿌리 볼륨펌을 제대로 셋팅하려면 모발 탄력이 필요해요. 손상 모발은 뿌리 볼륨이 빨리 꺼지므로, 단백질 클리닉으로 모발을 먼저 회복한 뒤 볼륨펌을 시술받으세요.",
  peanut_volume:
    "땅콩형 얼굴의 핵심은 패인 관자놀이 볼륨을 채우는 것이에요. 뿌리 볼륨펌으로 관자놀이와 정수리 볼륨을 동시에 살리고, 광대를 자연스럽게 감싸는 사이드뱅 처리를 더하면 완벽한 계란형으로 보정됩니다.",
};

// Q16 볼륨 밸런스 × Q15 볼륨 위치 조합 분기 처방
const VOLUME_SOLUTION_DB: Record<string, string> = {
  add_little:
    "전체 볼륨을 조금 추가해 드릴게요. 뿌리 볼륨펌으로 납작한 두상을 자연스럽게 살리고, 선택하신 볼륨 위치에 집중 셋팅을 더해 풍성하지만 과하지 않은 자연스러운 볼륨을 완성해요.",
  add_much:
    "볼륨을 확실하게 늘려드릴게요. 강한 볼륨 셋팅펌으로 정수리부터 옆머리까지 풍성한 볼륨을 만들고, 원하시는 부위에 집중 볼륨을 더해 존재감 있는 헤어 실루엣을 완성합니다.",
  reduce:
    "전체 볼륨을 차분하게 줄여드릴게요. 볼륨 다운 기법과 매직 스트레이트로 풍성한 머리를 정돈하고, 매끈하고 세련된 실루엣을 완성해요. 가벼운 레이어로 무게감을 덜어내는 것도 효과적이에요.",
  keep: "현재 볼륨을 유지하면서 디자인에 집중해 드릴게요. 자연스러운 볼륨 흐름은 그대로 살리고, 원하시는 스타일과 기장 변화로 새로운 분위기를 만들어 드릴게요.",
  // Q15 볼륨 위치가 있을 때의 상세 처방
  top_add_little:
    "정수리 볼륨을 중심으로 조금 더 풍성하게 살려드릴게요. 뿌리 볼륨펌으로 정수리를 끌어올려 두상 실루엣을 예쁘게 보정하고, 자연스럽게 흐르는 옆선으로 마무리해요.",
  top_add_much:
    "정수리 볼륨을 확실하게 높여드릴게요. 강한 뿌리 볼륨펌으로 정수리를 최대한 끌어올려 두상 라인을 극적으로 개선하고, 얼굴이 갸름해 보이는 세로 실루엣을 완성합니다.",
  side_add_little:
    "옆두상 볼륨을 자연스럽게 채워드릴게요. 납작한 옆 라인을 사이드 볼륨펌으로 부드럽게 살려 입체적이고 균형 잡힌 두상 형태를 만들어요.",
  side_add_much:
    "옆두상에 확실한 볼륨감을 만들어드릴게요. 사이드 볼륨 셋팅펌으로 옆 라인을 풍성하게 살려 두상이 예뻐 보이는 둥근 실루엣을 완성합니다.",
};

// 가르마별 처방 텍스트 — left/right 는 모두 side_part 키로 조회됨
const PARTING_PRESCRIPTION_DB: Record<string, string> = {
  side_part:
    "선택하신 옆가르마(사이드파트)는 얼굴 옆선을 자연스럽게 가려 비대칭 단점을 보완하고 세련된 무드를 연출해요. 얼굴형 보정 효과를 높이기 위해 좌우 중 더 얼굴이 작아 보이는 방향으로 가르마를 고정하세요.",
  center:
    "가운데 가르마는 얼굴의 좌우 대칭을 선명하게 부각해요. 계란형·긴형에 잘 어울리지만, 둥근형·각진형에는 가르마보다 사이드 볼륨으로 비율을 보정하는 것을 추천해요.",
  allback:
    "올백·넘김 스타일은 이마를 완전히 드러내므로 얼굴형 보정을 헤어 볼륨 실루엣으로 대신해야 해요. 특히 이마 라인을 드러내는 만큼 앞머리 경계 부분의 볼륨과 컷 라인을 섬세하게 작업해야 합니다.",
  bangs_no_part:
    "앞머리가 가르마를 덮고 있는 스타일이에요. 앞머리 디자인(시스루뱅·커튼뱅 등)이 얼굴형 보정의 핵심을 담당하므로, 앞머리 컷팅 라인을 꼼꼼하게 상담해 주세요.",
  undecided: "",
};

export function generateFacePrescription(answers: Answers): FacePrescriptionResult {
  const faceShapeMock =
    typeof window !== "undefined" ? sessionStorage.getItem("faceShape_mock") : null;
  const faceShape = (faceShapeMock ?? "round") as FaceShapeType;
  const faceShapeData = FACE_SHAPE_BASE_DB[faceShape];

  const design = single(answers, "q13_design") ?? "c_curl";
  const damage = single(answers, "q9_damage") ?? "none";
  const volumeBalance = single(answers, "q16_volume_balance") ?? "keep";
  const volumePositions = multi(answers, "q15_volume").filter((id) => id !== "none_volume");

  // ── 가르마 정규화: left/right → side_part ──────────────────────────────
  const rawParting = single(answers, "q4_part");
  const normParting = normalizeParting(rawParting);
  const partingNote = PARTING_PRESCRIPTION_DB[normParting] ?? "";

  // ── 처방 키 선택: 손상 우선 → 볼륨 고민 → 디자인 ────────────────────────
  let prescriptionKey: string;
  if (damage === "damaged" || damage === "severe") {
    prescriptionKey = `${faceShape}_damage`;
  } else if (
    volumeBalance === "add_much" ||
    (volumePositions.length > 0 && design === "straight")
  ) {
    prescriptionKey = `${faceShape}_volume`;
  } else {
    prescriptionKey = `${faceShape}_${design}`;
  }

  const baseExpertPrescription =
    EXPERT_PRESCRIPTION_DB[prescriptionKey] ??
    EXPERT_PRESCRIPTION_DB[`${faceShape}_c_curl`] ??
    "";

  // 가르마 처방 노트를 메인 처방 뒤에 합산
  const expertPrescription = partingNote
    ? `${baseExpertPrescription} / [가르마 처방] ${partingNote}`
    : baseExpertPrescription;

  // ── 볼륨 솔루션: Q15 위치 + Q16 밸런스 조합 ───────────────────────────
  const topPosition = volumePositions[0] ?? "";
  const compositeKey = topPosition ? `${topPosition}_${volumeBalance}` : volumeBalance;
  const volumeSolution =
    VOLUME_SOLUTION_DB[compositeKey] ??
    VOLUME_SOLUTION_DB[volumeBalance] ??
    VOLUME_SOLUTION_DB["keep"];

  return {
    title: faceShapeData.title,
    baseDefinition: faceShapeData.baseDefinition,
    advantage: faceShapeData.advantage,
    weakness: faceShapeData.weakness,
    expertPrescription,
    volumeSolution,
  };
}
