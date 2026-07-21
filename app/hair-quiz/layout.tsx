import type { Metadata } from "next";

// /hair-quiz는 자체 metadata가 없어 root 기본값만 쓰던 상태(sitemap 공개 엔트리) →
// 섹션 title/description + OG를 부여. OG 대표 이미지는 root의 og-default.png를 상속
// (openGraph.images 미지정 → 상위 값 병합). 자체 OG 아트는 [사업주 승인] 대상.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

export const metadata: Metadata = {
  title: "헤어 습관 진단 | 어뷰티(A-Beauty)",
  description:
    "6문항으로 내 헤어 관리 습관을 진단하고, 미용실 효과를 오래 유지하는 홈케어 루틴을 처방받으세요.",
  openGraph: {
    title: "내 헤어 습관 점수는? · 어뷰티 헤어 습관 진단",
    description: "매일의 헤어 습관이 미용실 효과를 좌우해요. 1분 6문항으로 내 루틴을 점검해 보세요.",
    url: `${SITE_URL}/hair-quiz`,
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: "어뷰티(A-Beauty)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "내 헤어 습관 점수는? · 어뷰티 헤어 습관 진단",
    description: "매일의 헤어 습관이 미용실 효과를 좌우해요. 1분 6문항으로 내 루틴을 점검해 보세요.",
    images: [`${SITE_URL}/og-default.png`],
  },
};

export default function HairQuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
