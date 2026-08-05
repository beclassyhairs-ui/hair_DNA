// ============================================================================
// lib/styleReference.ts
// 설문 답변 → public/references/ 레퍼런스 슬롯키 매핑 (2026-08-05 무나이 전환)
//
// 구조(사업주 확정, §0): /references/<기장>/<weight: heavy|medium|light>/<컬>/
//   예) 단발 + 층없음(heavy) + C컬 → references/bob/heavy/c_curl
//   ※ 나이(group_2040/5060) 제거 — 나이는 결과지 노출 필터에서 처리.
//   ※ 폴더명은 사업주 분류가 최종. weight 폴더는 heavy/medium/light 그대로 쓴다
//      (과거 none/soft/rich remap 폐기 — §0-4 옛 생성규칙 무효).
//
// ※ 레퍼런스 이미지는 Replicate 백엔드 전용(target_image) — 유저 브라우저 미노출
// ============================================================================

import type { StyleAnswers } from "@/app/style/surveyData";

// ─── [기장] — public/references/ 실제 폴더명과 1:1. shoulder는 레거시→collarbone ──
// (설문에서 2026-07 제거됐으나 과거 저장 다이어리/세션 값 방어. surveyData와 동일 처리.)
const LENGTH_DIR: Record<string, string> = {
  short:      "short",
  short_bob:  "short_bob",
  bob:        "bob",
  shoulder:   "collarbone", // 레거시 별칭
  collarbone: "collarbone",
  chest:      "chest",
};

// ─── [컬] 4종 ─────────────────────────────────────────────────────────────────
const WAVE_DIR: Record<string, string> = {
  straight: "straight",
  c_curl:   "c_curl",
  s_curl:   "s_curl",
  wave:     "wave",
};

// ─── [weight/층] 3종 — 설문 값(heavy/medium/light) = 폴더명 그대로(항등) ──────────
const LAYER_SET = new Set(["heavy", "medium", "light"]);

// 최종 폴백 이미지 경로(모든 슬롯·기장 폴백 실패 시). 사업주가 references 루트에 지정한
// 대표 이미지(정면·단일 얼굴·전체 헤어) — faceswap 캔버스로 안전.
export const DEFAULT_REFERENCE_PATH = "/references/c9248590-615b-4754-b6e6-85e079b2e926.jpg";

// 컬·weight 순회용(폴백 체인) — allowlist. 여기 없는 값은 슬롯키에 절대 안 들어간다(traversal 차단).
export const ALL_WEIGHTS = ["heavy", "medium", "light"] as const;
export const ALL_CURLS   = ["straight", "c_curl", "s_curl", "wave"] as const;

// ─── 핵심: 설문 답변 → 레퍼런스 슬롯키 "<len>/<weight>/<curl>" ──────────────────
// 반환값의 3토막은 전부 위 allowlist(LENGTH_DIR 값 / LAYER_SET / WAVE_DIR 값)에서만 나온다.
// 원시 설문값을 경로에 직접 넣지 않으므로 경로 traversal이 원천 불가능하다.
/**
 * @example
 * getReferenceSlotKey({ q11_length:"bob", q14_layer:"heavy", q13_design:"c_curl" })
 * // → "bob/heavy/c_curl"
 */
export function getReferenceSlotKey(answers: StyleAnswers): string {
  const length = LENGTH_DIR[answers.q11_length ?? ""] ?? "bob";
  const layer  = LAYER_SET.has(answers.q14_layer ?? "") ? (answers.q14_layer as string) : "medium";
  const wave   = WAVE_DIR[answers.q13_design ?? ""] ?? "straight";
  return `${length}/${layer}/${wave}`;
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
    shoulder:   "shoulder-length hair, lob-style cut",
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
