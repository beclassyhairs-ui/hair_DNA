// ============================================================================
// 어뷰티 — 소싱 후보 검수(Sourcing Review) 순수 로직
// Gemini가 만든 raw_candidates TSV/CSV 표를 파싱 → 자동 검수 플래그 계산 →
// admin_import 미리보기 구조로 변환한다.
//
// 이 파일은 UI(app/components/admin/SourcingReview.tsx)와 완전히 분리된
// 순수 함수 모음이다 — DB/API 호출 없음, 실제 저장은 아직 어디서도 하지 않는다.
// ============================================================================

import type { ProductSalesType, ProductStatus } from "./products";

// ─── raw_candidates 입력 컬럼 ────────────────────────────────────────────────

export const RAW_CANDIDATE_COLUMNS = [
  "group_id",
  "product_group_kr",
  "original_product_name",
  "korean_display_name",
  "brand_name",
  "source_platform",
  "product_url",
  "url_confidence",
  "image_url",
  "price_range",
  "shipping_region",
  "material_or_type",
  "risk_check",
  "memo",
] as const;

export type RawCandidateColumn = (typeof RAW_CANDIDATE_COLUMNS)[number];

// 필수 컬럼 — 하나라도 비어 있으면 해당 행은 keep 선택이 잠기고 자동으로 drop 추천된다.
export const REQUIRED_COLUMNS: RawCandidateColumn[] = [
  "korean_display_name",
  "product_url",
  "source_platform",
  "group_id",
];

// 필수가 아닌 나머지 컬럼 — 헤더에 없어도 오류가 아니라 참고 안내만 표시한다.
export const OPTIONAL_COLUMNS: RawCandidateColumn[] = RAW_CANDIDATE_COLUMNS.filter(
  (c) => !REQUIRED_COLUMNS.includes(c),
);

/** 붙여넣은 표의 한 행 — 알려진 컬럼만 채워지고, 없는 값은 undefined. */
export type RawCandidateRow = Partial<Record<RawCandidateColumn, string>> & {
  /** 붙여넣은 표 안에서의 1-based 행 번호(헤더 제외) — 화면 표시용, 안정적인 키로 쓰지 않는다 */
  rowIndex: number;
};

export interface ParseTableResult {
  headers: string[];
  rows: RawCandidateRow[];
  /** 헤더 행에 있었지만 알려진 14개 컬럼에 속하지 않는 이름 (참고용, 무시됨) */
  unknownHeaders: string[];
  /** 필수 컬럼(REQUIRED_COLUMNS) 중 헤더 행에 전혀 없는 컬럼 — 이건 실제 오류 */
  missingRequiredHeaders: RawCandidateColumn[];
  /** 선택 컬럼 중 헤더 행에 없는 컬럼 — 오류가 아니라 참고 안내용 */
  missingOptionalHeaders: RawCandidateColumn[];
}

// ─── TSV/CSV 파싱 ────────────────────────────────────────────────────────────
//
// 전체 입력을 문자 단위로 순회하면서 따옴표 바깥의 개행만 행 구분자로 처리한다.
// 줄 단위로 먼저 split하면 따옴표 안에 개행이 들어있는 셀(예: memo에 여러 줄
// 메모)이 잘못된 행으로 쪼개지기 때문에, 반드시 이 순서(전체 문자열 → 토큰화)를
// 지켜야 한다.

function detectDelimiter(raw: string): "\t" | "," {
  const firstLine = raw.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const tabCount = firstLine.split("\t").length;
  const commaCount = firstLine.split(",").length;
  return tabCount >= commaCount ? "\t" : ",";
}

/**
 * 따옴표 바깥의 delimiter/개행만 셀·행 구분자로 인식하는 CSV/TSV 토크나이저.
 * 따옴표 안의 개행·delimiter는 셀 내용으로 유지하고, ""는 이스케이프된 "로 처리한다.
 */
