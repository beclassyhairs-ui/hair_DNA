// ============================================================================
// app/style/hairTypeCopy.ts
// /style 결과지 — "불편함 해석형" 사용자 언어 번역 레이어.
//
// hairTypeMatrix.ts(108행, 내부 진단 데이터)는 절대 수정하지 않는다. 이 파일은
// 그 원본을 입력으로 받아 고객이 실제로 느끼는 언어로 "번역"만 담당한다.
//
// 구조:
// - painPointHeadline / whyItHappens / stylePrescription / discoveryItemHint
//   → curl × thickness × density = 27개 "모발 타입" 단위로만 존재한다.
//     historyCount(손상 이력)는 이 4개 필드를 절대 바꾸지 않는다 — 모발 타입
//     자체와 핵심 불편함은 손상 여부와 무관하게 동일해야 한다는 원칙.
// - avoidWithReason / salonScript / homeCareDirection
//   → historyCount modifier가 반영돼야 하므로 108개(원본 hairTypeMatrix 그대로)
//     단위로 파생한다. hairTypeMatrix.ts의 avoid/salonRequest/homeCare 원문을
//     그대로 가져와 안전 문구 교정(SAFETY_CORRECTIONS)만 적용한다 — 원문을
//     다시 쓰는 게 아니라 위험 표현만 다듬는 방식.
// ============================================================================

import {
  getHairTypeReport,
  type HairTypeEntry,
} from "./hairTypeMatrix";
import type { StyleAnswers } from "./surveyData";

export interface HairTypeCopy {
  id:                 string; // HairTypeEntry.id와 동일(108키)
  painPointHeadline:  string;
  whyItHappens:       string;
  stylePrescription:  string;
  avoidWithReason:    string[];
  salonScript:        string[];
  homeCareDirection:  string;
  discoveryItemHint:  string;
}

// ─── 27개 "모발 타입" 핵심 카피 (historyCount 영향 없음) ───────────────────────

interface CoreCopy {
  painPointHeadline: string;
  whyItHappens:      string;
  stylePrescription: string;
  discoveryItemHint: string;
}

function coreKey(curl: string, thickness: string, density: string): string {
  return `${curl}__${thickness}__${density}`;
}

