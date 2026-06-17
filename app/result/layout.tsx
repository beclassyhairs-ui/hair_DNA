// ============================================================================
// 결과지 라우트 레이아웃 — 바이럴 메타데이터(Open Graph)
// ----------------------------------------------------------------------------
// 기획안 §4 "바이럴 및 공유": Next.js Metadata API로 OG 태그를 설정한다.
// (결과지 page.tsx는 클라이언트 컴포넌트이므로, 서버 레이아웃에서 메타데이터를 제공)
// ============================================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "어뷰티(A-Beauty) | 나의 AI 헤어 진단 결과",
  description:
    "AI가 분석한 나의 얼굴형·헤어 고민 맞춤 진단 결과지. 추천 스타일과 맞춤 처방을 확인해 보세요.",
  openGraph: {
    title: "어뷰티(A-Beauty) | 나의 AI 헤어 진단 결과",
    description:
      "AI가 분석한 나의 맞춤 헤어스타일과 처방전을 확인해 보세요. 지금 무료로 진단받기!",
    type: "website",
    siteName: "어뷰티(A-Beauty)",
    locale: "ko_KR",
    // images: ["/og-result.png"], // 추후 결과 OG 이미지 추가 영역
  },
  twitter: {
    card: "summary_large_image",
    title: "어뷰티(A-Beauty) | 나의 AI 헤어 진단 결과",
    description: "AI가 분석한 나의 맞춤 헤어스타일과 처방전을 확인해 보세요.",
  },
};

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
