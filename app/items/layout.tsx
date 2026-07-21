import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

// /items·/items/[id]는 자체 metadata가 없어 root 기본값을 쓰던 상태 →
// 섹션 공통 title/description을 이 layout에서 부여.
// ⚠️ Next는 세그먼트별로 openGraph 객체를 통째로 교체(deep-merge 아님)하므로
//    OG 대표 이미지(og-default.png)를 여기서 명시해야 공유 카드에 이미지가 뜬다.
export const metadata: Metadata = {
  title: "맞춤 발견템 | 어뷰티(A-Beauty)",
  description: "AI 헤어 진단 결과에 맞춰 골라주는 헤어 발견템. 내 모발 타입에 어울리는 제품만 모았어요.",
  openGraph: {
    title: "맞춤 발견템 | 어뷰티(A-Beauty)",
    description: "내 모발 타입에 맞는 헤어 발견템을 만나보세요.",
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: "어뷰티(A-Beauty)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "맞춤 발견템 | 어뷰티(A-Beauty)",
    description: "내 모발 타입에 맞는 헤어 발견템을 만나보세요.",
    images: [`${SITE_URL}/og-default.png`],
  },
};

export default function ItemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
