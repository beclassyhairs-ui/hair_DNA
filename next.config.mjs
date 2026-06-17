/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/", destination: "/mbti", permanent: false },
      { source: "/diagnosis", destination: "/mbti", permanent: false },
      { source: "/upload", destination: "/mbti", permanent: false },
      { source: "/result", destination: "/mbti", permanent: false },
      { source: "/ai-loading", destination: "/mbti", permanent: false },
    ];
  },
};

export default nextConfig;
