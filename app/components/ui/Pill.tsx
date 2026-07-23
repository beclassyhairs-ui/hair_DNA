// ============================================================================
// WORKORDER-02 공용 Pill — 연한 웜그레이 면(--surface). 유채색 없음.
//   기본(태그): --surface + --ink-2.
//   active(선택): --ink 채움 + 흰 텍스트 (색이 아니라 명도로 선택 표현).
//   onClick을 주면 <button>, 아니면 <span>.
// ============================================================================

import type { ReactNode } from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type PillProps = {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function Pill({ children, active, className, onClick }: PillProps) {
  const cls = cx(
    "inline-flex items-center rounded-pill px-3 py-1 text-aux transition-colors",
    active
      ? "bg-ink text-white border border-ink"
      : "bg-surface text-ink-2 border border-line",
    onClick && "cursor-pointer",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}
