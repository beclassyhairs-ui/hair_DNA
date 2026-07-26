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

const CURL_VALUES = new Set(CURL_OPTIONS.map((o) => o.value));
const THICKNESS_VALUES = new Set(THICKNESS_OPTIONS.map((o) => o.value));
const DENSITY_VALUES = new Set(DENSITY_OPTIONS.map((o) => o.value));

/**
 * coreKey가 정확히 `curl__thickness__density` 형식인지 검증한다.
 *  - 이중밑줄(`__`) 정확히 2개 → 3토막
 *  - 각 토막이 허용값(위 OPTIONS)에 속함
 * 하나라도 어긋나면 false. 매칭(productMatchesCoreKey는 정확 문자열 일치)이 조용히
 * 깨지는 것을 막는 안전망 — 1토막(bangs_babyhair 등)·오타·빈 토막을 전부 거른다.
 */
export function isValidCoreKey(code: unknown): boolean {
  if (typeof code !== "string") return false;
  const parts = code.split("__");
  if (parts.length !== 3) return false;
  const [curl, thickness, density] = parts;
  return CURL_VALUES.has(curl) && THICKNESS_VALUES.has(thickness) && DENSITY_VALUES.has(density);
}

/** coreKey 코드를 사람이 읽는 라벨로 변환 (예: "곱슬·가는모·숱 적음"). */
export function coreKeyLabel(code: string): string {
  const [curl, thickness, density] = code.split("__");
  const c = CURL_OPTIONS.find((o) => o.value === curl)?.label ?? curl;
  const t = THICKNESS_OPTIONS.find((o) => o.value === thickness)?.label ?? thickness;
  const d = DENSITY_OPTIONS.find((o) => o.value === density)?.label ?? density;
  return `${c}·${t}·${d}`;
}
