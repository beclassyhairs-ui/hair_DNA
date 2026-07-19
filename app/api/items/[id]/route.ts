// ============================================================================
// 공개 상품 상세 조회 API (/api/items/[id])
// /items/[id] 상세페이지가 참조하는 공개 경로(인증 게이트 밖). fetchApprovedProductById가
// PUBLIC_PRODUCT_FIELDS로만 조회하고 승인 상품만 반환하므로 내부 필드는 노출되지 않는다.
// 없거나 미승인 id는 404.
// ============================================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { fetchApprovedProductById } from "../../../../lib/publicProducts";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  // 비정상/미존재/미승인 ID는 모두 404로 통일한다("없는 id는 404").
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const item = await fetchApprovedProductById(id);
    if (!item) {
      return NextResponse.json({ ok: false, error: "상품을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("[api/items/[id]] 조회 실패:", error);
    return NextResponse.json({ ok: false, error: "상품을 불러오지 못했습니다." }, { status: 500 });
  }
}
