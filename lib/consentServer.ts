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
