"use client";

// ============================================================================
// CoupangCardList — 결과지 하단 제휴 제품 카드(텍스트) + 대가성 문구
//
// 카드 = 아이콘 + 이름(굵게) + 추천사유 + 이유 2~3줄 + 우하단 가벼운 "제품 보러 가기 →" 링크.
//   ★ 2026-08-14 UI 경량화: 검은 채운 버튼 4개가 광고판처럼 보여 제거. 포인트컬러(#B5542C) 텍스트
//     링크로 낮추고, 터치는 카드 전체(≥44px)로. 문구는 "제품 보러 가기"(쿠팡 종속 안 함, 제휴처 변경 대비).
//   가격 미표시. 대가성 문구(법적 필수)는 제품 영역 바로 아래 가독 크기로 — 문구·위치 불변.
//   클릭은 PRODUCT_CLICKED 로 계측(§4-1 제휴 클릭·전환 데이터가 목적).
// ============================================================================

import { COUPANG_DISCLOSURE, type CoupangCard } from "@/lib/coupangCards";
import { EVENT_NAMES, trackEvent } from "@/lib/eventTracking";

export default function CoupangCardList({
  cards,
  landingId,
  heading = "이 머리에 맞는 제품",
}: {
  cards: CoupangCard[];
  landingId: string;
  heading?: string;
}) {
  if (!cards || cards.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-2">{heading}</p>

      {cards.map((c) => (
        <a
          key={c.g}
          href={c.link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() =>
            trackEvent(EVENT_NAMES.PRODUCT_CLICKED, {
              product_id_clicked: c.g,
              ui: `${landingId}_result_coupang`,
              cta_clicked: "제품 보러 가기",
              diagnosis_type: landingId,
            })
          }
          // ★ 카드 전체가 터치영역(≥44px). 검은 채움 없이 가벼운 카드.
          className="block rounded-xl border border-line bg-white px-3.5 py-3 transition-colors active:bg-surface"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[19px] leading-none">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">{c.name}</p>
              <p className="mt-0.5 text-[14px] font-medium leading-relaxed text-ink-2">{c.reason}</p>
              {/* 이유 2~3줄 — 한 줄 요약보다 한 톤 연하게(ink-3)·줄간격 넉넉·펼쳐둠. */}
              {c.detail && (
                <p className="mt-1.5 text-[13px] leading-[1.7] text-ink-3">{c.detail}</p>
              )}
              {/* 검은 버튼 제거 → 우하단 가벼운 포인트컬러 텍스트 링크. 터치는 카드 전체. */}
              <span className="mt-2 flex items-center justify-end gap-1 text-[13px] font-semibold text-[#B5542C]">
                제품 보러 가기 <span aria-hidden>→</span>
              </span>
            </div>
          </div>
        </a>
      ))}

      {/* 대가성 문구(법적 필수) — 제품 영역 바로 아래, 가독 크기·뚜렷한 색. 문구·위치 불변. */}
      <p className="px-1 pt-1 text-[13px] leading-relaxed text-ink-2">{COUPANG_DISCLOSURE}</p>
    </section>
  );
}