const CORE_COPY_27: Record<string, CoreCopy> = {
  // ── 직모(straight_hair) ──────────────────────────────────────────────────
  [coreKey("straight_hair", "coarse", "thick_density")]: {
    painPointHeadline: "차분해 보이지만 전체가 무겁고 답답해 보이기 쉬워요",
    whyItHappens: "직모에 굵기와 숱이 함께 있으면 힘은 좋아지지만 그만큼 끝선까지 무게감이 그대로 쌓여서, 정리해도 답답한 인상이 남기 쉬워요.",
    stylePrescription: "전체 볼륨을 더 키우기보다 양감을 덜어내는 레이어드 커트와 끝선 정리로 무게감을 조절하고, 정수리 볼륨을 살려 답답한 인상을 줄이는 방향이 좋아요.",
    discoveryItemHint: "무게감을 가볍게 잡아주는 리프트 트리트먼트나 가벼운 마무리 오일",
  },
  [coreKey("straight_hair", "coarse", "medium_density")]: {
    painPointHeadline: "힘 있고 차분하지만 자칫 밋밋해 보일 수 있어요",
    whyItHappens: "직모에 굵기가 있고 숱은 보통 수준이라 안정적인 힘은 있지만, 층이 없으면 결이 단조롭게 떨어져 심심한 인상을 줄 수 있어요.",
    stylePrescription: "아주 큰 손질 없이도 끝선에 가벼운 레이어드만 더하면 답답함 없이 결을 살릴 수 있어요.",
    discoveryItemHint: "가벼운 마무리 오일이나 광택 세럼",
  },
  [coreKey("straight_hair", "coarse", "thin_density")]: {
    painPointHeadline: "힘은 있는데 숱이 적어 허전해 보일 수 있어요",
    whyItHappens: "직모라 힘은 충분한데 숱이 적으면 끝선이 가늘어 보이고 정수리 쪽 볼륨도 아쉽게 느껴지기 쉬워요.",
    stylePrescription: "끝선의 두께감을 살리는 커트와 정수리 볼륨을 함께 보완하는 방향으로 안내드리는 게 좋아요.",
    discoveryItemHint: "볼륨을 살려주는 루트 리프트 제품",
  },
  [coreKey("straight_hair", "medium_thickness", "thick_density")]: {
    painPointHeadline: "볼륨은 좋은데 자칫 부피가 과해 보일 수 있어요",
    whyItHappens: "직모에 굵기는 보통이지만 숱이 많으면 자연스럽게 볼륨이 살아나는 대신, 겉머리 쪽이 과하게 부풀어 보일 수 있어요.",
    stylePrescription: "숱이 많은 만큼 겉머리 부분만 가볍게 틴닝해서 무게감을 덜어내면 부담스럽지 않게 볼륨을 유지할 수 있어요.",
    discoveryItemHint: "가벼운 텍스처라이징 제품",
  },
  [coreKey("straight_hair", "medium_thickness", "medium_density")]: {
    painPointHeadline: "기본기가 좋아서 사소한 디테일 하나로 완성도가 확 달라지는 타입이에요",
    whyItHappens: "굵기와 숱이 모두 무난해서 스타일이 무너지거나 처지는 일은 적지만, 그만큼 끝선 라인이나 텍스처 같은 디테일 하나에 따라 결과물이 확 달라지는 타입이에요.",
    stylePrescription: "기본 조건이 좋으니 큰 보정보다는 끝선 텍스처나 앞머리 라인처럼 세밀한 디테일에 신경 쓰는 편이 완성도를 높여줘요.",
    discoveryItemHint: "기본 트리트먼트 라인",
  },
  [coreKey("straight_hair", "medium_thickness", "thin_density")]: {
    painPointHeadline: "볼륨이 아쉽게 느껴지기 쉬워요",
    whyItHappens: "직모에 굵기는 보통이어도 숱이 적으면 뿌리 쪽 볼륨이 금방 가라앉아서, 스타일을 해도 밋밋해 보이기 쉬워요.",
    stylePrescription: "뿌리 볼륨을 살리는 드라이 방향과 가벼운 C컬·S컬 스타일링을 더하면 볼륨감을 자연스럽게 보완할 수 있어요.",
    discoveryItemHint: "루트 볼륨 무스나 미스트",
  },
  [coreKey("straight_hair", "fine", "thick_density")]: {
    painPointHeadline: "숱은 많은데 힘이 없어 스타일이 금방 풀려요",
    whyItHappens: "숱은 충분해도 모발이 얇으면 한 올 한 올의 힘이 약해서, 세팅한 스타일이 오래 버티지 못하고 처지기 쉬워요.",
    stylePrescription: "무게감을 줄이는 가벼운 커트와 가벼운 볼륨 제품으로 힘 있어 보이게 스타일링하는 방향이 잘 맞아요.",
    discoveryItemHint: "가벼운 볼륨 에센스",
  },
  [coreKey("straight_hair", "fine", "medium_density")]: {
    painPointHeadline: "부드럽지만 힘이 없어 스타일이 잔잔해 보여요",
    whyItHappens: "모발이 얇으면 손질을 해도 볼륨이 오래가지 않아서, 스타일이 밋밋하고 잔잔한 인상으로 가라앉기 쉬워요.",
    stylePrescription: "가벼운 볼륨 제품과 뿌리 볼륨 드라이로 스타일에 생기를 더해주는 방향이 좋아요.",
    discoveryItemHint: "가벼운 볼륨 미스트",
  },
  [coreKey("straight_hair", "fine", "thin_density")]: {
    painPointHeadline: "볼륨이 금방 꺼지고 힘없이 처지기 쉬워요",
    whyItHappens: "모발 자체가 얇고 숱이 적으면 뿌리 힘이 오래 버티지 못해서, 아침에 세팅한 볼륨이 낮이 되기 전에 가라앉기 쉬워요.",
    stylePrescription: "전체를 누르는 무거운 스타일링보다, 뿌리 볼륨과 가벼운 C컬로 힘을 보완하는 방향이 잘 맞아요.",
    discoveryItemHint: "가벼운 볼륨 미스트나 루트 리프트 제품",
  },
  // ── 반곱슬(wavy_hair) ────────────────────────────────────────────────────
  [coreKey("wavy_hair", "coarse", "thick_density")]: {
    painPointHeadline: "웨이브와 볼륨이 함께 있어 자칫 부피가 커 보일 수 있어요",
    whyItHappens: "반곱슬에 굵기와 숱이 함께 있으면 웨이브 결과 볼륨이 동시에 살아나는 대신, 전체적으로 부피가 커 보이는 인상을 줄 수 있어요.",
    stylePrescription: "웨이브 결을 정리해주는 정돈 시술로 형태를 잡거나, 겉결은 흐트러뜨리지 않고 안쪽 양감만 가볍게 조절하는 방향이 좋아요.",
    discoveryItemHint: "웨이브 정돈 크림",
  },
  [coreKey("wavy_hair", "coarse", "medium_density")]: {
    painPointHeadline: "날씨에 따라 스타일이 오르락내리락하기 쉬워요",
    whyItHappens: "반곱슬은 습도에 영향을 많이 받아서, 같은 손질을 해도 맑은 날과 습한 날의 스타일 느낌이 다르게 나타나기 쉬워요.",
    stylePrescription: "습한 날엔 가벼운 크림으로 결을 정돈하고, 맑은 날엔 웨이브를 그대로 살리는 방향으로 유연하게 스타일링하는 게 좋아요.",
    discoveryItemHint: "습도 방어 크림",
  },
  [coreKey("wavy_hair", "coarse", "thin_density")]: {
    painPointHeadline: "숱이 적어 웨이브만으로는 볼륨이 아쉬울 수 있어요",
    whyItHappens: "굵기는 있어도 숱이 적으면 웨이브 결만으로 부피를 채우기엔 아쉬움이 남기 쉬워요.",
    stylePrescription: "웨이브를 눌러 펴기보다는 웨이브 자체로 볼륨을 살리는 방향이 지금 상태에는 더 잘 맞아요.",
    discoveryItemHint: "웨이브 볼륨 무스",
  },
  [coreKey("wavy_hair", "medium_thickness", "thick_density")]: {
    painPointHeadline: "웨이브와 볼륨의 균형이 좋은 편이에요",
    whyItHappens: "굵기와 숱이 모두 보통 수준이면 웨이브 결과 볼륨이 서로 무리 없이 균형을 이뤄서, 큰 불편함이 두드러지지 않는 타입이에요.",
    stylePrescription: "필요한 부분만 정돈하는 방향으로 웨이브를 다듬거나, 자연스러운 웨이브를 그대로 살리는 스타일링 둘 다 편하게 시도해볼 수 있어요.",
    discoveryItemHint: "웨이브 유지 스프레이",
  },
  [coreKey("wavy_hair", "medium_thickness", "medium_density")]: {
    painPointHeadline: "웨이브 결 하나로 분위기가 완전히 달라지는 타입이에요",
    whyItHappens: "굵기와 숱이 모두 무난해서 관리는 수월하지만, 웨이브 결을 어떻게 정돈하느냐에 따라 차분한 인상과 화사한 인상이 크게 달라지는 타입이에요.",
    stylePrescription: "큰 보정보다는 웨이브 결의 방향과 크기를 어떻게 다듬느냐에 집중하면, 원하는 무드를 자유롭게 만들 수 있어요.",
    discoveryItemHint: "웨이브 정돈용 기본 크림",
  },
  [coreKey("wavy_hair", "medium_thickness", "thin_density")]: {
    painPointHeadline: "웨이브는 있는데 볼륨이 아쉽게 느껴져요",
    whyItHappens: "굵기는 보통이어도 숱이 적으면 웨이브가 있어도 뿌리 쪽 볼륨이 부족해 보이기 쉬워요.",
    stylePrescription: "웨이브 결을 살리면서 뿌리 볼륨을 함께 챙기는 스타일링이 볼륨감을 보완해줘요.",
    discoveryItemHint: "루트 볼륨과 웨이브 동시 케어 제품",
  },
  [coreKey("wavy_hair", "fine", "thick_density")]: {
    painPointHeadline: "숱은 많은데 웨이브가 금방 풀려요",
    whyItHappens: "숱은 충분해도 모발이 얇으면 웨이브를 지탱하는 힘이 약해서, 세팅한 웨이브가 오래 유지되지 못하고 금방 풀리기 쉬워요.",
    stylePrescription: "웨이브 유지력을 위해 부분적으로 정돈하는 시술을 고려하거나, 가벼운 무스로 웨이브를 살리는 방향이 좋아요.",
    discoveryItemHint: "웨이브 유지력을 높이는 가벼운 무스",
  },
  [coreKey("wavy_hair", "fine", "medium_density")]: {
    painPointHeadline: "부드럽지만 웨이브가 힘없이 퍼져 보일 수 있어요",
    whyItHappens: "모발이 얇으면 웨이브 결이 무게를 못 이기고 풀어지면서, 스타일이 힘없이 퍼진 느낌으로 보이기 쉬워요.",
    stylePrescription: "무거운 제품보다는 가벼운 크림으로 웨이브를 살리는 스타일링이 잘 맞아요.",
    discoveryItemHint: "가벼운 크림 타입 웨이브 제품",
  },
  [coreKey("wavy_hair", "fine", "thin_density")]: {
    painPointHeadline: "컬은 생기지만 지저분해 보이기 쉬워요",
    whyItHappens: "얇은 모발은 힘이 약해서 컬이 오래 버티지 못하고, 여기에 시술 이력이 쌓이면 컬 윤곽이 더 쉽게 흐트러져서 컬은 있는데 정돈된 느낌이 안 나는 상태가 되기 쉬워요.",
    stylePrescription: "전체를 누르는 강한 시술보다, 부분 정돈과 뿌리 볼륨을 함께 잡아주는 방향이 지금 상태에는 더 잘 맞아요.",
    discoveryItemHint: "손상 보호와 웨이브 정돈을 동시에 챙기는 가벼운 에센스",
  },
  // ── 곱슬(curly_hair) ─────────────────────────────────────────────────────
  [coreKey("curly_hair", "coarse", "thick_density")]: {
    painPointHeadline: "머리가 쉽게 뜨고 커 보이는 타입이에요",
    whyItHappens: "곱슬의 퍼짐, 굵은 모발의 힘, 많은 숱이 겹치면 손질을 못해서가 아니라 구조적으로 머리가 차분해 보이기보다 전체적으로 커 보이기 쉬워요.",
    stylePrescription: "컬을 더 많이 넣기보다 겉결은 흐트러뜨리지 않고 안쪽 양감과 부피를 먼저 정돈하고, 끝선 중심으로 움직임을 주는 방향이 좋아요.",
    discoveryItemHint: "곱슬 정돈 크림이나 무스",
  },
  [coreKey("curly_hair", "coarse", "medium_density")]: {
    painPointHeadline: "볼륨은 좋은데 부피가 부담스러워 보일 수 있어요",
    whyItHappens: "곱슬 기운이 강하고 굵기가 있으면 볼륨감이 뚜렷해지는 대신, 정돈이 안 되면 부피가 부담스럽게 느껴지기 쉬워요.",
    stylePrescription: "부피 정돈과 결 관리를 함께 챙기면 곱슬 특유의 볼륨을 부담스럽지 않게 유지할 수 있어요.",
    discoveryItemHint: "곱슬 정돈 크림",
  },
  [coreKey("curly_hair", "coarse", "thin_density")]: {
    painPointHeadline: "곱슬기는 있는데 숱이 적어 볼륨이 아쉬워 보일 수 있어요",
    whyItHappens: "곱슬 기운은 강한데 숱이 적으면 부피는 있어 보여도 정작 볼륨은 부족하게 느껴지는, 겉과 속이 다른 상태가 되기 쉬워요.",
    stylePrescription: "곱슬을 완전히 눌러 없애면 머리가 더 없어 보일 수 있어서, 볼륨을 살리는 컬감이나 층, 루트 볼륨을 함께 살리는 방향이 중요해요.",
    discoveryItemHint: "볼륨을 살리는 컬 크림",
  },
  [coreKey("curly_hair", "medium_thickness", "thick_density")]: {
    painPointHeadline: "전체적으로 부피가 크게 느껴지기 쉬워요",
    whyItHappens: "곱슬 기운이 강하고 숱이 많으면 머리 전체 부피가 크게 느껴져서, 정리해도 늘어난 것처럼 보이기 쉬워요.",
    stylePrescription: "부피 정돈을 우선하면서도 정수리는 볼륨을 유지하는 방향으로 균형을 잡는 게 좋아요.",
    discoveryItemHint: "부피 정돈 크림",
  },
  [coreKey("curly_hair", "medium_thickness", "medium_density")]: {
    painPointHeadline: "곱슬 결을 어떻게 살리느냐로 인상이 크게 달라지는 타입이에요",
    whyItHappens: "곱슬 기운과 굵기, 숱이 모두 무난해서 관리 부담은 적지만, 컬을 살리는 방식에 따라 세련된 느낌과 부스스한 느낌의 차이가 크게 갈리는 타입이에요.",
    stylePrescription: "결 정돈에만 집중해도 충분하지만, 컬 크림 양이나 건조 방식 하나로 완성도가 달라지니 그 부분에 신경 써보는 게 좋아요.",
    discoveryItemHint: "기본 컬 유지 제품",
  },
  [coreKey("curly_hair", "medium_thickness", "thin_density")]: {
    painPointHeadline: "곱슬기는 있는데 숱이 적어 볼륨이 아쉬워요",
    whyItHappens: "곱슬 기운은 강한데 숱이 적으면 컬 사이사이가 비어 보여서 볼륨이 아쉽게 느껴지기 쉬워요.",
    stylePrescription: "곱슬을 눌러 없애기보다 볼륨을 살리는 컬감이나 층으로 정돈하는 방향이 중요해요.",
    discoveryItemHint: "볼륨 살리는 컬 무스",
  },
  [coreKey("curly_hair", "fine", "thick_density")]: {
    painPointHeadline: "숱은 많은데 힘이 없어 곱슬이 힘없이 퍼져 보여요",
    whyItHappens: "숱은 충분해도 모발이 얇으면 곱슬을 지탱하는 힘이 약해서, 컬이 힘없이 퍼지며 부피만 커 보이는 상태가 되기 쉬워요.",
    stylePrescription: "곱슬을 정돈하면 깔끔해질 수 있지만 전체를 강하게 누르는 시술은 볼륨감을 너무 죽일 수 있어서, 볼륨을 남기는 정돈이나 부분 정돈 방향이 더 잘 맞을 수 있어요.",
    discoveryItemHint: "가벼운 컬 정돈 에센스",
  },
  [coreKey("curly_hair", "fine", "medium_density")]: {
    painPointHeadline: "부드럽지만 곱슬이 힘없이 흐트러지기 쉬워요",
    whyItHappens: "곱슬 기운이 강해도 모발이 얇으면 컬을 지탱하는 힘이 부족해서, 결이 쉽게 흐트러지고 부드럽게 퍼지는 인상을 주기 쉬워요.",
    stylePrescription: "전체를 강하게 누르는 시술보다는 부분 정돈과 뿌리 볼륨 유지 방향이 더 잘 맞을 수 있어요.",
    discoveryItemHint: "가벼운 컬 크림",
  },
  [coreKey("curly_hair", "fine", "thin_density")]: {
    painPointHeadline: "곱슬기는 있는데 힘도 숱도 부족해 볼륨이 쉽게 사라져요",
    whyItHappens: "모발이 얇고 숱도 적으면 곱슬을 지탱할 힘 자체가 부족해서, 컬은 있어도 금방 가라앉아 볼륨이 사라진 것처럼 보이기 쉬워요.",
    stylePrescription: "곱슬을 완전히 누르기보다 볼륨을 최우선으로 살리는 부분 정돈 방향이 중요해요.",
    discoveryItemHint: "손상 보호와 볼륨을 동시에 챙기는 가벼운 컬 케어 제품",
  },
};

