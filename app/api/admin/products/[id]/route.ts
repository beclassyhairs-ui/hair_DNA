// ============================================================================
// PUT    /api/admin/products/[id] — 제품 수정
// DELETE /api/admin/products/[id] — 제품 삭제
// ============================================================================

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { ADMIN_PRODUCT_FIELDS, type ProductInput } from "../../../../../lib/products";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "잘못된 id입니다." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body?.product_name?.trim()) {
    return NextResponse.json({ ok: false, error: "product_name은 필수입니다." }, { status: 400 });
  }

  // 신규 확장 필드는 body에 실제로 포함된 경우에만 반영한다 — 아직 이 필드들을
  // 보내지 않는 기존 /admin/products 수정 폼이 저장할 때마다 sourcing_note 등을
  // null로 지워버리지 않도록 하기 위함.
  const updatePayload: Record<string, unknown> = {
    product_name: body.product_name.trim(),
    category: body.category?.trim() || null,
    concern_tags: body.concern_tags?.length ? body.concern_tags : null,
    image_url: body.image_url?.trim() || null,
    buy_link: body.buy_link?.trim() || null,
  };

  if (body.status !== undefined) updatePayload.status = body.status;
  if (body.sales_type !== undefined) updatePayload.sales_type = body.sales_type;
  if (body.fit_hair_types !== undefined) {
    updatePayload.fit_hair_types = body.fit_hair_types?.length ? body.fit_hair_types : null;
  }
  if (body.avoid_hair_types !== undefined) {
    updatePayload.avoid_hair_types = body.avoid_hair_types?.length ? body.avoid_hair_types : null;
  }
  if (body.solves_concern !== undefined) {
    updatePayload.solves_concern = body.solves_concern?.length ? body.solves_concern : null;
  }
  if (body.recommend_reason !== undefined) updatePayload.recommend_reason = body.recommend_reason?.trim() || null;
  if (body.usage_guide !== undefined) updatePayload.usage_guide = body.usage_guide?.trim() || null;
  if (body.caution_note !== undefined) updatePayload.caution_note = body.caution_note?.trim() || null;
  if (body.sourcing_note !== undefined) updatePayload.sourcing_note = body.sourcing_note?.trim() || null;
  if (body.detail_image_urls !== undefined) {
    updatePayload.detail_image_urls = body.detail_image_urls?.length ? body.detail_image_urls : null;
  }
  if (body.image_source !== undefined) updatePayload.image_source = body.image_source;
  if (body.image_status !== undefined) updatePayload.image_status = body.image_status;
  if (body.image_alt !== undefined) updatePayload.image_alt = body.image_alt?.trim() || null;
  if (body.image_note !== undefined) updatePayload.image_note = body.image_note?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .select(ADMIN_PRODUCT_FIELDS)
    .single();

  if (error) {
    console.error("[api/admin/products] 수정 실패:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, product: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "잘못된 id입니다." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);

  if (error) {
    console.error("[api/admin/products] 삭제 실패:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
