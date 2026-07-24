import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "./components/Analytics";
import AttributionCapture from "./components/AttributionCapture";
import ProfileSync from "./components/ProfileSync";
import Toaster from "./components/Toaster";
import SiteFooter from "./components/SiteFooter";

// 본문·타이틀 공용: Pretendard (WORKORDER-02 — 가변폰트 로컬 로딩)
// 굵기 위계는 타이포 토큰(tailwind.config)에서 400/600/700으로 관리. 굵기로 밀어붙이지 않는다.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

// 타이틀용: 우아한 명조
const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 확대 금지 제거(maximumScale/userScalable) — 40~50대 타깃 접근성: 핀치 줌 허용
};

const SITE_NAME = "어뷰티(A-Beauty)";
const SITE_DESCRIPTION =
  "AI로 내 모발 타입을 진단하고, 타입에 맞는 헤어 발견템을 추천받는 퍼스널 헤어 커머스. 어뷰티(A-Beauty).";

export const metadata: Metadata = {
  // 소셜 미리보기 이미지 절대 URL 해석 기준 — 배포 도메인으로 교체
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app"
  ),
  // title 미설정 페이지의 기본값. 각 랜딩 layout이 자체 title(접미사 포함)을
  // 이미 지정하므로 template은 두지 않는다(이중 접미사 방지).
  title: "어뷰티(A-Beauty) | AI 헤어 진단 & 발견템",
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["헤어 진단", "AI 헤어", "모발 타입", "헤어 MBTI", "헤어스타일 추천", "어뷰티", "A-Beauty"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: "어뷰티(A-Beauty) | AI 헤어 진단 & 발견템",
    description: SITE_DESCRIPTION,
    // ⚠️ 플레이스홀더 — public/og-default.png(1200×630)를 디자인 확정 후 추가/교체.
    //    (자체 OG 이미지를 가진 랜딩 layout은 각자 값으로 이 기본값을 덮어씀)
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "어뷰티(A-Beauty) | AI 헤어 진단 & 발견템",
    description: SITE_DESCRIPTION,
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${notoSerif.variable}`}>
      <body className="font-sans">
        <Analytics />
        <AttributionCapture />
        {/* B-2: 로그인 유저의 진단·프로필을 서버와 동기화(미로그인이면 무동작) */}
        <ProfileSync />
        {children}
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
