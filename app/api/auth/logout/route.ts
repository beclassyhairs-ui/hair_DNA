// ============================================================================
// POST /api/auth/logout — 유저 세션 종료(쿠키 삭제)
// 부작용(세션 삭제)이 있어 POST만 받는다(외부 링크발 강제 로그아웃 GET 방지).
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { USER_COOKIE } from "../../../../lib/userAuth";

export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_COOKIE);
  return res;
}
