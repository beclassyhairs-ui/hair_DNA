// ============================================================================
// 어뷰티 — 밝은 웰니스앱 홈 계열 페이지(app/home, app/diagnosis, app/consulting,
// app/items, app/myhair) 공용 상단 헤더. 모든 페이지에서 동일하게 노출된다.
// ============================================================================

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-[#F9FAFB]/90 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[19px] font-bold tracking-tight text-[#2F2F2F]">어뷰티</p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-[#6B7280]">오늘의 헤어 케어</p>
        </div>
        <button
          aria-label="알림"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2F2F2F] shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className="h-5 w-5">
            <path
              d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
