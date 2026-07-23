import type { ReactNode } from "react";
import Link from "next/link";

// ============================================================================
// BlackCTAButton — WORKORDER-02: 순검정 폐지 → 소프트 차콜(--btn) 주 CTA.
// rounded-full → rounded-btn, 타이포는 --emphasis(16/600). API·로직은 그대로.
// href가 있으면 Link로, 없으면 button으로 렌더링한다.
// ============================================================================

type Props = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export default function BlackCTAButton({
  children, onClick, href, disabled = false, type = "button", className = "",
}: Props) {
  const classes =
    "flex h-14 w-full items-center justify-center gap-2 rounded-btn bg-btn text-emphasis text-white " +
    "transition-all active:scale-[0.98] disabled:bg-surface disabled:text-ink-3 disabled:cursor-not-allowed hover:opacity-90 " +
    className;

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
