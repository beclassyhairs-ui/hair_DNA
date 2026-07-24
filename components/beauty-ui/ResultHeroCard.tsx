import type { ReactNode } from "react";

// ============================================================================
// ResultHeroCard — "큰 이미지/타이틀 + 짧은 설명" 결과지 히어로.
// visual이 없으면 이미지가 없는 진단(damage-check, hair-quiz 등)에 쓰는 무이미지
// 버전이 되고, visual을 넘기면 그 위에 큰 이미지가 올라간다(bangs, style 등).
// badge: 등급/결과명처럼 짧은 pill로 강조하고 싶은 값(선택)
// title은 선택 — 결과명을 badge로만 보여주고 싶을 땐 생략할 수 있다.
// badgeVariant="subtle": title(예: 불편함 헤드라인)을 1차 후킹으로 세우고
// badge는 보조 태그로 낮추고 싶을 때만 사용 — 미지정 시 기존 solid 스타일 그대로.
// ============================================================================

export default function ResultHeroCard({
  eyebrow,
  visual,
  badge,
  badgeVariant = "solid",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  visual?: ReactNode;
  badge?: ReactNode;
  badgeVariant?: "solid" | "subtle";
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-white/60 bg-white/55 px-6 py-8 text-center shadow-[0_12px_40px_-16px_rgba(120,110,90,0.3)] backdrop-blur-xl sm:px-7 sm:py-10">
      {visual && <div className="mb-6">{visual}</div>}
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink-2">{eyebrow}</p>
      )}
      {badge && (
        <div className="mt-4 flex justify-center">
          <span
            className={
              badgeVariant === "subtle"
                ? "inline-flex flex-col items-center gap-0.5 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-ink"
                : "inline-flex flex-col items-center gap-0.5 rounded-full bg-ink px-6 py-2.5 text-base font-bold text-white"
            }
          >
            {badge}
          </span>
        </div>
      )}
      {title && (
        <h1
          className={`font-bold leading-snug text-ink ${
            badgeVariant === "subtle" ? "mt-3 text-[1.6rem]" : "mt-4 text-[1.45rem]"
          }`}
        >
          {title}
        </h1>
      )}
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{description}</p>
      )}
      {children}
    </div>
  );
}
