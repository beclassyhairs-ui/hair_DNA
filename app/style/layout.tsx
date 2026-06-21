import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";

export const metadata: Metadata = {
  title: "AI 헤어 변신 | 어뷰티(A-Beauty)",
  description: "4문항으로 내 헤어 스타일을 진단하고 AI가 추천하는 맞춤 스타일을 확인하세요.",
  openGraph: {
    title: "AI 헤어 변신 | 어뷰티(A-Beauty)",
    description: "내 모질에 꼭 맞는 헤어스타일을 AI가 처방해 드려요.",
    url: `${SITE_URL}/style`,
    images: [{ url: `${SITE_URL}/images/bangs-og.png`, width: 1200, height: 630 }],
  },
};

export default function StyleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
