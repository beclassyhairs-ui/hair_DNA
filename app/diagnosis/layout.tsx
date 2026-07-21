import type { Metadata } from "next";

// /diagnosis(AI 진단 허브)는 자체 metadata가 없어 root 기본값만 쓰던 상태(sitemap 공개 엔트리) →
// 섹션 title/description + OG 부여. OG 대표 이미지는 root의 og-default.png 상속.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

export const metadata: Metadata = {
  title: "AI 헤어 진단 허브 | 어뷰티(A-Beauty)",
  description:
    "앞머리·손상도·습관까지, 어뷰티의 AI 헤어 진단을 한곳에서 골라 시작하세요.",
  openGraph: {
    title: "AI 헤어 진단 허브 | 어뷰티(A-Beauty)",
    description: "내게 필요한 진단을 골라보세요. 모발 타입부터 앞머리·손상도까지.",
    url: `${SITE_URL}/diagnosis`,
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: "어뷰티(A-Beauty)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 헤어 진단 허브 | 어뷰티(A-Beauty)",
    description: "내게 필요한 진단을 골라보세요. 모발 타입부터 앞머리·손상도까지.",
    images: [`${SITE_URL}/og-default.png`],
  },
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
