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
 * flux-kontext-pro 마스터 프롬프트 템플릿
 * 4개 설문 변수(연령·기장·레이어드·웨이브)를 조합해 헤어 전이 지시문 생성.
 * 얼굴·연령·피부·옷·배경의 극한 보존을 명시하여 연령 퇴행·서양화를 차단.
 */
export function buildHairStylePrompt(answers: StyleAnswers): string {
  const AGE_LABEL: Record<string, string> = {
    age_20:     "young woman in her twenties",
    age_30:     "woman in her thirties",
    age_40:     "mature woman in her forties",
    age_50:     "distinguished woman in her fifties",
    age_60plus: "senior woman in her sixties or seventies",
  };
  const LENGTH_LABEL: Record<string, string> = {
    short:      "very short pixie cut, above the ears",
    short_bob:  "short bob, ear to chin length",
    bob:        "classic bob, jaw length",
    shoulder:   "shoulder-length lob",
    collarbone: "collarbone-length hair",
    chest:      "long hair, chest length or longer",
  };
  const LAYER_LABEL: Record<string, string> = {
    heavy:  "blunt one-length cut with zero layering, heavy and uniform",
    medium: "soft feathered layers with gentle movement and subtle graduation",
    light:  "heavily layered hush-cut with strong texture graduation and airy lightweight finish",
  };
  const WAVE_LABEL: Record<string, string> = {
    straight: "perfectly straight and sleek, no wave or curl whatsoever",
    c_curl:   "soft C-curl, ends curling gently inward, smooth rounded silhouette, classic Korean salon finish",
    s_curl:   "luxurious flowing S-wave, elegant waves cascading from roots to ends, voluminous root lift, sophisticated Cheongdam-dong high-end salon style, smooth and polished finish, no tight or frizzy curl",
    wave:     "rich voluminous body wave, generous sweeping waves throughout, strong root volume, glamorous and luscious, premium Korean salon wave perm, deep lustrous finish",
  };

  const age    = AGE_LABEL[answers.q1_age       ?? ""] ?? "Korean woman";
  const length = LENGTH_LABEL[answers.q11_length ?? ""] ?? "shoulder-length lob";
  const layer  = LAYER_LABEL[answers.q14_layer  ?? ""] ?? "soft feathered layers with gentle movement";
  const wave   = WAVE_LABEL[answers.q13_design  ?? ""] ?? "soft C-curl, ends curling gently inward";

  // 5060 그룹에만 anti-youthening 경고를 추가 (30대에게 적용하면 강제 노화 유발)
  const isOlderGroup = ["age_50", "age_60plus"].includes(answers.q1_age ?? "");
  const ageLockLine = isOlderGroup
    ? `AGE LOCK: Do NOT make this person appear younger. Preserve her mature appearance exactly.`
    : `AGE LOCK: Do NOT alter her apparent age in any direction — neither younger nor older.`;

  return [
    `TASK: Change ONLY the hairstyle. Keep everything else identical to the source photo.`,
    ``,
    `=== TARGET HAIRSTYLE ===`,
    `${length}, ${layer}, ${wave}.`,
    `Style must be elegant and fitting for a ${age}.`,
    ``,
    `=== FACE — COPY EXACTLY AS IN SOURCE PHOTO ===`,
    `Reproduce the face exactly as it appears in the source photo. Do not modify it in any way.`,
    `Preserve all skin details, texture, tone, and features precisely as visible in the source.`,
    `Preserve exact eye shape, eyelid, nose, lips, face contour, and jawline.`,
    `Do not smooth, retouch, enhance, or alter the skin in any way.`,
    `Do not westernize or change any facial feature.`,
    `Do not apply any makeup, filters, or visual effects to the face.`,
    ``,
    ageLockLine,
    ``,
    `=== BODY, CLOTHING & BACKGROUND — IDENTICAL COPY ===`,
    `Keep clothing, neckline, collar, and all accessories exactly unchanged.`,
    `Keep background, room, lighting, shadows, and environment pixel-identical.`,
    `Keep posture, shoulder width, and body position unchanged.`,
    ``,
    `=== QUALITY STANDARD ===`,
    `Natural, dignified Korean salon quality.`,
    `Avoid any western hair texture unless specified.`,
    `Clean, polished, professional finish.`,
  ].join("\n");
}
