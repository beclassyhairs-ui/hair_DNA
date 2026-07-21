import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

// 플래그십 랜딩. OG 대표 이미지는 root의 og-default.png(브랜드 임시 플레이스홀더)를 상속한다.
// 과거 bangs-og.png(인생 앞머리 전용 아트)를 재사용했으나 본 서비스와 어긋나 제거.
// 전용 /style OG 아트는 [사업주 승인] 대상 — 확정 후 아래 openGraph.images로 지정.
export const metadata: Metadata = {
  title: "AI 헤어 변신 | 어뷰티(A-Beauty)",
  description: "4문항으로 내 헤어 스타일을 진단하고 AI가 추천하는 맞춤 스타일을 확인하세요.",
  openGraph: {
    title: "AI 헤어 변신 | 어뷰티(A-Beauty)",
    description: "내 모질에 꼭 맞는 헤어스타일을 AI가 처방해 드려요.",
    url: `${SITE_URL}/style`,
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: "어뷰티(A-Beauty)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 헤어 변신 | 어뷰티(A-Beauty)",
    description: "내 모질에 꼭 맞는 헤어스타일을 AI가 처방해 드려요.",
    images: [`${SITE_URL}/og-default.png`],
  },
};

export default function StyleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
