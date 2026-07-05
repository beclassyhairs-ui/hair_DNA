"use client";

// ============================================================================
// 어뷰티 — 맞춤 발견템 (`/items`)
// 유저의 진단 데이터(concern_tags)와 매칭된 맞춤 제품만 보여주는 커머스 공간.
// 하단 탭바 "발견템"의 목적지. 지금은 더미 제품 — 실 연동 시 Supabase products
// 테이블에서 유저 태그와 일치하는 제품만 조회해 대체.
// ============================================================================

import AppShell from "../components/layout/AppShell";
import { trackEvent } from "../../lib/trackEvent";

const userName = "지환";

// TODO: DB에서 user_tags와 일치하는 제품만 SELECT 할 것 (현재는 더미 2개 고정)
const RECOMMENDED_ITEMS = [
  {
    id: "fixing_mascara_001",
    name: "앞머리 픽싱 마스카라",
    matchedTags: ["앞머리 갈라짐", "습도 높은 날", "정수리 처짐"],
    badges: ["앞머리갈라짐진단", "습도높은날", "정수리처짐", "가벼운고정템"],
    reason:
      "최근 진단에서 앞머리 갈라짐과 정수리 처짐 고민이 확인되어, 무겁게 떡지지 않고 앞머리와 잔머리 라인을 가볍게 고정하는 제품을 추천해요.",
  },
  {
    id: "root_volume_mist_002",
    name: "뿌리 볼륨 픽싱 미스트",
    matchedTags: ["정수리 부스스함", "볼륨 처짐"],
    badges: ["정수리부스스함진단", "볼륨처짐", "가벼운제형"],
    reason:
      "정수리 볼륨이 쉽게 죽는 분들을 위해, 무게감 없이 뿌리만 살짝 세워주는 제품을 추천해요.",
  },
];

function DiscoveryItemCard({ item }: { item: (typeof RECOMMENDED_ITEMS)[number] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold tracking-wide text-[#C8A96A]">AI 헤어 분석 결과 기반</p>
      <h2 className="mt-1 text-[17px] font-bold tracking-tight text-[#2F2F2F]">{userName}님 진단 기반 발견템</h2>

      <div className="mt-4 flex gap-3.5">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FBF6EA] to-[#E8D4A0]">
          <span className="text-2xl">✨</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#2F2F2F]">{item.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.badges.map((badge) => (
              <span key={badge} className="rounded-full bg-[#F9F4E8] px-2 py-0.5 text-[11px] font-medium text-[#8A6D2F]">
                #{badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-[#6B7280]">{item.reason}</p>

      <button
        onClick={() =>
          trackEvent("product_card_view", {
            productId: item.id,
            matchedTags: item.matchedTags,
            source: "items_page",
          })
        }
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F9F4E8] py-3.5 text-sm font-semibold text-[#8A6D2F] transition-colors active:bg-[#F3E9D2]"
      >
        왜 나에게 필요한지 보기 →
      </button>
    </section>
  );
}

export default function ItemsPage() {
  return (
    <AppShell>
      <div>
        <h1 className="text-[19px] font-bold tracking-tight text-[#2F2F2F]">{userName}님을 위한 맞춤 발견템</h1>
        <p className="mt-1 text-xs text-[#6B7280]">진단에서 확인된 고민 태그와 매칭된 제품만 모았어요.</p>
      </div>

      {RECOMMENDED_ITEMS.map((item) => (
        <DiscoveryItemCard key={item.id} item={item} />
      ))}
    </AppShell>
  );
}
