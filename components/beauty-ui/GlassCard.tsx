import type { ReactNode } from "react";

// ============================================================================
// GlassCard — 반투명 + 블러 카드. 골드는 상단 얇은 라인 정도로만 포인트.
// ============================================================================

export default function GlassCard({
  children,
  className = "",
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/60 bg-white/55 shadow-[0_8px_32px_-14px_rgba(120,110,90,0.28)] backdrop-blur-xl ${className}`}
    >
      {accent && (
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C8A86B]/50 to-transparent" />
      )}
      {children}
    </div>
  );
}
