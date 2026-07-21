import type { Metadata } from "next";

// /consulting(헤어 고민상담소)은 자체 metadata가 없어 root 기본값만 쓰던 상태(sitemap 공개 엔트리) →
// 섹션 title/description + OG 부여. OG 대표 이미지는 root의 og-default.png 상속.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

export const metadata: Metadata = {
  title: "헤어 고민상담소 | 어뷰티(A-Beauty)",
  description:
    "혼자 고민하지 마세요. 헤어 고민을 나누고 함께 답을 찾는 어뷰티 고민상담소.",
  openGraph: {
    title: "헤어 고민상담소 | 어뷰티(A-Beauty)",
    description: "지금 다른 분들은 어떤 헤어 고민을 나누고 있을까요? 함께 답을 찾아보세요.",
    url: `${SITE_URL}/consulting`,
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: "어뷰티(A-Beauty)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "헤어 고민상담소 | 어뷰티(A-Beauty)",
    description: "지금 다른 분들은 어떤 헤어 고민을 나누고 있을까요? 함께 답을 찾아보세요.",
    images: [`${SITE_URL}/og-default.png`],
  },
};

export default function ConsultingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
