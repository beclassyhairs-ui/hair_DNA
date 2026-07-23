// ============================================================================
// WORKORDER-02 공용 Card — 흰 카드 + --line 테두리로 구분(색 없음).
//   image 슬롯을 레이아웃에 반영(빈 카드 방지, 화려함은 사진이 담당).
//   image: 상단 이미지 src / imageAlt: 대체텍스트 / imageRatio: aspect (기본 4/3).
// ============================================================================

import type { ReactNode } from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type CardProps = {
  children?: ReactNode;
  image?: string;
  imageAlt?: string;
  imageRatio?: string; // 예: "4 / 3", "3 / 4", "16 / 9"
  className?: string;
  bodyClassName?: string;
};

export default function Card({
  children,
  image,
  imageAlt = "",
  imageRatio = "4 / 3",
  className,
  bodyClassName,
}: CardProps) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-card border border-line bg-card shadow-soft",
        className
      )}
    >
      {image ? (
        <div className="w-full bg-surface" style={{ aspectRatio: imageRatio }}>
          {/* 프로젝트 이미지 최적화 정책과 무관하게 동작하도록 순수 img 사용 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      {children != null ? (
        <div className={cx("p-4", bodyClassName)}>{children}</div>
      ) : null}
    </div>
  );
}
