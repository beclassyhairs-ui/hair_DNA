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

  async redirects() {
    return [
      { source: "/",           destination: "/style", permanent: false },
      { source: "/upload",     destination: "/mbti", permanent: false },
      { source: "/result",     destination: "/mbti", permanent: false },
      { source: "/ai-loading", destination: "/mbti", permanent: false },
    ];
  },
};

export default nextConfig;
