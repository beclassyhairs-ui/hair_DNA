// ============================================================================
// 어뷰티 스타일 서비스 — 추천 엔진
// 60종 스타일명 + 케어 처방전 + 맞춤 제품
// ============================================================================

import type { StyleAnswers } from "./surveyData";

// 모발 성질 기반 헤어 방향 리포트(q3_curl/q7_thickness/q8_density/q10_history_count
// 108조합) — 데이터/조회 함수 본체는 app/style/hairTypeMatrix.ts에 있고, 기존
// getStyleEntry와 동일한 진입점(../recommend)에서 가져다 쓸 수 있도록 재노출한다.
export { getHairTypeReport, type HairTypeEntry } from "./hairTypeMatrix";

// ─── 스타일 명칭 조립 시스템 [2×6×3×4 = 144조합] ─────────────────────────────
// 60종 하드코딩 테이블 전면 폐기 → 런타임 생성 함수로 교체

interface StyleEntry { name: string; mood: string; }

// [연령 2그룹]
function getAgeGroup(age: string): "2040" | "5060plus" {
  return ["age_20", "age_30", "age_40"].includes(age) ? "2040" : "5060plus";
}

// [효과 접두어] Age 2 × Layer 3 = 6칸
const EFFECT_PREFIX: Record<"2040" | "5060plus", Record<string, string>> = {
  "2040": {
    heavy:  "볼륨감 있는",
    medium: "손질이 편한",
    light:  "얼굴이 갸름해 보이는",
  },
  "5060plus": {
    heavy:  "관리하기 쉬운",
    medium: "손질이 편한",
    light:  "동안으로 보이는",
  },
};

// [기본 스타일명] Length 6 × Wave 4 = 24칸
const BASE_STYLE: Record<string, Record<string, string>> = {
  short:      { straight: "숏컷",           c_curl: "숏컷 C컬",       s_curl: "숏컷 S컬",       wave: "숏컷 웨이브" },
  short_bob:  { straight: "귀밑 단발",       c_curl: "귀밑 단발 C컬",  s_curl: "귀밑 단발 S컬",  wave: "귀밑 단발 웨이브" },
  bob:        { straight: "단발컷",          c_curl: "단발 C컬",       s_curl: "단발 S컬",       wave: "단발 웨이브" },
  shoulder:   { straight: "어깨선 단발컷",   c_curl: "어깨선 C컬",     s_curl: "어깨선 S컬",     wave: "어깨선 웨이브" },
  collarbone: { straight: "쇄골 레이어드컷", c_curl: "쇄골 C컬",       s_curl: "쇄골 S컬",       wave: "쇄골 웨이브" },
  chest:      { straight: "가슴선 롱컷",     c_curl: "가슴선 롱 C컬",  s_curl: "가슴선 롱 S컬",  wave: "가슴선 롱 웨이브" },
};

// [무드 문구] Wave 4 × Layer 3 = 12칸
const STYLE_MOOD: Record<string, Record<string, string>> = {
  straight: {
    heavy:  "깔끔하고 단정한 선이 자신감 있는 인상을 만들어요",
    medium: "자연스럽게 정돈된 직선 라인이 세련된 느낌이에요",
    light:  "각도 있는 레이어로 가볍고 경쾌한 분위기예요",
  },
  c_curl: {
    heavy:  "볼륨감 있는 C컬이 얼굴을 화사하게 감싸줘요",
    medium: "안으로 살짝 말리는 C컬이 청순하고 여성스러워요",
    light:  "가볍게 뜨는 C컬로 생동감 넘치는 스타일이에요",
  },
  s_curl: {
    heavy:  "풍성한 S컬이 고급스럽고 여성스러운 분위기예요",
    medium: "자연스럽게 흐르는 S컬이 우아함을 더해줘요",
    light:  "경쾌하게 흐르는 S컬로 발랄한 매력이 돋보여요",
  },
  wave: {
    heavy:  "묵직한 웨이브가 특별한 존재감을 발산해요",
    medium: "부드러운 웨이브가 로맨틱하고 감성적인 분위기예요",
    light:  "자유롭게 흐르는 웨이브로 낭만적인 무드가 완성돼요",
  },
};

export function getStyleEntry(answers: StyleAnswers): StyleEntry {
  const ageGroup = getAgeGroup(answers.q1_age ?? "age_30");
  const layer    = answers.q14_layer  ?? "medium";

  // 레거시/정책 예외 정규화 — shoulder(구 옵션, 2026-07 제거)는 collarbone으로,
  // short·short_bob + s_curl(신정책상 존재하지 않는 조합)은 wave로 취급한다.
  const rawLength = answers.q11_length ?? "bob";
  const length    = rawLength === "shoulder" ? "collarbone" : rawLength;
  const isShort   = length === "short" || length === "short_bob";
  const rawDesign = answers.q13_design ?? "straight";
  const design    = isShort && rawDesign === "s_curl" ? "wave" : rawDesign;

  const prefix = EFFECT_PREFIX[ageGroup][layer] ?? "손질이 편한";
  const base   = BASE_STYLE[length]?.[design]  ?? "단발컷";
  const name   = `${prefix} ${base}`;
  const mood   = STYLE_MOOD[design]?.[layer]   ?? "자연스럽고 편안한 스타일이에요";

  return { name, mood };
}

