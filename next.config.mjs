/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // @mediapipe/face_mesh — CommonJS 패키지를 Next.js에서 올바르게 번들링
  transpilePackages: ["@mediapipe/face_mesh"],

  async redirects() {
    return [
      { source: "/diagnosis",  destination: "/mbti", permanent: false },
      { source: "/upload",     destination: "/mbti", permanent: false },
      { source: "/result",     destination: "/mbti", permanent: false },
      { source: "/ai-loading", destination: "/mbti", permanent: false },
    ];
  },
};

export default nextConfig;
