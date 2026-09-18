import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Sentry instrumentation.ts 훅 활성화 (Next 14.2 — 15에서 stable화)
  experimental: {
    instrumentationHook: true,
  },

  // @mediapipe/face_mesh — CommonJS 패키지를 Next.js에서 올바르게 번들링
  transpilePackages: ["@mediapipe/face_mesh"],

  // ★ Replicate AI 결과 이미지 도메인 허용 (외부 <img> 로딩 차단 방지)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbxt.replicate.delivery" },
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "delivery.replicate.com" },
      { protocol: "https", hostname: "replicate.com" },
    ],
    // <img> 태그 사용 시에도 경고 억제
    unoptimized: false,
  },

  // 루트(/)는 첫 화면 = 홈(/home)으로. 구형 경로(/upload·/result·/ai-loading)는 플래그십(/style)으로.
  // 과거엔 /upload·/result·/ai-loading이 /mbti로 향했지만, /mbti는 파트너스 링크를
  // 유지하는 미끼 랜딩 실험장이라 본진과 완전 분리한다(sitemap 제외 + noindex).
  // 특히 /diagnosis/quick → /upload 경로가 살아 있어서, 그대로 두면 본진 방문자가
  // 퀵 진단만 끝내도 미끼 랜딩에 착지했다.
  // ⚠️ 이 config redirect 가 app/page.tsx 보다 먼저 평가된다 — 루트 진입점은 여기가 실효.
  async redirects() {
    return [
      { source: "/",           destination: "/home",  permanent: false },
      { source: "/upload",     destination: "/style", permanent: false },
      { source: "/result",     destination: "/style", permanent: false },
      { source: "/ai-loading", destination: "/style", permanent: false },
    ];
  },
};

// ── Sentry 빌드 래핑 ──────────────────────────────────────────────────────────
// DSN이 없어도 빌드는 정상 통과한다(런타임 init이 no-op). 소스맵 업로드는
// SENTRY_AUTH_TOKEN이 있을 때만 수행 — 없으면 조용히 건너뛴다(빌드 실패 아님).
// org/project/authToken은 전부 [사업주 환경변수] 자리다.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,           // 빌드 로그 스팸 억제
  sourcemaps: {
    // 토큰 없으면 업로드 시도 자체를 끈다(경고·실패 방지)
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Vercel Cron 등에서 자동 계측 라우트 생성 방지 옵션은 기본값 유지
});