function tokenizeDelimitedTable(raw: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      row.push(cell);
      rows.push(row);
      cell = "";
      row = [];
      if (raw[i + 1] === "\n") i++;
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      cell = "";
      row = [];
    } else {
      cell += ch;
    }
  }

  // 마지막 셀/행이 개행 없이 끝난 경우 flush
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // 완전히 빈 줄(셀 전체가 공백)은 데이터로 취급하지 않는다.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** textarea에 붙여넣은 raw_candidates TSV/CSV 표를 헤더 기준으로 파싱한다. */
export function parseRawCandidatesTable(raw: string): ParseTableResult {
  if (raw.trim() === "") {
    return {
      headers: [],
      rows: [],
      unknownHeaders: [],
      missingRequiredHeaders: [...REQUIRED_COLUMNS],
      missingOptionalHeaders: [...OPTIONAL_COLUMNS],
    };
  }

  const delimiter = detectDelimiter(raw);
  const tokenized = tokenizeDelimitedTable(raw, delimiter);
  const headerCells = (tokenized[0] ?? []).map((h) => h.trim());
  const knownSet = new Set<string>(RAW_CANDIDATE_COLUMNS);

  const unknownHeaders = headerCells.filter((h) => h && !knownSet.has(h));
  const missingRequiredHeaders = REQUIRED_COLUMNS.filter((c) => !headerCells.includes(c));
  const missingOptionalHeaders = OPTIONAL_COLUMNS.filter((c) => !headerCells.includes(c));

  const rows: RawCandidateRow[] = tokenized.slice(1).map((cells, idx) => {
    const row: RawCandidateRow = { rowIndex: idx + 1 };
    headerCells.forEach((header, colIdx) => {
      if (knownSet.has(header)) {
        row[header as RawCandidateColumn] = (cells[colIdx] ?? "").trim();
      }
    });
    return row;
  });

  return { headers: headerCells, rows, unknownHeaders, missingRequiredHeaders, missingOptionalHeaders };
}

// ─── 자동 검수 룰 ────────────────────────────────────────────────────────────

export type Decision = "keep" | "maybe" | "drop";

export interface ReviewFlags {
  /** 비어 있는 필수 컬럼 목록 — 하나라도 있으면 이 행은 drop으로 잠긴다 */
  missingRequired: RawCandidateColumn[];
  /** 같은 배치 안에서 product_url이 2회 이상 등장 (기존 DB와의 중복은 체크하지 않음) */
  isDuplicateUrl: boolean;
  /** url_confidence === "uncertain" */
  urlConfidenceUncertain: boolean;
  /** source_platform이 AliExpress/Temu/eBay — 해외수입 리스크 배지 트리거 */
  overseasRisk: boolean;
}

export interface ParsedCandidate {
  raw: RawCandidateRow;
  flags: ReviewFlags;
  /**
   * 자동 추천값 — 절대 최종 확정이 아니다. missingRequired가 있으면 "drop"으로
   * 잠기고, uncertain/해외리스크/중복 URL이면 "maybe"로만 추천한다. 아무 문제
   * 없는 행은 null(미정) — 사람이 반드시 keep/maybe/drop 중 하나를 직접 선택해야 한다.
   */
  recommendedDecision: Decision | null;
}

// AliExpress/Temu/eBay의 실제 표기 변형(예: "AliExpress US", "eBay.com",
// "Temu Global")까지 감지하기 위해 정확 일치 대신 부분 문자열 포함으로 판정한다.
const OVERSEAS_RISK_KEYWORDS = ["aliexpress", "temu", "ebay"];

function isOverseasRiskPlatform(platform: string | undefined): boolean {
  const p = (platform ?? "").trim().toLowerCase();
  if (!p) return false;
  return OVERSEAS_RISK_KEYWORDS.some((keyword) => p.includes(keyword));
}

function normalizeUrl(url: string | undefined): string {
  return (url ?? "").trim().toLowerCase();
}

/**
 * decision 상태를 저장할 때 쓰는 안정적인 행 키. rowIndex 단독으로 쓰면 표를
 * 통째로 교체했을 때 "이전 배치 3번 행의 keep 선택"이 "새 배치 3번 행"에
 * 그대로 남아버리는 오귀속 버그가 생긴다 — product_url + korean_display_name
 * 조합을 우선 키로 쓰고, 완전히 동일한 내용이 같은 배치에 중복될 경우를 위해
 * rowIndex를 마지막 구분자로만 덧붙인다.
 */
export function getCandidateRowKey(row: RawCandidateRow): string {
  const url = normalizeUrl(row.product_url);
  const name = (row.korean_display_name ?? "").trim().toLowerCase();
  return `${url}::${name}::${row.rowIndex}`;
}

/** 파싱된 행 전체를 받아 배치 내부 중복 체크를 포함한 검수 플래그를 계산한다. */
export function validateCandidates(rows: RawCandidateRow[]): ParsedCandidate[] {
  const urlCounts = new Map<string, number>();
  for (const row of rows) {
    const url = normalizeUrl(row.product_url);
    if (!url) continue;
    urlCounts.set(url, (urlCounts.get(url) ?? 0) + 1);
  }

  return rows.map((row) => {
    const missingRequired = REQUIRED_COLUMNS.filter((col) => !(row[col] ?? "").trim());
    const normalizedUrl = normalizeUrl(row.product_url);
    const isDuplicateUrl = normalizedUrl.length > 0 && (urlCounts.get(normalizedUrl) ?? 0) > 1;
    const urlConfidenceUncertain = (row.url_confidence ?? "").trim().toLowerCase() === "uncertain";
    const overseasRisk = isOverseasRiskPlatform(row.source_platform);

    const flags: ReviewFlags = { missingRequired, isDuplicateUrl, urlConfidenceUncertain, overseasRisk };

    let recommendedDecision: Decision | null = null;
    if (missingRequired.length > 0) recommendedDecision = "drop";
    else if (urlConfidenceUncertain || overseasRisk || isDuplicateUrl) recommendedDecision = "maybe";

    return { raw: row, flags, recommendedDecision };
  });
}

