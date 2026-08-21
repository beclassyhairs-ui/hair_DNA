"use client";

// FadePreview — 접힘 상세를 "요약→펼치면 원장 상세"로 보여주는 토글.
//   결과지 핵심 UX. 옛 <details>/<summary>(13px 흐린 회색 + 네이티브 삼각형)는
//   손님이 못 알아채고 지나쳐서, 두 신호를 겹친다:
//     ① 접힌 상태에서 첫 몇 줄을 흐리게(그라데이션 페이드) 보여줘 "밑에 더 있다"
//     ② "탭하면 원장님 상세 설명 ▼" 버튼 문구로 "누르는 것"임을 명확히
//   판정·카피 내용은 건드리지 않는다. 렌더/스타일 전용.
import { useState, type ReactNode } from "react";

export default function FadePreview({
  title,
  children,
  dashed = false,
  collapsedHeight = 60,
}: {
  title?: string;
  children: ReactNode;
  /** 차단 상태 '회복 후 시술 참고'처럼 점선 테두리로 성격을 구분할 때. */
  dashed?: boolean;
  /** 접힌 상태에서 미리 보여줄 높이(px). 기본 ≈ 2줄. */
  collapsedHeight?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`mt-2 overflow-hidden rounded-xl border bg-card ${
        dashed ? "border-dashed border-line" : "border-line"
      }`}
    >
      {title && (
        <div className="px-4 pt-3.5 pb-1 text-[14px] font-bold leading-snug text-ink">{title}</div>
      )}

      <div className="relative px-4">
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight: open ? 1600 : collapsedHeight }}
          aria-hidden={!open}
        >
          <div className="pt-1 pb-3">{children}</div>
        </div>

        {/* 접힌 상태 페이드 — 흰 카드 바탕(--card)으로 흘려 "더 있다"를 눈에 남긴다. */}
        {!open && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-11"
            style={{
              background: "linear-gradient(to top, #ffffff 28%, rgba(255,255,255,0))",
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1.5 border-t border-line bg-btn-bg px-4 py-3 text-[14px] font-extrabold text-ink transition-colors hover:brightness-95 active:scale-[0.99]"
      >
        {open ? "접기" : "탭하면 원장님 상세 설명"}
        <span aria-hidden className={`text-[11px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
    </div>
  );
}
