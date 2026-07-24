"use client";

import { motion } from "framer-motion";

// ============================================================================
// RoundedOptionButton — 둥근 pill형 선택지 버튼.
// single(자동진행)/multi(체크) 모드를 모두 지원한다.
// WORKORDER-02.1: 골드 폐지 → 선택 표시는 명도(--ink)로만. 무채색 통일.
// ============================================================================

export default function RoundedOptionButton({
  icon,
  label,
  desc,
  selected,
  multi = false,
  disabled = false,
  muted = false,
  onSelect,
}: {
  icon?: string;
  label: string;
  desc?: string;
  selected: boolean;
  multi?: boolean;
  disabled?: boolean;
  muted?: boolean; // "없음"류 옵션을 비선택 시 한 톤 죽여서 보여줄 때
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      whileTap={{ scale: 0.985 }}
      className={`flex w-full items-center gap-3 rounded-full border px-5 py-3.5 text-left transition-all duration-200 disabled:opacity-40 ${
        selected
          ? "border-ink bg-white shadow-soft"
          : "border-line bg-white/70 hover:border-btn-line hover:bg-white"
      }`}
    >
      {icon && (
        <span
          className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors ${
            selected ? "bg-ink text-white" : "bg-surface text-ink-2"
          }`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className={`block text-sm font-semibold leading-snug ${selected ? "text-ink" : muted ? "text-ink-3" : "text-ink"}`}>
          {label}
        </span>
        {desc && (
          <span className={`mt-0.5 block text-xs leading-relaxed ${selected ? "text-ink-2" : "text-ink-2"}`}>
            {desc}
          </span>
        )}
      </span>
      {multi ? (
        <span
          className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-ink bg-ink" : "border-btn-line bg-white"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      ) : (
        selected && (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 flex-none text-ink">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      )}
    </motion.button>
  );
}
