// ============================================================================
// GET /api/me/data — 로그인한 유저의 서버 저장 프로필 + 진단 이력 조회
//
// B-2: 다른 기기/재방문에서도 내 진단이 그대로 보이게 하는 "당겨오기(pull)" 쪽.
// 저장은 POST /api/me/sync가 담당한다.
//
// 보안:
//   - userId는 쿠키 세션에서만 얻는다(본문/쿼리 입력 불신).
//   - supabaseAdmin(service_role)은 이 서버 라우트 안에서만 쓴다(RLS는 anon deny-all).
//   - 응답에는 내부 컬럼을 그대로 흘리지 않고 클라가 쓰는 형태로만 정리해 내보낸다.
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUserId } from "@/lib/userSession";

// 한 유저가 되돌려받는 진단 이력 상한(응답 폭주 방지). 최신순 200건.
// ⚠️ 알려진 한계(수용): 서버에 200건이 넘게 쌓이면 새 기기는 오래된 이력을 못 당겨온다.
//    데이터가 지워지는 건 아니고 화면 표시만 최신 200건으로 잘린다. 진단 4종 기준
//    200건은 현실적으로 도달하기 어려워 MVP에선 페이지네이션을 만들지 않는다
//    (계정당 저장 상한은 /api/me/sync의 MAX_ROWS_PER_USER=500). 실제로 넘치면 그때 도입.
const MAX_ENTRIES = 200;

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  try {
    const [profileRes, diagRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("profile").eq("user_id", userId).maybeSingle(),
      supabaseAdmin
        .from("diagnoses")
        .select("client_id, kind, answers, result, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_ENTRIES),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (diagRes.error) throw diagRes.error;

    // 저장할 때 클라 엔트리 원본을 result에 통째로 넣었으므로 그대로 복원한다.
    const entries = (diagRes.data ?? []).map((row) => ({
      ...(row.result && typeof row.result === "object" ? row.result : {}),
      id: row.client_id,
      kind: row.kind,
      answers: row.answers ?? undefined,
    }));

    return NextResponse.json({
      ok: true,
      // 이 응답이 "누구 기준으로" 만들어졌는지 그대로 알려준다. 클라가 동기화 도중
      // 계정이 바뀌었는지(쿠키가 갈렸는지) 검증해 엉뚱한 계정 데이터를 반영하는 것을 막는다.
      userId,
      profile: profileRes.data?.profile ?? null,
      entries,
    });
  } catch (err) {
    // 공급자 응답 원문은 노출하지 않는다(내부 구조 유출 방지).
    console.error("[/api/me/data] 조회 실패:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
