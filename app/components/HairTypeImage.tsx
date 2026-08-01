"use client";

// ============================================================================
// HairTypeImage — 곱슬축 3장 이미지(straight/wavy/curly) 인라인 썸네일.
// coreKey의 곱슬축만 보고 이미지를 고른다(lib/hairType). next/image, 세로 4:5.
// 이미지가 없거나 로드 실패면 아무것도 렌더하지 않는다(공간도 안 차지) —
// 깨진 이미지·빈 박스 금지. /home 프로필 카드처럼 "있으면 보이고 없으면 텍스트만".
// ============================================================================

import { useState } from "react";
import Image from "next/image";
import { hairTypeImage } from "@/lib/hairType";

export default function HairTypeImage({ coreKey }: { coreKey: string | null }) {
  const src = hairTypeImage(coreKey);
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div className="relative aspect-[4/5] w-[92px] shrink-0 overflow-hidden rounded-[14px]">
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="92px"
        priority
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