// ─── 아하! 공감형 3-Block 텍스트 시스템 ───────────────────────────────────────
// 4가지 모질 변수(곱슬·숱·굵기·시술 횟수) → 우선순위 1개 고민 선택 → 3블록 조립

export type HairConcern =
  | "severe_damage" | "damage" | "fine_and_thin"
  | "curly" | "fine" | "thin" | "wavy" | "healthy";

export interface AhaBlock {
  cause:    string;  // A. 원인 짚어주기
  sympathy: string;  // B. 아하! 공감
  solution: string;  // C. 솔루션
}

const AHA_BLOCKS: Record<HairConcern, AhaBlock> = {
  severe_damage: {
    cause:    "새치 때문에 잦은 염색을 반복하셔서 모발이 많이 예민해진 상태예요.",
    sympathy: "그래서 염색 직후엔 괜찮다가 금방 푸석해지고, 머릿결이 생각보다 빨리 거칠어지셨을 거예요.",
    solution: "이럴 땐 새치는 마스카라 타입으로 터치업하고 시술 주기를 줄이는 게 최우선이에요. 약산성 샴푸로 두피 pH부터 회복시키세요.",
  },
  damage: {
    cause:    "잦은 펌·염색으로 모발 속 수분과 단백질이 빠져나간 상태예요.",
    sympathy: "그래서 시술 후 탄력이 금방 사라지거나, 머릿결이 기대보다 빨리 거칠어지셨을 거예요.",
    solution: "이럴 땐 주 1~2회 단백질 트리트먼트가 핵심이에요. 홈케어를 탄탄히 할수록 다음 시술 결과도 훨씬 오래가요.",
  },
  fine_and_thin: {
    cause:    "모발이 가늘고 숱도 적어서 볼륨을 유지하기가 유독 어려운 상태예요.",
    sympathy: "그래서 아침에 열심히 드라이해도 2~3시간이면 납작 눌려버려서 '내 머리는 왜 이러지?' 하셨을 거예요.",
    solution: "이럴 땐 볼륨 에센스를 뿌리에만 집중해서 바르고, 드라이어를 위로 향하게 말리세요. 뿌리부터 세우면 볼륨이 훨씬 오래 유지돼요.",
  },
  curly: {
    cause:    "악성 곱슬 모질이라 수분이 빠지는 속도가 일반 모발보다 훨씬 빠른 상태예요.",
    sympathy: "그래서 아침마다 머리가 제멋대로 뻗치거나 부스스하게 퍼져서 고생이셨을 거예요.",
    solution: "이럴 땐 물기가 있을 때 컬 크림을 바르고 자연건조하는 게 포인트예요. '찰랑이는 컬'보다 '살아있는 결'을 목표로 하면 훨씬 편해져요.",
  },
  fine: {
    cause:    "모발이 가늘어서 열이나 외부 자극에 특히 민감한 상태예요.",
    sympathy: "그래서 드라이나 고데기를 쓸 때마다 머리카락이 자주 끊어지거나 탄력이 빨리 사라지셨을 거예요.",
    solution: "이럴 땐 저자극 단백질 트리트먼트로 탄력을 채우고, 샴푸 마지막엔 차가운 물로 마무리해 주세요. 큐티클이 닫혀서 훨씬 덜 손상돼요.",
  },
  thin: {
    cause:    "숱이 적어서 머리카락 사이사이가 비어 보이기 쉬운 상태예요.",
    sympathy: "그래서 거울 앞에서 스타일 완성해도 '왜 이렇게 빈약해 보이지?' 하고 속상하셨을 거예요.",
    solution: "이럴 땐 볼류마이징 샴푸와 드라이어 방향이 핵심이에요. 뿌리를 먼저 말리고 위로 들어올리면 훨씬 풍성해 보여요.",
  },
  wavy: {
    cause:    "반곱슬 모질이라 날씨나 습도에 따라 머리 상태가 많이 달라지는 편이에요.",
    sympathy: "그래서 '오늘은 왜 이렇게 부스스하지?' 하고 매일 아침 복불복처럼 느끼셨을 거예요.",
    solution: "이럴 땐 가벼운 크림 타입 제품으로 마무리하는 게 포인트예요. 마지막에 찬바람으로 큐티클을 닫아주면 훨씬 오래 유지돼요.",
  },
  healthy: {
    cause:    "모발 상태가 전반적으로 건강하고 균형 잡혀 있어요.",
    sympathy: "어떤 스타일을 해도 잘 소화하고, 큰 고민 없이 지내셨을 거예요.",
    solution: "지금의 홈케어 루틴을 꾸준히 유지하면 충분해요. 오히려 지금이 새 스타일에 도전하기 딱 좋은 타이밍이에요!",
  },
};

