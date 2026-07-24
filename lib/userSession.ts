// ============================================================================
// 서버 라우트에서 "지금 로그인한 유저가 누구인지"를 얻는 공용 헬퍼.
//
// ⚠️ 보안 원칙: userId는 **항상 쿠키 세션에서만** 얻는다. 요청 본문(body)이나
//    쿼리스트링으로 넘어온 userId는 절대 믿지 않는다 — 그러면 남의 진단을
//    읽고 쓰는 것이 그대로 가능해진다.
// ============================================================================

import "server-only";
import type { NextRequest } from "next/server";
import { USER_COOKIE, verifyUserToken } from "./userAuth";

/** 세션 쿠키를 검증해 내부 uuid를 돌려준다. 미로그인/위조/만료면 null. */
export async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret) return null;
  const token = req.cookies.get(USER_COOKIE)?.value ?? "";
  if (!token) return null;
  const session = await verifyUserToken(secret, token);
  return session?.userId ?? null;
}
