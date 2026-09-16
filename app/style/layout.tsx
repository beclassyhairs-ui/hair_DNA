import type { Metadata } from "next";
import StyleSessionPing from "./StyleSessionPing";

import { SITE_URL } from "@/lib/siteUrl";

// 플래그십 랜딩. 전용 OG 카드 og-style.png(아이보리+차콜+골드, 문구는 아래 카피 verbatim).
export const metadata: Metadata = {
  title: "AI 헤어 변신 | 미알팁",
  description: "4문항으로 내 헤어 스타일을 진단하고 AI가 추천하는 맞춤 스타일을 확인하세요.",
  openGraph: {
    title: "AI 헤어 변신 | 미알팁",
    description: "내 모질에 꼭 맞는 헤어스타일을 AI가 처방해 드려요.",
    url: `${SITE_URL}/style`,
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-style.png`, width: 1200, height: 630, alt: "미알팁 AI 헤어 변신" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 헤어 변신 | 미알팁",
    description: "내 모질에 꼭 맞는 헤어스타일을 AI가 처방해 드려요.",
    images: [`${SITE_URL}/og-style.png`],
  },
};

export default function StyleLayout({ children }: { children: React.ReactNode }) {
  // ③ 세션핑 90초 — /style 구역 전체에 상주하며 GPU 예열 유지(하위 라우트 전환에도 안 끊김).
  return <><StyleSessionPing />{children}</>;
}