const DEFAULT_CORE_KEY = coreKey("straight_hair", "medium_thickness", "medium_density");

// ─── 108개 시술/케어 문구 파생 — 원본 손대지 않고 안전 문구만 교정 ─────────────
// hairTypeMatrix.ts의 avoid/salonRequest/homeCare 원문을 그대로 입력받아,
// 아래 3가지 미용 검수 기준만 정확히 교정한다:
//   1) 곱슬 타입 — "겉머리 틴닝" → "겉결은 흐트러뜨리지 않고 안쪽 양감과 부피 조절"
//   2) 얇고 숱 적은 직모 — "볼륨매직" 추천 → 뿌리 볼륨/가벼운 C컬 중심으로 완화
//   3) 반곱슬(웨이브) — "다운펌" 반복 표현 완화 → "정돈 시술" 계열로
// 그 외 문장은 원본을 그대로 사용한다(재창작하지 않음).

interface CorrectionRule {
  scope: (entry: HairTypeEntry) => boolean;
  pattern: RegExp;
  replacement: string;
}

const SAFETY_CORRECTIONS: CorrectionRule[] = [
  // 1) 곱슬 — 겉머리 틴닝 표현 교정
  {
    scope: (e) => e.curl === "curly_hair",
    pattern: /겉머리는\s*가볍게\s*틴닝해서\s*무게감만\s*살짝\s*줄여주세요\./g,
    replacement: "겉결은 흐트러뜨리지 않고 안쪽 양감과 부피만 가볍게 조절해주세요.",
  },
  // 2) 얇고 숱 적은 직모 — 볼륨매직 추천 완화
  {
    scope: (e) => e.curl === "straight_hair" && e.thickness === "fine" && e.density === "thin_density",
    pattern: /볼륨매직이나\s*디지털펌\s*같은\s*볼륨\s*시술을/g,
    replacement: "전체를 누르는 시술보다는 뿌리 볼륨을 살리는 커트나 가벼운 C컬 펌을",
  },
  {
    scope: (e) => e.curl === "straight_hair" && e.thickness === "fine" && e.density === "thin_density",
    pattern: /양감을\s*가볍게\s*조절하는\s*레이어드\s*커트나\s*볼륨매직으로\s*상담받고\s*싶어요\./g,
    replacement: "전체를 누르는 시술보다는 뿌리 볼륨을 살리는 커트와 가벼운 C컬 펌으로 상담받고 싶어요.",
  },
  // 3) 반곱슬 — 다운펌 반복 표현 완화(구체 패턴 → 일반 패턴 순서로 적용)
  {
    scope: (e) => e.curl === "wavy_hair",
    pattern: /전체\s*다운펌/g,
    replacement: "전체를 누르는 정돈 시술",
  },
  {
    scope: (e) => e.curl === "wavy_hair",
    pattern: /부분\s*다운펌/g,
    replacement: "부분 정돈 시술",
  },
  {
    scope: (e) => e.curl === "wavy_hair",
    pattern: /다운펌으로/g,
    replacement: "정돈 시술로",
  },
  {
    scope: (e) => e.curl === "wavy_hair",
    pattern: /다운펌이나/g,
    replacement: "정돈 시술이나",
  },
  {
    scope: (e) => e.curl === "wavy_hair",
    pattern: /다운펌을/g,
    replacement: "정돈 시술을",
  },
  {
    // 위에서 못 잡은 나머지 "다운펌" 잔여 표현 — 최후 폴백
    scope: (e) => e.curl === "wavy_hair",
    pattern: /다운펌/g,
    replacement: "정돈 시술",
  },
];

