import type { Metadata } from "next";

// ============================================================================
// 어뷰티 인생뱅 (/bangs) — 카카오톡·인스타 공유용 OG 메타데이터
// 이미지: public/images/bangs-og.png (1200×630px) 필요
// ============================================================================

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

export const metadata: Metadata = {
  title: "어뷰티(A-Beauty) - 내 인생 앞머리 찾기",
  description:
    "AI가 0.1초 만에 당신의 얼굴형과 콤플렉스를 분석하여 가장 젊어 보이는 인생 앞머리를 찾아드립니다.",

  openGraph: {
    title: "어뷰티 | 5초 만에 찾는 내 인생 앞머리 (인생뱅)",
    description:
      "나이 들수록 죽어가는 이마 볼륨, 광대 부각 콤플렉스? AI 정밀 처방전으로 완벽 커버하세요!",
    url:      `${SITE_URL}/bangs`,
    siteName: "어뷰티 (A-Beauty)",
    locale:   "ko_KR",
    type:     "website",
    images: [
      {
        url:    `${SITE_URL}/images/bangs-og.png`,
        width:  1200,
        height: 630,
        alt:    "어뷰티 인생 앞머리 찾기",
      },
    ],
  },

  // X(트위터)·슬랙은 twitter: 카드를 우선 읽음
  twitter: {
    card:        "summary_large_image",
    title:       "어뷰티 | 5초 만에 찾는 내 인생 앞머리 (인생뱅)",
    description: "AI 정밀 얼굴형 분석으로 나에게 딱 맞는 앞머리 스타일을 처방받으세요!",
    images:      [`${SITE_URL}/images/bangs-og.png`],
  },
};

export default function BangsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
