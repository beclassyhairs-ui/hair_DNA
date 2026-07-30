// ============================================================================
// lib/textures.ts — 진단 텍스처 스와치 매핑 상수
//
// public/textures/ 의 6종 질감 이미지(채택본) 경로 + 27개 모발 타입 → 스와치 매핑.
// 검수 통과본: 각 타입 -03 우선, flat만 -02 채택. 탈락 원본 11장은
// public/textures/_rejected/ 로 이동해 보관(코드에서 참조하지 않음).
//
// 키 의미(스와치가 표현하는 모발 특성):
//   curl     곱슬/컬 결
//   straight 직모(매끈하고 힘 있는 결)
//   volume   숱 많음 · 풍성한 부피
//   flat     숱 적음 · 볼륨 꺼짐(납작)
//   fine     얇은 모발(가는모)
//   care     손상·약한 모발 케어(부드럽고 힘없는 결)
// ============================================================================

export const TEXTURES = {
  curl:     "/textures/tex_curl-03.jpg",
  straight: "/textures/tex_straight-03.jpg",
  volume:   "/textures/tex_volume-03.jpg",
  flat:     "/textures/tex_flat-02.jpg",
  fine:     "/textures/tex_fine-03.jpg",
  care:     "/textures/tex_care-03.jpg",
} as const;

export type TextureKey = keyof typeof TEXTURES;

// ============================================================================
// 27타입 스와치 매핑 — ★ 1단계 확정본, 임의 수정 금지 ★
//
// coreKey(`curl__thickness__density`) → 텍스처 스와치(primary + optional secondary).
// 세션이 바뀌어도 이 표가 유실되지 않도록 여기에 못박는다. 값을 바꾸려면
// 반드시 사업주 재확정을 거친다(디자인 SSOT: docs/ui-spec.html §6).
//
// ratio는 전부 50 고정 — 굵기별 미세조정은 하지 않기로 확정된 사항이라
// 항목별 ratio를 두지 않는다(TextureSwatch의 기본값 50을 그대로 쓴다).
//
// 표기: primary + secondary. secondary 없으면 primary 단일.
// 검증 조건(확정본 충족):
//   · flat + care 동시 사용 0건
//   · 단일 3건 = #2·#5·#23
//   · #7·#8·#9 는 반드시 secondary=straight (직모 정체성 표기 목적)
// ============================================================================

export interface SwatchSpec {
  primary: TextureKey;
  secondary?: TextureKey;
}

export const TYPE_SWATCH: Record<string, SwatchSpec> = {
  // ── A. 직모 (straight_hair) ──
  "straight_hair__coarse__thick_density":          { primary: "volume",   secondary: "straight" }, // #1
  "straight_hair__coarse__medium_density":         { primary: "straight" },                        // #2 단일
  "straight_hair__coarse__thin_density":           { primary: "flat",     secondary: "straight" }, // #3
  "straight_hair__medium_thickness__thick_density":  { primary: "volume",   secondary: "straight" }, // #4
  "straight_hair__medium_thickness__medium_density": { primary: "straight" },                        // #5 단일
  "straight_hair__medium_thickness__thin_density":   { primary: "flat",     secondary: "straight" }, // #6
  "straight_hair__fine__thick_density":            { primary: "fine",     secondary: "straight" }, // #7
  "straight_hair__fine__medium_density":           { primary: "fine",     secondary: "straight" }, // #8
  "straight_hair__fine__thin_density":             { primary: "fine",     secondary: "straight" }, // #9

  // ── B. 반곱슬 (wavy_hair) ──
  "wavy_hair__coarse__thick_density":          { primary: "volume", secondary: "curl" },     // #10
  "wavy_hair__coarse__medium_density":         { primary: "curl",   secondary: "straight" }, // #11
  "wavy_hair__coarse__thin_density":           { primary: "flat",   secondary: "curl" },     // #12
  "wavy_hair__medium_thickness__thick_density":  { primary: "volume", secondary: "curl" },     // #13
  "wavy_hair__medium_thickness__medium_density": { primary: "curl",   secondary: "straight" }, // #14
  "wavy_hair__medium_thickness__thin_density":   { primary: "flat",   secondary: "curl" },     // #15
  "wavy_hair__fine__thick_density":            { primary: "fine",   secondary: "curl" },     // #16
  "wavy_hair__fine__medium_density":           { primary: "fine",   secondary: "curl" },     // #17
  "wavy_hair__fine__thin_density":             { primary: "care",   secondary: "curl" },     // #18

  // ── C. 곱슬 (curly_hair) ──
  "curly_hair__coarse__thick_density":          { primary: "curl", secondary: "volume" }, // #19
  "curly_hair__coarse__medium_density":         { primary: "curl", secondary: "volume" }, // #20
  "curly_hair__coarse__thin_density":           { primary: "curl", secondary: "flat" },   // #21
  "curly_hair__medium_thickness__thick_density":  { primary: "curl", secondary: "volume" }, // #22
  "curly_hair__medium_thickness__medium_density": { primary: "curl" },                      // #23 단일
  "curly_hair__medium_thickness__thin_density":   { primary: "curl", secondary: "flat" },   // #24
  "curly_hair__fine__thick_density":            { primary: "curl", secondary: "fine" },   // #25
  "curly_hair__fine__medium_density":           { primary: "curl", secondary: "fine" },   // #26
  "curly_hair__fine__thin_density":             { primary: "curl", secondary: "care" },   // #27
};

/** 직모 단일 — coreKey가 27표에 없을 때(레거시·오타) 안전한 폴백. */
const DEFAULT_SWATCH: SwatchSpec = { primary: "straight" };

/** coreKey로 스와치 스펙을 찾는다. 표에 없으면 직모 단일로 폴백(UI 크래시 방지). */
export function swatchForCoreKey(coreKey: string | null | undefined): SwatchSpec {
  if (!coreKey) return DEFAULT_SWATCH;
  return TYPE_SWATCH[coreKey] ?? DEFAULT_SWATCH;
}
