import type { Metadata } from "next";

// ============================================================================
// 어뷰티 셀프 손상도 자가진단 (/damage-check) — 공유용 OG 메타데이터
// ============================================================================

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

export const metadata: Metadata = {
  title: "어뷰티(A-Beauty) - 미용실 가기 전 1분 손상도 자가진단",
  description:
    "젖은 머리 당겨보기 등 미용사들의 시크릿 테스트로, 미용실 가기 전에 내 모발 손상도를 1분 만에 확인하세요.",

  openGraph: {
    title: "어뷰티 | 미용실 가기 전 1분 팩트체크",
    description: "내 모발, 진짜 손상도는 얼마나 될까? 시크릿 테스트 3가지로 바로 확인해보세요.",
    url:      `${SITE_URL}/damage-check`,
    siteName: "어뷰티 (A-Beauty)",
    locale:   "ko_KR",
    type:     "website",
    images: [
      {
        url:    `${SITE_URL}/images/bangs-og.png`,
        width:  1200,
        height: 630,
        alt:    "어뷰티 손상도 자가진단",
      },
    ],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "어뷰티 | 미용실 가기 전 1분 팩트체크",
    description: "시크릿 테스트 3가지로 내 모발 손상도를 바로 확인하세요.",
    images:      [`${SITE_URL}/images/bangs-og.png`],
  },
};

export default function DamageCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
