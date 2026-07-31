// ============================================================================
// lib/hairType.ts — 곱슬축 3장 이미지 매핑 (텍스처 사선 스와치 대체)
//
// 사업주 실기기 판정: 텍스처 사선 스와치는 썸네일 크기에서 판독 불가 →
// coreKey(curl__thickness__density)의 "곱슬축(s/w/c)"만 보고 1:1 이미지 매핑.
// 로직은 이 함수 하나가 전부다(굵기·숱은 이미지에 반영하지 않는다).
//
// public/hairtype/{straight,wavy,curly}.jpg (사업주 배치 대기).
// 파일이 없어도 안전 — 표시 컴포넌트(HairTypeImage/HairTypeHero)가
// onError/미로딩 시 이미지를 숨기거나 soft 패널로 폴백한다(깨진 이미지 금지).
// ============================================================================

export function hairTypeImage(coreKey: string | null | undefined): string | null {
  if (!coreKey) return null;
  const curl = coreKey.split("__")[0];
  if (curl === "straight_hair") return "/hairtype/straight.jpg";
  if (curl === "wavy_hair") return "/hairtype/wavy.jpg";
  if (curl === "curly_hair") return "/hairtype/curly.jpg";
  return null;
}
