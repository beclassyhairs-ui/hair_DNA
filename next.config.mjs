/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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

  // 구형 경로는 전부 플래그십(/style)으로 흘려보낸다.
  // 과거엔 /upload·/result·/ai-loading이 /mbti로 향했지만, /mbti는 파트너스 링크를
  // 유지하는 미끼 랜딩 실험장이라 본진과 완전 분리한다(sitemap 제외 + noindex).
  // 특히 /diagnosis/quick → /upload 경로가 살아 있어서, 그대로 두면 본진 방문자가
  // 퀵 진단만 끝내도 미끼 랜딩에 착지했다.
  async redirects() {
    return [
      { source: "/",           destination: "/style", permanent: false },
      { source: "/upload",     destination: "/style", permanent: false },
      { source: "/result",     destination: "/style", permanent: false },
      { source: "/ai-loading", destination: "/style", permanent: false },
    ];
  },
};

export default nextConfig;
