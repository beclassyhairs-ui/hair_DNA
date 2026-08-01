// ============================================================================
// lib/business.ts — 사업자 표시 정보 (전자상거래법 제10조 대응)
//
// 값은 소스에 박지 않고 전부 환경변수(NEXT_PUBLIC_BIZ_*)에서 읽는다. 미설정이면
// 빈 문자열로 폴백 → isBusinessInfoReady() 게이트가 자연스럽게 false가 되어
// 푸터의 사업자 표시 블록이 숨는다. 값을 채우는 순간 별도 코드 변경 없이 노출된다.
//
// ⚠️ NEXT_PUBLIC_* 는 "빌드 타임 인라인"이다. Vercel 프로젝트 환경변수에 값을 넣은
//    뒤 반드시 재배포(redeploy)해야 실제 값이 번들에 반영된다(런타임 주입 아님).
//    자택 주소 등 민감값이 git 히스토리에 남지 않도록 소스·커밋에는 절대 적지 않는다.
// ============================================================================

// (구) 미기재 표식 — 이제 폴백은 "" 이지만, 게이트 비교/디버깅 단서로 상수는 남겨둔다.
export const BUSINESS_PLACEHOLDER = "[사업주 기재 필요]";

export const BUSINESS_INFO = {
  companyName:    process.env.NEXT_PUBLIC_BIZ_COMPANY_NAME   ?? "", // 상호
  representative: process.env.NEXT_PUBLIC_BIZ_REPRESENTATIVE ?? "", // 대표자
  businessRegNo:  process.env.NEXT_PUBLIC_BIZ_REG_NO         ?? "", // 사업자등록번호
  mailOrderRegNo: process.env.NEXT_PUBLIC_BIZ_MAILORDER_NO   ?? "", // 통신판매업신고번호
  address:        process.env.NEXT_PUBLIC_BIZ_ADDRESS        ?? "", // 주소
  email:          process.env.NEXT_PUBLIC_BIZ_EMAIL          ?? "", // 이메일
} as const;

// 푸터 등에서 순서대로 렌더할 표시 항목 6종.
export const BUSINESS_INFO_FIELDS: { label: string; value: string }[] = [
  { label: "상호",             value: BUSINESS_INFO.companyName },
  { label: "대표자",           value: BUSINESS_INFO.representative },
  { label: "사업자등록번호",   value: BUSINESS_INFO.businessRegNo },
  { label: "통신판매업신고번호", value: BUSINESS_INFO.mailOrderRegNo },
  { label: "주소",             value: BUSINESS_INFO.address },
  { label: "이메일",           value: BUSINESS_INFO.email },
];

/**
 * 사업자 표시 6항목이 모두 실값(플레이스홀더 아님·공백 아님)일 때만 true.
 * 하나라도 미기재면 false → 푸터의 사업자 표시 블록을 숨긴다.
 * 값을 채우는 순간 자동으로 true가 되어 별도 코드 변경 없이 표시된다.
 */
export function isBusinessInfoReady(): boolean {
  return BUSINESS_INFO_FIELDS.every(
    (f) => f.value.trim() !== "" && f.value !== BUSINESS_PLACEHOLDER,
  );
}
