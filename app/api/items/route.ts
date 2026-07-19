// ============================================================================
// 공개 발견템 조회 API (/api/items)
// /items 페이지가 쓰는 유일한 상품 조회 경로. 관리자 API(/api/admin/*)와 완전히
// 분리된 공개 라우트다(미들웨어 인증 게이트 밖).
//
// ⚠️ 원칙:
//  - status='approved' AND image_status='approved' 인 상품만 반환한다.
//  - 공개 allowlist(PUBLIC_PRODUCT_FIELDS)만 select 한다 — 내부 메모류
//    (sourcing_note, image_note) 및 운영 필드(sales_type, status 등) 절대 미노출.
//  - anon 클라이언트/anon RLS를 열지 않고, 반드시 이 서버 라우트를 경유한다.
//    (supabaseAdmin은 서버 전용, 응답 필드는 위 allowlist로 이미 제한됨)
// ============================================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { PUBLIC_PRODUCT_FIELDS, type PublicProduct } from "../../../lib/products";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(PUBLIC_PRODUCT_FIELDS)
    .eq("status", "approved")
    .eq("image_status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    // 상세는 서버 로그에만, 응답은 일반화한다.
    console.error("[api/items] 조회 실패:", error);
    return NextResponse.json({ ok: false, error: "상품을 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: (data ?? []) as unknown as PublicProduct[] });
}
