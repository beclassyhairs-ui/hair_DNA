// ============================================================================
// 동안비법 — 친구 초대(레퍼럴) 추적 로직
// ?ref=<id> 쿼리 파라미터를 파싱·저장·생성합니다.
// ============================================================================

const CAME_FROM_KEY = "dongan:ref_from"; // 누구의 링크로 왔는지
const MY_REF_KEY = "dongan:ref_mine";   // 이 세션의 고유 공유 ID

/**
 * URL에 ?ref= 파라미터가 있으면 세션에 저장하고 반환합니다.
 * 결과지 마운트 시 한 번 호출하세요.
 */
export function captureReferral(): string | null {
  if (typeof window === "undefined") return null;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) {
    try {
      sessionStorage.setItem(CAME_FROM_KEY, ref);
    } catch {}
  }
  return ref;
}

/** 이 세션이 누구의 초대 링크로 유입됐는지 반환합니다. */
export function getIncomingRef(): string | null {
  try {
    return sessionStorage.getItem(CAME_FROM_KEY);
  } catch {
    return null;
  }
}

/**
 * 이 사용자가 다른 사람을 초대할 때 쓸 고유 ref ID를 반환합니다.
 * 세션 내에서 동일한 ID가 유지됩니다.
 */
export function getOrCreateMyRef(): string {
  try {
    const existing = sessionStorage.getItem(MY_REF_KEY);
    if (existing) return existing;
    // 타임스탬프 기반 짧은 ID — 회원 계정이 생기면 userId로 교체
    const id =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    sessionStorage.setItem(MY_REF_KEY, id);
    return id;
  } catch {
    return "anon";
  }
}

/** 결과지 공유용 URL을 생성합니다. */
export function buildReferralUrl(myRefId: string): string {
  if (typeof window === "undefined") return `/result?ref=${myRefId}`;
  return `${window.location.origin}/result?ref=${encodeURIComponent(myRefId)}`;
}
