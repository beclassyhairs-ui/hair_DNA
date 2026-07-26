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
import { validateCoreKeyList, type CoreKeyViolation } from "../../../../lib/hairTypeOptions";

/** fit/avoid coreKey 위반 목록을 400 응답으로 변환한다(sourcing import와 동일한 형식·문구). */
function coreKeyErrorResponse(invalid: CoreKeyViolation[]) {
  const preview = invalid
    .slice(0, 10)
    .map((v) => `${v.field}=${v.value}`)
    .join(" / ");
  return NextResponse.json(
    {
      ok: false,
      error: `모발 타입 형식 오류 ${invalid.length}건 — 반드시 3토막(curl__thickness__density)이어야 합니다: ${preview}`,
      invalid,
    },
    { status: 400 },
  );
}

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

  // ── 3토막 형식 검증 가드 ──
  // fit/avoid의 각 값은 반드시 `curl__thickness__density`(3토막)여야 한다. 정상 UI(CoreKeyBuilder)는
  // 셀렉트뿐이라 사고가 안 나지만, API 직접 호출로 아무 문자열이나 들어오는 것을 막는다.
  // (sourcing import 라우트와 동일한 공용 검증 함수·응답 형식을 공유한다.)
  const fitCheck = validateCoreKeyList(body.fit_hair_types, "fit_hair_types");
  const avoidCheck = validateCoreKeyList(body.avoid_hair_types, "avoid_hair_types");
  const invalid = [...fitCheck.invalid, ...avoidCheck.invalid];
  if (invalid.length > 0) return coreKeyErrorResponse(invalid);

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
      fit_hair_types: fitCheck.valid.length ? fitCheck.valid : null,
      avoid_hair_types: avoidCheck.valid.length ? avoidCheck.valid : null,
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
