"use client";

// ============================================================================
// SwatchHero — 미끼 결과지(손상도·앞머리·성향) 공용 히어로.
// 디자인 SSOT: docs/ui-spec.html §3/§6/§7.
//   · 텍스처 스와치(220px) + 하단 그라데이션 + 타입명(명조·흰색).
//   · 스와치 texture = 유저 본인 모발 결(coreKey 파생, /home과 동일 규칙).
//     coreKey가 없으면 swatchForCoreKey가 직모 단일로 폴백한다.
//   · /style 결과지는 본인 합성컷 전용이라 이 히어로를 쓰지 않는다.
// 폰트 "크기"는 현행 토큰 유지(text-h1=22px). 명조만 입힌다.
// ============================================================================

import TextureSwatch from "./TextureSwatch";
import { swatchForCoreKey } from "@/lib/textures";

export default function SwatchHero({
  coreKey,
  title,
  eyebrow,
}: {
  coreKey: string | null;
  title: string;
  eyebrow?: string;
}) {
  const swatch = swatchForCoreKey(coreKey);

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-[18px]">
      <TextureSwatch primary={swatch.primary} secondary={swatch.secondary} className="absolute inset-0" />
      {/* 하단 그라데이션 — 타입명 가독용 */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: "linear-gradient(to top, rgba(42,38,31,0.72), transparent)" }}
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-serif text-h1 font-semibold leading-snug text-white">{title}</h1>
      </div>
    </div>
  );
}
