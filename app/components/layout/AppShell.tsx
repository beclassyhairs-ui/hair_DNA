import type { ReactNode } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";

// ============================================================================
// 어뷰티 — 밝은 웰니스앱 홈 계열 페이지 공용 셸.
// app/home, app/diagnosis, app/consulting, app/items, app/myhair가 전부 이걸로
// 감싸서 동일한 헤더/하단 탭바/모바일 컨테이너(max-w-430px)를 공유한다.
// ============================================================================

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto min-h-screen max-w-[430px] pb-28">
        <Header />
        <main className="space-y-5 px-page py-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
