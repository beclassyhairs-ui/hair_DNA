// ============================================================================
// WORKORDER-02 공용 Button — 웜 그레이지 토큰 기반 3종.
//   primary   : 소프트 차콜 채움(--btn) + 흰 텍스트. 화면당 주 CTA 1개만.
//   secondary : 투명 + --btn-line 테두리 + --ink 텍스트. (밑줄 텍스트버튼 폐지)
//   ghost     : 텍스트만.
//   disabled  : --surface 배경 + --ink-3 텍스트로 명확히 구분.
// href를 주면 <Link>, 아니면 <button>. 색은 토큰만 사용(유채색 액센트 없음).
// ============================================================================

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-btn text-emphasis " +
  "transition-colors select-none min-h-[48px] px-5 " +
  "disabled:cursor-not-allowed";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-btn text-white hover:opacity-90 active:opacity-80 " +
    "disabled:bg-surface disabled:text-ink-3 disabled:opacity-100",
  secondary:
    "bg-transparent border border-btn-line text-ink hover:bg-surface " +
    "disabled:bg-surface disabled:text-ink-3 disabled:border-line",
  ghost:
    "bg-transparent text-ink hover:bg-surface " +
    "disabled:bg-transparent disabled:text-ink-3",
};

type CommonProps = {
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, keyof CommonProps> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps> & { href: string };

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", fullWidth, className, children, ...rest } = props;
  const cls = cx(BASE, VARIANT[variant], fullWidth && "w-full", className);

  if ("href" in props && props.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { ...btnRest } = rest as ButtonAsButton;
  return (
    <button className={cls} {...btnRest}>
      {children}
    </button>
  );
}
