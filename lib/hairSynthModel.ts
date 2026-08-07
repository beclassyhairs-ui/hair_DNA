// ============================================================================
// lib/hairSynthModel.ts — 헤어 합성 모델·등급·프롬프트 단일 출처(Single Source of Truth)
//
// 2026-08-07: Replicate faceswap 전면 폐기 → OpenAI 이미지 편집으로 전환.
// ⚠️ 반복 사고 교훈: 라벨과 실물이 갈라지면 안 된다(100배 느린 모델로 갔던 사고). 모델명·등급·
//    프롬프트를 여기 "한 곳"에서만 정의하고 라우트가 참조한다.
//
// 확정(블라인드 A/B로 사업주 결정): gpt-image-1-mini · quality="low" (≈₩7 · 15~18초).
//   입력 image[0]=손님 셀카 / image[1]=레퍼런스 헤어. input_fidelity는 mini 미지원이라 넣지 않는다.
//   ★ quality는 아래 상수 한 줄만 바꾸면 low↔medium 전환(배포 후 실물 보고 승격 가능).
// ============================================================================

export const HAIRSYNTH_MODEL = "gpt-image-1-mini";
/** 화질 등급. 배포 후 실물 보고 여기 한 줄만 "low"↔"medium" 교체. */
export const HAIRSYNTH_QUALITY = "low";
export const HAIRSYNTH_SIZE = "1024x1536";
// 출력은 jpeg — PNG data URI는 커져서 서버리스 응답 한도를 넘길 수 있다(Codex 지적). jpeg로 축소.
export const HAIRSYNTH_OUTPUT_FORMAT = "jpeg";
export const OPENAI_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";

// 프롬프트 — 얼굴 보존 요구와 헤어 충실도 요구를 문장으로 "분리"해 충돌을 막는다.
// 상의는 결과지 통일감을 위해 흰색 반팔로 명시(블라인드에서 옷 색이 흰/회/검으로 갈렸음).
export const HAIRSYNTH_PROMPT = [
  "Edit the FIRST image.",
  "",
  "=== FACE — keep the FIRST image's person exactly as-is ===",
  "Same face, same facial features, same age, same wrinkles and skin texture, same skin tone,",
  "same neck and shoulders. Do NOT beautify, do NOT make them look younger, do NOT smooth or",
  "retouch the skin. The face and everything below the chin must remain the original person.",
  "",
  "=== HAIR — copy the SECOND image's hairstyle faithfully ===",
  "Replace ONLY the hair. Reproduce the hairstyle in the second image in full detail: not only",
  "the length and layers, but also the volume, the hair texture, the direction the curls fall,",
  "the shape of the bangs/fringe, and the parting position. Match the hair color tone of the",
  "second image. Do NOT simplify or flatten the hair. Use the second image ONLY as a hairstyle",
  "reference — never for the face or body.",
  "",
  "=== BACKGROUND / TOP / QUALITY ===",
  "Keep a clean, neat studio-tone background. The top must be a plain WHITE short-sleeve t-shirt.",
  "Photorealistic and natural.",
].join("\n");
