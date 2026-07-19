// ============================================================================
// 어뷰티 — 유저 여정 이벤트 트래킹 유틸리티 (익명 ID → 카카오 로그인 전 구간 포함)
//
// 기존 lib/analytics.ts(GA4/Clarity 전송)와는 별개의 레이어입니다.
// 이 모듈은 "우리 자체 스키마"로 이벤트를 Supabase `events` 테이블에 실시간 적재합니다.
// 테이블/RLS 정의는 supabase/schema.sql 참고. anon key는 INSERT만 가능하도록 제한돼있어,
// 이 클라이언트로는 다른 유저의 이벤트를 조회할 수 없습니다(어드민 조회는 서버 API 경유).
//
// 앱 전역 단일 트래킹 진입점 — lib/trackEvent.ts도 이 파일의 trackEvent를 re-export합니다.
// 따라서 문자열 이벤트명(예: "product_buy_click")을 쓰는 기존 호출부도 전부 이 경로로
// Supabase에 적재됩니다. 스키마에 정의된 컬럼 키는 컬럼으로, 그 외 임의 키는 meta(jsonb)로
// 자동 분리됩니다.
// ============================================================================

import { supabase } from "./supabaseClient";

const ANONYMOUS_ID_KEY  = "abeauty:anonymous_id";
const SESSION_ID_KEY    = "abeauty:session_id";
const KAKAO_USER_ID_KEY = "abeauty:kakao_user_id";
const ATTRIBUTION_KEY   = "abeauty:attribution";

/** 핵심 퍼널 이벤트 — 조회수→유입→진단완료→상품클릭→구매전환 */
export const EVENT_NAMES = {
  LANDING_VIEW:        "landing_view",       // 유입/조회
  DIAGNOSIS_START:     "diagnosis_start",    // 진단 시작
  ANSWER_SELECTED:     "answer_selected",    // 문항 답변(드롭오프 분석용)
  DIAGNOSIS_COMPLETE:  "diagnosis_complete", // 진단 완료
  PRODUCT_VIEWED:      "product_viewed",     // 상품 노출(임프레션)
  PRODUCT_CLICKED:     "product_clicked",    // 상품 클릭
  PURCHASE_CLICK:      "purchase_click",     // 구매 전환(외부 구매 링크 클릭)
  LOGIN_CLICKED:       "login_clicked",      // 로그인 클릭
} as const;

export type TrackedEventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/** 이벤트 페이로드 스키마 — 아래 키는 events 테이블 컬럼에 직접 매핑된다. 그 외 키는 meta로 간다. */
export interface EventPayload {
  landing_id?: string;                        // 유입된 랜딩페이지 식별자 (예: 'mbti_test', 'style')
  content_id?: string;
  diagnosis_type?: string;                     // 진단 종류
  answers?: Record<string, unknown> | unknown[]; // 설문 답변
  concern_tags?: string[];                     // 고민 태그
  result_type?: string;                        // 도출된 결과 유형
  recommended_product_groups?: string[];       // 추천된 제품군
  product_group_clicked?: string;
  product_id_clicked?: string;
  cta_clicked?: string;
  marketing_consent?: boolean;
  kakao_channel_added?: boolean;
  // ↓ 위 스키마에 없는 임의 키(productId, coreKey, ui, postId, rank 등)는 meta(jsonb)로 적재된다.
  [key: string]: unknown;
}

/** events 테이블에 "컬럼"으로 존재하는 페이로드 키 — 나머지는 전부 meta(jsonb)로 분리 적재.
 *  source/utm_medium/utm_campaign은 페이로드가 아니라 first-touch 어트리뷰션에서만 채운다. */
const COLUMN_KEYS = new Set<string>([
  "landing_id",
  "content_id",
  "diagnosis_type",
  "answers",
  "concern_tags",
  "result_type",
  "recommended_product_groups",
  "product_group_clicked",
  "product_id_clicked",
  "cta_clicked",
  "marketing_consent",
  "kakao_channel_added",
]);

