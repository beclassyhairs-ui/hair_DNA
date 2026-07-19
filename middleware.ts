// ============================================================================
// 어뷰티 — 관리자 최소 인증 게이트
// /admin/* 페이지와 /api/admin/* 라우트를 ADMIN_SECRET 기반 세션 쿠키로 보호한다.
// - 쿠키 유효: 통과
// - 쿠키 없음/불일치: 페이지는 /admin/login으로 리다이렉트, API는 401
// - ADMIN_SECRET 미설정: fail-closed (500) — 무인증으로 열리지 않게 한다
// 로그인/로그아웃 라우트만 예외로 둔다(그래야 인증을 시작·해제할 수 있음).
//
// ⚠️ 이건 전체 인증(Supabase Auth + allowlist 등, 백로그)이 아니라 공개 배포 전
//    최소 방어다. 단일 공유 비밀번호이므로 유출 시 전원 접근됨 — 운영 확장 시 교체.
// ⚠️ 알려진 한계: /api/admin/login에 rate limit이 없다(서버리스 특성상 공유 스토어
//    필요). 지금은 충분히 긴 랜덤 ADMIN_SECRET으로 온라인 대입을 비현실화하는 것으로
//    완화한다. 운영 확장 시 KV 기반 rate limit / 계정별 인증으로 교체.
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./lib/adminAuth";

const LOGIN_PAGE = "/admin/login";
const AUTH_ROUTES = ["/api/admin/login", "/api/admin/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");

  // 인증을 시작/해제하는 경로는 게이트에서 제외한다.
  if (pathname === LOGIN_PAGE || AUTH_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // 비밀번호가 없으면 열지 않고 막는다(fail-closed).
    return isApi
      ? NextResponse.json({ ok: false, error: "서버에 ADMIN_SECRET이 설정되지 않았습니다." }, { status: 500 })
      : new NextResponse("서버 설정 오류: ADMIN_SECRET 미설정", { status: 500 });
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (await verifyAdminToken(secret, cookie)) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json({ ok: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = LOGIN_PAGE;
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
