// ============================================================================
// lib/styleReference.ts
// 설문 답변 → public/references/ 디렉토리 동적 매핑 + 랜덤 이미지 픽
//
// 디렉토리 구조: /references/[age]/[length]/[wave]/[layer]/1.jpg ~ 5.jpg
// 예) 30대 + 단발 + C컬 + 무거움 → /references/30s/bob/c_curl/heavy/3.jpg
//
// ※ 레퍼런스 이미지는 Replicate API 호출용 내부 자원 — 유저 화면 미노출
// ============================================================================

import type { StyleAnswers } from "@/app/style/surveyData";

// ─── 연령대 매핑 ──────────────────────────────────────────────────────────────

const AGE_DIR: Record<string, string> = {
  age_20:     "20s",
  age_30:     "30s",
  age_40:     "40s",
  age_50:     "50s",
  age_60plus: "60s",
};

// ─── 기장(Length) 매핑 ────────────────────────────────────────────────────────

const LENGTH_DIR: Record<string, string> = {
  short:      "short",
  bob:        "bob",
  shoulder:   "shoulder",
  collarbone: "collarbone",
  chest:      "chest",
};

// ─── 웨이브/디자인 매핑 ────────────────────────────────────────────────────────

const WAVE_DIR: Record<string, string> = {
  straight: "straight",
  c_curl:   "c_curl",
  s_curl:   "s_curl",
  wave:     "wave",
};

// ─── 레이어드 매핑 ────────────────────────────────────────────────────────────

const LAYER_DIR: Record<string, string> = {
  heavy:  "heavy",
  medium: "medium",
  light:  "light",
};

// 각 폴더 내 이미지 수 (1.jpg ~ MAX_IMG.jpg)
const MAX_IMG = 5;

// ─── 핵심 함수 ────────────────────────────────────────────────────────────────

/**
 * 설문 답변 4가지 → 레퍼런스 이미지 디렉토리 상대 경로
 * (예) { q1_age: "age_30", q11_length: "bob", q13_design: "c_curl", q14_layer: "heavy" }
 *   → "/references/30s/bob/c_curl/heavy/"
 */
export function getStyleDirectoryPath(answers: StyleAnswers): string {
  const age    = AGE_DIR[answers.q1_age      ?? ""] ?? "40s";
  const length = LENGTH_DIR[answers.q11_length ?? ""] ?? "shoulder";
  const wave   = WAVE_DIR[answers.q13_design  ?? ""] ?? "straight";
  const layer  = LAYER_DIR[answers.q14_layer  ?? ""] ?? "medium";
  return `/references/${age}/${length}/${wave}/${layer}/`;
}

/**
 * 디렉토리 경로 + 랜덤 인덱스 → 절대 URL
 * 같은 경로에서 1~5 중 매번 다른 이미지 → '다시하기' 시 자동 로테이션
 *
 * @param dirPath   getStyleDirectoryPath() 반환값
 * @param baseUrl   서버 origin (e.g. "https://your-domain.com" | "http://localhost:3001")
 */
export function pickRandomReferenceUrl(dirPath: string, baseUrl: string): string {
  const index = Math.floor(Math.random() * MAX_IMG) + 1;
  return `${baseUrl}${dirPath}${index}.jpg`;
}

/**
 * answers → 랜덤 레퍼런스 이미지 절대 URL (원스텝 헬퍼)
 */
export function getRandomReferenceUrl(answers: StyleAnswers, baseUrl: string): string {
  return pickRandomReferenceUrl(getStyleDirectoryPath(answers), baseUrl);
}

// ─── 헤어 스타일 프롬프트 빌더 ────────────────────────────────────────────────

/**
 * 설문 답변 → Replicate API 텍스트 프롬프트
 * 텍스트 프롬프트는 레퍼런스 이미지를 보강하는 역할만 담당
 */
export function buildHairStylePrompt(answers: StyleAnswers): string {
  const LENGTH_LABEL: Record<string, string> = {
    short:      "very short pixie cut hair above ears",
    bob:        "chin length bob haircut",
    shoulder:   "shoulder length lob haircut",
    collarbone: "collarbone length medium length hair",
    chest:      "long hair below collarbone",
  };
  const WAVE_LABEL: Record<string, string> = {
    straight: "sleek straight hair without any waves",
    c_curl:   "C-curl perm with hair gently curling inward at ends",
    s_curl:   "natural S-wave perm with flowing waves",
    wave:     "loose beach waves with wavy texture throughout",
  };
  const LAYER_LABEL: Record<string, string> = {
    heavy:  "blunt one-length cut with no layers",
    medium: "soft feathered layers with natural movement",
    light:  "heavy hush-cut layers with lots of texture and volume",
  };

  const length = LENGTH_LABEL[answers.q11_length ?? ""] ?? "medium length hair";
  const wave   = WAVE_LABEL[answers.q13_design  ?? ""] ?? "natural hair";
  const layer  = LAYER_LABEL[answers.q14_layer  ?? ""] ?? "layered hair";

  return (
    `professional hair salon portrait, Korean woman, ` +
    `${length}, ${wave}, ${layer}, ` +
    `high quality photography, sharp focus, studio lighting, beautiful skin`
  );
}
