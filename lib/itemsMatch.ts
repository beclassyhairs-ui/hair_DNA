// ============================================================================
// 어뷰티 — /items 매칭 순수 로직
// 유저의 최신 /style 진단(answers: q3_curl/q7_thickness/q8_density)에서 coreKey
// (`curl__thickness__density`)를 도출하고, 상품 fit_hair_types/avoid_hair_types와
// 매칭한다. hairTags(한글 고민어휘)는 coreKey와 어휘가 달라 매칭에 쓰지 않는다.
//
// DB/네트워크 호출 없는 순수 함수 — /items 페이지에서만 사용.
// ============================================================================

import type { DiaryEntryLike } from "./beautyProfile";

const CURLS = new Set(["straight_hair", "wavy_hair", "curly_hair"]);
const THICKS = new Set(["coarse", "medium_thickness", "fine"]);
const DENSITIES = new Set(["thick_density", "medium_density", "thin_density"]);

function entryTime(entry: DiaryEntryLike): number {
  if (typeof entry.savedAt === "number") return entry.savedAt;
  if (typeof entry.createdAt === "string") {
    const t = Date.parse(entry.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/**
 * diaryEntries에서 curl/thickness/density가 모두 유효한 가장 최근 엔트리를 찾아
 * coreKey를 만든다. 하나도 없으면(스타일 진단 전 등) null.
 */
export function deriveCoreKeyFromEntries(entries: DiaryEntryLike[]): string | null {
  const sorted = [...entries].sort((a, b) => entryTime(b) - entryTime(a));
  for (const entry of sorted) {
    const answers = entry.answers;
    if (!answers || typeof answers !== "object") continue;
    const a = answers as Record<string, unknown>;
    const curl = a.q3_curl;
    const thickness = a.q7_thickness;
    const density = a.q8_density;
    if (
      typeof curl === "string" && CURLS.has(curl) &&
      typeof thickness === "string" && THICKS.has(thickness) &&
      typeof density === "string" && DENSITIES.has(density)
    ) {
      return `${curl}__${thickness}__${density}`;
    }
  }
  return null;
}

/**
 * 상품이 이 유저(coreKey)에게 노출 대상인지 판정한다.
 *  - avoid_hair_types에 coreKey가 있으면 제외
 *  - fit_hair_types가 비어있으면 범용 상품 → 노출
 *  - fit_hair_types가 지정돼 있으면 coreKey 포함 시에만 노출
 * coreKey가 null(진단 전)이면 fit 지정 상품은 매칭 불가로 판단한다(페이지에서 fallback 처리).
 */
export function productMatchesCoreKey(
  fitHairTypes: string[] | null,
  avoidHairTypes: string[] | null,
  coreKey: string | null,
): boolean {
  if (coreKey && avoidHairTypes && avoidHairTypes.includes(coreKey)) return false;
  if (!fitHairTypes || fitHairTypes.length === 0) return true;
  if (!coreKey) return false;
  return fitHairTypes.includes(coreKey);
}
