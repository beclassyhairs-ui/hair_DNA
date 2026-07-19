"use client";

// ============================================================================
// /admin/matching-preview — 유저 타입으로 보기 (매칭 미리보기 시뮬레이터)
// curl/thickness/density 조합을 골라 그 타입 유저가 /items에서 보게 될 상품
// 목록·순서를 미리본다.
//
// ⚠️ 실서비스와 결과가 어긋나면 안 되므로:
//   - 데이터는 /items가 쓰는 것과 동일한 공개 API(/api/items)에서만 가져온다
//     (approved + image_approved, created_at desc 정렬이 이미 적용됨).
//   - 매칭은 lib/itemsMatch.ts의 productMatchesCoreKey를 그대로 재사용한다
//     (/items 페이지의 matched 로직과 동일). 별도 구현 금지.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { productMatchesCoreKey } from "../../../lib/itemsMatch";
import { CURL_OPTIONS, THICKNESS_OPTIONS, DENSITY_OPTIONS, coreKeyLabel } from "../../../lib/hairTypeOptions";
import type { PublicProduct } from "../../../lib/products";

const SELECT_CLASS =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-cream focus:border-gold/40 focus:outline-none";

export default function MatchingPreviewPage() {
  const [items, setItems] = useState<PublicProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [curl, setCurl] = useState(CURL_OPTIONS[0].value);
  const [thickness, setThickness] = useState(THICKNESS_OPTIONS[0].value);
  const [density, setDensity] = useState(DENSITY_OPTIONS[0].value);
  const [preDiagnosis, setPreDiagnosis] = useState(false); // 진단 전(coreKey 없음) 유저 시점

  useEffect(() => {
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

  const coreKey = preDiagnosis ? null : `${curl}__${thickness}__${density}`;

  // /items 페이지의 matched 로직과 동일 — coreKey null이면 전체, 아니면 매칭 필터.
  const matched = useMemo(() => {
    if (!items) return [];
    if (coreKey === null) return items;
    return items.filter((p) => productMatchesCoreKey(p.fit_hair_types, p.avoid_hair_types, coreKey));
  }, [items, coreKey]);

  return (
    <div className="px-5 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="font-serif text-xl font-bold text-cream">유저 타입으로 보기</h1>
        <p className="mt-1 text-sm text-cream/50">
          모발 타입 조합을 고르면 그 유저가 <b className="text-cream/75">/items</b>에서 보게 될
          상품 목록·순서를 그대로 미리봅니다. (실서비스 매칭 로직·데이터 동일)
        </p>
      </header>

      {/* 타입 선택 */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-cream/45">컬(curl)</span>
            <select className={SELECT_CLASS} value={curl} disabled={preDiagnosis}
              onChange={(e) => setCurl(e.target.value)}>
              {CURL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-cream/45">굵기(thickness)</span>
            <select className={SELECT_CLASS} value={thickness} disabled={preDiagnosis}
              onChange={(e) => setThickness(e.target.value)}>
              {THICKNESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-cream/45">숱(density)</span>
            <select className={SELECT_CLASS} value={density} disabled={preDiagnosis}
              onChange={(e) => setDensity(e.target.value)}>
              {DENSITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-cream/70">
          <input type="checkbox" checked={preDiagnosis} onChange={(e) => setPreDiagnosis(e.target.checked)} />
          진단 전 유저로 보기 (coreKey 없음 → 승인 상품 전체 노출)
        </label>

        <p className="mt-3 text-[13px] text-cream/55">
          현재 시점:{" "}
          <span className="font-semibold text-gold-light">
            {coreKey ? coreKeyLabel(coreKey) : "진단 전(전체 노출)"}
          </span>
        </p>
      </div>

      {/* 결과 */}
      <div className="mt-6">
        {loading && <p className="text-sm text-cream/45">불러오는 중…</p>}
        {!loading && error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            상품을 불러오지 못했습니다: {error}
          </p>
        )}
        {!loading && !error && (
          <>
            <p className="mb-3 text-sm text-cream/70">
              이 유저는 <b className="text-gold-light">{matched.length}</b>개 상품을 아래 순서로 봅니다.
              {items && <span className="text-cream/40"> (승인 상품 전체 {items.length}개 중)</span>}
            </p>

            {matched.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-cream/40">
                이 타입 유저에게 노출될 승인 상품이 없습니다.
              </p>
            ) : (
              <ol className="space-y-2">
                {matched.map((p, i) => (
                  <li key={p.id}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <span className="mt-0.5 w-6 shrink-0 text-right text-sm font-bold text-gold-light">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-cream">
                        {p.product_name}
                        {p.category && <span className="ml-2 text-[11px] font-normal text-cream/40">{p.category}</span>}
                        {!p.image_url && <span className="ml-2 text-[11px] text-amber-300/70">이미지 없음</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="text-cream/40">
                          fit: {p.fit_hair_types?.length ? p.fit_hair_types.map(coreKeyLabel).join(" / ") : "(범용 — 전체 노출)"}
                        </span>
                        {p.avoid_hair_types?.length ? (
                          <span className="text-red-300/60">avoid: {p.avoid_hair_types.map(coreKeyLabel).join(" / ")}</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
