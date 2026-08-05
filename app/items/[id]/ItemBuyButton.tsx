"use client";

// 상세페이지 구매 버튼 — 클릭 시 trackEvent 후 외부 구매 링크로 이동.
// (서버 컴포넌트인 상세페이지에서 이 부분만 클라이언트로 분리한다.)

import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { readDiaryEntries } from "../../../lib/beautyProfile";
import { derivePurchaseSegments } from "../../../lib/itemsMatch";

export default function ItemBuyButton({ id, buyLink }: { id: number; buyLink: string | null }) {
  if (!buyLink) {
    return (
      <div className="flex w-full items-center justify-center rounded-btn bg-surface py-3.5 text-emphasis text-ink-3">
        구매 링크 준비 중
      </div>
    );
  }

  return (
    <a
      href={buyLink}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        // 진단 전 방문자는 세 값 모두 null로 실린다(터지지 않게). 진단 후엔 최신 유효값.
        const seg = derivePurchaseSegments(readDiaryEntries());
        void trackEvent(EVENT_NAMES.PURCHASE_CLICK, {
          product_id_clicked: String(id),
          cta_clicked: "구매하러 가기",
          ui: "item_detail",
          coreKey: seg.coreKey,
          ageGroup: seg.ageGroup,
          treatmentFreq: seg.treatmentFreq,
        });
      }}
      className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-btn bg-btn-bg border border-btn-border py-3.5 text-emphasis font-bold text-btn-text transition-all hover:brightness-95 active:scale-[0.99]"
    >
      구매하러 가기 →
    </a>
  );
}
