// ============================================================================
// Sentry 이벤트 PII 최소화 스크러버 (client/server/edge 공용, 순수 함수)
//
// 에러 이벤트에는 요청 URL·쿼리스트링·헤더·쿠키가 실릴 수 있어, 개인정보/비밀값이
// Sentry로 새는 것을 막는다. sendDefaultPii:false와 함께 beforeSend에 물린다.
//   - URL 쿼리스트링 제거(토큰·이메일 등이 쿼리에 실릴 수 있음)
//   - 쿠키/인증 헤더 제거
// ============================================================================
import type { ErrorEvent } from "@sentry/nextjs";

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const req = event.request;
  if (req) {
    // 쿼리스트링 제거 — 경로만 남긴다
    if (typeof req.url === "string") {
      req.url = req.url.split("?")[0]!;
    }
    delete req.query_string;
    delete req.cookies;
    if (req.headers) {
      for (const k of Object.keys(req.headers)) {
        const lk = k.toLowerCase();
        if (lk === "cookie" || lk === "authorization" || lk === "x-admin-token") {
          delete req.headers[k];
        }
      }
    }
  }
  return event;
}
