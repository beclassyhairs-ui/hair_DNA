// ============================================================================
// lib/consentGate.ts — 클라 전용 동의 게이트 헬퍼
//
// /style 사진(얼굴 수집) 단계 진입 전, "현재 방침버전 국외이전 동의 보유"를 확인한다.
// 설문 게이트(survey)와 직접진입 가드(upload)가 공유한다. (§8)
//   - 로그인 + 현재버전 국외이전 동의 → 통과(/style/upload)
//   - 그 외(미로그인 / 기록없음 / 구버전) → /login/consent
//   - 조회 실패 → 안전측(동의화면). 로그인 여부만으로 통과시키지 않는다.
// ============================================================================

import { CONSENT_POLICY_VERSION } from "./consent";

export const CONSENT_GATE_RETURN_TO = "/style/upload";

/** 동의화면으로 보낼 때의 href(return_to는 사진 단계로). */
export function consentGateHref(returnTo: string = CONSENT_GATE_RETURN_TO): string {
  return `/login/consent?return_to=${encodeURIComponent(returnTo)}`;
}

/** 현재 방침버전 국외이전 동의를 보유했는가. 실패 시 false(안전측). */
export async function hasOverseasConsent(): Promise<boolean> {
  try {
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
    return Boolean(
      me?.loggedIn &&
        me?.consent?.overseas_transfer === true &&
        me?.consent?.policy_version === CONSENT_POLICY_VERSION,
    );
  } catch {
    return false;
  }
}
