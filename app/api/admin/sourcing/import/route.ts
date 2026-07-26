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
import { isValidCoreKey } from "../../../../../lib/hairTypeOptions";

const MAX_BATCH = 200;

const SALES_TYPES: ProductSalesType[] = [
  "affiliate",
  "coupang",
  "naver",
  "domestic_consignment",
  "overseas_candidate",
  "own",
];

/**
 * fit/avoid 배열을 **검증하면서** 정제한다. 조용히 버리지 않는다:
 *  - 필드 없음/null → 빈 배열(허용, 미지정)
 *  - 배열이 아님 → 위반 기록(400 유발)
 *  - 원소가 비문자열이거나 3토막 coreKey가 아니면(빈 문자열·1토막·오타 포함) → 위반 기록
 * 위반이 있으면 invalid에 {row,field,value}를 쌓고, 통과한 값만 trim해 반환한다.
 * (호출부는 invalid가 하나라도 있으면 배치 전체를 400으로 거부하므로 정제 결과는 버려진다.)
 */
function validateCoreKeys(
  raw: unknown,
  field: string,
  row: number,
  productName: string,
  invalid: { row: number; product_name: string; field: string; value: string }[],
): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    invalid.push({ row, product_name: productName, field, value: `<비배열: ${typeof raw}>` });
    return [];
  }
  const out: string[] = [];
  for (const el of raw) {
    if (typeof el !== "string" || !isValidCoreKey(el.trim())) {
      invalid.push({ row, product_name: productName, field, value: typeof el === "string" ? el : `<${typeof el}>` });
      continue;
    }
    out.push(el.trim());
  }
  return out;
}

/** 클라이언트가 보낸 한 건에서 허용 필드만 뽑아 products insert 레코드를 만든다.
 *  fit/avoid는 이미 검증·정제된 배열을 받아 그대로 넣는다(빈 배열도 그대로 저장). */
function toDraftRecord(item: unknown, fit: string[], avoid: string[]): Record<string, unknown> | null {
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

  return {
    product_name: productName,
    category: str(it.category),
    image_url: str(it.image_url),
    buy_link: str(it.buy_link),
    sales_type: salesType,
    // 자동 태깅 중단 상태라 소싱 상품은 fit/avoid가 빈 배열로 들어온다(사람이 손 태깅).
    // ⚠️ fit 빈 배열 = 전 사용자 노출 — 단 status='draft'라 승인 전엔 공개되지 않는다.
    fit_hair_types: fit,
    avoid_hair_types: avoid,
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

  // ── 3토막 형식 검증 가드 (영구) ──
  // fit_hair_types / avoid_hair_types의 각 값은 반드시 `curl__thickness__density`(3토막,
  // hairTypeOptions 허용값)여야 한다. 위반이 하나라도 있으면 **조용히 통과시키지 않고**
  // 배치 전체를 거부하고, 문제가 된 행·필드·값을 응답에 담아 화면에서 크게 실패시킨다.
  // (지금은 자동 태깅이 꺼져 fit/avoid가 비어 발동할 일이 적지만, 나중에 GROUP_ID 맵을
  //  다시 켤 때 1토막·오타 값이 DB에 박혀 상품이 영구 미노출되는 사고를 막는 안전망이다.)
  const records: Record<string, unknown>[] = [];
  const invalid: { row: number; product_name: string; field: string; value: string }[] = [];
  let skipped = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itObj = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const pname = typeof itObj?.product_name === "string" ? String(itObj.product_name) : "";

    // 원본 원소를 먼저 검증(비문자열·빈토막·1토막·비배열 전부 위반으로 기록) → 통과분만 정제.
    const fit = validateCoreKeys(itObj?.fit_hair_types, "fit_hair_types", i + 1, pname, invalid);
    const avoid = validateCoreKeys(itObj?.avoid_hair_types, "avoid_hair_types", i + 1, pname, invalid);

    const record = toDraftRecord(item, fit, avoid);
    if (record) records.push(record);
    else skipped++;
  }

  if (invalid.length > 0) {
    const preview = invalid
      .slice(0, 10)
      .map((v) => `${v.row}행 "${v.product_name}" ${v.field}=${v.value}`)
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
