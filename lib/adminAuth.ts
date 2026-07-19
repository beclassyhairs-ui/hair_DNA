// ============================================================================
// 어뷰티 어드민 — 최소 인증 게이트 공용 로직
// ADMIN_SECRET(서버 전용 환경변수)을 키로 HMAC-SHA256 서명한 세션 토큰을 만들고,
// httpOnly 쿠키에 담아 middleware가 검증한다. 전체 인증(Supabase Auth 등)은
// 백로그이며, 이건 무인증 관리자 API를 공개 배포하기 전 최소 방어를 위한 게이트다.
//
// 토큰 형식: `${expMs}.${hmacHex}` — 만료시각(exp)을 payload에 넣어 서명하므로
//   1) 서버가 만료를 강제할 수 있고(쿠키를 재전송해도 exp 지나면 거부),
//   2) 고정 payload가 아니라 exp마다 서명이 달라진다.
// ⚠️ 단일 공유 비밀번호이므로 ADMIN_SECRET은 반드시 충분히 긴 랜덤값이어야 한다
//    (약한 비밀번호는 쿠키 유출 시 오프라인 대입에 취약). 전체 인증은 백로그.
//
// Edge(middleware)와 Node(route handler) 양쪽에서 동작하도록 Web Crypto만 사용한다.
// ============================================================================

export const ADMIN_COOKIE = "abeauty_admin";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12시간
const SESSION_PAYLOAD = "abeauty-admin-session-v1";

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

/** 만료시각이 포함된 세션 토큰을 발급한다(쿠키에 저장할 값). */
export async function issueAdminToken(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const sig = await hmacHex(secret, `${SESSION_PAYLOAD}:${exp}`);
  return `${exp}.${sig}`;
}

/** 토큰의 서명 유효성과 만료 여부를 검증한다. */
export async function verifyAdminToken(secret: string, token: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false; // 만료 강제

  const expected = await hmacHex(secret, `${SESSION_PAYLOAD}:${expStr}`);
  return safeEqual(sig, expected);
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
