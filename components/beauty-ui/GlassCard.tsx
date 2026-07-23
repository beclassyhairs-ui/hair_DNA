import type { ReactNode } from "react";

// ============================================================================
// GlassCard — WORKORDER-02: 글래스/골드 폐지. 흰 카드 + --line 테두리로 구분.
// tone="soft"는 무게를 한 단계 낮춘 --surface 면. API는 유지(호출부 변경 없음).
// ============================================================================

const TONE_CLASS: Record<"default" | "soft", string> = {
  default: "border-line bg-card shadow-soft",
  soft:    "border-line bg-surface",
};

export default function GlassCard({
  children,
  className = "",
  accent = false,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  tone?: "default" | "soft";
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border ${TONE_CLASS[tone]} ${className}`}
    >
      {accent && <div className="h-px w-full bg-line" />}
      {children}
    </div>
  );
}
