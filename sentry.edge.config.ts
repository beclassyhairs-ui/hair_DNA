// ============================================================================
// Sentry — Edge 런타임 초기화 (middleware 등 edge 실행 코드용)
// DSN 없으면 no-op. sentry.server.config.ts와 동일 정책.
// ============================================================================
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentryScrub";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  debug: false,
});
