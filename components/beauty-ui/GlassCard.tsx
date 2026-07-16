import type { ReactNode } from "react";

// ============================================================================
// GlassCard — 반투명 + 블러 카드. 골드는 상단 얇은 라인 정도로만 포인트.
// tone="soft"는 Tier2(참고 정보성) 카드처럼 시각적 무게를 한 단계 낮출 때만
// 사용 — 기존 호출부(tone 미지정)는 전부 이전과 동일한 클래스를 받는다.
// ============================================================================

const TONE_CLASS: Record<"default" | "soft", string> = {
  default: "border-white/60 bg-white/55 shadow-[0_8px_32px_-14px_rgba(120,110,90,0.28)]",
  soft:    "border-white/35 bg-white/35 shadow-[0_6px_22px_-14px_rgba(120,110,90,0.2)]",
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
      className={`overflow-hidden rounded-3xl border backdrop-blur-xl ${TONE_CLASS[tone]} ${className}`}
    >
      {accent && (
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C8A86B]/50 to-transparent" />
      )}
      {children}
    </div>
  );
}