export function getPrimaryConcern(answers: StyleAnswers): HairConcern {
  const h = answers.q10_history_count;
  const t = answers.q7_thickness;
  const d = answers.q8_density;
  const c = answers.q3_curl;
  if (h === "count_7plus")                            return "severe_damage";
  if (h === "count_5_6")                              return "damage";
  if (t === "fine" && d === "thin_density")           return "fine_and_thin";
  if (c === "curly_hair")                             return "curly";
  if (t === "fine")                                   return "fine";
  if (d === "thin_density")                           return "thin";
  if (c === "wavy_hair")                              return "wavy";
  return "healthy";
}

export function buildAhaText(answers: StyleAnswers): AhaBlock {
  return AHA_BLOCKS[getPrimaryConcern(answers)];
}

// ─── 케어 처방전 ──────────────────────────────────────────────────────────────

export interface CarePrescription {
  densityNote:   string;
  thicknessNote: string;
  curlNote:      string;
  historyNote:   string;
  isSevereDamage: boolean;
}

export function buildCarePrescription(answers: StyleAnswers): CarePrescription {
  // 숱
  const densityNote =
    answers.q8_density === "thick_density"
      ? "풍성한 숱이 다양한 스타일링을 가능하게 해요. 가볍게 쳐내는 틴닝으로 무게감을 조절하세요."
      : answers.q8_density === "thin_density"
      ? "숱이 적어 볼륨이 부족하기 쉬워요. 볼류마이징 샴푸와 드라이어 리프팅 기술로 보완하세요."
      : "균형 잡힌 숱으로 대부분의 스타일을 잘 소화할 수 있어요. 꾸준한 홈케어만으로 충분해요.";

  // 굵기
  const thicknessNote =
    answers.q7_thickness === "coarse"
      ? "굵은 모발은 스타일 유지력이 강해 장점이 많아요. 헤비 트리트먼트로 뻣뻣함을 완화하세요."
      : answers.q7_thickness === "fine"
      ? "얇은 모발은 손상에 민감하므로 저자극 샴푸와 단백질 트리트먼트를 정기적으로 사용하세요."
      : "일반 굵기로 주 1~2회 트리트먼트 루틴을 꾸준히 유지하면 충분해요.";

  // 곱슬
  const curlNote =
    answers.q3_curl === "curly_hair"
      ? "곱슬이 강할수록 수분 공급이 핵심이에요. 컬 크림이나 에센스로 자연스러운 결을 살리세요."
      : answers.q3_curl === "wavy_hair"
      ? "반곱슬은 날씨에 따라 스타일이 달라질 수 있어요. 촉촉한 크림 제품으로 마무리하면 깔끔해요."
      : "직모는 광택이 좋아 생머리 스타일이 잘 어울려요. 고데기로 다양한 스타일링을 즐겨보세요.";

  // 시술 횟수
  const isSevereDamage = answers.q10_history_count === "count_7plus";
  const historyNote =
    answers.q10_history_count === "count_7plus"
      ? "잦은 새치 염색으로 두피와 모발이 얇아지고 예민해진 상태예요. 새치 마스카라 활용으로 시술 주기를 줄이고, 약산성 홈케어가 필수입니다."
      : answers.q10_history_count === "count_5_6"
      ? "잦은 시술로 큐티클 손상이 진행 중일 수 있어요. 집중 케어 트리트먼트와 저자극 제품으로 회복에 집중하세요."
      : answers.q10_history_count === "count_3_4"
      ? "주기적인 시술로 모발이 약해질 수 있어요. 트리트먼트 주기를 늘리고 단백질 케어를 추가하세요."
      : "연 1~2회 시술로 모발 상태가 양호해요. 지금의 홈케어 루틴을 꾸준히 유지하면 돼요.";

  return { densityNote, thicknessNote, curlNote, historyNote, isSevereDamage };
}

// ─── 맞춤 제품 ────────────────────────────────────────────────────────────────

export interface StyleProduct {
  emoji:       string;
  category:    string;
  name:        string;
  tagline:     string;
}

