"use client";

// ============================================================================
// HairTypeImage — 곱슬축 3장 이미지(straight/wavy/curly) 표시용 (인라인 썸네일).
// coreKey의 곱슬축만 보고 이미지를 고른다(lib/hairType). 파일이 없거나 로드 실패면
// 아무것도 렌더하지 않는다(공간도 차지하지 않음) — 깨진 이미지·빈 박스 금지.
// /home 프로필 카드처럼 "이미지 있으면 보이고 없으면 텍스트만" 자리에 쓴다.
// ============================================================================

import { useState } from "react";
import { hairTypeImage } from "@/lib/hairType";

export default function HairTypeImage({
  coreKey,
  className = "",
}: {
  coreKey: string | null;
  className?: string;
}) {
  const src = hairTypeImage(coreKey);
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  if (!src || status === "fail") return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      onLoad={() => setStatus("ok")}
      onError={() => setStatus("fail")}
      // 로드 확정 전에는 hidden(display:none) → 깨진 이미지/빈 공간 없음
      className={status === "ok" ? className : "hidden"}
    />
  );
}
