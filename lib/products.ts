// ============================================================================
// 어뷰티 — 제품 관리(Product CMS) 공용 타입
// 테이블 정의: supabase/products_schema.sql (Supabase DB에 적용 완료)
//
// status/sales_type/fit_hair_types 등은 draft → review → approved → hidden
// 워크플로우를 위한 확장 필드다.
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

export type ProductImageSource =
  | "official"
  | "affiliate"
  | "seller"
  | "manual_upload"
  | "placeholder"
  | "unknown";

export type ProductImageStatus = "needs_image" | "needs_review" | "approved" | "rejected";

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

  detail_image_urls: string[] | null;
  image_source: ProductImageSource | null;
  image_status: ProductImageStatus;
  image_alt: string | null;
  image_note: string | null;       // 내부 이미지 검수 메모 — 유저 비노출

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
  detail_image_urls?: string[];
  image_source?: ProductImageSource;
  image_status?: ProductImageStatus;   // 생략 시 DB 기본값 'needs_review'
  image_alt?: string;
  image_note?: string;
}

/** 관리자 API(GET/POST/PUT)가 공통으로 노출하는 필드 — select("*") 대신 이 목록을 명시한다 */
export const ADMIN_PRODUCT_FIELDS =
  "id, product_name, category, concern_tags, image_url, buy_link, " +
  "status, sales_type, fit_hair_types, avoid_hair_types, solves_concern, " +
  "recommend_reason, usage_guide, caution_note, sourcing_note, " +
  "detail_image_urls, image_source, image_status, image_alt, image_note, " +
  "created_at, updated_at";

/**
 * 공개(/api/items)에서 노출해도 되는 필드만 담은 allowlist.
 * ⚠️ 내부 전용 필드(sourcing_note, image_note, sales_type, status, image_status,
 *    image_source 등)는 절대 포함하지 않는다. 매칭에 필요한 fit/avoid/solves와
 *    유저 대면 카피(recommend_reason/usage_guide/caution_note)만 노출한다.
 */
export const PUBLIC_PRODUCT_FIELDS =
  "id, product_name, category, image_url, buy_link, " +
  "recommend_reason, usage_guide, caution_note, " +
  "fit_hair_types, avoid_hair_types, solves_concern, image_alt";

/** 공개 API가 반환하는 상품 형태 — PUBLIC_PRODUCT_FIELDS와 1:1 대응. */
export interface PublicProduct {
  id: number;
  product_name: string;
  category: string | null;
  image_url: string | null;
  buy_link: string | null;
  recommend_reason: string | null;
  usage_guide: string | null;
  caution_note: string | null;
  fit_hair_types: string[] | null;
  avoid_hair_types: string[] | null;
  solves_concern: string[] | null;
  image_alt: string | null;
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
