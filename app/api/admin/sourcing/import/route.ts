// ============================================================================
// 소싱 검수 → products draft 배치 저장
// /admin/sourcing에서 "채택(keep)"으로 결정한 후보를 관리자가 명시적으로
// "draft로 저장" 버튼을 눌렀을 때만 호출된다. (keep 클릭 자체로는 저장하지 않음)
//
// ⚠️ 서버가 status='draft', image_status='needs_review'를 강제한다 — 클라이언트가
//    무엇을 보내든 무시한다. 허용 필드만 명시적으로 뽑아 저장한다(과잉 신뢰 방지).
//    이 라우트는 middleware.ts의 관리자 인증 게이트 뒤에 있다(/api/admin/*).
// ============================================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import type { ProductSalesType } from "../../../../../lib/products";

const MAX_BATCH = 200;

const SALES_TYPES: ProductSalesType[] = [
  "affiliate",
  "coupang",
  "naver",
  "domestic_consignment",
  "overseas_candidate",
  "own",
];

/** 클라이언트가 보낸 한 건에서 허용 필드만 뽑아 products insert 레코드를 만든다. */
function toDraftRecord(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  const it = item as Record<string, unknown>;

  const productName = typeof it.product_name === "string" ? it.product_name.trim() : "";
  if (!productName) return null; // product_name 없으면 저장 대상 아님

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const salesTypeRaw = typeof it.sales_type === "string" ? it.sales_type : null;
  const salesType =
    salesTypeRaw && SALES_TYPES.includes(salesTypeRaw as ProductSalesType)
      ? (salesTypeRaw as ProductSalesType)
      : null;

  const fitHairTypes = Array.isArray(it.fit_hair_types)
    ? it.fit_hair_types.filter((t): t is string => typeof t === "string" && t.trim() !== "")
    : [];

  return {
    product_name: productName,
    category: str(it.category),
    image_url: str(it.image_url),
    buy_link: str(it.buy_link),
    sales_type: salesType,
    fit_hair_types: fitHairTypes.length ? fitHairTypes : null,
    sourcing_note: str(it.sourcing_note),
    // ── 서버 강제값 (클라이언트 입력 무시) ──
    status: "draft",
    image_status: "needs_review",
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  const items = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "저장할 항목이 없습니다." }, { status: 400 });
  }
  if (items.length > MAX_BATCH) {
    return NextResponse.json(
      { ok: false, error: `한 번에 최대 ${MAX_BATCH}건까지 저장할 수 있습니다.` },
      { status: 400 },
    );
  }

  const records: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const item of items) {
    const record = toDraftRecord(item);
    if (record) records.push(record);
    else skipped++;
  }

  if (records.length === 0) {
    return NextResponse.json(
      { ok: false, error: "유효한 항목이 없습니다(product_name 필요).", skipped },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert(records)
    .select("id");

  if (error) {
    // 상세(제약조건명/컬럼 등)는 서버 로그에만 남기고, 응답은 일반화한다.
    console.error("[api/admin/sourcing/import] insert 실패:", error);
    return NextResponse.json({ ok: false, error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: data?.length ?? 0, skipped });
}