/** Supabase에 insert되는 최종 이벤트 레코드 — created_at은 DB default now()가 채우므로 클라이언트에서 보내지 않는다 */
export interface TrackedEvent {
  user_id: string;          // kakao_user_id가 있으면 그 값, 없으면 anonymous_id
  anonymous_id: string;
  kakao_user_id: string | null;
  session_id: string;
  event_name: string;
  event_time: string;       // ISO 타임스탬프 (이벤트 발생 시각)
  // 어트리뷰션(first-touch) — 모든 이벤트에 동승
  source: string | null;        // utm_source
  utm_medium: string | null;
  utm_campaign: string | null;
  // 컬럼 매핑 페이로드
  landing_id?: string;
  content_id?: string;
  diagnosis_type?: string;
  answers?: unknown;
  concern_tags?: unknown;
  result_type?: string;
  recommended_product_groups?: unknown;
  product_group_clicked?: string;
  product_id_clicked?: string;
  cta_clicked?: string;
  marketing_consent?: boolean;
  kakao_channel_added?: boolean;
  // 스키마 외 임의 컨텍스트
  meta: Record<string, unknown> | null;
}

/** Supabase에서 읽어온 행 — id/created_at은 DB가 채워서 내려준다 */
export interface StoredEvent extends TrackedEvent {
  id: number;
  created_at: string;
}

// ─── ID 발급/조회 ────────────────────────────────────────────────────────────

function createUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // 구형 브라우저 폴백
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** localStorage 기반 익명 ID — 브라우저(기기)당 최초 1회 생성, 영구 유지 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = createUuid();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

/** sessionStorage 기반 세션 ID — 탭/세션 단위로 새로 발급 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = createUuid();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

/** 카카오 로그인 완료 시 호출 — 익명 ID에 카카오 유저 ID를 매핑 */
export function setKakaoUserId(kakaoUserId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KAKAO_USER_ID_KEY, kakaoUserId);
}

export function getKakaoUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KAKAO_USER_ID_KEY);
}

// ─── UTM 어트리뷰션 (first-touch) ────────────────────────────────────────────
//
// 유입 최초 1회, URL의 utm_source/utm_medium/utm_campaign을 localStorage에 고정 저장한다.
// 이후 URL에서 utm이 사라져도(내부 이동) 이 유저의 모든 이벤트에 같은 값이 실려간다.
// "어느 쇼츠/어느 랜딩에서 온 유입인지"를 전환까지 끝까지 추적하기 위한 것.
// 모델: first-touch — 이미 저장된 값이 있으면 덮어쓰지 않는다.

export interface Attribution {
  source: string | null;        // utm_source
  utm_medium: string | null;
  utm_campaign: string | null;
}

const EMPTY_ATTRIBUTION: Attribution = { source: null, utm_medium: null, utm_campaign: null };

/** 앱 진입 시(루트) 1회 호출 — 현재 URL의 utm_*를 first-touch로 저장한다. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    // 이미 저장돼 있으면 first-touch 유지 (덮어쓰지 않음)
    if (localStorage.getItem(ATTRIBUTION_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const source   = params.get("utm_source");
    const medium   = params.get("utm_medium");
    const campaign = params.get("utm_campaign");
    // utm이 하나도 없으면(직접/오가닉 유입) 저장하지 않는다 — 다음 페이지에서 utm 붙은 재진입 시 잡히도록.
    if (!source && !medium && !campaign) return;
    const attribution: Attribution = {
      source:       source ?? null,
      utm_medium:   medium ?? null,
      utm_campaign: campaign ?? null,
    };
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* localStorage 접근 불가 — 조용히 무시 */
  }
}

/** 저장된 first-touch 어트리뷰션을 반환. 없으면 전부 null. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY_ATTRIBUTION;
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return EMPTY_ATTRIBUTION;
    const parsed = JSON.parse(raw) as Partial<Attribution>;
    return {
      source:       parsed.source ?? null,
      utm_medium:   parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
    };
  } catch {
    return EMPTY_ATTRIBUTION;
  }
}

/** 하위 호환 — 기존 호출부가 쓰던 utm_source getter. 이제 first-touch 저장값을 반환한다. */
export function getUtmSource(): string | undefined {
  return getAttribution().source ?? undefined;
}

