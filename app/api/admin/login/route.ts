// ============================================================================
// 관리자 로그인 — ADMIN_SECRET 검증 후 세션 쿠키 발급
// middleware가 이 경로는 게이트에서 제외하므로 무인증으로 도달 가능하다.
// ============================================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_TTL_MS, issueAdminToken, safeEqual } from "../../../../lib/adminAuth";

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "서버에 ADMIN_SECRET이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => null)) as { secret?: string } | null;
  const input = typeof body?.secret === "string" ? body.secret : "";

  if (!input || !safeEqual(input, secret)) {
    return NextResponse.json({ ok: false, error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await issueAdminToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // 로컬 http에서도 로그인되게
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000, // 토큰 만료(exp)와 동일하게 맞춘다
  });
  return res;
}
