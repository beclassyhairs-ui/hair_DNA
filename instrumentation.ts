// ============================================================================
// Next.js instrumentation 훅 — 런타임별 Sentry 초기화 진입점
// (next.config.mjs의 experimental.instrumentationHook + withSentryConfig와 세트)
// ============================================================================
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// App Router 서버(라우트/RSC) 요청 에러를 Sentry로 넘긴다.
// (Next 15+ 훅 — 14에서는 호출되지 않지만 두어도 무해, 상위 버전 대비 forward-compat)
export const onRequestError = Sentry.captureRequestError;