// ─── meta 가드 ───────────────────────────────────────────────────────────────
//
// 스키마 외 임의 키는 meta(jsonb)로 적재되므로, 실수로 민감정보(이메일/본문/이미지 URL)나
// 대용량 객체가 영구 저장되는 걸 막는다. 원시값(string/number/boolean/null)만 허용하고,
// 문자열 길이·키 개수를 제한한다. 컬럼 매핑 페이로드(answers 등)는 이 가드를 거치지 않는다.

const META_MAX_KEYS = 20;
const META_MAX_STRLEN = 500;

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(meta)) {
    if (count >= META_MAX_KEYS) break;
    let val: unknown;
    if (v === null) val = null;
    else if (typeof v === "string") val = v.length > META_MAX_STRLEN ? v.slice(0, META_MAX_STRLEN) : v;
    else if (typeof v === "number" || typeof v === "boolean") val = v;
    else continue; // 객체/배열/함수 등 비원시값은 버린다 — 민감정보/대용량 유입 차단
    out[k] = val;
    count++;
  }
  return count > 0 ? out : null;
}

// ─── 이벤트 기록 ─────────────────────────────────────────────────────────────

/**
 * 앱 어디서든 호출하는 메인 트래킹 함수. Supabase `events` 테이블에 비동기로 insert한다.
 * anonymous_id/session_id/kakao_user_id/user_id/event_time은 자동으로 채워지고,
 * first-touch UTM(source/utm_medium/utm_campaign)이 모든 이벤트에 자동 동승한다.
 *
 * 페이로드의 키 중 events 컬럼(COLUMN_KEYS)에 해당하는 것은 컬럼으로, 그 외 임의 키는
 * meta(jsonb)로 자동 분리된다. 따라서 문자열 이벤트명 + 자유 페이로드도 안전하게 적재된다.
 *
 * 실패해도 절대 throw하지 않는다 — 트래킹 오류가 실제 유저 플로우(버튼 클릭, 페이지 이동)를
 * 막아서는 안 되므로, 호출부는 await 없이 fire-and-forget으로 불러도 안전하다.
 *
 * @example
 * trackEvent(EVENT_NAMES.PURCHASE_CLICK, { product_id_clicked: "12", ui: "item_detail" });
 */
export async function trackEvent(
  eventName: TrackedEventName | string,
  payload: EventPayload = {},
): Promise<void> {
  const anonymousId = getOrCreateAnonymousId();
  const kakaoUserId = getKakaoUserId();
  const attribution = getAttribution();

  // 페이로드를 컬럼 vs meta로 분리
  const columns: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined) continue;
    if (COLUMN_KEYS.has(k)) columns[k] = v;
    else meta[k] = v; // source 포함 스키마 외 키 → meta (utm_source 컬럼은 어트리뷰션 전용)
  }

  const event: TrackedEvent = {
    ...columns,
    user_id:       kakaoUserId ?? anonymousId,
    anonymous_id:  anonymousId,
    kakao_user_id: kakaoUserId,
    session_id:    getOrCreateSessionId(),
    event_name:    eventName,
    event_time:    new Date().toISOString(),
    // first-touch UTM 동승
    source:       attribution.source,
    utm_medium:   attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    meta: sanitizeMeta(meta),
  };

  try {
    const { error } = await supabase.from("events").insert(event);
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`[trackEvent] Supabase insert 실패 (${eventName}):`, error.message);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[trackEvent] ✅ ${eventName}`, event);
    }
  } catch (e) {
    // 네트워크 오류, Supabase 미설정 등 — 조용히 로그만 남기고 유저 플로우는 계속 진행
    // eslint-disable-next-line no-console
    console.error(`[trackEvent] 네트워크 예외 (${eventName}):`, e instanceof Error ? e.message : e);
  }
}
