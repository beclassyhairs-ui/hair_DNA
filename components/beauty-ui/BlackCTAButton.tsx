import type { ReactNode } from "react";
import Link from "next/link";

// ============================================================================
// BlackCTAButton — WORKORDER-03: 차콜 채움 폐지 → 아주 연한 회색 필 주 CTA.
// bg-btn-bg(#F1EEE8) + 1px border-btn-border(#E3DED5) + text-btn-text(=ink),
// 굵기 700, 최소높이 48px. 이름은 유지(임포트/라우트 무변경)하되 검은 버튼 아님.
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
    "flex h-14 min-h-[48px] w-full items-center justify-center gap-2 rounded-btn " +
    "bg-btn-bg border border-btn-border text-base font-bold text-btn-text " +
    "transition-all active:scale-[0.98] hover:brightness-95 " +
    "disabled:opacity-50 disabled:cursor-not-allowed " +
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
