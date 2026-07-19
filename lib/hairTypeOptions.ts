// ============================================================================
// lib/hairTypeOptions.ts — curl/thickness/density 선택 어휘 (단일 출처)
// 상품 폼(ProductManager)과 매칭 시뮬레이터가 공유한다. 값은 lib/itemsMatch.ts의
// coreKey 포맷·집합(CURLS/THICKS/DENSITIES)과 반드시 동일해야 한다.
// 자유입력 금지 — 선택 조합으로만 coreKey를 만들어 오타 매칭 파손을 막는다.
// ============================================================================

export const CURL_OPTIONS: { value: string; label: string }[] = [
  { value: "straight_hair", label: "직모" },
  { value: "wavy_hair", label: "반곱슬" },
  { value: "curly_hair", label: "곱슬" },
];

export const THICKNESS_OPTIONS: { value: string; label: string }[] = [
  { value: "coarse", label: "굵은모" },
  { value: "medium_thickness", label: "보통 굵기" },
  { value: "fine", label: "가는모" },
];

export const DENSITY_OPTIONS: { value: string; label: string }[] = [
  { value: "thick_density", label: "숱 많음" },
  { value: "medium_density", label: "숱 보통" },
  { value: "thin_density", label: "숱 적음" },
];

/** coreKey 코드를 사람이 읽는 라벨로 변환 (예: "곱슬·가는모·숱 적음"). */
export function coreKeyLabel(code: string): string {
  const [curl, thickness, density] = code.split("__");
  const c = CURL_OPTIONS.find((o) => o.value === curl)?.label ?? curl;
  const t = THICKNESS_OPTIONS.find((o) => o.value === thickness)?.label ?? thickness;
  const d = DENSITY_OPTIONS.find((o) => o.value === density)?.label ?? density;
  return `${c}·${t}·${d}`;
}
