import type { Metadata } from "next";

import { SITE_URL } from "@/lib/siteUrl";

// 홈(/home) 공유용 OG. 전용 카드 og-home.png(아이보리+차콜+골드, 태그라인 verbatim).
// 문구는 root layout 의 기존 카피를 그대로 사용(새 문장 없음).
export const metadata: Metadata = {
  title: "미알팁 — 미용실에서 알 수 없는 꿀팁",
  description: "AI로 내 모발 타입을 진단하고, 타입에 맞는 헤어 발견템을 추천받는 퍼스널 헤어 커머스.",
  openGraph: {
    title: "미알팁 — 미용실에서 알 수 없는 꿀팁",
    description: "AI로 내 모발 타입을 진단하고, 타입에 맞는 헤어 발견템을 추천받는 퍼스널 헤어 커머스.",
    url: `${SITE_URL}/home`,
    siteName: "미알팁",
    type: "website",
    locale: "ko_KR",
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: "미알팁 — 미용실에서 알 수 없는 꿀팁" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "미알팁 — 미용실에서 알 수 없는 꿀팁",
    description: "AI로 내 모발 타입을 진단하고, 타입에 맞는 헤어 발견템을 추천받는 퍼스널 헤어 커머스.",
    images: [`${SITE_URL}/og-home.png`],
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
