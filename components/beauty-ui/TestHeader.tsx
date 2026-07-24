import type { ReactNode } from "react";

// ============================================================================
// TestHeader — 설문 상단 sticky 헤더. 스텝 라벨 + 카운터만, 장식 최소화.
// children으로 ProgressBar를 아래에 끼워 넣는다.
// ============================================================================

export default function TestHeader({
  stepLabel,
  current,
  total,
  children,
}: {
  stepLabel: string;
  current: number;
  total: number;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-bg/95 px-5 pb-3 pt-4 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2">
          {stepLabel}
        </span>
        <span className="tabular-nums text-xs font-semibold text-ink-2">
          {current} / {total}
        </span>
      </div>
      {children}
    </header>
  );
}
