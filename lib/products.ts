// ============================================================================
// 어뷰티 — 제품 관리(Product CMS) 공용 타입
// 테이블 정의: supabase/products_schema.sql
//
// status/sales_type/fit_hair_types 등은 draft → review → approved → hidden
// 워크플로우를 위한 확장 필드다 (설계 단계 — products_schema.sql 하단
// ALTER TABLE 참고, 아직 실제 Supabase DB에는 미적용).
// 기존 concern_tags는 legacy로 유지하고, 신규 매칭 로직은 solves_concern을
// 사용한다 — 기존 /admin/products 폼·API는 계속 concern_tags 그대로 사용 가능.
// ============================================================================

export type ProductStatus = "draft" | "review" | "approved" | "hidden";

export type ProductSalesType =
  | "affiliate"
  | "coupang"
  | "naver"
  | "domestic_consignment"
  | "overseas_candidate"
  | "own";

// fit_hair_types / avoid_hair_types 코드값 규칙:
//   `${curl}__${thickness}__${density}` — app/style/hairTypeCopy.ts의 coreKey()와
//   동일 포맷. 한글 라벨("곱슬모" 등)이 아니라 이 시스템 코드값을 저장한다.
//     curl:      straight_hair | wavy_hair | curly_hair
//     thickness: coarse | medium_thickness | fine
//     density:   thick_density | medium_density | thin_density
//   예) "straight_hair__fine__thin_density", "curly_hair__coarse__thick_density",
//       "wavy_hair__fine__thin_density"

export interface Product {
  id: number;
  product_name: string;
  category: string | null;
  concern_tags: string[] | null;   // legacy — 신규 매칭 로직은 solves_concern 사용
  image_url: string | null;
  buy_link: string | null;         // Gemini CSV의 `product_url` 컬럼이 여기로 매핑됨

  status: ProductStatus;
  sales_type: ProductSalesType | null;
  fit_hair_types: string[] | null;
  avoid_hair_types: string[] | null;
  solves_concern: string[] | null;
  recommend_reason: string | null;
  usage_guide: string | null;
  caution_note: string | null;
  sourcing_note: string | null;    // 내부 소싱 메모 — 유저 비노출

  created_at: string;
  updated_at: string;
}

/** 등록/수정 시 클라이언트가 보내는 입력 — id/created_at/updated_at은 서버가 관리 */
export interface ProductInput {
  product_name: string;
  category?: string;
  concern_tags?: string[];         // legacy 입력 경로 — 기존 폼 그대로 계속 사용 가능

  status?: ProductStatus;          // 생략 시 DB 기본값 'draft'
  sales_type?: ProductSalesType;
  fit_hair_types?: string[];
  avoid_hair_types?: string[];
  solves_concern?: string[];
  recommend_reason?: string;
  usage_guide?: string;
  caution_note?: string;
  sourcing_note?: string;

  image_url?: string;
  buy_link?: string;
}

// ============================================================================
// Gemini CSV 컬럼 매핑 (참고용 — 실제 import 파서는 아직 구현하지 않음)
//
// CSV 컬럼명            → DB 컬럼 / 타입
// ----------------------------------------------------------------------------
// product_name          → product_name (text, 필수)
// category              → category (text)
// product_url            → buy_link (text)  *** 컬럼명이 다름 — buy_link로 매핑 ***
// image_url              → image_url (text)
// sales_type             → sales_type (ProductSalesType)
// fit_hair_types         → fit_hair_types (text[], "|" 구분, 코드값만 — 위 규칙 참고)
// avoid_hair_types       → avoid_hair_types (text[], "|" 구분, 코드값만)
// solves_concern         → solves_concern (text[], "|" 구분)
// recommend_reason       → recommend_reason (text)
// usage_guide            → usage_guide (text)
// caution_note           → caution_note (text)
// sourcing_note          → sourcing_note (text, 내부용 — 유저 비노출)
//
// CSV에 포함하지 않음: status(서버가 항상 'draft'로 강제), id/created_at/updated_at
// (DB 자동 관리), concern_tags(legacy — 신규 import는 solves_concern만 채움)
// ============================================================================
