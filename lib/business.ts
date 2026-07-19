// ============================================================================
// lib/business.ts — 사업자 표시 정보 (전자상거래법 제10조 대응)
//
// ⚠️ 값은 전부 플레이스홀더다. 배포 전 사업주가 실제 값으로 교체해야 한다.
//    (상호·대표자·사업자등록번호·통신판매업신고번호·주소·이메일)
// ============================================================================

export const BUSINESS_PLACEHOLDER = "[사업주 기재 필요]";

export const BUSINESS_INFO = {
  companyName:    BUSINESS_PLACEHOLDER, // 상호
  representative: BUSINESS_PLACEHOLDER, // 대표자
  businessRegNo:  BUSINESS_PLACEHOLDER, // 사업자등록번호
  mailOrderRegNo: BUSINESS_PLACEHOLDER, // 통신판매업신고번호
  address:        BUSINESS_PLACEHOLDER, // 주소
  email:          BUSINESS_PLACEHOLDER, // 이메일
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