// ─── admin_import 변환 규칙 ──────────────────────────────────────────────────

// sales_type 매핑용 — 해외 오픈마켓/셀렉트샵은 전부 overseas_candidate로 묶는다.
// (5번 리스크 배지 대상인 AliExpress/Temu/eBay보다 범위가 넓다 — 리스크 배지와
// sales_type 매핑은 서로 다른 목적이라 의도적으로 목록을 분리해뒀다.)
const OVERSEAS_CANDIDATE_PLATFORMS = [
  "aliexpress",
  "temu",
  "ebay",
  "amazon",
  "amazon japan",
  "yesstyle",
  "kitsch official",
];

function mapSalesType(platform: string | undefined): ProductSalesType | null {
  const p = (platform ?? "").trim().toLowerCase();
  if (!p) return null;
  if (p === "coupang") return "coupang";
  if (p === "naver" || p === "smartstore" || p.includes("smartstore") || p.includes("네이버")) return "naver";
  if (OVERSEAS_CANDIDATE_PLATFORMS.includes(p)) return "overseas_candidate";
  if (p.includes("자체몰") || p.includes("브랜드몰")) return "own";
  return null;
}

// group_id → fit_hair_types 자동 매핑 (Gemini가 그룹 단위로 넘긴 값을 코드값으로 변환)
const GROUP_ID_FIT_HAIR_TYPE_MAP: Record<string, string> = {
  G001: "bangs_babyhair",
  G002: "straight_hair__fine__thin_density",
  G003: "bangs_babyhair",
  G004: "curly_hair__coarse__thick_density",
  G005: "damaged_hair_high_history",
};

function mapFitHairTypes(groupId: string | undefined): string[] {
  const key = (groupId ?? "").trim().toUpperCase();
  const mapped = GROUP_ID_FIT_HAIR_TYPE_MAP[key];
  return mapped ? [mapped] : [];
}

/** 유저 비노출 내부 메모 — 소싱 판단에 참고했던 원본 정보를 한 줄로 합친다. */
function buildSourcingNote(row: RawCandidateRow): string {
  const parts: string[] = [];
  if (row.original_product_name) parts.push(`원본명: ${row.original_product_name}`);
  if (row.brand_name) parts.push(`브랜드: ${row.brand_name}`);
  if (row.source_platform) parts.push(`플랫폼: ${row.source_platform}`);
  if (row.price_range) parts.push(`가격대: ${row.price_range}`);
  if (row.shipping_region) parts.push(`배송지역: ${row.shipping_region}`);
  if (row.material_or_type) parts.push(`소재/유형: ${row.material_or_type}`);
  if (row.risk_check) parts.push(`리스크체크: ${row.risk_check}`);
  if (row.memo) parts.push(`메모: ${row.memo}`);
  return parts.join(" · ");
}

export interface AdminImportPreviewRow {
  rowIndex: number;
  product_name: string | null;
  category: string | null;
  image_url: string | null;
  buy_link: string | null;
  status: ProductStatus;
  sales_type: ProductSalesType | null;
  fit_hair_types: string[];
  sourcing_note: string;
}

/**
 * 검수된 후보 한 건을 products 등록 입력 형태(admin_import)로 변환한다.
 * ⚠️ 미리보기 전용 — 이 함수는 어떤 저장/네트워크 호출도 하지 않는다.
 * status는 실제 등록 여부와 무관하게 항상 "draft"로 고정한다.
 */
export function buildAdminImportPreview(candidate: ParsedCandidate): AdminImportPreviewRow {
  const row = candidate.raw;
  return {
    rowIndex: row.rowIndex,
    product_name: row.korean_display_name?.trim() || null,
    category: row.product_group_kr?.trim() || null,
    image_url: row.image_url?.trim() || null,
    buy_link: row.product_url?.trim() || null,
    status: "draft",
    sales_type: mapSalesType(row.source_platform),
    fit_hair_types: mapFitHairTypes(row.group_id),
    sourcing_note: buildSourcingNote(row),
  };
}
