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
 * flux-kontext-pro 마스터 프롬프트 — 단일 age-neutral 어휘
 *
 * 핵심 설계 원칙:
 * · Young/Mature 듀얼 어휘 시스템 완전 폐기
 *   → "Korean salon wave perm" / "elegant" / "refined" / "voluminous root lift" 등
 *      FLUX의 중년 여성 이미지 prior를 활성화하는 어휘가 흰머리 강제 생성의 원인이었음
 * · 모든 연령대에 동일한 fresh/natural/bouncy/airy 계열 어휘 적용
 * · q1_age는 레퍼런스 이미지 경로 분기에만 사용 — 프롬프트 어휘 선택에 관여하지 않음
 * · 얼굴 보존: 원본 그대로 복사 중립 언어만 사용
 * · 민족성 고정: 100% Korean(동양인) 강제 — 서구화/혼혈화 차단
 */
export function buildHairStylePrompt(answers: StyleAnswers): string {

  // ── 기장 — 연령 무관, 중립 묘사 ────────────────────────────────────────────
  const LENGTH_LABEL: Record<string, string> = {
    short:      "very short pixie cut, above the ears",
    short_bob:  "short bob, ear to chin length",
    bob:        "classic bob, jaw to chin length",
    shoulder:   "shoulder-length hair",
    collarbone: "collarbone-length hair",
    chest:      "long hair reaching the chest",
  };

  // ── 레이어드 — 단일 age-neutral 어휘 ─────────────────────────────────────────
  // "feathered" / "graduation" 등 중년 연상 어휘 제거
  const LAYER_LABEL: Record<string, string> = {
    heavy:  "blunt one-length cut, clean and sleek, full uniform weight",
    medium: "soft layers with natural airy movement, light and bouncy",
    light:  "heavily layered hush-cut, strong texture, light and breezy",
  };

  // ── 웨이브 — 단일 age-neutral 어휘 ──────────────────────────────────────────
  // "Korean salon wave perm" / "elegant" / "voluminous root lift" / "polished" /
  // "refined" 전부 제거 — FLUX 학습 데이터에서 이 단어들이 흰머리 prior를 활성화함
  const WAVE_LABEL: Record<string, string> = {
    straight: "perfectly straight and sleek, smooth and glossy, clean fresh finish",
    c_curl:   "soft C-curl, ends curling gently inward, bouncy smooth silhouette, natural K-beauty style",
    s_curl:   "natural flowing S-wave, soft airy waves from mid-lengths to ends, light and bouncy",
    wave:     "natural bouncy body wave, lively waves throughout, full-bodied and airy",
  };

  const length = LENGTH_LABEL[answers.q11_length ?? ""] ?? "shoulder-length hair";
  const layer  = LAYER_LABEL[answers.q14_layer  ?? ""] ?? "soft layers with natural airy movement";
  const wave   = WAVE_LABEL[answers.q13_design  ?? ""] ?? "soft C-curl, ends curling gently inward";

  return [
    `TASK: Apply a new hairstyle ONLY. The face is a FROZEN, READ-ONLY LAYER — do not touch it.`,
    ``,
    `=== HAIR — SHAPE ONLY. ALL OTHER PROPERTIES FROM SOURCE IMAGE ===`,
    `Apply the new cut shape and wave pattern ONLY.`,
    `Hair color, shine, and texture: observe and copy directly from the source image as-is.`,
    `The source image is the sole reference for every hair property except shape.`,
    `Do not imagine or invent any hair attribute — read it from the source photo.`,
    ``,
    `=== HAIRSTYLE TO APPLY ===`,
    `NOTE: The following describes CUT SHAPE and WAVE PATTERN ONLY — NOT color, NOT age, NOT ethnicity.`,
    `${length}, ${layer}, ${wave}.`,
    ``,
    `=== FACIAL IDENTITY LOCK — ABSOLUTE ZERO TOLERANCE ===`,
    `The person in the output MUST be the PIXEL-FOR-PIXEL IDENTICAL individual from the source photo.`,
    `Treat the face as a locked, immovable stamp. Do NOT repaint, reinterpret, reshape, or redraw ANY part of it.`,
    ``,
    `Freeze each feature with exact pixel-level precision — no drift allowed:`,
    `- Eye shape, eyelid crease type (monolid / hooded / inner fold — KEEP AS-IS), eye size, inter-eye distance`,
    `- Nose bridge width and height, nose length, nostril shape, nose tip — do NOT raise the bridge`,
    `- Lip outer contour, cupid's bow shape, mouth width`,
    `- Jawline curve, chin shape, full face outline`,
    `- Cheekbone position, under-eye area, temple width`,
    `- Face shape category — do NOT change it (round stays round, square stays square, oval stays oval)`,
    `- Eyebrow shape, arch height, thickness`,
    `- All spatial distances and proportions between every facial landmark`,
    ``,
    `If the output person looks different from the source in ANY of the above features, the task has COMPLETELY FAILED.`,
    `Do not alter any facial feature even if it would better complement the hairstyle.`,
    `Do NOT make the person look younger or older — age manipulation is PROHIBITED.`,
    ``,
    `=== ETHNICITY LOCK — NON-NEGOTIABLE ===`,
    `This person is 100% Korean (East Asian). This is a hard constraint, not a preference.`,
    `- Strictly preserve 100% Korean/Asian facial characteristics`,
    `- Do NOT westernize ANY feature — no higher nose bridge, no enlarged eyes, no sharper chin`,
    `- Do NOT add a double eyelid if the original has monolids (inner fold or no fold)`,
    `- Do NOT apply any Caucasian/Western bone structure or facial proportion`,
    `- Do NOT introduce any mixed-race or half-foreign appearance`,
    `Any output with westernized facial features is a FAILED output.`,
    ``,
    `=== SKIN — AS PHOTOGRAPHED ===`,
    `Copy skin tone, texture, and all visible skin details exactly from the source.`,
    `Do not smooth, retouch, brighten, or apply any filter to the skin.`,
    ``,
    `=== HANDS, ARMS & BODY — FREEZE AS-IS ===`,
    `Preserve ALL body parts exactly as they appear in the source: hands, fingers, arms, shoulders, neck, and all exposed skin.`,
    `If hands or fingers overlap with the hair area in the source: keep them in the EXACT same position, shape, and pixel detail.`,
    `Do NOT regenerate, reinterpret, blend, or alter any body part even if it is in contact with the hair region.`,
    ``,
    `=== CLOTHING & BACKGROUND ===`,
    `Keep clothing, neckline, accessories, background, lighting, and posture unchanged.`,
    ``,
    `=== QUALITY ===`,
    `Natural Korean salon quality. Clean and polished finish.`,
    `No western hair texture unless specified.`,
  ].join("\n");
}
