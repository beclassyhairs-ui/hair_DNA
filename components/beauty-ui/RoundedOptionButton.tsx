"use client";

import { motion } from "framer-motion";

// ============================================================================
// RoundedOptionButton — 둥근 pill형 선택지 버튼.
// single(자동진행)/multi(체크) 모드를 모두 지원한다.
// 골드는 선택 시 체크 아이콘 색상 정도로만 사용.
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
          ? "border-[#2F2A22]/70 bg-white shadow-[0_4px_18px_-6px_rgba(47,42,34,0.18)]"
          : "border-[#EDE7DA] bg-white/70 hover:border-[#D8CDB8] hover:bg-white"
      }`}
    >
      {icon && (
        <span
          className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-base transition-colors ${
            selected ? "bg-[#2F2A22] text-white" : "bg-[#F3EEE3] text-[#9C9482]"
          }`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className={`block text-sm font-semibold leading-snug ${selected ? "text-[#2F2A22]" : muted ? "text-[#B5AC9A]" : "text-[#3A352C]"}`}>
          {label}
        </span>
        {desc && (
          <span className={`mt-0.5 block text-xs leading-relaxed ${selected ? "text-[#7A7263]" : "text-[#9C9482]"}`}>
            {desc}
          </span>
        )}
      </span>
      {multi ? (
        <span
          className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-[#C8A86B] bg-[#C8A86B]" : "border-[#D8CDB8] bg-white"
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
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 flex-none text-[#C8A86B]">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      )}
    </motion.button>
  );
}
