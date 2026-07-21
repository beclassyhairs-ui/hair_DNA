// ============================================================================
// 어뷰티 유저 세션 — 카카오 로그인 후 우리 자체 세션 쿠키
//
// ⚠️ 관리자 인증(lib/adminAuth.ts)과 시크릿·쿠키·모듈이 완전히 분리돼 있다(CLAUDE.md 8번).
//    - 시크릿:  USER_SESSION_SECRET  (관리자는 ADMIN_SECRET — 절대 재사용 금지)
//    - 쿠키명:  abeauty_session       (관리자는 abeauty_admin)
//    유저 세션과 관리자 세션은 서로의 토큰을 검증하지 못한다(서명 payload·시크릿이 다름).
//
// 토큰 형식: `${userId}.${expMs}.${hmacHex}`
//   - userId(내부 uuid)를 payload에 넣어 서명 → 쿠키만으로 유저를 식별하되 위조 불가.
//   - expMs(만료시각)도 서명에 포함 → 쿠키 재전송해도 만료 후 거부, exp마다 서명 상이.
//   - uuid에는 '.'이 없고 expMs도 숫자라 '.'로 안전하게 3분할된다.
//
// Edge/Node 양쪽에서 동작하도록 Web Crypto만 사용한다.
// ============================================================================

export const USER_COOKIE = "abeauty_session";
export const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
const SESSION_PAYLOAD = "abeauty-user-session-v1";

/** secret을 키로 message를 HMAC-SHA256 서명하고 hex로 반환. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 타이밍 공격을 피하기 위한 상수시간 문자열 비교. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** 유저 세션 토큰 발급(쿠키에 저장할 값). userId는 내부 uuid. */
export async function issueUserToken(secret: string, userId: string): Promise<string> {
  const exp = Date.now() + USER_SESSION_TTL_MS;
  const sig = await hmacHex(secret, `${SESSION_PAYLOAD}:${userId}:${exp}`);
  return `${userId}.${exp}.${sig}`;
}

/** 토큰 검증. 유효하면 { userId }, 아니면 null. */
export async function verifyUserToken(
  secret: string,
  token: string,
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts as [string, string, string];
  if (!userId || !expStr || !sig) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return null; // 만료 강제

  const expected = await hmacHex(secret, `${SESSION_PAYLOAD}:${userId}:${expStr}`);
  if (!safeEqual(sig, expected)) return null;
  return { userId };
}

/** 유저 세션 쿠키 옵션(발급 시). maxAge는 토큰 exp와 동일하게 맞춘다. */
export function userCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // 카카오 콜백 top-level redirect에 쿠키 동승 필요
    path: "/",
    maxAge: USER_SESSION_TTL_MS / 1000,
  };
}
