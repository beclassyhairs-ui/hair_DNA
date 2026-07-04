// ============================================================================
// 어뷰티 — 유저 여정 이벤트 트래킹 유틸리티 (익명 ID → 카카오 로그인 전 구간 포함)
//
// 기존 lib/analytics.ts(GA4/Clarity 전송)와는 별개의 레이어입니다.
// 이 모듈은 "우리 자체 스키마"로 이벤트를 Supabase `events` 테이블에 실시간 적재합니다.
// 테이블/RLS 정의는 supabase/schema.sql 참고. anon key는 INSERT만 가능하도록 제한돼있어,
// 이 클라이언트로는 다른 유저의 이벤트를 조회할 수 없습니다(어드민 조회는 서버 API 경유).
// ============================================================================

import { supabase } from "./supabaseClient";

const ANONYMOUS_ID_KEY  = "abeauty:anonymous_id";
const SESSION_ID_KEY    = "abeauty:session_id";
const KAKAO_USER_ID_KEY = "abeauty:kakao_user_id";

/** 필수 트래킹 이벤트명 — 문항 답변 이벤트는 "answer_selected"로 명명(원 스펙의 오타 교정) */
export const EVENT_NAMES = {
  LANDING_VIEW:        "landing_view",
  DIAGNOSIS_START:     "diagnosis_start",
  ANSWER_SELECTED:      "answer_selected",
  DIAGNOSIS_COMPLETE:  "diagnosis_complete",
  PRODUCT_CLICKED:     "product_clicked",
  LOGIN_CLICKED:       "login_clicked",
} as const;

export type TrackedEventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

/** 이벤트 페이로드 스키마 — 요청주신 전체 데이터 스키마 기준 */
export interface EventPayload {
  landing_id?: string;                        // 유입된 랜딩페이지 식별자 (예: 'mbti_test', 'bang_test')
  source?: string;                             // 유입 출처 (utm_source 기반)
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
}

/** Supabase에 insert되는 최종 이벤트 레코드 — created_at은 DB default now()가 채우므로 클라이언트에서 보내지 않는다 */
export interface TrackedEvent extends EventPayload {
  user_id: string;          // kakao_user_id가 있으면 그 값, 없으면 anonymous_id
  anonymous_id: string;
  kakao_user_id: string | null;
  session_id: string;
  event_name: TrackedEventName;
  event_time: string;       // ISO 타임스탬프 (이벤트 발생 시각)
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

/** URL의 ?utm_source= 값을 source로 사용 (없으면 referrer 기반 direct/organic 등은 호출부 판단) */
export function getUtmSource(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
}

// ─── 이벤트 기록 ─────────────────────────────────────────────────────────────

/**
 * 앱 어디서든 호출하는 메인 트래킹 함수. Supabase `events` 테이블에 비동기로 insert한다.
 * anonymous_id/session_id/kakao_user_id/user_id/event_time은 자동으로 채워진다.
 *
 * 실패해도 절대 throw하지 않는다 — 트래킹 오류가 실제 유저 플로우(버튼 클릭, 페이지 이동)를
 * 막아서는 안 되므로, 호출부는 await 없이 fire-and-forget으로 불러도 안전하다.
 *
 * @example
 * trackEvent(EVENT_NAMES.PRODUCT_CLICKED, {
 *   product_group_clicked: "세팅 스프레이",
 *   product_id_clicked: "spray-001",
 *   cta_clicked: "발견템 보러가기",
 * });
 */
export async function trackEvent(eventName: TrackedEventName, payload: EventPayload = {}): Promise<void> {
  const anonymousId = getOrCreateAnonymousId();
  const kakaoUserId  = getKakaoUserId();

  const event: TrackedEvent = {
    ...payload,
    user_id:       kakaoUserId ?? anonymousId,
    anonymous_id:  anonymousId,
    kakao_user_id: kakaoUserId,
    session_id:    getOrCreateSessionId(),
    event_name:    eventName,
    event_time:    new Date().toISOString(),
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
