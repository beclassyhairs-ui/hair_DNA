"use client";

// ============================================================================
// 어뷰티 — 맞춤 발견템 (`/items`)
// 유저의 진단 데이터로 매칭된 승인 상품만 보여주는 커머스 공간.
// 조회는 공개 API(/api/items)만 사용한다 — status='approved' AND
// image_status='approved' 상품을 공개 allowlist 필드로만 받는다.
// 매칭: diaryEntries에서 도출한 유저 coreKey ↔ 상품 fit_hair_types/avoid_hair_types.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "../components/layout/AppShell";
import { EVENT_NAMES, trackEvent } from "../../lib/eventTracking";
import { readDiaryEntries, readBeautyUserProfile } from "../../lib/beautyProfile";
import { deriveCoreKeyFromEntries, selectMatchedProducts } from "../../lib/itemsMatch";
import type { PublicProduct } from "../../lib/products";

function DiscoveryItemCard({ item, coreKey }: { item: PublicProduct; coreKey: string | null }) {
  const reason = item.recommend_reason || item.usage_guide || "진단 결과와 결이 맞는 발견템이에요.";

  return (
    <Link
      href={`/items/${item.id}`}
      onClick={() =>
        trackEvent(EVENT_NAMES.PRODUCT_CLICKED, {
          product_id_clicked: String(item.id),
          product_group_clicked: item.category ?? undefined,
          ui: "items_list",
          coreKey,
        })
      }
      className="block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow active:shadow-md"
    >
      <p className="text-[11px] font-semibold tracking-wide text-[#C8A96A]">AI 헤어 분석 결과 기반</p>

      <div className="mt-3 flex gap-3.5">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#FBF6EA] to-[#E8D4A0]">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.image_alt || item.product_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">✨</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#2F2F2F]">{item.product_name}</p>
          {item.category && (
            <span className="mt-1.5 inline-block rounded-full bg-[#F9F4E8] px-2 py-0.5 text-[11px] font-medium text-[#8A6D2F]">
              {item.category}
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-[#6B7280]">{reason}</p>

      <span className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F9F4E8] py-3 text-sm font-semibold text-[#8A6D2F]">
        자세히 보기 →
      </span>
    </Link>
  );
}

export default function ItemsPage() {
  const [items, setItems] = useState<PublicProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coreKey, setCoreKey] = useState<string | null>(null);
  const [name, setName] = useState("고객");

  useEffect(() => {
    // 클라이언트에서만 접근 가능한 진단 데이터로 매칭 키/이름을 준비한다.
    try {
      setCoreKey(deriveCoreKeyFromEntries(readDiaryEntries()));
      const profile = readBeautyUserProfile();
      if (profile?.name) setName(profile.name);
    } catch {
      /* localStorage 접근 불가 시 기본값 유지 */
    }

    fetch("/api/items")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        return body.items as PublicProduct[];
      })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  // 노출 규칙은 lib/itemsMatch.selectMatchedProducts 한 곳에만 있다 —
  // /admin/matching-preview가 같은 함수를 써야 미리보기와 실서비스가 어긋나지 않는다.
  const matched = useMemo(() => selectMatchedProducts(items, coreKey), [items, coreKey]);

  // 상품 노출(임프레션) — 매칭 리스트가 실제로 렌더되는 상품에 대해 상품당 1회만 기록.
  // 재렌더/필터 변화로 중복 발화하지 않도록 ref Set으로 방어(퍼널의 "상품 노출" 단계).
  const impressed = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const item of matched) {
      if (impressed.current.has(item.id)) continue;
      impressed.current.add(item.id);
      // 노출(view)이므로 "_clicked" 컬럼을 쓰지 않고 상품 식별자는 meta에 담는다.
      trackEvent(EVENT_NAMES.PRODUCT_VIEWED, {
        product_id: String(item.id),
        category: item.category ?? undefined,
        ui: "items_list",
        coreKey,
      });
    }
  }, [matched, coreKey]);

  return (
    <AppShell>
      <div>
        <h1 className="text-[19px] font-bold tracking-tight text-[#2F2F2F]">{name}님을 위한 맞춤 발견템</h1>
        <p className="mt-1 text-xs text-[#6B7280]">
          {coreKey
            ? "진단에서 확인된 모발 타입과 매칭된 제품만 모았어요."
            : "먼저 헤어 진단을 하면 모발 타입에 맞춰 더 정확히 추천해드려요."}
        </p>
      </div>

      {loading && (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-[#9AA0A6]">
          발견템 불러오는 중…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-500">
          발견템을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {!loading && !error && matched.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-[#9AA0A6]">
          {coreKey
            ? "지금 모발 타입에 딱 맞는 발견템을 준비하고 있어요. 곧 채워질 예정이에요."
            : "아직 공개된 발견템이 없어요. 곧 채워질 예정이에요."}
        </div>
      )}

      {!loading && !error && matched.map((item) => (
        <DiscoveryItemCard key={item.id} item={item} coreKey={coreKey} />
      ))}
    </AppShell>
  );
}
