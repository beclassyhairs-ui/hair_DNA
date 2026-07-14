import type { ReactNode } from "react";

// ============================================================================
// SilkBackground — 실크 아이보리 배경 (그리드/글로우 대신 은은한 마블 텍스처)
// ============================================================================

export default function SilkBackground({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative min-h-screen bg-[#FBF9F4] ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(200,190,172,0.28) 0%, transparent 42%)," +
            "radial-gradient(circle at 88% 12%, rgba(212,201,182,0.22) 0%, transparent 40%)," +
            "radial-gradient(circle at 50% 92%, rgba(196,186,168,0.20) 0%, transparent 50%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
