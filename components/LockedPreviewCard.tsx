"use client";

// ============================================================================
// A-2 잠금 미리보기 카드 — 미끼 랜딩(/bangs · /damage-check · /hair-quiz)
// 결과지 하단에서 /style(AI 합성)로 넘기는 카드.
//
// ⚠️ 여기 쓰는 이미지는 유저 얼굴이 아니라 공용 레퍼런스(public/references/
//    default_style.jpg)다. 이 랜딩들은 사진을 아예 수집하지 않으므로 유저 얼굴을
//    보여줄 수도 없다 — 오해 방지를 위해 "예시" 표기를 항상 함께 노출한다.
// ============================================================================

import Link from "next/link";
import { Lock } from "lucide-react";

export default function LockedPreviewCard({
  className = "",
  onCtaClick,
}: {
  className?: string;
  onCtaClick?: () => void;
}) {
  return (
    <section className={`overflow-hidden rounded-card border border-line bg-card ${className}`}>
      {/* 블러 처리된 예시 이미지 + 자물쇠 */}
      <div className="relative h-40 w-full overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/references/default_style.jpg"
          alt="AI 스타일 합성 예시 이미지"
          aria-hidden
          draggable={false}
          className="h-full w-full select-none object-cover blur-md"
          style={{ objectPosition: "50% 25%", pointerEvents: "none" }}
        />
        <div className="absolute inset-0 bg-white/35" />

        {/* 예시 표기 — 유저 얼굴로 오인하지 않도록 항상 노출 */}
        <span className="absolute left-3 top-3 rounded-pill bg-ink px-2.5 py-0.5 text-[11px] font-bold text-white">
          예시
        </span>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink">
            <Lock size={20} strokeWidth={1.8} className="text-white" aria-hidden />
          </span>
        </div>
      </div>

      <div className="px-5 py-5 text-center">
        <h3 className="text-h2 text-ink">내 얼굴로 보는 변신 결과</h3>
        <p className="mt-2 text-body leading-relaxed text-ink-2">
          AI 헤어 분석에서는 내 사진에 어울리는 스타일을 직접 합성해서 보여드려요.
        </p>

        <Link
          href="/style"
          onClick={onCtaClick}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-btn border border-btn-border bg-btn-bg text-base font-bold text-btn-text transition-all hover:brightness-95 active:scale-[0.99]"
        >
          AI 헤어 분석 받아보기
        </Link>
      </div>
    </section>
  );
}
