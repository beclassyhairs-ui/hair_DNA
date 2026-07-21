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
  return NextResponse.json({ loggedIn: true, userId: session.userId });
}
