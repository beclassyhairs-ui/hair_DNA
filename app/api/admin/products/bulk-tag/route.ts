// ============================================================================
// POST /api/admin/products/bulk-tag — 여러 상품의 fit/avoid 모발타입을 일괄 덮어쓰기
//
// 배경: 같은 제품군 상품은 fit_hair_types가 동일한데, 상품 1개씩 CoreKeyBuilder로
//       넣으면 수백~천 번 클릭이 필요하다. 이 라우트는 선택한 상품들에 fit/avoid를
//       한 번에 적용한다(덮어쓰기 — 기존 값 제거 후 새로 저장).
//
// 안전:
//   - 매칭 로직은 건드리지 않는다. 저장은 기존과 동일한 3토막 검증(validateCoreKeyList)을
//     그대로 통과해야 한다 — 검증 우회 경로가 아니다.
//   - status/image_status 등은 절대 건드리지 않는다(fit/avoid만). "빈 fit로 승인" 사고 차단.
//   - 관리자 인증 게이트(middleware, /api/admin/*) 뒤에 있다.
//   - fit/avoid는 항상 함께 덮어쓴다(빈 값 → null). 화면이 곧 최종 상태다.
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { validateCoreKeyList } from "../../../../../lib/hairTypeOptions";

const MAX_IDS = 200;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { product_ids?: unknown; fit_hair_types?: unknown; avoid_hair_types?: unknown }
    | null;

  const ids = Array.isArray(body?.product_ids) ? (body!.product_ids as unknown[]) : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json({ ok: false, error: "적용할 상품이 선택되지 않았습니다." }, { status: 400 });
  }
  if (!ids.every((n) => typeof n === "number" && Number.isInteger(n) && n > 0)) {
    return NextResponse.json({ ok: false, error: "잘못된 상품 id가 포함돼 있습니다." }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { ok: false, error: `한 번에 최대 ${MAX_IDS}개까지만 적용할 수 있습니다.` },
      { status: 400 },
    );
  }
  // 같은 요청 안 중복 id 제거(멱등)
  const uniqueIds = Array.from(new Set(ids as number[]));

  // ── 3토막 형식 검증 (기존 공용 함수 재사용 — 우회 없음) ──
  // fit/avoid 미전송 시 []로 간주(= 해당 필드를 비운다 = 덮어쓰기의 일부).
  const fitCheck = validateCoreKeyList(body?.fit_hair_types ?? [], "fit_hair_types");
  const avoidCheck = validateCoreKeyList(body?.avoid_hair_types ?? [], "avoid_hair_types");
  const invalid = [...fitCheck.invalid, ...avoidCheck.invalid];
  if (invalid.length > 0) {
    const preview = invalid.slice(0, 10).map((v) => `${v.field}=${v.value}`).join(" / ");
    return NextResponse.json(
      {
        ok: false,
        error: `모발 타입 형식 오류 ${invalid.length}건 — 반드시 3토막(curl__thickness__density)이어야 합니다: ${preview}`,
        invalid,
      },
      { status: 400 },
    );
  }

  // 덮어쓰기 — 빈 배열은 null로 저장(fit null = 전체 노출, avoid null = 제외 없음).
  const { data, error } = await supabaseAdmin
    .from("products")
    .update({
      fit_hair_types: fitCheck.valid.length ? fitCheck.valid : null,
      avoid_hair_types: avoidCheck.valid.length ? avoidCheck.valid : null,
    })
    .in("id", uniqueIds)
    .select("id");

  if (error) {
    console.error("[api/admin/products/bulk-tag] 일괄 저장 실패:", error.message);
    return NextResponse.json({ ok: false, error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
