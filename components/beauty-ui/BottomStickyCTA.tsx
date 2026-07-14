import type { ReactNode } from "react";

// ============================================================================
// BottomStickyCTA — 결과지 하단 고정 CTA 바.
// ============================================================================

export default function BottomStickyCTA({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-[#FBF9F4]/92 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-lg space-y-2">{children}</div>
    </div>
  );
}
