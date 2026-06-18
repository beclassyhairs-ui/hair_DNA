import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { Analytics } from "./components/Analytics";

// 본문용: 가독성 높은 고딕
const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

// 타이틀용: 우아한 명조
const notoSerif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  // 소셜 미리보기 이미지 절대 URL 해석 기준 — 배포 도메인으로 교체
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app"
  ),
  title: "어뷰티(A-Beauty) | 퍼스널 헤어 MBTI 테스트",
  description:
    "나의 평소 관리 습관과 미용실 성향으로 알아보는 헤어 MBTI. 어뷰티(A-Beauty)에서 무료로 진단받으세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body className="font-sans">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
