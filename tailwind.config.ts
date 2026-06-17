import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 동안비법 브랜드 컬러 (차홍 앱 스타일)
        cream: "#FDFBFA", // 고급스러운 크림 베이지 배경
        brown: {
          DEFAULT: "#4A3A32", // 다크 브라운 텍스트
          light: "#6B574C",
          dark: "#352822",
        },
        accent: "#A67C52", // 포인트 (따뜻한 모카)
        charcoal: "#1C1A18", // 하이엔드 다크 모드 배경 (Deep Charcoal)
        gold: {
          DEFAULT: "#C8A86B", // 우아한 골드 (선택 포인트)
          light: "#E4D2A8",
          dark: "#A8884A",
        },
        champagne: "#F6EFE4", // 선택 시 부드럽게 채워지는 배경
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(200,168,107,0.55), 0 10px 30px -10px rgba(168,136,74,0.40)",
        card: "0 4px 24px -10px rgba(74,58,50,0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
