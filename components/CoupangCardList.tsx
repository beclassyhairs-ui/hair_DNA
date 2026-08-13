"use client";

// ============================================================================
// CoupangCardList — 결과지 하단 쿠팡 제휴 카드(텍스트) + 대가성 문구
//
// 최종 지시서(2026-08-13): 사진 없음 → 버튼이 또렷해야 상품으로 인식된다(설계 약점을 디자인으로 보완).
//   카드 = 아이콘 + 이름(굵게) + 추천사유 + "쿠팡에서 보기 →"(채운 버튼). 가격 미표시.
//   대가성 문구는 제품 영역 바로 아래, 읽을 수 있는 크기(13px·뚜렷한 색)로. 푸터에 숨기지 않는다.
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
    <section className="space-y-2.5">
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
              cta_clicked: "쿠팡에서 보기",
              diagnosis_type: landingId,
            })
          }
          className="block rounded-2xl border border-line bg-white p-4 transition-shadow active:shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="text-[22px] leading-none">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">{c.name}</p>
              <p className="mt-0.5 text-[14px] font-medium leading-relaxed text-ink-2">{c.reason}</p>
              {/* 이유 2~3줄 — 한 줄 요약보다 한 톤 연하게(ink-3)·줄간격 넉넉·펼쳐둠. */}
              {c.detail && (
                <p className="mt-2 text-[13px] leading-[1.7] text-ink-3">{c.detail}</p>
              )}
            </div>
          </div>
          {/* 사진이 없으므로 버튼을 또렷하게(채운 버튼) — 상품·구매 인지 확보 */}
          <span className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-3 text-[15px] font-bold text-white">
            쿠팡에서 보기 <span aria-hidden>→</span>
          </span>
        </a>
      ))}

      {/* 대가성 문구(법적 필수) — 제품 영역 바로 아래, 가독 크기·뚜렷한 색. 푸터에 숨기지 않는다. */}
      <p className="px-1 pt-1 text-[13px] leading-relaxed text-ink-2">{COUPANG_DISCLOSURE}</p>
    </section>
  );
}
