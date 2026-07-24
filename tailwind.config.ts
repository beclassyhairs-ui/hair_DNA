import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── WORKORDER-02 웜 그레이지 토큰 (SSOT = app/globals.css :root, 여기선 var 참조) ──
        bg: "var(--bg)", // 페이지 배경 (흰색)
        surface: "var(--surface)", // 연한 웜그레이 면
        card: "var(--card)", // 카드
        line: "var(--line)", // 경계선
        ink: {
          DEFAULT: "var(--ink)", // 본문
          2: "var(--ink-2)", // 보조
          3: "var(--ink-3)", // 힌트
        },
        btn: {
          DEFAULT: "var(--btn)", // (구) 소프트 차콜 — 미사용
          line: "var(--btn-line)", // 아웃라인 버튼 테두리
          bg: "var(--btn-bg)", // WORKORDER-03 주 CTA 연한 배경
          border: "var(--btn-border)", // WORKORDER-03 주 CTA 테두리
          text: "var(--btn-text)", // WORKORDER-03 주 CTA 텍스트(ink)
        },
        "upload-bg": "var(--upload-bg)", // 업로드 화면 웜 차콜

        // ── 구 팔레트 (차홍 앱 스타일) — 스윕 완료 후 제거 예정. 지금 지우면 build 깨짐 ──
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
      fontSize: {
        // ── WORKORDER-02 타이포 스케일 (Pretendard) ──
        // 가독성은 크기·대비로 확보하고 굵기로 밀어붙이지 않는다(50·60 타깃).
        // 한 화면에 700(페이지타이틀)은 1~2곳만. 본문·라벨 기본은 400.
        h1: ["22px", { lineHeight: "1.3", fontWeight: "700" }], // 페이지 타이틀 (WORKORDER-02.1: 26→22)
        h2: ["18px", { lineHeight: "1.35", fontWeight: "600" }], // 섹션·카드 제목
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }], // 본문
        emphasis: ["16px", { lineHeight: "1.4", fontWeight: "600" }], // 버튼·강조
        aux: ["13px", { lineHeight: "1.5", fontWeight: "400" }], // 보조
      },
      borderRadius: {
        // ── WORKORDER-02 형태 토큰 ──
        card: "var(--r-card)", // 16px
        btn: "var(--r-btn)", // 12px
        pill: "var(--r-pill)", // 999px
      },
      spacing: {
        page: "var(--pad-x)", // 화면 좌우 패딩 (px-page)
      },
      boxShadow: {
        // ── WORKORDER-02: 그림자는 1단계만 ──
        soft: "var(--shadow)",
        // 구 그림자 — 스윕 후 제거 예정
        gold: "0 0 0 1px rgba(200,168,107,0.55), 0 10px 30px -10px rgba(168,136,74,0.40)",
        card: "0 4px 24px -10px rgba(74,58,50,0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