function correct(text: string, entry: HairTypeEntry): string {
  let result = text;
  for (const rule of SAFETY_CORRECTIONS) {
    if (rule.scope(entry)) result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

// 손상 이력이 낮을 때 반복되는 내용 없는 필러 문장 — homeCare 문단 조립 시 제외한다.
const FILLER_LINE = /^지금처럼\s*관리하면\s*충분해요\.?$/;

function deriveTreatmentCopy(entry: HairTypeEntry): Pick<HairTypeCopy, "avoidWithReason" | "salonScript" | "homeCareDirection"> {
  const avoidWithReason = entry.avoid.map((line) => correct(line, entry));
  const salonScript     = entry.salonRequest.map((line) => correct(line, entry));

  const meaningfulHomeCare = entry.homeCare
    .map((line) => correct(line, entry))
    .filter((line) => !FILLER_LINE.test(line.trim()));
  const homeCareDirection = meaningfulHomeCare.length > 0
    ? meaningfulHomeCare.join(" ")
    : entry.homeCare.map((line) => correct(line, entry)).join(" ");

  return { avoidWithReason, salonScript, homeCareDirection };
}

// ─── 통합 조회 함수 ────────────────────────────────────────────────────────

export function getHairTypeCopy(answers: StyleAnswers): HairTypeCopy {
  const entry = getHairTypeReport(answers);
  const core  = CORE_COPY_27[coreKey(entry.curl, entry.thickness, entry.density)]
    ?? CORE_COPY_27[DEFAULT_CORE_KEY];
  const treatment = deriveTreatmentCopy(entry);

  return {
    id: entry.id,
    painPointHeadline: core.painPointHeadline,
    whyItHappens:      core.whyItHappens,
    stylePrescription: core.stylePrescription,
    discoveryItemHint: core.discoveryItemHint,
    ...treatment,
  };
}
