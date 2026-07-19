// ============================================================================
// 공개 상품 조회 — 서버 전용 헬퍼
// /api/items, /api/items/[id], /items/[id] 서버 컴포넌트가 공통으로 쓰는 단일
// 진입점. 항상 PUBLIC_PRODUCT_FIELDS(공개 allowlist)로만 select 하고
// status='approved' AND image_status='approved'만 반환한다 — 내부 필드는
// 여기서 애초에 조회하지 않으므로 어떤 호출자도 유출할 수 없다.
//
// ⚠️ supabaseAdmin(service_role)을 쓰므로 서버에서만 import 할 것. 클라이언트
//    컴포넌트에서 import 하면 안 된다(브라우저 번들에 키가 새지는 않지만 원칙상 금지).
// ============================================================================

import { supabaseAdmin } from "./supabaseAdmin";
import { PUBLIC_PRODUCT_FIELDS, type PublicProduct } from "./products";

/** 공개 노출 대상(승인 + 이미지 승인) 상품 전체를 최신순으로 반환. */
export async function fetchApprovedProducts(): Promise<PublicProduct[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(PUBLIC_PRODUCT_FIELDS)
    .eq("status", "approved")
    .eq("image_status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PublicProduct[];
}

/** id로 공개 노출 대상 상품 1건을 반환. 없거나 미승인이면 null. */
export async function fetchApprovedProductById(id: number): Promise<PublicProduct | null> {
  if (!Number.isInteger(id) || id <= 0) return null;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(PUBLIC_PRODUCT_FIELDS)
    .eq("id", id)
    .eq("status", "approved")
    .eq("image_status", "approved")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as PublicProduct | null;
}
