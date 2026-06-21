// ============================================================================
// 어뷰티 스타일 서비스 — 추천 엔진
// 60종 스타일명 + 케어 처방전 + 맞춤 제품
// ============================================================================

import type { StyleAnswers } from "./surveyData";

// ─── 60종 스타일 테이블 ───────────────────────────────────────────────────────
// key: `${q11_length}_${q13_design}_${q14_layer}`

interface StyleEntry { name: string; mood: string; }

export const STYLE_TABLE: Record<string, StyleEntry> = {
  // ── 숏 (short) ──────────────────────────────────────────────────────────────
  "short_straight_heavy": { name: "클래식 숏컷",       mood: "심플하고 단정한 선이 지적인 인상을 만들어요" },
  "short_straight_medium": { name: "텍스처드 숏컷",    mood: "가벼운 결 처리로 생동감 있는 소프트 숏이에요" },
  "short_straight_light":  { name: "허쉬 숏컷",        mood: "각도 있는 레이어로 얼굴을 감싸는 모던한 숏이에요" },
  "short_c_curl_heavy":    { name: "볼드 숏펌",         mood: "볼륨감 있는 C컬이 머리를 풍성하게 보이게 해요" },
  "short_c_curl_medium":   { name: "소프트 숏펌",       mood: "가볍게 뜨는 C컬이 자연스러운 볼륨을 연출해요" },
  "short_c_curl_light":    { name: "에어 숏펌",         mood: "공기처럼 가벼운 C컬로 활동적인 매력이 돋보여요" },
  "short_s_curl_heavy":    { name: "웨이비 볼드 숏",    mood: "풍성한 S컬이 럭셔리한 숏 스타일을 완성해요" },
  "short_s_curl_medium":   { name: "내추럴 S컬 숏",    mood: "부드러운 S컬이 청순한 여성스러움을 더해요" },
  "short_s_curl_light":    { name: "에어리 S컬 숏",    mood: "공기감 가득한 S컬로 스타일리시함이 완성돼요" },
  "short_wave_heavy":      { name: "볼드 숏 웨이브",   mood: "묵직한 웨이브가 특별한 존재감을 발산해요" },
  "short_wave_medium":     { name: "소프트 숏 웨이브", mood: "경쾌한 웨이브가 얼굴을 밝고 발랄하게 만들어요" },
  "short_wave_light":      { name: "에어 숏 웨이브",   mood: "흩날리는 웨이브로 낭만적인 무드가 연출돼요" },

  // ── 숏단발 (bob) ────────────────────────────────────────────────────────────
  "bob_straight_heavy":    { name: "미시 단발",         mood: "기본에 충실한 단발로 세련된 도회적 이미지예요" },
  "bob_straight_medium":   { name: "소프트 A라인",      mood: "안으로 살짝 말리는 단발이 청초한 느낌을 줘요" },
  "bob_straight_light":    { name: "허쉬컷 단발",       mood: "층을 넣어 경쾌한 움직임이 완성되는 트렌디한 스타일이에요" },
  "bob_c_curl_heavy":      { name: "볼드 단발펌",       mood: "볼륨 있는 C컬이 단발을 화사하게 살려줘요" },
  "bob_c_curl_medium":     { name: "소프트 단발펌",     mood: "안으로 감기는 C컬이 얼굴을 아담하게 감싸요" },
  "bob_c_curl_light":      { name: "에어 단발펌",       mood: "가벼운 C컬로 발랄하면서 여성스러움을 더해요" },
  "bob_s_curl_heavy":      { name: "볼드 단발 S컬",     mood: "풍성한 S컬로 시선을 사로잡는 단발이에요" },
  "bob_s_curl_medium":     { name: "내추럴 단발 S컬",  mood: "자연스러운 S컬이 귀여운 여성미를 높여요" },
  "bob_s_curl_light":      { name: "에어리 단발 S컬",  mood: "사르르 흐르는 S컬로 걸리시한 무드예요" },
  "bob_wave_heavy":        { name: "글래머 단발 웨이브", mood: "묵직한 웨이브로 성숙한 매력이 넘쳐요" },
  "bob_wave_medium":       { name: "로맨틱 단발 웨이브", mood: "부드러운 웨이브가 사랑스러운 감성을 만들어요" },
  "bob_wave_light":        { name: "루즈 단발 웨이브", mood: "자유로운 웨이브로 세련된 캐주얼 무드예요" },

  // ── 단발 (shoulder) ─────────────────────────────────────────────────────────
  "shoulder_straight_heavy": { name: "미디엄 단발",       mood: "어깨에 닿는 단발이 성숙하고 안정적인 느낌을 줘요" },
  "shoulder_straight_medium": { name: "C라인 단발",       mood: "끝을 안으로 감은 단발로 깔끔하고 단정한 이미지예요" },
  "shoulder_straight_light": { name: "허쉬 미디",         mood: "풍성한 레이어가 얼굴을 갸름하게 만들어요" },
  "shoulder_c_curl_heavy":   { name: "볼륨 미디 C컬",    mood: "풍성한 C컬이 여성스러운 볼륨을 완성해요" },
  "shoulder_c_curl_medium":  { name: "소프트 미디 C컬",  mood: "자연스럽게 말리는 C컬로 청순함이 두 배예요" },
  "shoulder_c_curl_light":   { name: "에어 미디 C컬",    mood: "가볍게 뜨는 C컬이 개성 있는 스타일링이에요" },
  "shoulder_s_curl_heavy":   { name: "글래머 S컬 미디",  mood: "풍성한 S컬이 화려한 여성미를 발산해요" },
  "shoulder_s_curl_medium":  { name: "빌드펌 미디",       mood: "쇄골 라인에서 자연스럽게 뻗쳐 여성스러움을 극대화해요" },
  "shoulder_s_curl_light":   { name: "루즈 S컬 미디",    mood: "느슨하게 흐르는 S컬이 세련된 무드를 연출해요" },
  "shoulder_wave_heavy":     { name: "볼드 미디 웨이브",  mood: "강렬한 웨이브로 개성이 넘치는 스타일이에요" },
  "shoulder_wave_medium":    { name: "로맨틱 미디 웨이브", mood: "물결치는 웨이브가 감성적인 아름다움을 더해요" },
  "shoulder_wave_light":     { name: "에어리 미디 웨이브", mood: "자유로운 웨이브로 낭만적인 인상을 줘요" },

  // ── 중단발 (collarbone) ─────────────────────────────────────────────────────
  "collarbone_straight_heavy": { name: "클래식 롱 단발",    mood: "쇄골을 넘는 길이로 우아한 여성미가 완성돼요" },
  "collarbone_straight_medium": { name: "소프트 롱 단발",   mood: "끝을 살짝 다듬어 깔끔하고 세련된 느낌이에요" },
  "collarbone_straight_light": { name: "허쉬 롱 단발",      mood: "풍성한 레이어가 얼굴을 갸름하게 만들어요" },
  "collarbone_c_curl_heavy":   { name: "볼드 쇄골 C컬",    mood: "풍성한 C컬이 쇄골 라인을 화려하게 연출해요" },
  "collarbone_c_curl_medium":  { name: "내추럴 쇄골 C컬",  mood: "자연스러운 C컬이 우아한 여성스러움을 더해요" },
  "collarbone_c_curl_light":   { name: "에어리 쇄골 C컬",  mood: "가볍게 뜨는 C컬로 생동감 넘치는 스타일이에요" },
  "collarbone_s_curl_heavy":   { name: "볼드 쇄골 S컬",    mood: "풍성한 S컬로 성숙하고 우아한 매력이에요" },
  "collarbone_s_curl_medium":  { name: "빌드펌 쇄골",       mood: "쇄골에서 완만하게 펼쳐지는 S컬이 청순함을 더해요" },
  "collarbone_s_curl_light":   { name: "에어 쇄골 S컬",    mood: "가벼운 S컬이 낭만적이고 걸리시한 무드예요" },
  "collarbone_wave_heavy":     { name: "글래머 쇄골 웨이브", mood: "풍성한 웨이브로 화려한 존재감을 발산해요" },
  "collarbone_wave_medium":    { name: "로맨틱 쇄골 웨이브", mood: "부드러운 웨이브가 낭만적인 인상을 만들어요" },
  "collarbone_wave_light":     { name: "루즈 쇄골 웨이브",  mood: "느슨한 웨이브로 자유롭고 감각적인 스타일이에요" },

  // ── 긴머리 (chest) ──────────────────────────────────────────────────────────
  "chest_straight_heavy":  { name: "클래식 롱헤어",      mood: "매끄럽고 광택 있는 긴 머리로 시크한 여성미예요" },
  "chest_straight_medium": { name: "소프트 롱헤어",       mood: "자연스러운 결이 살아있는 우아한 롱헤어예요" },
  "chest_straight_light":  { name: "허쉬 롱헤어",         mood: "레이어로 경쾌하게 살린 롱헤어가 세련돼요" },
  "chest_c_curl_heavy":    { name: "볼드 롱 C컬",         mood: "묵직한 C컬이 롱헤어의 볼륨을 극대화해요" },
  "chest_c_curl_medium":   { name: "내추럴 롱 C컬",      mood: "자연스러운 C컬이 여성스러운 롱헤어를 완성해요" },
  "chest_c_curl_light":    { name: "에어리 롱 C컬",      mood: "가볍게 흐르는 C컬로 청초한 롱헤어 스타일이에요" },
  "chest_s_curl_heavy":    { name: "볼드 롱 S컬",         mood: "풍성한 S컬로 화려하고 성숙한 롱헤어예요" },
  "chest_s_curl_medium":   { name: "로맨틱 롱 S컬",      mood: "우아하게 흐르는 S컬이 로맨틱한 무드를 연출해요" },
  "chest_s_curl_light":    { name: "에어리 롱 S컬",      mood: "경쾌하게 흐르는 S컬로 봄날 같은 여성스러움이에요" },
  "chest_wave_heavy":      { name: "글래머 롱 웨이브",   mood: "강렬한 웨이브가 화려한 개성을 발산해요" },
  "chest_wave_medium":     { name: "비치 롱 웨이브",     mood: "물결치는 웨이브가 자유롭고 감각적인 스타일이에요" },
  "chest_wave_light":      { name: "루즈 롱 웨이브",     mood: "느슨하게 흐르는 웨이브로 낭만적인 롱헤어예요" },
};

