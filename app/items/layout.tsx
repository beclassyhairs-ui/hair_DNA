import type { Metadata } from "next";

// /items·/items/[id]는 자체 metadata가 없어 root 기본값을 쓰던 상태 →
// 섹션 공통 title/description을 이 layout에서 부여.
export const metadata: Metadata = {
  title: "맞춤 발견템 | 어뷰티(A-Beauty)",
  description: "AI 헤어 진단 결과에 맞춰 골라주는 헤어 발견템. 내 모발 타입에 어울리는 제품만 모았어요.",
  openGraph: {
    title: "맞춤 발견템 | 어뷰티(A-Beauty)",
    description: "내 모발 타입에 맞는 헤어 발견템을 만나보세요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function ItemsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
