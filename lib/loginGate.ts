// ============================================================================
// lib/loginGate.ts — 로그인을 "어느 지점에서 요구할지" 단일 설정 상수
//
// ⚠️ 사업주 미정(②): AI 합성 전 vs 진단 상세 앞 중 어디서 로그인을 강제할지 확정 대기.
//    이번(Phase A)에는 로그인 엔진만 만들고 실제 게이트 교체(Phase B)는 착수하지 않는다.
//    기존 가짜 게이트(app/style/result의 localStorage 플래그 + kakaoLogin())는 그대로 공존.
//
// 확정되면 이 상수 한 곳만 바꾸고, Phase B에서 게이트가 이 값을 읽어 동작하게 배선한다.
// 지금은 어디에서도 import/강제하지 않는다("none").
// ============================================================================

export type LoginRequirementPoint =
  | "none" // (현재) 강제 안 함 — 기존 가짜 게이트와 공존
  | "before_ai_synthesis" // AI 헤어 합성 시작 전
  | "before_report_detail"; // 진단 상세 리포트 열람 전

/** 현재 로그인 강제 지점. Phase B에서 이 값을 읽어 게이트를 켠다. */
export const LOGIN_REQUIREMENT_POINT: LoginRequirementPoint = "none";

/**
 * 카카오 로그인 기능 마스터 스위치(Phase B 활성화 플래그).
 * ⚠️ 지금은 false — 로그인 엔진만 존재하고 손님 흐름엔 노출되지 않는다(기존 가짜 게이트와 공존).
 * Phase B에서 로그인을 실제로 켤 때 true로 바꾼다. 이 값에 연동되는 것:
 *   - /privacy의 카카오 개인정보 수집항목·목적·보유기간 문구(켜질 때 함께 노출 → 정합)
 *   - (Phase B) 실제 로그인 게이트 배선
 * ⚠️ true로 바꾸기 전 /privacy 카카오 문안 사업주 검토 확정 필수.
 */
export const KAKAO_LOGIN_ENABLED = false;