export function getStyleProduct(answers: StyleAnswers): StyleProduct {
  if (answers.q10_history_count === "count_7plus") {
    return {
      emoji: "🧴", category: "새치 케어",
      name: "어뷰티 약산성 새치 케어 샴푸",
      tagline: "두피 pH 균형 회복 + 새치 예방 복합 케어",
    };
  }
  if (answers.q7_thickness === "fine" || answers.q8_density === "thin_density") {
    return {
      emoji: "💊", category: "볼륨 케어",
      name: "어뷰티 뿌리 볼륨 에센스",
      tagline: "가는 모발에 탄력·볼륨을 채워주는 집중 케어",
    };
  }
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "wavy_hair") {
    return {
      emoji: "🌀", category: "컬 케어",
      name: "어뷰티 컬 유지 크림",
      tagline: "곱슬·웨이브 모발의 결을 정돈하고 촉촉하게 유지",
    };
  }
  return {
    emoji: "✨", category: "광택 케어",
    name: "어뷰티 글로시 헤어 세럼",
    tagline: "건강한 모발에 빛나는 광택을 더해주는 데일리 세럼",
  };
}

// ─── 두 번째 보완 제품 ────────────────────────────────────────────────────────

export function getSecondStyleProduct(answers: StyleAnswers): StyleProduct {
  if (answers.q10_history_count === "count_7plus") {
    return {
      emoji: "💎", category: "손상 복구",
      name: "어뷰티 딥 리페어 트리트먼트",
      tagline: "극손상 모발 집중 단백질 복구 마스크",
    };
  }
  if (answers.q7_thickness === "fine" || answers.q8_density === "thin_density") {
    return {
      emoji: "🌿", category: "두피 강화",
      name: "어뷰티 스칼프 볼류마이저 샴푸",
      tagline: "모근부터 풍성하게, 탈모 예방 강화 루틴",
    };
  }
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "wavy_hair") {
    return {
      emoji: "💧", category: "수분 집중",
      name: "어뷰티 모이스처 인텐시브 마스크",
      tagline: "곱슬 모발 24시간 수분 잠금 팩",
    };
  }
  return {
    emoji: "🌟", category: "두피 토닉",
    name: "어뷰티 스칼프 클렌징 에센스",
    tagline: "두피 건강부터 챙기는 데일리 두피 케어",
  };
}

// ─── AI 진단 소견 텍스트 ──────────────────────────────────────────────────────

export function buildAIDiagnosisText(answers: StyleAnswers): string {
  const isSevere = answers.q10_history_count === "count_7plus";
  const isFine   = answers.q7_thickness === "fine";
  const isThin   = answers.q8_density   === "thin_density";
  const isCurly  = answers.q3_curl === "curly_hair";
  const isWavy   = answers.q3_curl === "wavy_hair";
  const isCoarse = answers.q7_thickness === "coarse";
  const isDense  = answers.q8_density   === "thick_density";

  if (isSevere && (isFine || isThin)) {
    return "잦은 새치 염색으로 인한 극손상·가는 모발입니다. 단백질 케어와 약산성 홈케어가 시급합니다.";
  }
  if (isSevere) {
    return "잦은 시술로 인한 손상 모발입니다. 두피 진정 + 손상 복구 이중 케어가 필요합니다.";
  }
  if (isFine && isThin) {
    return "가늘고 숱 없는 극세·박모입니다. 볼륨 에센스와 모근 강화 루틴이 효과적입니다.";
  }
  if (isFine) {
    return "얇고 가는 세모질입니다. 저자극 샴푸와 단백질 트리트먼트로 탄력을 살려주세요.";
  }
  if (isThin) {
    return "숱이 적은 박모 타입입니다. 볼류마이징 루틴과 두피 케어를 병행하세요.";
  }
  if (isCurly) {
    return "곱슬이 강한 모발입니다. 수분 공급이 핵심이며 컬 크림으로 결을 정돈하세요.";
  }
  if (isWavy) {
    return "반곱슬 모발로 날씨 따라 부스스해지기 쉽습니다. 촉촉한 크림 제품으로 마무리하세요.";
  }
  if (isCoarse && isDense) {
    return "굵고 숱 많은 건강한 모발입니다. 가볍게 틴닝해 스타일 유지력을 높이세요.";
  }
  return "균형 잡힌 정상 모질입니다. 지금의 케어 루틴을 꾸준히 유지하면 충분합니다.";
}

// ─── 구글 시트 제출용 answers 변환 ───────────────────────────────────────────

export function toSheetAnswers(answers: StyleAnswers): Record<string, string | string[]> {
  return {
    q1_age:             answers.q1_age            ?? "",
    q11_length:         answers.q11_length         ?? "",
    q14_layer:          answers.q14_layer          ?? "",
    q13_design:         answers.q13_design         ?? "",
    q8_density:         answers.q8_density         ?? "",
    q7_thickness:       answers.q7_thickness        ?? "",
    q3_curl:            answers.q3_curl            ?? "",
    q10_history_count:  answers.q10_history_count  ?? "",
    q10_history:        ["color_regular"],
  };
}
