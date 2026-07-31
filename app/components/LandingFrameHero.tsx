"use client";

// ============================================================================
// LandingFrameHero — 진단 랜딩 4종 공용 "액자 히어로".
// 디자인 SSOT: docs/ui-spec.html §3 — 흰 매트 액자 + 살짝 기울임(-0.6deg)
//   + EXAMPLE 라벨 필수. next/image. (흰 카드 수: 액자 1장뿐 — CTA는 카드 아님.)
//   모델 사진 6장(public/landing/*.jpg, 896×1120 4:5)을 이 액자에 담는다.
// ============================================================================

import Image from "next/image";

export default function LandingFrameHero({
  src,
  caption = "EXAMPLE · AI 미리보기",
}: {
  src: string;
  caption?: string;
}) {
  return (
    <div
      className="relative mx-auto w-[74%] max-w-[300px] rounded-[6px] bg-white p-[10px] pb-[26px] shadow-[0_14px_34px_rgba(42,38,31,0.16)]"
      style={{ transform: "rotate(-0.6deg)" }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[3px] bg-soft">
        <Image
          src={src}
          alt=""
          aria-hidden
          fill
          sizes="(max-width: 430px) 74vw, 300px"
          priority
          className="object-cover"
        />
      </div>
      {/* EXAMPLE 라벨 — 매트 하단(폴라로이드 자리), 회색이라 어떤 사진 위에서도 판독 */}
      <p className="absolute inset-x-0 bottom-[8px] text-center text-[9px] tracking-[0.18em] text-sub">
        {caption}
      </p>
    </div>
  );
}
