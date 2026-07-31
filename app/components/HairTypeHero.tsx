"use client";

// ============================================================================
// HairTypeHero — 미끼 결과지(손상도·퀵진단) 히어로. 곱슬축 3장 이미지 방식.
// 디자인 SSOT: docs/ui-spec.html §6/§7 히어로 구성(220px + 하단 그라데이션
// + 명조 흰색 타입명). 텍스처 사선 스와치(폐기) 대체.
//   · 이미지 = coreKey 곱슬축(lib/hairType), next/image. 파일 없거나 로드 실패면
//     soft 패널로 폴백(깨진 이미지 금지). 앞머리 결과지는 추천 앞머리 사진 사용.
// ============================================================================

import { useState } from "react";
import Image from "next/image";
import { hairTypeImage } from "@/lib/hairType";

export default function HairTypeHero({
  coreKey,
  title,
  eyebrow,
}: {
  coreKey: string | null;
  title: string;
  eyebrow?: string;
}) {
  const src = hairTypeImage(coreKey);
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-[18px] bg-soft">
      {src && !failed && (
        <Image
          src={src}
          alt=""
          aria-hidden
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          priority
          className="object-cover"
          style={{ objectPosition: "50% 28%" }}
          onError={() => setFailed(true)}
        />
      )}

      {/* 하단 그라데이션 — 타입명 가독용(이미지 없어도 soft 위 흰 타이틀 대비 확보) */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: "linear-gradient(to top, rgba(42,38,31,0.74), transparent)" }}
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        {eyebrow && <p className="text-[11px] font-bold tracking-[0.14em] text-white/80">{eyebrow}</p>}
        <h1 className="mt-1 font-serif text-h1 font-semibold leading-snug text-white">{title}</h1>
      </div>
    </div>
  );
}
