"use client";

// ============================================================================
// 어뷰티 어드민 — 제품 관리(Product CMS)
// /api/admin/products(GET/POST), /api/admin/products/[id](PUT/DELETE)를 통해
// products 테이블을 CRUD한다. 이미지는 Supabase 용량을 아끼기 위해 파일 업로드
// 없이 외부 이미지 URL 붙여넣기만 지원한다.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import type {
  Product,
  ProductInput,
  ProductStatus,
  ProductImageStatus,
  ProductImageSource,
} from "../../../lib/products";

const EMPTY_FORM = {
  product_name: "",
  category: "",
  image_url: "",
  buy_link: "",
  status: "draft" as ProductStatus,
  image_status: "needs_review" as ProductImageStatus,
  image_source: "" as ProductImageSource | "",   // "" = 미설정 → 전송 시 undefined
  image_alt: "",
  image_note: "",
};

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "초안" },
  { value: "review", label: "검토중" },
  { value: "approved", label: "승인" },
  { value: "hidden", label: "숨김" },
];

const IMAGE_STATUS_OPTIONS: { value: ProductImageStatus; label: string }[] = [
  { value: "needs_image", label: "이미지 필요" },
  { value: "needs_review", label: "검수 대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

const IMAGE_SOURCE_OPTIONS: { value: ProductImageSource; label: string }[] = [
  { value: "official", label: "공식" },
  { value: "affiliate", label: "제휴" },
  { value: "seller", label: "판매자" },
  { value: "manual_upload", label: "직접 업로드" },
  { value: "placeholder", label: "임시" },
  { value: "unknown", label: "미상" },
];

const STATUS_BADGE: Record<ProductStatus, string> = {
  draft: "bg-white/[0.06] text-cream/45",
  review: "bg-amber-400/15 text-amber-200",
  approved: "bg-emerald-400/15 text-emerald-200",
  hidden: "bg-white/[0.03] text-cream/25",
};

const IMAGE_STATUS_BADGE: Record<ProductImageStatus, string> = {
  needs_image: "bg-red-400/15 text-red-200",
  needs_review: "bg-amber-400/15 text-amber-200",
  approved: "bg-emerald-400/15 text-emerald-200",
  rejected: "bg-red-400/15 text-red-200",
};

const statusLabel = (v: ProductStatus) =>
  STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
const imageStatusLabel = (v: ProductImageStatus) =>
  IMAGE_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;

export default function ProductManager() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingId !== null;

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

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTagsInput("");
    setFormError(null);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      product_name: p.product_name,
      category: p.category ?? "",
      image_url: p.image_url ?? "",
      buy_link: p.buy_link ?? "",
      status: p.status ?? "draft",
      image_status: p.image_status ?? "needs_review",
      image_source: p.image_source ?? "",
      image_alt: p.image_alt ?? "",
      image_note: p.image_note ?? "",
    });
    setTagsInput((p.concern_tags ?? []).join(", "));
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim()) {
      setFormError("제품명은 필수입니다.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload: ProductInput = {
      product_name: form.product_name.trim(),
      category: form.category.trim(),
      concern_tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      image_url: form.image_url.trim(),
      buy_link: form.buy_link.trim(),
      status: form.status,
      image_status: form.image_status,
      // 미설정("")은 DB CHECK 제약(빈 문자열 거부)에 걸리므로 아예 전송하지 않는다.
      image_source: form.image_source || undefined,
      image_alt: form.image_alt.trim(),
      image_note: form.image_note.trim(),
    };

    try {
      const url    = isEditing ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      resetForm();
      loadProducts();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`"${p.product_name}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;

    const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      alert(`삭제 실패: ${body?.error ?? res.status}`);
      return;
    }
    if (editingId === p.id) resetForm();
    loadProducts();
  };

  const sortedProducts = useMemo(
    () => [...(products ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [products],
  );

  return (
    <div className="px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="font-serif text-2xl font-bold text-cream">제품 관리</h1>
          <p className="mt-1 text-sm text-cream/40">
            헤어 고민 해결 커머스 제품을 등록·수정·삭제합니다.
            {products && <span className="ml-2 text-cream/30">총 {products.length}개</span>}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          {/* 등록/수정 폼 */}
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cream/85">
                {isEditing ? "제품 수정" : "새 제품 등록"}
              </h2>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-cream/40 hover:text-cream/70"
                >
                  취소
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3.5">
              <label className="block">
                <span className="text-xs font-medium text-cream/50">제품명 *</span>
                <input
                  value={form.product_name}
                  onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                  placeholder="예: 모카 스칼프 세럼"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-cream/50">카테고리</span>
                <input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="예: 두피케어, 트리트먼트"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-cream/50">고민 태그 (쉼표로 구분)</span>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="예: 탈모, 곱슬, 손상모"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-cream/50">제품 이미지 URL</span>
                <div className="mt-1.5 flex items-center gap-3">
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.image_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 text-[9px] text-cream/25">
                      미리보기
                    </div>
                  )}
                  <input
                    value={form.image_url}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-cream/30">
                  파일 업로드는 지원하지 않습니다 — 제품 이미지가 올라가 있는 외부 링크(쇼핑몰, CDN 등)를 복사해 붙여넣으세요.
                </p>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-cream/50">구매 링크</span>
                <input
                  value={form.buy_link}
                  onChange={(e) => setForm((f) => ({ ...f, buy_link: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-cream/50">공개 상태</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream focus:border-gold/40 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-neutral-900">
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-cream/30">
                  공개 노출은 <span className="text-emerald-200/80">승인</span> + 이미지 <span className="text-emerald-200/80">승인</span>일 때만 됩니다.
                </p>
              </label>

              {/* ── 이미지 검수 ─────────────────────────────── */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <p className="text-xs font-semibold text-cream/60">이미지 검수</p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-medium text-cream/45">검수 상태</span>
                    <select
                      value={form.image_status}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, image_status: e.target.value as ProductImageStatus }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-cream focus:border-gold/40 focus:outline-none"
                    >
                      {IMAGE_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-neutral-900">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-medium text-cream/45">이미지 출처</span>
                    <select
                      value={form.image_source}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, image_source: e.target.value as ProductImageSource | "" }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-cream focus:border-gold/40 focus:outline-none"
                    >
                      <option value="" className="bg-neutral-900">미설정</option>
                      {IMAGE_SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-neutral-900">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="text-[11px] font-medium text-cream/45">대체 텍스트 (alt)</span>
                  <input
                    value={form.image_alt}
                    onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
                    placeholder="예: 갈색 유리병 두피 세럼 정면"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="text-[11px] font-medium text-cream/45">내부 검수 메모 (유저 비노출)</span>
                  <textarea
                    value={form.image_note}
                    onChange={(e) => setForm((f) => ({ ...f, image_note: e.target.value }))}
                    rows={2}
                    placeholder="예: 공식몰 이미지 저작권 확인 필요"
                    className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {formError && <p className="mt-3 text-xs text-red-300">{formError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-xl border border-gold/30 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/25 disabled:opacity-50"
            >
              {saving ? "저장 중…" : isEditing ? "수정 저장" : "제품 등록"}
            </button>
          </form>

          {/* 제품 리스트 */}
          <div>
            {loading && !products && (
              <div className="flex min-h-[200px] items-center justify-center text-cream/40">
                제품 목록 불러오는 중…
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {products && products.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-cream/40">
                등록된 제품이 없습니다. 왼쪽 폼에서 첫 제품을 등록해보세요.
              </div>
            )}

            {sortedProducts.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sortedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.product_name}
                        className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/15 text-[10px] text-cream/25">
                        이미지 없음
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-cream">{p.product_name}</p>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="rounded-lg px-2 py-1 text-[11px] font-medium text-cream/50 hover:bg-white/[0.06] hover:text-cream/80"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="rounded-lg px-2 py-1 text-[11px] font-medium text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[p.status] ?? "bg-white/[0.06] text-cream/45"}`}>
                          {statusLabel(p.status)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${IMAGE_STATUS_BADGE[p.image_status] ?? "bg-white/[0.06] text-cream/45"}`}>
                          이미지 · {imageStatusLabel(p.image_status)}
                        </span>
                        {p.category && (
                          <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] text-gold-light">
                            {p.category}
                          </span>
                        )}
                      </div>

                      {p.concern_tags && p.concern_tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {p.concern_tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-cream/50">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {p.buy_link && (
                        <a
                          href={p.buy_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 block truncate text-[11px] text-gold-light/80 hover:underline"
                        >
                          {p.buy_link}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
