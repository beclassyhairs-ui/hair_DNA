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

/** 매칭 판정에 필요한 최소 형태 — PublicProduct가 그대로 만족한다. */
export interface MatchableProduct {
  fit_hair_types: string[] | null;
  avoid_hair_types: string[] | null;
}

/**
 * 이 유저(coreKey)가 /items에서 실제로 보게 될 상품을, **보게 될 순서 그대로** 고른다.
 * 입력 순서(= /api/items 응답 순서)를 유지하며 재정렬하지 않는다.
 *
 * ⚠️ `/items`(실서비스)와 `/admin/matching-preview`(미리보기 시뮬레이터)가 **반드시**
 *    이 함수를 함께 써야 한다. 각자 filter를 복사해 두면 한쪽만 고쳤을 때 미리보기가
 *    조용히 어긋나고, 그 순간 시뮬레이터는 도구로서 의미를 잃는다.
 *    노출 규칙을 바꿀 일이 생기면 여기 한 곳만 고칠 것.
 */
export function selectMatchedProducts<T extends MatchableProduct>(
  items: T[] | null,
  coreKey: string | null,
): T[] {
  if (!items) return [];
  // 진단 전(coreKey 없음)에는 매칭 기준이 없으므로 승인 상품 전체를 보여준다(무작위 아님).
  if (coreKey === null) return items;
  return items.filter((p) => productMatchesCoreKey(p.fit_hair_types, p.avoid_hair_types, coreKey));
}
