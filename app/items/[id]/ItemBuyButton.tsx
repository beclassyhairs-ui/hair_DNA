"use client";

// 상세페이지 구매 버튼 — 클릭 시 trackEvent 후 외부 구매 링크로 이동.
// (서버 컴포넌트인 상세페이지에서 이 부분만 클라이언트로 분리한다.)

import { trackEvent } from "../../../lib/trackEvent";

export default function ItemBuyButton({ id, buyLink }: { id: number; buyLink: string | null }) {
  if (!buyLink) {
    return (
      <div className="flex w-full items-center justify-center rounded-xl bg-[#F3F4F6] py-3.5 text-sm font-semibold text-[#9AA0A6]">
        구매 링크 준비 중
      </div>
    );
  }

  return (
    <a
      href={buyLink}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("product_buy_click", { productId: id, source: "item_detail" })}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2F2F2F] py-3.5 text-sm font-semibold text-white transition-colors active:bg-black"
    >
      구매하러 가기 →
    </a>
  );
}
