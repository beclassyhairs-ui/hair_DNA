// ============================================================================
// lib/consentServer.ts — 서버 전용 동의 조회
//
// 현재 방침버전의 국외이전 동의 보유 여부를 user_consents에서 확인한다.
// /api/auth/me(게이트 판단용 필드)와 /api/hair-transform(합성 前 서버 강제, §13)이 공유한다.
//   - 최신 이벤트가 granted=true여야 보유로 본다(철회는 granted=false 새 이벤트).
//   - 실패·타임아웃·테이블 미적용이면 false(안전측/fail-closed — 진입 차단).
//     ⚠️ 조회 실패를 "통과"로 처리하면 그 자체가 우회로가 된다(§13-3).
// ============================================================================

import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import { CONSENT_POLICY_VERSION } from "./consent";

const CONSENT_DB_TIMEOUT_MS = 2500;

export async function hasCurrentOverseasConsent(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_consents")
      .select("granted")
      .eq("user_id", userId)
      .eq("consent_type", "overseas_transfer")
      .eq("policy_version", CONSENT_POLICY_VERSION)
      .order("granted_at", { ascending: false })
      .limit(1)
      .abortSignal(AbortSignal.timeout(CONSENT_DB_TIMEOUT_MS))
      .maybeSingle();
    if (error) return false;
    return data?.granted === true;
  } catch {
    return false;
  }
}

// 현재 마케팅(광고성 정보 수신) 동의 보유 여부. 최신 이벤트가 granted=true여야 보유.
//   ★ overseas와 달리 policy_version으로 필터하지 않는다 — 마케팅 수신 opt-in 은 개인정보
//     방침 버전이 올라간다고 자동 해제돼선 안 된다(손님이 "취소" 누르기 전까지 유지).
//     철회는 granted=false 새 이벤트로 남고, granted_at 최신값이 현재 상태를 결정한다.
//   실패·타임아웃이면 false(안전측 — "미신청"으로 표시, 재신청은 멱등).
export async function hasCurrentMarketingConsent(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_consents")
      .select("granted")
      .eq("user_id", userId)
      .eq("consent_type", "marketing")
      .order("granted_at", { ascending: false })
      .limit(1)
      .abortSignal(AbortSignal.timeout(CONSENT_DB_TIMEOUT_MS))
      .maybeSingle();
    if (error) return false;
    return data?.granted === true;
  } catch {
    return false;
  }
}
