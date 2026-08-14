// ============================================================================
// lib/authGate.ts — 공용 로그인 게이트(클라 전용)
//
// 두 흐름이 "같은 게이트"를 공유한다:
//   · 스타일: AI 합성 시작 직전(/style/loading) — 게이트 조건은 호출부가 결정
//     (isLoginRequiredBeforeSynthesis). 여기선 로그인 확인 + 리다이렉트만 담당.
//   · 데미지: 결과 보기 직전(/damage-check/result 마운트).
//
// 동작: /api/auth/me 로 로그인 여부만 확인한다. 미로그인/조회실패는 fail-closed로
//   /login/consent?return_to=…(원래 화면 복귀)로 보내고 false를 반환한다.
//   ★ 서버 강제(api/hair-transform 401)와 스타일 upload 동의 게이트는 이 헬퍼와 무관하게
//     그대로 유지된다 — 이 헬퍼는 "클라 프리플라이트 리다이렉트"만 담당한다.
// ============================================================================

/**
 * 로그인 되어 있으면 true, 아니면 /login/consent 로 리다이렉트하고 false.
 * @param returnTo 로그인 후 복귀할 경로(예: "/style/loading", "/damage-check/result")
 * @param opts.onRedirect 리다이렉트 직전 실행할 훅(스타일은 clearAccountId 전달 — 기존 동작 보존)
 */
export async function ensureLoggedInOrRedirect(
  returnTo: string,
  opts?: { onRedirect?: () => void },
): Promise<boolean> {
  let loggedIn = false;
  try {
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json());
    loggedIn = Boolean(me?.loggedIn);
  } catch {
    loggedIn = false; // 조회 실패 = 안전측(미로그인 취급) → 리다이렉트
  }
  if (loggedIn) return true;

  try { opts?.onRedirect?.(); } catch { /* 훅 실패는 무시 — 리다이렉트는 반드시 수행 */ }
  if (typeof window !== "undefined") {
    window.location.href = `/login/consent?return_to=${encodeURIComponent(returnTo)}`;
  }
  return false;
}
