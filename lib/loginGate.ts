// ============================================================================
// lib/loginGate.ts — 로그인을 "어느 지점에서 요구할지" 단일 설정 상수
//
// Phase B(2026-07-21) 활성화: 확정안대로 "결과(변환 이미지) 보기 직전 = AI 합성 시작 전"에
// 실제 카카오 로그인을 요구한다. 흐름: 8문항 → 셀카 업로드 → 로그인 → 합성 → 결과 공개 → 처방.
// 게이트 배선은 app/style/loading(합성 시작 전 /api/auth/me 확인)에서 수행한다.
//
// ⚠️ 로그인을 끄거나 요구 지점을 바꾸려면 이 파일의 상수 2개만 조정한다(단일 소스).
// ============================================================================

export type LoginRequirementPoint =
  | "none" // 강제 안 함
  | "before_ai_synthesis" // AI 헤어 합성 시작 전(= 결과 이미지 보기 직전)
  | "before_report_detail"; // 진단 상세 리포트 열람 전

/** 현재 로그인 강제 지점. */
export const LOGIN_REQUIREMENT_POINT: LoginRequirementPoint = "before_ai_synthesis";

/**
 * 카카오 로그인 기능 마스터 스위치.
 * 이 값에 연동되는 것:
 *   - /privacy의 카카오 개인정보 수집항목·목적·보유기간 문구(켜질 때 함께 노출 → 정합)
 *   - 실제 로그인 게이트(아래 헬퍼로 각 화면이 참조)
 * ⚠️ 다시 끄면(false) 손님 흐름에서 로그인 강제와 /privacy 카카오 문구가 함께 사라진다.
 */
export const KAKAO_LOGIN_ENABLED = true;

/** AI 합성(유료·결과 공개) 직전에 로그인을 요구해야 하는가. loading 페이지 게이트가 참조. */
export function isLoginRequiredBeforeSynthesis(): boolean {
  return KAKAO_LOGIN_ENABLED && LOGIN_REQUIREMENT_POINT === "before_ai_synthesis";
}
