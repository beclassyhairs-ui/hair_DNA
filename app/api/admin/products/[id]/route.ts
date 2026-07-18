// ============================================================================
// PUT    /api/admin/products/[id] — 제품 수정
// DELETE /api/admin/products/[id] — 제품 삭제
// ============================================================================

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import type { ProductInput } from "../../../../../lib/products";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "잘못된 id입니다." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body?.product_name?.trim()) {
    return NextResponse.json({ ok: false, error: "product_name은 필수입니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({
      product_name: body.product_name.trim(),
      category: body.category?.trim() || null,
      concern_tags: body.concern_tags?.length ? body.concern_tags : null,
      image_url: body.image_url?.trim() || null,
      buy_link: body.buy_link?.trim() || null,
    })
    .eq("id", id)
    .select("id, product_name, category, concern_tags, image_url, buy_link, created_at")
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
