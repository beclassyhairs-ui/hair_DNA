import type { ReactNode } from "react";
import Link from "next/link";

// ============================================================================
// BlackCTAButton — 골드 그라디언트 대신 쓰는 솔리드 블랙/딥브라운 CTA.
// href가 있으면 Link로, 없으면 button으로 렌더링한다(호출부 로직은 그대로 둔다).
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
    "flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1C1A17] text-base font-semibold text-white " +
    "transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2A2620] " +
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
