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
