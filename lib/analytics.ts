// ============================================================================
// 동안비법 — 중앙 애널리틱스 모듈
// GA4 + Microsoft Clarity 통합 이벤트 트래킹
// ============================================================================

/** 앱 전체에서 발생하는 이벤트 이름 상수 */
export const EVENTS = {
  // 퍼널 진입
  DIAGNOSIS_START: "diagnosis_start",
  DIAGNOSIS_STEP_COMPLETE: "diagnosis_step_complete",
  DIAGNOSIS_COMPLETE: "diagnosis_complete",
  PHOTO_UPLOAD: "photo_upload",
  PHOTO_CONFIRMED: "photo_confirmed",
  RESULT_VIEW: "result_view",
  // 수익화 전환 이벤트
  PRODUCT_CLICK: "product_click",     // 제품 CTA 클릭 (자체 커머스 /items 유도)
  SHARE_CLICK: "share_click",
  REFERRAL_LANDED: "referral_landed", // ?ref= 파라미터로 유입
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (method: string, ...args: unknown[]) => void;
  }
}

/**
 * GA4 + Clarity에 동시에 이벤트를 전송합니다.
 * 어느 SDK도 로드되지 않은 환경(로컬, 빌드 시)에서는 조용히 무시합니다.
 */
export function track(event: EventName, params?: EventParams): void {
  if (typeof window === "undefined") return;

  // Google Analytics 4
  window.gtag?.("event", event, params ?? {});

  // Microsoft Clarity — 이벤트명 + 커스텀 태그
  window.clarity?.("event", event);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      window.clarity?.("set", key, String(val));
    });
  }
}

/**
 * 서버사이드 이벤트 로그 엔드포인트(/api/track)에 비동기로 전송합니다.
 * 실패해도 사용자 경험에 영향을 주지 않습니다.
 */
export async function trackServer(
  event: EventName,
  params?: EventParams & { ref?: string },
): Promise<void> {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, params, timestamp: Date.now() }),
      keepalive: true, // 페이지 이탈 시에도 전송 보장
    });
  } catch {
    // 네트워크 오류 등 — 프로덕션에서는 Sentry 등으로 보고
  }
}
