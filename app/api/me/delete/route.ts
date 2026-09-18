// ============================================================================
// POST /api/me/delete — 본인 계정·진단 기록 삭제(soft-delete) + 로그아웃
//
// §6 서버 권위 경계: 삭제 대상 user_id 는 **세션 쿠키에서만** 얻는다(본문/쿼리 무시).
//   → 남의 데이터를 지울 경로가 없다. 미로그인/위조/만료면 401.
//
// 실제 파기는 Supabase RPC soft_delete_user(uuid) 단일 트랜잭션(원자성):
//   diagnoses/profiles/hair_usage/events 실제 DELETE + users soft-delete(카카오ID 센티넬,
//   nickname/profile_image null, marketing_consent false). user_consents 는 보존(감사).
//   → SQL: docs/delete_user_rpc.sql (사업주가 Supabase 에서 직접 실행하는 관문).
//
// 성공/이미삭제 모두 세션 쿠키를 만료(로그아웃)한다. RPC 오류만 500.
// 부작용(파기)이 있어 POST 만 받는다.
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUserId } from "@/lib/userSession";
import { USER_COOKIE } from "@/lib/userAuth";

// /api/auth/me 가 last_login 스로틀에 쓰는 쿠키 — 삭제 시 함께 정리(다음 로그인에서 새로 발급).
const BUMP_COOKIE = "abeauty_seen";

/** 세션·스로틀 쿠키를 만료시킨 응답을 만든다(로그아웃). */
function withClearedSession(body: Record<string, unknown>, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.cookies.delete(USER_COOKIE);
  res.cookies.delete(BUMP_COOKIE);
  return res;
}

export async function POST(req: NextRequest) {
  // 1) 신원: 세션 쿠키에서만. 본문·쿼리의 user_id 는 절대 신뢰하지 않는다.
  const userId = await getSessionUserId(req);
  if (!userId) {
    // 세션이 없거나 만료·위조 — 남아있을 수 있는 쿠키도 정리해 확실히 로그아웃 상태로.
    return withClearedSession({ ok: false, reason: "login_required" }, 401);
  }

  // 2) 원자적 삭제(RPC). 반환 false = 이미 삭제/없음(멱등) → 여전히 로그아웃 처리.
  try {
    const { error } = await supabaseAdmin.rpc("soft_delete_user", { p_user_id: userId });
    if (error) throw error;
  } catch (err) {
    console.error("[/api/me/delete] soft_delete_user 실패:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  // 3) 세션 종료(로그아웃) — 세션 쿠키 + 스로틀 쿠키 만료.
  return withClearedSession({ ok: true }, 200);
}
