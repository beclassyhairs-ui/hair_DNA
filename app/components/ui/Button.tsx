// ============================================================================
// WORKORDER-02 공용 Button — 웜 그레이지 토큰 기반 3종.
//   primary   : WORKORDER-03 아주 연한 회색 필(--btn-bg) + 1px 테두리 + ink 텍스트(700). 화면당 1개.
//   secondary : 고스트(텍스트만) — 보조 액션은 채움/테두리 없이 낮춘다.
//   ghost     : 텍스트만.
//   disabled  : opacity로 흐리게.
// href를 주면 <Link>, 아니면 <button>. 색은 토큰만 사용(유채색 액센트 없음).
// ============================================================================

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-btn text-base " +
  "transition-colors select-none min-h-[48px] px-5 " +
  "disabled:cursor-not-allowed";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-btn-bg border border-btn-border text-btn-text font-bold hover:brightness-95 active:scale-[0.99] " +
    "disabled:opacity-50",
  secondary:
    "bg-transparent font-semibold text-ink hover:bg-surface " +
    "disabled:text-ink-3",
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
