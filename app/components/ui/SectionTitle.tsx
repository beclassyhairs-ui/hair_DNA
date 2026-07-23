// ============================================================================
// WORKORDER-02 공용 SectionTitle — 섹션·카드 제목(위계로 승부).
//   title: --ink + text-h2(18/600)   desc: --ink-2 + text-aux(13/400)
//   강조는 화면당 1곳 원칙 — 제목·부제가 다 크고 굵어지지 않게 토큰 고정.
//   as로 헤딩 레벨 지정(기본 h2).
// ============================================================================

import type { ReactNode } from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type SectionTitleProps = {
  title: ReactNode;
  desc?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  action?: ReactNode; // 우측 액션(예: "전체보기") 슬롯
};

export default function SectionTitle({
  title,
  desc,
  as: Tag = "h2",
  className,
  action,
}: SectionTitleProps) {
  return (
    <div className={cx("mb-3 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <Tag className="text-h2 text-ink">{title}</Tag>
        {desc != null ? <p className="mt-1 text-aux text-ink-2">{desc}</p> : null}
      </div>
      {action != null ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
