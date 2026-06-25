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
// 설문값(q11_length) ↔ /references/ 폴더명 — 1:1 직접 매핑
// short      (숏)    → short
// short_bob  (숏단발) → short_bob
// bob        (단발)   → bob
// shoulder   (어깨선) → shoulder
// collarbone (쇄골선) → collarbone
// chest      (가슴선) → chest

const LENGTH_DIR: Record<string, string> = {
  short:      "short",
  short_bob:  "short_bob",
  bob:        "bob",
  shoulder:   "shoulder",
  collarbone: "collarbone",
  chest:      "chest",
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
 * flux-kontext-pro 마스터 프롬프트 — 연령대별 듀얼 매핑
 *
 * 핵심 설계 원칙:
 * · Young (2040): 헤어 묘사에 fresh/natural/bouncy 계열 어휘만 사용
 *   → "sophisticated/luxurious/Cheongdam-dong/glamorous" 같은 중년 연상 어휘 완전 배제
 * · Mature (5060): 볼륨·우아함 계열 어휘 유지, anti-youthening AGE LOCK 적용
 * · 얼굴 보존: 노화 특징 열거 없이 "원본 그대로 복사" 중립 언어만 사용
 */
export function buildHairStylePrompt(answers: StyleAnswers): string {

  // ── 연령 그룹 판별 ──────────────────────────────────────────────────────────
  const isYoung = ["age_20", "age_30", "age_40"].includes(answers.q1_age ?? "");

  // ── AGE LABEL — "mature" 제거, 중립 표현만 사용 ────────────────────────────
  const AGE_LABEL: Record<string, string> = {
    age_20:     "woman in her twenties",
    age_30:     "woman in her thirties",
    age_40:     "woman in her forties",
    age_50:     "woman in her fifties",
    age_60plus: "woman in her sixties or older",
  };

  // ── 기장 — 연령 무관, 중립 묘사 ────────────────────────────────────────────
  const LENGTH_LABEL: Record<string, string> = {
    short:      "very short pixie cut, above the ears",
    short_bob:  "short bob, ear to chin length",
    bob:        "classic bob, jaw to chin length",
    shoulder:   "shoulder-length hair",
    collarbone: "collarbone-length hair",
    chest:      "long hair reaching the chest",
  };

  // ── 레이어드 듀얼 매핑 ──────────────────────────────────────────────────────
  // Young: fresh/airy/natural / Mature: classic graduation terminology 유지
  const LAYER_LABEL_YOUNG: Record<string, string> = {
    heavy:  "blunt one-length cut, clean and sleek, full uniform weight",
    medium: "soft layers with natural airy movement, light and bouncy",
    light:  "heavily layered hush-cut, strong texture, light and breezy",
  };
  const LAYER_LABEL_MATURE: Record<string, string> = {
    heavy:  "blunt one-length cut with zero layering, heavy and uniform",
    medium: "soft feathered layers with gentle movement and subtle graduation",
    light:  "heavily layered hush-cut with strong texture graduation and lightweight finish",
  };

  // ── 웨이브 듀얼 매핑 — 핵심 변경 지점 ──────────────────────────────────────
  // Young: "sophisticated/Cheongdam-dong/luxurious/glamorous" 완전 배제
  //        → fresh/natural/bouncy/airy/K-beauty 계열로 교체
  // Mature: 볼륨·우아함 어휘 유지
  const WAVE_LABEL_YOUNG: Record<string, string> = {
    straight: "perfectly straight and sleek, smooth and glossy, clean fresh finish",
    c_curl:   "soft C-curl, ends curling gently inward, bouncy smooth silhouette, natural K-beauty style",
    s_curl:   "natural flowing S-wave, soft airy waves from mid-lengths to ends, light and bouncy, fresh youthful finish",
    wave:     "natural bouncy body wave, lively waves throughout, full-bodied and airy, fresh Korean wave perm finish",
  };
  const WAVE_LABEL_MATURE: Record<string, string> = {
    straight: "perfectly straight and sleek, no wave or curl, refined and polished",
    c_curl:   "soft C-curl, ends curling gently inward, smooth rounded silhouette, refined Korean salon finish",
    s_curl:   "flowing S-wave, elegant waves from roots to ends, voluminous root lift, polished salon finish",
    wave:     "rich voluminous body wave, generous sweeping waves throughout, strong root volume, Korean salon wave perm",
  };

  // ── 최종 레이블 선택 ────────────────────────────────────────────────────────
  const LAYER_LABEL = isYoung ? LAYER_LABEL_YOUNG : LAYER_LABEL_MATURE;
  const WAVE_LABEL  = isYoung ? WAVE_LABEL_YOUNG  : WAVE_LABEL_MATURE;

  const age    = AGE_LABEL[answers.q1_age       ?? ""] ?? "Korean woman";
  const length = LENGTH_LABEL[answers.q11_length ?? ""] ?? "shoulder-length hair";
  const layer  = LAYER_LABEL[answers.q14_layer  ?? ""] ?? "soft layers with natural airy movement";
  const wave   = WAVE_LABEL[answers.q13_design  ?? ""] ?? "soft C-curl, ends curling gently inward";

  // ── AGE LOCK 분기 ──────────────────────────────────────────────────────────
  const ageLockLine = isYoung
    ? `AGE LOCK: Do NOT alter her apparent age in any direction — keep her looking exactly her age.`
    : `AGE LOCK: Do NOT make this person appear younger. Preserve her natural appearance exactly.`;

  // ── Quality Standard — "dignified" 제거 (중년 연상) ─────────────────────────
  const qualityLine = isYoung
    ? `Fresh, natural Korean salon quality. Clean and polished finish.`
    : `Elegant, refined Korean salon quality. Clean and polished finish.`;

  return [
    `TASK: Apply a new hairstyle ONLY. The face is NOT a creative zone — do not edit it.`,
    ``,
    `=== HAIRSTYLE TO APPLY ===`,
    `${length}, ${layer}, ${wave}.`,
    `Style for a ${age}.`,
    ``,
    `=== FACIAL IDENTITY LOCK — ZERO TOLERANCE ===`,
    `The person in the output MUST be the IDENTICAL individual from the source photo.`,
    `Treat the face as a locked layer that cannot be painted over, reshaped, or reinterpreted.`,
    ``,
    `Freeze each feature with pixel-level precision:`,
    `- Eye shape, eyelid crease type, eye size, and exact inter-eye distance`,
    `- Nose bridge width, nose length, nostril shape, and nose tip`,
    `- Lip outer contour, cupid's bow shape, and mouth width`,
    `- Jawline curve, chin shape, and the full face outline`,
    `- Cheekbone position, under-eye area, and temple width`,
    `- Face shape category — do NOT change it (oval stays oval, round stays round)`,
    `- Eyebrow shape, arch height, and thickness`,
    `- All spatial distances and proportions between facial landmarks`,
    ``,
    `If the output person looks different from the source in ANY of the above, the task has FAILED.`,
    `Do not alter any facial feature even if it would better complement the hairstyle.`,
    ``,
    ageLockLine,
    ``,
    `=== SKIN — AS PHOTOGRAPHED ===`,
    `Copy skin tone, texture, and all visible skin details exactly from the source.`,
    `Do not smooth, retouch, brighten, or apply any filter to the skin.`,
    ``,
    `=== BODY, CLOTHING & BACKGROUND ===`,
    `Keep clothing, neckline, accessories, background, lighting, and posture unchanged.`,
    ``,
    `=== QUALITY ===`,
    qualityLine,
    `No western hair texture unless specified.`,
  ].join("\n");
}
