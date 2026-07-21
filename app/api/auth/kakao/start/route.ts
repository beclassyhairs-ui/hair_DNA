// ============================================================================
// GET /api/auth/kakao/start — 카카오 로그인 시작
// state(CSRF)+return_to를 httpOnly 쿠키에 저장하고 카카오 인가 페이지로 302한다.
//
// ⚠️ KAKAO_REST_API_KEY / (Redirect URI)는 [사업주 등록] 환경변수다.
//    미설정이면 로그인 시작 불가 → 503 안내(크래시 아님).
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getKakaoEnv,
  buildKakaoAuthorizeUrl,
  sanitizeReturnTo,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_S,
} from "../../../../../lib/kakaoAuth";

export function GET(req: NextRequest) {
  const env = getKakaoEnv();
  if (!env) {
    return NextResponse.json(
      { ok: false, error: "카카오 로그인이 아직 설정되지 않았습니다.(KAKAO_REST_API_KEY 미설정)" },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const returnTo = sanitizeReturnTo(req.nextUrl.searchParams.get("return_to"));

  const res = NextResponse.redirect(buildKakaoAuthorizeUrl(env, state));
  // state와 return_to를 한 쿠키에 담아 콜백에서 대조한다(값 구분자: '|').
  res.cookies.set(OAUTH_STATE_COOKIE, `${state}|${returnTo}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // 카카오 콜백 top-level redirect에 동승
    path: "/",
    maxAge: OAUTH_STATE_TTL_S,
  });
  return res;
}
