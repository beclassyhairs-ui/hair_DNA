// ============================================================================
// lib/styleReference.ts
// 설문 답변 → public/references/ 최종 확정 디렉토리 매핑
//
// 구조: /references/[age 2그룹]/[length 6그룹]/[wave 4그룹]/[layer 3그룹]/
// 예)  30대 + 단발(bob) + C컬 + 중간층 → /references/group_2040/bob/c_curl/soft/
//
// ※ 레퍼런스 이미지는 Replicate 백엔드 전용 — 유저 브라우저 절대 미노출
// ============================================================================

import type { StyleAnswers } from "@/app/style/surveyData";

// ─── [나이] 2그룹 ─────────────────────────────────────────────────────────────
// 20대·30대·40대 → group_2040 / 50대·60대 이상 → group_5060

const AGE_DIR: Record<string, string> = {
  age_20:     "group_2040",
  age_30:     "group_2040",
  age_40:     "group_2040",
  age_50:     "group_5060",
  age_60plus: "group_5060",
};

// ─── [기장] 6그룹 ─────────────────────────────────────────────────────────────
// 설문값(q11_length)  →  실제 폴더명
// short     (숏)     → short
// bob       (숏단발) → short_bob
// shoulder  (단발)   → bob
// collarbone(중단발) → shoulder
// chest     (긴머리) → collarbone

const LENGTH_DIR: Record<string, string> = {
  short:      "short",
  bob:        "short_bob",
  shoulder:   "bob",
  collarbone: "shoulder",
  chest:      "collarbone",
};

// ─── [웨이브] 4그룹 ───────────────────────────────────────────────────────────

const WAVE_DIR: Record<string, string> = {
  straight: "straight",
  c_curl:   "c_curl",
  s_curl:   "s_curl",
  wave:     "wave",
};

// ─── [레이어드/질감] 3그룹 ────────────────────────────────────────────────────
// heavy  (무거움/층없음)  → none
// medium (중간/층약간)    → soft
// light  (가벼움/층많이)  → rich

const LAYER_DIR: Record<string, string> = {
  heavy:  "none",
  medium: "soft",
  light:  "rich",
};

// 기본 대체 이미지 경로 (빈 폴더 방어용)
export const DEFAULT_REFERENCE_PATH = "/references/default_style.jpg";

// 폴더당 최대 이미지 수 (1.jpg ~ MAX_IMG.jpg)
export const MAX_IMG = 5;

// ─── 핵심 매핑 함수 ───────────────────────────────────────────────────────────

/**
 * 설문 답변 4가지 → 4차원 디렉토리 경로 (trailing slash 포함)
 *
 * @example
 * getStyleDirectoryPath({ q1_age:"age_30", q11_length:"shoulder",
 *                         q13_design:"c_curl", q14_layer:"medium" })
 * // → "/references/group_2040/bob/c_curl/soft/"
 */
export function getStyleDirectoryPath(answers: StyleAnswers): string {
  const age    = AGE_DIR[answers.q1_age      ?? ""] ?? "group_2040";
  const length = LENGTH_DIR[answers.q11_length ?? ""] ?? "bob";
  const wave   = WAVE_DIR[answers.q13_design  ?? ""] ?? "straight";
  const layer  = LAYER_DIR[answers.q14_layer  ?? ""] ?? "soft";
  return `/references/${age}/${length}/${wave}/${layer}/`;
}

/**
 * 서버 baseUrl 없이 디렉토리 경로만 필요할 때 사용
 * (파일 존재 체크 없이 순수 경로 계산)
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
