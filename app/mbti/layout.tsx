import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";
const TITLE = "퍼스널 헤어 MBTI 테스트 💇";
const DESCRIPTION =
  "내 평소 관리 습관으로 알아보는 찰떡 헤어스타일! 나는 어떤 유형일까? 지금 바로 확인해 보세요.";
const OG_IMAGE = `${SITE_URL}/hair-mbti-og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,

  // 미끼 랜딩 분리 정책: /mbti 계열은 파트너스 링크·고지를 유지하는 실험장이라
  // 본진(hair-dna 본 서비스) 검색 노출과 분리한다. sitemap에서도 제외됨.
  // og:/twitter: 태그는 그대로 둔다 — 카카오톡 공유 미리보기는 계속 필요하고,
  // noindex는 검색 색인만 막지 SNS 공유 카드에는 영향이 없다.
  robots: { index: false, follow: false },

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
        alt: "퍼스널 헤어 MBTI 테스트 — 어뷰티(A-Beauty)",
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
