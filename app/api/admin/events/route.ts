// ============================================================================
// GET /api/admin/events
// 어드민 대시보드 전용 이벤트 조회 — service_role 키로 RLS를 우회해 전체 events를 읽는다.
// 이 라우트만 통해서 데이터를 내려주므로, 브라우저에는 service_role 키가 절대 노출되지 않는다.
// ============================================================================

export const runtime  = "nodejs";
// Next.js는 GET Route Handler를 기본적으로 캐싱한다 — 어드민 통계는 항상 최신이어야
// 하므로 라우트 캐시/데이터 캐시를 명시적으로 끈다. (안 끄면 최초 응답이 계속 재사용돼
// 실제로는 새 이벤트가 쌓여도 화면엔 옛날 스냅샷만 보이는 버그가 남는다.)
export const dynamic  = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const MAX_ROWS = 5000; // 안전한 상한 — 이 이상 쌓이면 서버 집계 쿼리(RPC/View)로 전환 필요

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    console.error("[api/admin/events] Supabase 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, events: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
