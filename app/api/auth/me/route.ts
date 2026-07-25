// ============================================================================
// GET /api/auth/me — 현재 유저 세션 확인
// 게이트(Phase B)가 로그인 여부를 확인할 때 쓴다. httpOnly 쿠키라 클라 JS가 직접
// 못 읽으므로 이 엔드포인트로 확인한다. 내부 uuid만 반환(추가 PII 없음).
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { USER_COOKIE, verifyUserToken } from "../../../../lib/userAuth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// last_login_at 스로틀 — 이 간격 안이면 갱신하지 않는다.
const LAST_LOGIN_THROTTLE_MS = 24 * 60 * 60 * 1000;
const BUMP_COOKIE = "abeauty_seen";        // 마지막 bump 시각(epoch ms). 스로틀 판정용.
const BUMP_DB_TIMEOUT_MS = 2500;            // DB가 느려도 /me가 오래 멈추지 않게.

// 쿠키 자동로그인도 "마지막 접속"에 반영한다(전엔 OAuth 콜백에서만 갱신돼 첫 로그인 시각에 고정).
// 조건부 단일 UPDATE: last_login_at이 없거나(방어적 — 스키마는 NOT NULL) 24h보다 오래됐을 때만
// 1행 갱신, 아니면 0행(쓰기 없음). abortSignal로 응답 지연 상한(2.5s)을 두고, 실패는 삼킨다
// (세션 확인 자체는 계속 성공). ※ null 포함 조건이라 last_login_at이 null인 행도 갱신된다.
async function bumpLastLoginInDb(userId: string): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - LAST_LOGIN_THROTTLE_MS).toISOString();
    await supabaseAdmin
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId)
      .or(`last_login_at.is.null,last_login_at.lt.${cutoff}`)
      .abortSignal(AbortSignal.timeout(BUMP_DB_TIMEOUT_MS));
  } catch {
    /* 갱신 실패·타임아웃 무시 */
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.USER_SESSION_SECRET;
  const token = req.cookies.get(USER_COOKIE)?.value ?? "";

  if (!secret || !token) {
    return NextResponse.json({ loggedIn: false });
  }
  const session = await verifyUserToken(secret, token);
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  const res = NextResponse.json({ loggedIn: true, userId: session.userId });

  // 핫패스 최적화: 이 브라우저가 "같은 계정으로" 24h 이내에 이미 bump했으면 DB 왕복을 생략한다.
  // ProfileSync가 route change마다 /me를 부르므로, 스로틀 판정을 쿠키로 하면 하루 1회만 DB를 친다.
  // 쿠키 값은 `${userId}.${epoch}` — 계정 전환 시 userId가 달라 fresh로 안 잡혀 새 계정도 즉시 bump.
  // (쿠키는 서명하지 않는다 — 위조해도 "본인 last_login 정확도"에만 영향, 보안 영향 없음.
  //  DB UPDATE 자체도 24h 조건으로 한 번 더 막혀 write 증폭이 없다.)
  const rawCookie = req.cookies.get(BUMP_COOKIE)?.value ?? "";
  const dot = rawCookie.lastIndexOf(".");
  const cookieUser = dot > 0 ? rawCookie.slice(0, dot) : "";
  const cookieTs = dot > 0 ? Number(rawCookie.slice(dot + 1)) : NaN;
  const now = Date.now();
  const elapsed = now - cookieTs;
  const fresh =
    cookieUser === session.userId &&
    Number.isFinite(cookieTs) &&
    elapsed >= 0 &&                       // 미래 시각 쿠키는 fresh로 인정하지 않는다
    elapsed < LAST_LOGIN_THROTTLE_MS;

  if (!fresh) {
    await bumpLastLoginInDb(session.userId);
    res.cookies.set(BUMP_COOKIE, `${session.userId}.${now}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: LAST_LOGIN_THROTTLE_MS / 1000,
    });
  }

  return res;
}
