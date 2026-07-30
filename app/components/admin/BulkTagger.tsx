"use client";

// ============================================================================
// 어뷰티 어드민 — 일괄 태깅 (Bulk Tagging)
// 여러 상품을 체크박스로 골라, fit_hair_types / avoid_hair_types를 한 번에 덮어쓴다.
// "이 컬크림은 생머리면 다 보여줘" = 컬만 [직모] 고르면 직모__*__* 9개가 자동 생성된다.
//
// ⚠️ 매칭 로직/검증은 건드리지 않는다. 저장은 서버(/api/admin/products/bulk-tag)에서
//    기존 validateCoreKeyList(3토막 검증)를 그대로 통과한다. CoreKeyBuilder(단일 편집)는
//    ProductManager에 그대로 남아 있다 — 이 화면은 대량 클릭을 대신 눌러주는 도구일 뿐이다.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product, ProductStatus } from "../../../lib/products";
import {
  CURL_OPTIONS,
  THICKNESS_OPTIONS,
  DENSITY_OPTIONS,
  TOTAL_CORE_KEY_COUNT,
  expandCoreKeyCombos,
} from "../../../lib/hairTypeOptions";

const MAX_SELECT = 200;

type AxisOption = { value: string; label: string };

// 축 라벨(값은 hairTypeOptions에서 읽는다 — 화면에 하드코딩하지 않는다)
const AXES: { key: "curl" | "thickness" | "density"; title: string; options: AxisOption[] }[] = [
  { key: "curl", title: "컬", options: CURL_OPTIONS },
  { key: "thickness", title: "굵기", options: THICKNESS_OPTIONS },
  { key: "density", title: "숱", options: DENSITY_OPTIONS },
];

function labelsOf(options: AxisOption[], values: string[]): string {
  return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join("·");
}

/** fit 선택 상태를 한국어 한 줄 설명으로. 미선택 축은 "상관없음"으로 표시한다. */
function describeFit(curls: string[], thicks: string[], dens: string[]): string {
  const parts: string[] = [];
  const ignored: string[] = [];
  if (curls.length) parts.push(labelsOf(CURL_OPTIONS, curls)); else ignored.push("컬");
  if (thicks.length) parts.push(labelsOf(THICKNESS_OPTIONS, thicks)); else ignored.push("굵기");
  if (dens.length) parts.push(labelsOf(DENSITY_OPTIONS, dens)); else ignored.push("숱");
  const base = `${parts.join(" · ")}인 손님`;
  return ignored.length ? `${base} 전원 (${ignored.join("·")} 상관없음)` : base;
}

const STATUS_FILTERS: { value: "all" | ProductStatus; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "approved", label: "승인" },
];

