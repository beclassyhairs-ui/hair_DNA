// ============================================================================
// 어뷰티 — 제품 관리(Product CMS) 공용 타입
// 테이블 정의: supabase/products_schema.sql
// ============================================================================

export interface Product {
  id: number;
  product_name: string;
  category: string | null;
  concern_tags: string[] | null;
  image_url: string | null;
  buy_link: string | null;
  created_at: string;
}

/** 등록/수정 시 클라이언트가 보내는 입력 — id/created_at은 서버가 관리 */
export interface ProductInput {
  product_name: string;
  category?: string;
  concern_tags?: string[];
  image_url?: string;
  buy_link?: string;
}