// ─── 스타일 매칭 ──────────────────────────────────────────────────────────────

export function getStyleEntry(answers: StyleAnswers): StyleEntry {
  const key = `${answers.q11_length}_${answers.q13_design}_${answers.q14_layer}`;
  return STYLE_TABLE[key] ?? { name: "내추럴 소프트 스타일", mood: "자연스럽고 편안한 일상 스타일을 추천해요" };
}

// ─── 레퍼런스 이미지 경로 ─────────────────────────────────────────────────────

export function getRefImagePath(answers: StyleAnswers): string {
  const ageGroup = ["age_20", "age_30"].includes(answers.q1_age ?? "") ? "2040" : "5060";
  const layerMap: Record<string, string> = { heavy: "none", medium: "soft", light: "rich" };
  const layer    = layerMap[answers.q14_layer ?? ""] ?? "soft";
  const length   = answers.q11_length  ?? "shoulder";
  const design   = answers.q13_design  ?? "straight";
  return `/references/${ageGroup}/${length}/${design}/${layer}/ref_01.png`;
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
  coupangUrl:  string;
}

export function getStyleProduct(answers: StyleAnswers): StyleProduct {
  if (answers.q10_history_count === "count_7plus") {
    return {
      emoji: "🧴", category: "새치 케어",
      name: "어뷰티 약산성 새치 케어 샴푸",
      tagline: "두피 pH 균형 회복 + 새치 예방 복합 케어",
      coupangUrl: "https://link.coupang.com/a/eEoal2SxC8",
    };
  }
  if (answers.q7_thickness === "fine" || answers.q8_density === "thin_density") {
    return {
      emoji: "💊", category: "볼륨 케어",
      name: "어뷰티 뿌리 볼륨 에센스",
      tagline: "가는 모발에 탄력·볼륨을 채워주는 집중 케어",
      coupangUrl: "https://link.coupang.com/a/eEnDYZ4YEe",
    };
  }
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "wavy_hair") {
    return {
      emoji: "🌀", category: "컬 케어",
      name: "어뷰티 컬 유지 크림",
      tagline: "곱슬·웨이브 모발의 결을 정돈하고 촉촉하게 유지",
      coupangUrl: "https://link.coupang.com/a/eEn6wxl4Oy",
    };
  }
  return {
    emoji: "✨", category: "광택 케어",
    name: "어뷰티 글로시 헤어 세럼",
    tagline: "건강한 모발에 빛나는 광택을 더해주는 데일리 세럼",
    coupangUrl: "https://link.coupang.com/a/eEnlw9bAnQ",
  };
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
