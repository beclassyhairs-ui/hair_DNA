"use client";

import { motion } from "framer-motion";

// ============================================================================
// ProgressBar — 단일 연속 바 (세그먼트 여러 개 대신 하나로 단순화)
// value: 0~100
// ============================================================================

export default function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#EEE8DA]">
      <motion.div
        className="h-full rounded-full bg-[#2F2A22]"
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </div>
  );
}
