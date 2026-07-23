import type { ReactNode } from "react";

// ============================================================================
// SilkBackground — WORKORDER-02: 크림/골드 글로우 폐지. 흰 배경(--bg)만.
// 화려함은 색이 아니라 사진이 담당한다. API는 유지(호출부 변경 없음).
// ============================================================================

export default function SilkBackground({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative min-h-screen bg-bg ${className}`}>
      <div className="relative">{children}</div>
    </div>
  );
}
