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

/** validateCoreKeyList가 돌려주는 위반 1건 — 어느 필드의 어떤 값이 문제인지. */
export interface CoreKeyViolation {
  field: string;
  value: string;
}

/**
 * fit/avoid 같은 coreKey 배열 하나를 **검증하면서** 정제한다. 조용히 버리지 않는다:
 *  - undefined/null → 빈 valid(허용, 미지정). 위반 아님.
 *  - 배열이 아님(문자열·숫자·객체 등) → 위반 1건, valid는 빈 배열.
 *  - 원소가 비문자열(숫자·null·객체·중첩배열) → 위반.
 *  - 빈 문자열/공백만 → isValidCoreKey가 false → 위반.
 *  - 3토막(curl__thickness__density) 아님(1·2·4토막·오타) → 위반.
 * 통과한 값만 trim해 valid에 담는다. 호출부는 invalid가 하나라도 있으면 배치/요청을
 * 거부하는 책임을 진다(이 함수는 판단하지 않고 분류만 한다).
 *
 * ⚠️ 소싱 import 라우트와 products 라우트가 이 한 벌을 공유한다 — 로직을 복사하지 말 것.
 */
export function validateCoreKeyList(
  raw: unknown,
  field: string,
): { valid: string[]; invalid: CoreKeyViolation[] } {
  const invalid: CoreKeyViolation[] = [];
  if (raw === undefined || raw === null) return { valid: [], invalid };
  if (!Array.isArray(raw)) {
    invalid.push({ field, value: `<비배열: ${typeof raw}>` });
    return { valid: [], invalid };
  }
  const valid: string[] = [];
  for (const el of raw) {
    if (typeof el !== "string" || !isValidCoreKey(el.trim())) {
      invalid.push({ field, value: typeof el === "string" ? el : `<${typeof el}>` });
      continue;
    }
    valid.push(el.trim());
  }
  return { valid, invalid };
}

/** coreKey 코드를 사람이 읽는 라벨로 변환 (예: "곱슬·가는모·숱 적음"). */
export function coreKeyLabel(code: string): string {
  const [curl, thickness, density] = code.split("__");
  const c = CURL_OPTIONS.find((o) => o.value === curl)?.label ?? curl;
  const t = THICKNESS_OPTIONS.find((o) => o.value === thickness)?.label ?? thickness;
  const d = DENSITY_OPTIONS.find((o) => o.value === density)?.label ?? density;
  return `${c}·${t}·${d}`;
}
