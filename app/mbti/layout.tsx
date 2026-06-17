import type { Metadata } from "next";

const TITLE = "퍼스널 헤어 DNA 테스트 🧬";
const DESCRIPTION =
  "내 평소 관리 습관으로 알아보는 찰떡 헤어스타일! 나는 어떤 유형일까? 지금 바로 확인해 보세요.";
const OG_IMAGE = "/og-image.jpg"; // public/ 기준 — 1200×630px 권장

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "어뷰티(A-Beauty)",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "퍼스널 헤어 DNA 테스트 — 어뷰티(A-Beauty)",
      },
    ],
  },

  // 카카오톡은 og: 태그를 읽고, X(트위터)·슬랙은 twitter: 태그를 우선 읽음
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function MbtiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
