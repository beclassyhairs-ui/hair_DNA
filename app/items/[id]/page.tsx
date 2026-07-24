// ============================================================================
// 발견템 상세페이지 (/items/[id]) — 서버 컴포넌트
// 공개 조회 헬퍼(fetchApprovedProductById)로 승인 상품만, PUBLIC_PRODUCT_FIELDS
// allowlist로만 조회한다(내부 필드 노출 없음). 없거나 미승인 id는 notFound()로
// 실제 404 처리. 구매 버튼만 클라이언트(ItemBuyButton)로 분리한다.
// ============================================================================

import { notFound } from "next/navigation";
import AppShell from "../../components/layout/AppShell";
import { fetchApprovedProductById } from "../../../lib/publicProducts";
import ItemBuyButton from "./ItemBuyButton";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const item = await fetchApprovedProductById(id);
  if (!item) notFound();

  return (
    <AppShell>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex aspect-square w-full items-center justify-center bg-surface">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.image_alt || item.product_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl">✨</span>
          )}
        </div>

        <div className="p-6">
          <p className="text-[11px] font-semibold tracking-wide text-ink-2">AI 헤어 분석 결과 기반</p>
          <h1 className="mt-1 text-[19px] font-bold tracking-tight text-ink">{item.product_name}</h1>
          {item.category && (
            <span className="mt-2 inline-block rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
              {item.category}
            </span>
          )}

          {item.recommend_reason && (
            <section className="mt-5">
              <h2 className="text-[15px] font-bold text-ink">왜 나에게 맞을까요</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{item.recommend_reason}</p>
            </section>
          )}

          {item.usage_guide && (
            <section className="mt-4">
              <h2 className="text-[15px] font-bold text-ink">사용법</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{item.usage_guide}</p>
            </section>
          )}

          {item.caution_note && (
            <section className="mt-4 rounded-btn border border-line bg-surface p-3.5">
              <h2 className="text-emphasis text-ink">주의사항</h2>
              <p className="mt-1 text-body leading-relaxed text-ink-2">{item.caution_note}</p>
            </section>
          )}

          <div className="mt-6">
            <ItemBuyButton id={item.id} buyLink={item.buy_link} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
