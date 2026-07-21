// ============================================================================
// Sentry — 서버(Node.js 런타임) 초기화
// API 라우트·서버 컴포넌트의 런타임 에러를 수집한다.
//
// ⚠️ DSN은 [사업주 환경변수]다. NEXT_PUBLIC_SENTRY_DSN이 없으면 enabled:false로
//    완전히 비활성(no-op) — 배포 후 Vercel에 DSN만 넣으면 바로 동작한다.
//    ⚠️ DSN 활성화 = 에러 데이터의 국외이전 개시다. 켜기 전 반드시 /privacy에
//       Sentry 수탁·국외이전 고지를 추가할 것(사업주 결정 — PROJECT_STATE 참고).
//    알림 채널(이메일)은 Sentry 대시보드에서 설정한다(코드 아님).
// ============================================================================
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentryScrub";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  // 순수 에러 감지가 목적 — 성능 트레이스는 끈다(URL/쿼리 등 PII 노출·비용 최소화).
  // 필요 시 사업주 판단으로 상향.
  tracesSampleRate: 0,
  // IP·쿠키 등 기본 PII 미전송
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  debug: false,
});
