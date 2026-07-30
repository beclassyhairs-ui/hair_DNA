// ============================================================================
// 어뷰티 — 밝은 웰니스앱 홈 계열 페이지(app/home, app/diagnosis, app/consulting,
// app/items, app/myhair) 공용 상단 헤더. 모든 페이지에서 동일하게 노출된다.
// ============================================================================

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="flex items-center px-6 py-5">
        <div>
          <p className="text-[19px] font-bold tracking-tight text-ink">어뷰티</p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-ink-2">오늘의 헤어 케어</p>
        </div>
      </div>
    </header>
  );
}
