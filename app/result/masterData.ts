// ============================================================================
// 어뷰티— 결과지 마스터 데이터 (전 연령 대상)
// ============================================================================

import type { IllustrationKey } from "../diagnosis/surveyData";

export type AgeBand = "10s" | "20s" | "30s" | "40s" | "50s" | "60s";

export interface ReferenceStyle {
  id: string;
  ages: AgeBand[];
  /** q2_concern 또는 q2b_extra_concern 의 option id */
  concerns: string[];
  lengths?: string[];
  name: string;
  summary: string;
  illustration: IllustrationKey;
  promptKeywords: string[];
}

export const REFERENCE_TABLE: ReferenceStyle[] = [
  // --- 정수리 볼륨 꺼짐 ---
  {
    id: "ref_crown_bob",
    ages: ["40s", "50s", "60s"],
    concerns: ["crown_volume"],
    lengths: ["bob", "short"],
    name: "볼륨 단발",
    summary: "뿌리 볼륨펌으로 정수리를 살린 풍성한 단발. 두상이 예뻐 보이고 한층 어려 보여요.",
    illustration: "volume-top",
    promptKeywords: ["voluminous root perm bob", "lifted crown", "rounded silhouette"],
  },
  {
    id: "ref_crown_layer",
    ages: ["20s", "30s", "40s", "50s"],
    concerns: ["crown_volume"],
    lengths: ["shoulder", "collarbone", "bob"],
    name: "볼륨 레이어드",
    summary: "정수리 볼륨과 얼굴 라인 레이어를 더해 입체적이고 세련된 중단발 스타일이에요.",
    illustration: "layer-rich",
    promptKeywords: ["layered medium hairstyle", "voluminous crown", "face-framing layers"],
  },
  // --- 넓은 이마 ---
  {
    id: "ref_forehead_seethrough",
    ages: ["10s", "20s", "30s", "40s", "50s"],
    concerns: ["forehead_wide"],
    name: "시스루 뱅 커버 스타일",
    summary: "시스루·사이드 뱅으로 넓은 이마를 자연스럽게 감싸 얼굴형을 작아 보이게 해요.",
    illustration: "layer-face",
    promptKeywords: ["see-through bangs", "side-swept fringe covering forehead", "soft face-framing"],
  },
  // --- 옆두상 볼륨 꺼짐 ---
  {
    id: "ref_side_volume",
    ages: ["20s", "30s", "40s", "50s", "60s"],
    concerns: ["side_volume"],
    lengths: ["shoulder", "collarbone", "bob"],
    name: "사이드 볼륨 스타일",
    summary: "옆두상 볼륨 셋팅펌으로 납작한 옆 라인을 살려 두상을 예쁘게 보정해요.",
    illustration: "volume-all",
    promptKeywords: ["side volume perm", "rounded side silhouette", "balanced head shape"],
  },
  // --- 전체적으로 많이 떠서 가라앉히고 싶음 ---
  {
    id: "ref_fluffy_calm",
    ages: ["10s", "20s", "30s", "40s", "50s", "60s"],
    concerns: ["too_fluffy"],
    name: "차분한 다운 스타일",
    summary: "볼륨을 정리하고 차분하게 가라앉힌 매끄럽고 세련된 스타일이에요.",
    illustration: "design-straight",
    promptKeywords: ["sleek smooth hair", "calm volume-down style", "polished finish"],
  },
  // --- 길이 변화 스타일 고민 ---
  {
    id: "ref_length_change",
    ages: ["10s", "20s", "30s", "40s", "50s", "60s"],
    concerns: ["length_change"],
    name: "기장 변화 스타일",
    summary: "원하는 기장의 변화를 반영한 맞춤 스타일을 제안해요.",
    illustration: "design-curl",
    promptKeywords: ["fresh new length", "style transformation", "natural flow"],
  },
  // --- 새치·뿌리 염색 고민 ---
  {
    id: "ref_gray_glossy",
    ages: ["40s", "50s", "60s"],
    concerns: ["gray_root"],
    name: "내추럴 블랙 윤기 스타일",
    summary: "뿌리 새치 커버와 큐티클 코팅으로 균일하고 환한 컬러, 윤기 나는 결을 완성해요.",
    illustration: "design-straight",
    promptKeywords: ["natural black root color", "glossy healthy hair", "even hair tone"],
  },
  // --- 손상·엉킴 고민 ---
  {
    id: "ref_damage_silk",
    ages: ["10s", "20s", "30s", "40s", "50s", "60s"],
    concerns: ["tangle_damage"],
    name: "실키 복구 스타일",
    summary: "단백질 클리닉으로 엉킴·손상을 회복시켜 찰랑이는 매끈한 결을 되살린 스타일이에요.",
    illustration: "design-straight",
    promptKeywords: ["silky smooth repaired hair", "healthy glossy texture", "no frizz"],
  },
  // --- 폴백: 디자인 선호 기반 ---
  {
    id: "ref_wave_romantic",
    ages: ["10s", "20s", "30s", "40s", "50s"],
    concerns: [],
    lengths: ["collarbone", "chest", "shoulder"],
    name: "로맨틱 웨이브",
    summary: "풍성한 물결 웨이브로 우아하고 여성스러운 분위기를 살린 롱 스타일이에요.",
    illustration: "design-wave",
    promptKeywords: ["romantic flowing waves", "soft voluminous curls", "feminine long hairstyle"],
  },
  {
    id: "ref_ccurl_natural",
    ages: ["10s", "20s", "30s", "40s", "50s", "60s"],
    concerns: [],
    name: "내추럴 C컬",
    summary: "자연스러운 굵은 C컬로 손질이 쉽고 단정한 동안 스타일이에요.",
    illustration: "design-curl",
    promptKeywords: ["natural C-curl", "soft inward curl ends", "easy-to-style hairstyle"],
  },
];

