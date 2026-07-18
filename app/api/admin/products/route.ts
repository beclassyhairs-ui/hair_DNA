// ============================================================================
// GET  /api/admin/products — 전체 제품 목록 조회
// POST /api/admin/products — 제품 신규 등록
// events 라우트와 동일하게 service_role 키로 RLS를 우회한다.
// ============================================================================

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { ADMIN_PRODUCT_FIELDS, type ProductInput } from "../../../../lib/products";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(ADMIN_PRODUCT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/admin/products] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, products: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ProductInput | null;

  if (!body?.product_name?.trim()) {
    return NextResponse.json({ ok: false, error: "product_name은 필수입니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      product_name: body.product_name.trim(),
      category: body.category?.trim() || null,
      concern_tags: body.concern_tags?.length ? body.concern_tags : null,
      image_url: body.image_url?.trim() || null,
      buy_link: body.buy_link?.trim() || null,

      status: body.status,
      sales_type: body.sales_type,
      fit_hair_types: body.fit_hair_types?.length ? body.fit_hair_types : null,
      avoid_hair_types: body.avoid_hair_types?.length ? body.avoid_hair_types : null,
      solves_concern: body.solves_concern?.length ? body.solves_concern : null,
      recommend_reason: body.recommend_reason?.trim() || null,
      usage_guide: body.usage_guide?.trim() || null,
      caution_note: body.caution_note?.trim() || null,
      sourcing_note: body.sourcing_note?.trim() || null,

      detail_image_urls: body.detail_image_urls?.length ? body.detail_image_urls : null,
      image_source: body.image_source,
      image_status: body.image_status,
      image_alt: body.image_alt?.trim() || null,
      image_note: body.image_note?.trim() || null,
    })
    .select(ADMIN_PRODUCT_FIELDS)
    .single();

  if (error) {
    console.error("[api/admin/products] 등록 실패:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: data });
}
