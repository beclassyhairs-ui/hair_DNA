import type { Answers } from "../app/diagnosis/surveyData";

// ============================================================================
// 레퍼런스 이미지 경로 매칭 알고리즘
//
// 핵심 축: Q1(연령) + Q12(기장) → AI 사진 생성의 1차 키
// 세부 축: Q14(디자인) + Q15(레이어) → 경로 세분화
//
// 경로 규칙:
//   단발 이상  → /references/{ageGroup}/{length}/{design}/{layer}/ref_01.png
//   숏/숏단발  → /references/{ageGroup}/{length}/{design}/ref_01.png  (레이어 뎁스 생략)
// ============================================================================

const FALLBACK = "/images/placeholder_hair.png";

// Q1 연령대 id → 폴더명
const AGE_GROUP: Record<string, string> = {
  "10s": "group_2040",
  "20s": "group_2040",
  "30s": "group_2040",
  "40s": "group_2040",
  "50s": "group_5060",
  "60s": "group_5060",
};

// 레이어 뎁스를 생략할 짧은 기장
const SHORT_LENGTHS = new Set(["short", "short_bob"]);

export function getReferenceImagePath(answers: Answers): string {
  try {
    const ageRaw  = answers["q1_age"]     as string | undefined;
    const lengths = answers["q11_length"];
    const design  = answers["q13_design"] as string | undefined;
    const layer   = answers["q14_layer"]  as string | undefined;

    // Q1(연령), Q12(기장), Q14(디자인) 없으면 폴백
    if (!ageRaw || !lengths || !design) return FALLBACK;

    const ageGroup = AGE_GROUP[ageRaw] ?? ageRaw;

    // Q12는 복수 선택 가능 — 첫 번째(우선순위 높은) 값 사용
    const length = Array.isArray(lengths) ? lengths[0] : lengths;
    if (!length) return FALLBACK;

    // TODO: 추후 다른 문진 항목들이 매칭 조건으로 추가될 수 있도록 확장 가능한 필터링 로직 공간
    // 예) const bangs  = answers["q6_bangs"]    as string | undefined;  // 앞머리 유무
    // 예) const damage = answers["q9_damage"]   as string | undefined;  // 손상도
    // 예) const curl   = answers["q3_curl"]     as string | undefined;  // 모질(곱슬도)
    // 예) const volume = answers["q15_volume"]  as string[] | undefined; // 볼륨 위치
    // 위 변수들을 경로 세그먼트에 추가하거나, 별도 파일명 suffix로 활용 가능

    // 숏/숏단발: 레이어 뎁스 생략
    if (SHORT_LENGTHS.has(length)) {
      return `/references/${ageGroup}/${length}/${design}/ref_01.png`;
    }

    // 그 외 기장: 레이어 포함
    if (!layer) return FALLBACK;
    return `/references/${ageGroup}/${length}/${design}/${layer}/ref_01.png`;

  } catch {
    return FALLBACK;
  }
}
