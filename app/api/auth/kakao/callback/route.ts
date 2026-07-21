// ============================================================================
// GET /api/auth/kakao/callback — 카카오 인가코드 콜백
// 1) state 쿠키 대조(CSRF) 2) 토큰 교환 3) 회원정보 조회 4) users upsert
// 5) 우리 세션 쿠키 발급 6) return_to로 302.
// access_token은 회원번호 조회에만 쓰고 저장하지 않는다(확정 결정 ①).
//
// ⚠️ 카카오 콜백은 top-level GET redirect다(우리가 만든 부작용 요청이 아니라 카카오가
//    보내는 표준 콜백). state 쿠키 대조로 위조 콜백을 막는다.
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getKakaoEnv,
  exchangeKakaoCode,
  fetchKakaoProfile,
  upsertUserByKakaoId,
  sanitizeReturnTo,
  OAUTH_STATE_COOKIE,
} from "../../../../../lib/kakaoAuth";
import { USER_COOKIE, issueUserToken, userCookieOptions } from "../../../../../lib/userAuth";

const TAG = "[kakao-callback]";

/** 실패 시 사용자를 어디로 돌려보낼지(로그인 실패 표식 포함). */
function failRedirect(req: NextRequest, returnTo: string, reason: string) {
  const dest = new URL(sanitizeReturnTo(returnTo), req.nextUrl.origin);
  dest.searchParams.set("login", "failed");
  const res = NextResponse.redirect(dest);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  console.error(`${TAG} 로그인 실패: ${reason}`);
  return res;
}

export async function GET(req: NextRequest) {
  // state 쿠키에서 (state, returnTo) 복원
  const rawCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const sep = rawCookie.indexOf("|");
  const cookieState = sep >= 0 ? rawCookie.slice(0, sep) : rawCookie;
  const returnTo = sanitizeReturnTo(sep >= 0 ? rawCookie.slice(sep + 1) : "/");

  const env = getKakaoEnv();
  if (!env) return failRedirect(req, returnTo, "kakao env 미설정");

  // 카카오가 에러로 돌려보낸 경우(유저 취소 등)
  const err = req.nextUrl.searchParams.get("error");
  if (err) return failRedirect(req, returnTo, `kakao error=${err}`);

  // CSRF: state 대조
  const state = req.nextUrl.searchParams.get("state") ?? "";
  if (!state || !cookieState || state !== cookieState) {
    return failRedirect(req, returnTo, "state 불일치");
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return failRedirect(req, returnTo, "code 없음");

  try {
    const accessToken = await exchangeKakaoCode(env, code);
    const profile = await fetchKakaoProfile(accessToken);
    // access_token은 여기서 폐기(저장 안 함). 회원번호로 내부 유저 확보.
    const user = await upsertUserByKakaoId(profile);

    const secret = process.env.USER_SESSION_SECRET;
    if (!secret) return failRedirect(req, returnTo, "USER_SESSION_SECRET 미설정");

    const token = await issueUserToken(secret, user.id);

    const dest = new URL(returnTo, req.nextUrl.origin);
    const res = NextResponse.redirect(dest);
    res.cookies.set(USER_COOKIE, token, userCookieOptions());
    res.cookies.delete(OAUTH_STATE_COOKIE);
    console.log(`${TAG} ✔ 로그인 성공(userId 발급, 셀카·토큰 미저장)`);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failRedirect(req, returnTo, msg);
  }
}
