import type { ReactNode } from "react";

// ============================================================================
// ResultHeroCard — "큰 이미지/타이틀 + 짧은 설명" 결과지 히어로.
// visual이 없으면 이미지가 없는 진단(damage-check, hair-quiz 등)에 쓰는 무이미지
// 버전이 되고, visual을 넘기면 그 위에 큰 이미지가 올라간다(bangs, style 등).
// badge: 등급/결과명처럼 짧은 pill로 강조하고 싶은 값(선택)
// title은 선택 — 결과명을 badge로만 보여주고 싶을 땐 생략할 수 있다.
// ============================================================================

export default function ResultHeroCard({
  eyebrow,
  visual,
  badge,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  visual?: ReactNode;
  badge?: ReactNode;
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-white/60 bg-white/55 px-6 py-8 text-center shadow-[0_12px_40px_-16px_rgba(120,110,90,0.3)] backdrop-blur-xl sm:px-7 sm:py-10">
      {visual && <div className="mb-6">{visual}</div>}
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#A8884A]">{eyebrow}</p>
      )}
      {badge && (
        <div className="mt-4 flex justify-center">
          <span className="inline-flex flex-col items-center gap-0.5 rounded-full bg-[#1C1A17] px-6 py-2.5 font-serif text-base font-bold text-white">
            {badge}
          </span>
        </div>
      )}
      {title && (
        <h1 className="mt-4 font-serif text-[1.65rem] font-bold leading-snug text-[#2F2A22]">
          {title}
        </h1>
      )}
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-[#6B6355]">{description}</p>
      )}
      {children}
    </div>
  );
}