export const DEFAULT_REFERENCE: ReferenceStyle = REFERENCE_TABLE.find(
  (r) => r.id === "ref_ccurl_natural",
)!;

// ----------------------------------------------------------------------------
// 자사 제품 카탈로그
// ----------------------------------------------------------------------------

export interface BeautyProduct {
  id: string;
  category: string;
  name: string;
  tagline: string;
  detail: string;
  concerns: string[];
  histories?: string[];
  damages?: string[];
  price: string;
  emoji: string;
  coupangUrl?: string;
}

export const PRODUCT_CATALOG: BeautyProduct[] = [
  {
    id: "p_root_volume",
    category: "#crown_volume",
    name: "어뷰티 뿌리 볼륨 에센스",
    tagline: "납작한 정수리를 세워주는 데일리 볼륨 부스터",
    detail:
      "정수리·옆두상 볼륨이 고민이신 분께 처방해요. 뿌리에 발라 말리면 하루 종일 볼륨이 유지돼 동안 효과를 살려줘요.",
    concerns: ["crown_volume", "side_volume"],
    price: "28,000원",
    emoji: "🌿",
    coupangUrl: "https://link.coupang.com/a/XXXXXXX",
  },
  {
    id: "p_calming_serum",
    category: "#volume_down",
    name: "어뷰티 진정 볼륨다운 세럼",
    tagline: "떠오르는 볼륨을 차분하게 잡아주는 무거움 없는 세럼",
    detail:
      "전체적으로 볼륨이 많이 뜨는 모발에 딱 맞아요. 가볍게 도포하면 차분하고 정돈된 실루엣이 완성돼요.",
    concerns: ["too_fluffy"],
    price: "25,000원",
    emoji: "🌊",
    coupangUrl: "https://link.coupang.com/a/XXXXXXX",
  },
  {
    id: "p_gray_mascara",
    category: "#natural_black",
    name: "어뷰티 새치 커버 마스카라",
    tagline: "거슬리는 뿌리 새치를 30초 만에 감쪽같이",
    detail:
      "염색 주기 사이, 자라난 뿌리 새치를 빗듯이 발라 즉시 커버해요. 물·땀에 강하고 머리를 감으면 깨끗이 지워져요.",
    concerns: ["gray_root"],
    histories: ["color_root"],
    price: "22,000원",
    emoji: "🖌️",
    coupangUrl: "https://link.coupang.com/a/XXXXXXX",
  },
  {
    id: "p_repair_ampoule",
    category: "#hair_repair",
    name: "어뷰티 단백질 리페어 앰플",
    tagline: "끊어지고 엉키는 손상모를 위한 집중 영양",
    detail:
      "손상·엉킴이 신경 쓰이는 모발에 단백질과 유분을 채워 매끈한 결로 회복시켜요. 탈색·잦은 시술 모발에 특히 추천해요.",
    concerns: ["tangle_damage"],
    histories: ["bleach", "magic_perm", "color_regular"],
    damages: ["damaged", "severe"],
    price: "34,000원",
    emoji: "💧",
    coupangUrl: "https://link.coupang.com/a/XXXXXXX",
  },
  {
    id: "p_scalp_tonic",
    category: "#scalp_care",
    name: "어뷰티 두피 쿨링 토닉",
    tagline: "열감·각질·가려움을 시원하게 케어하는 두피 앰플",
    detail:
      "두피 열감·각질·불편함이 고민인 분께 처방해요. 두피에 직접 도포해 진정시키고 건강한 모발 환경을 만들어줘요.",
    concerns: ["scalp"],
    price: "29,000원",
    emoji: "❄️",
    coupangUrl: "https://link.coupang.com/a/XXXXXXX",
  },
  {
    id: "p_hairline_shadow",
    category: "#forehead_cover",
    name: "어뷰티 헤어라인 섀도우 파우더",
    tagline: "넓은 이마를 자연스럽게 채워주는 음영 파우더",
    detail:
      "비어 보이는 헤어라인과 이마 경계에 살짝 발라 풍성하고 또렷한 라인을 연출해요.",
    concerns: ["forehead_wide"],
    price: "24,000원",
    emoji: "🤎",
    coupangUrl: "https://link.coupang.com/a/XXXXXXX",
  },
  {
    id: "p_glossy_serum",
    category: "#glossy_finish",
    name: "어뷰티 글로시 윤기 세럼",
    tagline: "푸석한 모발 끝에 윤기와 찰랑임을",
    detail:
      "모발 끝 위주로 발라 푸석함을 잡고 윤기를 더해요. 모든 모발 타입에 잘 맞는 데일리 마무리 제품이에요.",
    concerns: [],
    price: "21,000원",
    emoji: "🪞",
  },
];
