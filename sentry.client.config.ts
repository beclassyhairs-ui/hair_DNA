// ============================================================================
// Sentry — 클라이언트(브라우저) 초기화
// 프론트엔드 런타임 에러(렌더/이벤트 핸들러 예외)를 수집한다.
//
// ⚠️ DSN은 [사업주 환경변수](NEXT_PUBLIC_SENTRY_DSN). 없으면 enabled:false → no-op.
//    세션 리플레이는 비용·프라이버시(셀카 화면) 고려로 꺼둔다.
//
// 📌 Next 14.2 + webpack 기준 이 파일명(sentry.client.config.ts)이 정식 진입점이다.
//    (instrumentation-client.ts는 Next 15.3+에서만 지원 — 상위 버전 이관 시 교체)
// ============================================================================
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentryScrub";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  // 순수 에러 감지 목적 — 성능 트레이스·리플레이 미사용(PII·비용 최소화)
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  debug: false,
});