const AXIS_BTN = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-gold/50 bg-gold/20 text-gold-light"
      : "border-white/10 bg-white/[0.03] text-cream/60 hover:bg-white/[0.07]"
  }`;

/** 축 3줄 버튼 세트 (fit/avoid 공용). */
function AxisPicker({
  selected,
  onToggle,
  ignoreHint,
}: {
  selected: Record<"curl" | "thickness" | "density", string[]>;
  onToggle: (axis: "curl" | "thickness" | "density", value: string) => void;
  ignoreHint: string;
}) {
  return (
    <div className="space-y-2">
      {AXES.map((axis) => (
        <div key={axis.key} className="flex flex-wrap items-center gap-2">
          <span className="w-10 shrink-0 text-xs font-medium text-cream/50">{axis.title}</span>
          {axis.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(axis.key, o.value)}
              className={AXIS_BTN(selected[axis.key].includes(o.value))}
            >
              {o.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-cream/25">{ignoreHint}</span>
        </div>
      ))}
    </div>
  );
}

const EMPTY_AXES = { curl: [] as string[], thickness: [] as string[], density: [] as string[] };

export default function BulkTagger() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectNote, setSelectNote] = useState<string | null>(null);

  const [fit, setFit] = useState<Record<"curl" | "thickness" | "density", string[]>>(EMPTY_AXES);
  const [avoid, setAvoid] = useState<Record<"curl" | "thickness" | "density", string[]>>(EMPTY_AXES);

  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const loadProducts = () => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/products")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        return body.products as Product[];
      })
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };
  useEffect(loadProducts, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.product_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, statusFilter]);

  const toggleSelect = (id: number) => {
    setSelectNote(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECT) {
          setSelectNote(`한 번에 ${MAX_SELECT}개까지만 됩니다.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectNote(null);
    const ids = filtered.map((p) => p.id).slice(0, MAX_SELECT);
    setSelected(new Set(ids));
    if (filtered.length > MAX_SELECT) {
      setSelectNote(`화면에 ${filtered.length}개가 있지만 한 번에 ${MAX_SELECT}개까지만 선택했습니다.`);
    }
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectNote(null);
  };

  const toggleAxis =
    (setter: typeof setFit) => (axis: "curl" | "thickness" | "density", value: string) => {
      setResult(null);
      setter((prev) => {
        const cur = prev[axis];
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        return { ...prev, [axis]: next };
      });
    };

  const fitCombos = useMemo(
    () => expandCoreKeyCombos(fit.curl, fit.thickness, fit.density),
    [fit],
  );
  const avoidCombos = useMemo(
    () => expandCoreKeyCombos(avoid.curl, avoid.thickness, avoid.density),
    [avoid],
  );

  const fitIsEmpty = fit.curl.length === 0 && fit.thickness.length === 0 && fit.density.length === 0;

  const apply = async () => {
    if (selected.size === 0) {
      setApplyError("먼저 상품을 선택하세요.");
      return;
    }
    const n = selected.size;
    const ok = window.confirm(
      `상품 ${n}개의 기존 태그를 지우고 새로 덮어씁니다. 진행할까요?`,
    );
    if (!ok) return;

    setApplying(true);
    setApplyError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/products/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_ids: Array.from(selected),
          fit_hair_types: fitCombos,
          avoid_hair_types: avoidCombos,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setResult(`${body.updated}개 적용 완료. 매칭 미리보기에서 확인하세요.`);
      clearSelection();
      loadProducts();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-serif text-2xl font-bold text-cream">일괄 태깅</h1>
        <p className="mt-1 text-sm text-cream/40">
          여러 상품을 골라 모발 타입(fit/avoid)을 한 번에 지정합니다. 매칭 규칙은 그대로이며, 이 화면은 대량 클릭을 대신 눌러주는 도구입니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* ── 왼쪽: 상품 고르기 ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제품명 검색"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | ProductStatus)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-cream focus:border-gold/40 focus:outline-none"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-neutral-900">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-cream/70 hover:bg-white/[0.08]"
              >
                현재 화면 전체 선택
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-cream/45 hover:text-cream/80"
              >
                선택 해제
              </button>
              <span className="ml-auto text-xs text-cream/50">
                선택 {selected.size} / 표시 {filtered.length}
              </span>
            </div>
            {selectNote && <p className="mt-2 text-[11px] text-amber-300/90">{selectNote}</p>}

            <div className="mt-4 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
              {loading && !products && (
                <p className="py-8 text-center text-sm text-cream/40">불러오는 중…</p>
              )}
              {error && <p className="py-4 text-sm text-red-300">{error}</p>}
              {products && filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-cream/40">조건에 맞는 상품이 없습니다.</p>
              )}
              {filtered.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${
                      checked ? "border-gold/40 bg-gold/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(p.id)}
                      className="h-4 w-4 accent-gold"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-cream/85">{p.product_name}</span>
                    {p.category && (
                      <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-cream/50">
                        {p.category}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] text-cream/35">
                      {STATUS_FILTERS.find((s) => s.value === p.status)?.label ?? p.status}
                      {p.fit_hair_types && p.fit_hair_types.length > 0 ? ` · fit ${p.fit_hair_types.length}` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── 오른쪽: 축 고르기 + 적용 ── */}
          <div className="h-fit space-y-4">
            {/* 노출(fit) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-cream/85">노출할 타입 (fit)</p>
              <div className="mt-3">
                <AxisPicker selected={fit} onToggle={toggleAxis(setFit)} ignoreHint="안 고르면 = 상관없음" />
              </div>
              <div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.06] px-3.5 py-3">
                {fitIsEmpty ? (
                  <p className="text-sm font-semibold text-gold-light">전체 노출 — 모든 손님에게 보입니다</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gold-light">
                      {TOTAL_CORE_KEY_COUNT}개 타입 중 {fitCombos.length}개에게 노출됩니다
                    </p>
                    <p className="mt-0.5 text-xs text-cream/60">{describeFit(fit.curl, fit.thickness, fit.density)}</p>
                  </>
                )}
              </div>
            </div>

            {/* 제외(avoid) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-cream/85">제외할 타입 (avoid)</p>
              <p className="mt-1 text-[11px] text-cream/35">제외가 노출보다 우선합니다.</p>
              <div className="mt-3">
                <AxisPicker selected={avoid} onToggle={toggleAxis(setAvoid)} ignoreHint="안 고르면 = 제외 없음" />
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2">
                <p className="text-xs text-cream/55">
                  {avoidCombos.length === 0
                    ? "제외 없음"
                    : `${avoidCombos.length}개 타입을 제외합니다`}
                </p>
              </div>
            </div>

            {/* 적용 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <button
                type="button"
                onClick={apply}
                disabled={applying || selected.size === 0}
                className="w-full rounded-xl border border-gold/30 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/25 disabled:opacity-40"
              >
                {applying ? "적용 중…" : `선택한 ${selected.size}개 상품에 적용`}
              </button>
              {applyError && <p className="mt-3 text-xs text-red-300">{applyError}</p>}
              {result && (
                <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-3.5 py-3">
                  <p className="text-sm text-emerald-200">{result}</p>
                  <Link
                    href="/admin/matching-preview"
                    className="mt-1.5 inline-block text-xs font-medium text-gold-light hover:underline"
                  >
                    → 매칭 미리보기 열기
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
