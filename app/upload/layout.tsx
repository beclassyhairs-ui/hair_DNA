// ============================================================================
// 사진 업로드 라우트 레이아웃 — 메타데이터
// (page.tsx가 클라이언트 컴포넌트이므로 서버 레이아웃에서 메타데이터 제공)
// ============================================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "어뷰티(A-Beauty) | 얼굴 사진 등록",
  description: "정면 얼굴 사진을 등록하고 AI 헤어 진단을 받아보세요.",
};

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
