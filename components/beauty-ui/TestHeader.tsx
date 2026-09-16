import type { ReactNode } from "react";

// ============================================================================
// TestHeader — 설문 상단 sticky 헤더. 뒤로가기(좌상단) + 스텝 라벨 + 카운터.
// children으로 ProgressBar를 아래에 끼워 넣는다.
// leading: 좌상단 슬롯(뒤로가기/나가기) — P7(뒤로 항상 좌상단). 없으면 라벨만.
// ============================================================================

export default function TestHeader({
  stepLabel,
  current,
  total,
  leading,
  children,
}: {
  stepLabel: string;
  current: number;
  total: number;
  leading?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-bg/95 px-5 pb-3 pt-3 backdrop-blur-md">
      {leading && <div className="mb-1 flex min-h-12 items-center">{leading}</div>}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-label uppercase tracking-[0.1em] text-ink-2">
          {stepLabel}
        </span>
        <span className="tabular-nums text-aux font-semibold text-ink-2">
          {current} / {total}
        </span>
      </div>
      {children}
    </header>
  );
}
