import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── IVORY REVAMP 토큰 (SSOT = app/globals.css :root, 여기선 var 참조) ──
        bg: "var(--bg)", // 페이지 배경 (아이보리)
        card: "var(--card)", // 카드 (흰색)
        line: "var(--line)", // 구분선/테두리
        sub: "var(--sub)", // 보조 텍스트
        soft: "var(--soft)", // 태그·뱃지 바탕
        tone: "var(--tone)", // 뮤트 블루그레이 (타입명 강조 전용)
        surface: "var(--surface)", // (구) 연한 면 — --soft 별칭, 3단계 후 제거
        ink: {
          DEFAULT: "var(--ink)", // 본문/제목 (차콜)
          2: "var(--ink-2)", // (구) 보조 — --sub 별칭
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
        // ── IVORY REVAMP 섹션 여백 3단 (8px 배수, html 18px 기준 rem 왜곡 회피 위해 px 고정) ──
        "sec-1": "var(--sec-1)", // 12px
        "sec-2": "var(--sec-2)", // 20px
        "sec-3": "var(--sec-3)", // 32px
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
