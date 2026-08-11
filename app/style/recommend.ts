// ============================================================================
// 어뷰티 스타일 서비스 — 추천 엔진
// 60종 스타일명 + 케어 처방전 + 맞춤 제품
// ============================================================================

import type { StyleAnswers } from "./surveyData";
import { LENGTH_LABEL_MAP } from "./surveyData";

// 모발 성질 기반 헤어 방향 리포트(q3_curl/q7_thickness/q8_density/q10_history_count
// 108조합) — 데이터/조회 함수 본체는 app/style/hairTypeMatrix.ts에 있고, 기존
// getStyleEntry와 동일한 진입점(../recommend)에서 가져다 쓸 수 있도록 재노출한다.
export { getHairTypeReport, type HairTypeEntry } from "./hairTypeMatrix";

// ─── 스타일 네이밍 (지시서 A-6 · 확정 137) ───────────────────────────────────
// 조립식 접두어(연령×레이어) 전면 폐기 → 간판명 단일 세트(연령 분기 없음).
//   간판명 = q13_design(웨이브축) × q14_layer(레이어) 12조합 맵(확정 표 그대로).
//   부제  = "{기장 라벨} 기장 · {컬 설명}". 컬 설명 12개는 카피 최종본 §4 표에서 전부 주입.

interface StyleEntry { name: string; subtitle: string; mood: string; }

// [간판명] q13_design × q14_layer = 12칸 (지시서 A-6 표)
const SIGN_NAME: Record<string, Record<string, string>> = {
  straight: { heavy: "슬릭컷",     medium: "슬릭펌",     light: "레이어드 슬릭컷" },
  c_curl:   { heavy: "러블리펌",   medium: "빌드펌",     light: "에어펌" },
  s_curl:   { heavy: "엘리자벳펌", medium: "그레이스펌", light: "물결펌" },
  wave:     { heavy: "바디펌",     medium: "젤리펌",     light: "히피펌" },
};

// [부제 — 컬 설명] 카피 최종본 §4 표(간판명 12개 전부). design × layer로 매핑.
const SUBTITLE_CURL: Record<string, Record<string, string>> = {
  straight: { heavy: "한 줄로 떨어지는 매끈한 생머리", medium: "자연스럽게 정돈된 생머리",   light: "층을 낸 가벼운 생머리" },
  c_curl:   { heavy: "얼굴을 감싸는 굵은 C컬",         medium: "끝에서 안으로 말리는 C컬",     light: "가볍게 뜨는 C컬" },
  s_curl:   { heavy: "풍성하게 흐르는 S웨이브",        medium: "자연스럽게 흐르는 S웨이브",    light: "가볍게 흐르는 S웨이브" },
  wave:     { heavy: "묵직하게 굽이치는 웨이브",       medium: "부드럽게 굽이치는 웨이브",     light: "잔컬이 흐르는 자연스러운 웨이브" },
};

// [무드 문구] 공유/저장 문구용(Wave 4 × Layer 3 = 12칸). 기존 유지.
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
  const layer = answers.q14_layer ?? "medium";

  // 레거시/정책 예외 정규화 — shoulder(구 옵션, 2026-07 제거)는 collarbone으로,
  // short·short_bob + s_curl(신정책상 존재하지 않는 조합)은 wave로 취급한다. (기존 유지)
  const rawLength = answers.q11_length ?? "bob";
  const length    = rawLength === "shoulder" ? "collarbone" : rawLength;
  const isShort   = length === "short" || length === "short_bob";
  const rawDesign = answers.q13_design ?? "straight";
  const design    = isShort && rawDesign === "s_curl" ? "wave" : rawDesign;

  const name        = SIGN_NAME[design]?.[layer] ?? SIGN_NAME.straight!.medium!;
  const lengthLabel = LENGTH_LABEL_MAP[length] ?? LENGTH_LABEL_MAP.bob ?? "단발";
  const curlDesc    = SUBTITLE_CURL[design]?.[layer] ?? "";
  const subtitle    = `${lengthLabel} 기장 · ${curlDesc}`;
  const mood        = STYLE_MOOD[design]?.[layer] ?? "자연스럽고 편안한 스타일이에요";

  return { name, subtitle, mood };
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
    // A-1② 시술이력(구 q10_history_count 대체). 구 컬럼은 하위호환 위해 유지(신규 세션은 빈값).
    q10_history_count:  answers.q10_history_count  ?? "",
    q8a_recent:         answers.q8a_recent         ?? "",
    q8b_prev:           answers.q8b_prev           ?? "",
    q8c_more:           answers.q8c_more           ?? "",
    q8_bleach_2plus:    answers.q8_bleach_2plus    ?? "",
    q8_root_gray:       answers.q8_root_gray       ?? "",
    q10_history:        ["color_regular"],
  };
}
