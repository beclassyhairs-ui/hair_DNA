"use client";

// ============================================================================
// 어뷰티 어드민 — 기간별 5단계 퍼널 + UTM 분해
//
// 집계는 전부 /api/admin/funnel(관리자 게이트 안쪽 서버)에서 수행한다. 이 화면은
// 계산된 숫자만 받아 그린다 — 원본 이벤트 행은 브라우저로 내려오지 않는다.
//
// 이 패널의 목적은 하나다: "조회수 1만당 구매 N건" 계수를 바로 읽는 것.
// ============================================================================

import { useEffect, useState } from "react";

type Range = "today" | "7d" | "30d";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "7d",    label: "7일" },
  { value: "30d",   label: "30일" },
];

interface StageStat {
  key: string;
  label: string;
  users: number;
  stepRate: number | null;
  overallRate: number | null;
}

interface Breakdown {
  key: string;
  views: number;
  completes: number;
  productClicks: number;
  purchases: number;
  purchasesPer10k: number | null;
}

interface FunnelResponse {
  ok: true;
  range: Range;
  since: string;
  eventCount: number;
  truncated: boolean;
  stages: StageStat[];
  purchasesPer10kViews: number | null;
  bySource: Breakdown[];
  byCampaign: Breakdown[];
}

const num = (n: number) => n.toLocaleString("ko-KR");
const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);

/** 조회수 1만당 구매 건수 — 소수점 1자리까지(0.4건 같은 값이 뭉개지지 않게). */
const per10k = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}건`);

function SectionHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="h-4 w-1 rounded-full bg-gold" />
      <h2 className="text-sm font-semibold text-cream/85">{title}</h2>
      {caption && <span className="text-[11px] text-cream/30">{caption}</span>}
    </div>
  );
}

/** utm_source / utm_campaign 분해 표 — 컬럼 구성이 같아 하나로 공용. */
function BreakdownTable({ rows, keyLabel }: { rows: Breakdown[]; keyLabel: string }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-cream/35">
        이 기간에 집계된 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-cream/40">
            <th className="px-4 py-3 font-medium">{keyLabel}</th>
            <th className="px-4 py-3 font-medium">유입</th>
            <th className="px-4 py-3 font-medium">진단 완료</th>
            <th className="px-4 py-3 font-medium">상품 클릭</th>
            <th className="px-4 py-3 font-medium">구매</th>
            <th className="px-4 py-3 font-medium">1만당 구매</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-white/5 last:border-0 odd:bg-white/[0.015]">
              <td className="px-4 py-3 font-medium text-cream/90">{r.key}</td>
              <td className="px-4 py-3 tabular-nums text-cream/80">{num(r.views)}</td>
              <td className="px-4 py-3 tabular-nums text-cream/80">{num(r.completes)}</td>
              <td className="px-4 py-3 tabular-nums text-cream/80">{num(r.productClicks)}</td>
              <td className="px-4 py-3 tabular-nums font-semibold text-cream">{num(r.purchases)}</td>
              <td className="px-4 py-3 tabular-nums font-semibold text-gold-light">{per10k(r.purchasesPer10k)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FunnelPanel() {
  const [range, setRange]     = useState<Range>("7d");
  const [data, setData]       = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/funnel?range=${range}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        return body as FunnelResponse;
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [range]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          title="기간별 퍼널"
          caption="유입 → 진단 시작 → 진단 완료 → 상품 클릭 → 구매 (고유 유저 기준)"
        />
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setRange(o.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                range === o.value
                  ? "bg-gold/20 text-gold-light"
                  : "text-cream/45 hover:bg-white/[0.05] hover:text-cream/70"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-xs text-red-300/80">
          퍼널 집계를 불러오지 못했습니다: {error}
        </div>
      )}

      {loading && !data && (
        <p className="mt-3 rounded-2xl border border-white/10 px-4 py-6 text-center text-xs text-cream/35">
          집계 중…
        </p>
      )}

      {data && (
        <>
          {/* 핵심 계수 — 이 화면의 존재 이유 */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gold/25 bg-gold/[0.07] px-5 py-4">
              <p className="text-xs font-medium text-gold-light/70">조회수 1만당 구매</p>
              <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-gold-light">
                {per10k(data.purchasesPer10kViews)}
              </p>
              <p className="mt-1 text-[11px] text-cream/35">구매 클릭 / 유입 × 10,000</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-xs font-medium text-cream/50">유입 → 구매 전환율</p>
              <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-cream">
                {pct(data.stages[4]?.overallRate ?? null)}
              </p>
              <p className="mt-1 text-[11px] text-cream/35">최종 단계 / 최초 유입</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <p className="text-xs font-medium text-cream/50">집계 이벤트</p>
              <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-cream">{num(data.eventCount)}</p>
              <p className="mt-1 text-[11px] text-cream/35">
                {new Date(data.since).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} 이후
              </p>
            </div>
          </div>

          {/* 상한에 걸려 잘렸으면 숫자를 "전부"로 오해하지 않도록 명시 */}
          {data.truncated && (
            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5 text-[11px] text-amber-300/80">
              이 기간의 이벤트가 조회 상한(25,000행)을 넘습니다 — 아래 숫자는 실제보다 작습니다.
              기간을 좁혀서 보세요.
            </p>
          )}

          {/* 5단계 퍼널 */}
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-cream/40">
                  <th className="px-4 py-3 font-medium">단계</th>
                  <th className="px-4 py-3 font-medium">고유 유저</th>
                  <th className="px-4 py-3 font-medium">직전 단계 대비</th>
                  <th className="px-4 py-3 font-medium">최초 유입 대비</th>
                </tr>
              </thead>
              <tbody>
                {data.stages.map((s, i) => (
                  <tr key={s.key} className="border-b border-white/5 last:border-0 odd:bg-white/[0.015]">
                    <td className="px-4 py-3">
                      <span className="mr-2 text-[11px] tabular-nums text-cream/30">{i + 1}</span>
                      <span className="font-medium text-cream/90">{s.label}</span>
                      <div className="mt-0.5 text-[11px] text-cream/30">{s.key}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-cream">{num(s.users)}</td>
                    <td className="px-4 py-3">
                      {s.stepRate === null ? (
                        <span className="text-cream/25">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gold/15">
                            <div
                              className="h-full rounded-full bg-gold"
                              style={{ width: `${Math.max(0, Math.min(100, s.stepRate))}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-xs font-medium text-gold-light">{pct(s.stepRate)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-cream/70">{pct(s.overallRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* UTM 분해 */}
          <div className="mt-8">
            <SectionHeading title="유입 채널별 (utm_source)" caption="first-touch 기준" />
            <div className="mt-3">
              <BreakdownTable rows={data.bySource} keyLabel="Source" />
            </div>
          </div>

          <div className="mt-8">
            <SectionHeading title="캠페인별 (utm_campaign)" caption="어느 쇼츠·게시물이 실제 구매로 이어졌는지" />
            <div className="mt-3">
              <BreakdownTable rows={data.byCampaign} keyLabel="Campaign" />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
