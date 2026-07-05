"use client";

// ============================================================================
// 어뷰티 — 어드민 대시보드
// Supabase `events` 테이블의 실데이터를 /api/admin/events(서버, service_role 키)를
// 통해 읽어와 KPI/퍼널/타임라인으로 집계한다. 브라우저는 anon key로 이 테이블을
// 직접 조회할 수 없으므로(RLS), 반드시 이 서버 라우트를 거쳐야 한다.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EVENT_NAMES, type StoredEvent } from "../../lib/eventTracking";

const LANDING_LABELS: Record<string, string> = {
  mbti_test: "헤어 MBTI 테스트",
  bang_test: "인생 앞머리 테스트",
  diagnosis_default: "기본 진단",
};

const EVENT_LABELS: Record<string, string> = {
  [EVENT_NAMES.LANDING_VIEW]:       "랜딩 진입",
  [EVENT_NAMES.DIAGNOSIS_START]:    "진단 시작",
  [EVENT_NAMES.ANSWER_SELECTED]:    "문항 답변",
  [EVENT_NAMES.DIAGNOSIS_COMPLETE]: "진단 완료",
  [EVENT_NAMES.PRODUCT_CLICKED]:    "제품 클릭",
  [EVENT_NAMES.LOGIN_CLICKED]:      "로그인 클릭",
};

const FUNNEL_STAGES = [
  { key: EVENT_NAMES.LANDING_VIEW,       label: "유입" },
  { key: EVENT_NAMES.DIAGNOSIS_START,    label: "시작" },
  { key: EVENT_NAMES.DIAGNOSIS_COMPLETE, label: "완료" },
  { key: EVENT_NAMES.PRODUCT_CLICKED,    label: "제품클릭" },
] as const;

const GOLD_RAMP = ["#E4D2A8", "#D9BE86", "#C8A86B", "#A8884A"];

// ─── 집계 헬퍼 ────────────────────────────────────────────────────────────────

function uniqueUsers(events: StoredEvent[], eventName: string, landingId?: string): number {
  const ids = new Set(
    events
      .filter((e) => e.event_name === eventName && (!landingId || e.landing_id === landingId))
      .map((e) => e.anonymous_id),
  );
  return ids.size;
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─── 작은 프레젠테이션 컴포넌트 ────────────────────────────────────────────────

function SectionHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="h-4 w-1 rounded-full bg-gold" />
      <h2 className="text-sm font-semibold text-cream/85">{title}</h2>
      {caption && <span className="text-[11px] text-cream/30">{caption}</span>}
    </div>
  );
}

function StatTile({ label, value, caption, accent }: { label: string; value: string; caption?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-cream/50">{label}</p>
        {accent && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />}
      </div>
      <p className="mt-2 font-sans text-3xl font-semibold tabular-nums text-cream">{value}</p>
      {caption && <p className="mt-1 text-[11px] text-cream/35">{caption}</p>}
    </div>
  );
}

/** 퍼널 단계 진행률 미니 바 — 골드 단일 색상(순차 스케일), 트랙은 같은 램프의 옅은 단계 */
function FunnelBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gold/15">
        <div className="h-full rounded-full bg-gold" style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-medium tabular-nums text-gold-light">
        {clamped.toFixed(1)}%
      </span>
    </div>
  );
}

function EventBadge({ eventName }: { eventName: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-cream/70">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      {EVENT_LABELS[eventName] ?? eventName}
    </span>
  );
}

/** 전체 퍼널(유입→시작→완료→제품클릭)을 가로 막대 차트로 시각화 */
function AggregateFunnelChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={72}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(253,251,250,0.55)", fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#1C1A18",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(253,251,250,0.7)" }}
            formatter={(value: number) => [`${formatNumber(value)}명`, "고유 유저"]}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={30}>
            {data.map((_, i) => (
              <Cell key={i} fill={GOLD_RAMP[i % GOLD_RAMP.length]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(v: number) => formatNumber(v)}
              style={{ fill: "rgba(253,251,250,0.85)", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 단계 전환율 배지 */}
      <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
        {data.slice(1).map((stage, i) => (
          <span
            key={stage.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-cream/60"
          >
            {data[i].label} → {stage.label}
            <span className="font-semibold tabular-nums text-gold-light">
              {formatPercent(stage.count, data[i].count)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents]   = useState<StoredEvent[] | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/admin/events")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return body.events as StoredEvent[];
      })
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const landingIds = useMemo(
    () => Array.from(new Set((events ?? []).map((e) => e.landing_id).filter((v): v is string => !!v))),
    [events],
  );

  // 최근 이벤트 타임라인 (최신순 10개)
  const recentEvents = useMemo(
    () => [...(events ?? [])].sort((a, b) => b.event_time.localeCompare(a.event_time)).slice(0, 10),
    [events],
  );

  if (loading && !events) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-cream/40">
        Supabase에서 이벤트 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-950/40 px-6 py-5 text-center">
          <p className="text-sm font-semibold text-red-300">이벤트를 불러오지 못했습니다</p>
          <p className="mt-2 text-xs leading-relaxed text-red-300/70">{error}</p>
          <p className="mt-3 text-xs text-cream/40">
            .env.local의 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 설정과
            supabase/schema.sql 실행 여부를 확인하세요.
          </p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="mt-4 rounded-xl border border-red-400/30 px-4 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!events) return null;

  // KPI 요약
  const totalVisitors  = uniqueUsers(events, EVENT_NAMES.LANDING_VIEW);
  const totalCompleted = uniqueUsers(events, EVENT_NAMES.DIAGNOSIS_COMPLETE);
  const totalProductClicks = events.filter((e) => e.event_name === EVENT_NAMES.PRODUCT_CLICKED).length;
  const avgConversion = formatPercent(totalCompleted, totalVisitors);

  // 전체 퍼널(랜딩 무관 합산)
  const aggregateFunnel = FUNNEL_STAGES.map((stage) => ({
    label: stage.label,
    count: uniqueUsers(events, stage.key),
  }));

  // 랜딩페이지별 퍼널
  const funnelRows = landingIds.map((landingId) => {
    const counts = FUNNEL_STAGES.map((stage) => uniqueUsers(events, stage.key, landingId));
    return { landingId, counts };
  });

  return (
    <div className="px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-cream">대시보드</h1>
            <p className="mt-1 text-sm text-cream/40">
              Supabase 전체 유저 실데이터 · 이벤트 {formatNumber(events.length)}건 기준 집계
              {loading && <span className="ml-2 text-gold-light/70">새로고침 중…</span>}
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-medium text-gold-light transition-colors hover:bg-gold/20"
          >
            ↻ 새로고침
          </button>
        </div>

        {events.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
            <p className="text-sm text-cream/50">아직 Supabase에 쌓인 이벤트가 없습니다.</p>
            <p className="mt-1 text-xs text-cream/30">
              <a href="/mbti" className="text-gold-light hover:underline">헤어 MBTI 테스트</a> 또는{" "}
              <a href="/bangs" className="text-gold-light hover:underline">인생 앞머리 테스트</a>를 진행해보면 여기 데이터가 쌓입니다.
            </p>
          </div>
        )}

        {events.length > 0 && (
          <>
            {/* 1. KPI 요약 카드 */}
            <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="총 방문자 수" value={formatNumber(totalVisitors)} caption="landing_view 고유 anonymous_id" accent="#C8A86B" />
              <StatTile label="총 진단 완료 수" value={formatNumber(totalCompleted)} caption="diagnosis_complete 고유 유저" accent="#C8A86B" />
              <StatTile label="평균 전환율" value={avgConversion} caption="완료 / 방문" accent="#C8A86B" />
              <StatTile label="총 제품 클릭 수" value={formatNumber(totalProductClicks)} caption="product_clicked 이벤트 수" accent="#C8A86B" />
            </section>

            {/* 2. 전체 퍼널 개요 (차트) */}
            <section className="mt-10">
              <SectionHeading title="전체 퍼널 개요" caption="유입 → 시작 → 완료 → 제품 클릭 (전체 랜딩 합산)" />
              <div className="mt-3">
                <AggregateFunnelChart data={aggregateFunnel} />
              </div>
            </section>

            {/* 3. 랜딩페이지별 퍼널 성과 테이블 */}
            <section className="mt-10">
              <SectionHeading title="랜딩페이지별 퍼널 성과" />
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-cream/40">
                      <th className="px-4 py-3 font-medium">Landing ID</th>
                      {FUNNEL_STAGES.map((stage, i) => (
                        <th key={stage.key} className="px-4 py-3 font-medium">
                          {stage.label}
                          {i > 0 && <span className="ml-1 font-normal normal-case text-cream/25">(단계 전환율)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {funnelRows.map(({ landingId, counts }) => (
                      <tr key={landingId} className="border-b border-white/5 last:border-0 odd:bg-white/[0.015]">
                        <td className="px-4 py-3 font-medium text-cream/90">
                          {LANDING_LABELS[landingId] ?? landingId}
                          <div className="text-[11px] font-normal text-cream/35">{landingId}</div>
                        </td>
                        {counts.map((count, i) => (
                          <td key={i} className="px-4 py-3">
                            <div className="font-semibold tabular-nums text-cream">{formatNumber(count)}</div>
                            {i > 0 && (
                              <div className="mt-1">
                                <FunnelBar percent={counts[i - 1] > 0 ? (count / counts[i - 1]) * 100 : 0} />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. 이벤트 로그 실시간 타임라인 */}
            <section className="mt-10 pb-10">
              <SectionHeading title="최근 이벤트" caption="최신 10건" />
              <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
                {recentEvents.map((e, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-[92px] shrink-0 text-xs tabular-nums text-cream/35">
                        {formatEventTime(e.event_time)}
                      </span>
                      <span className="w-[110px] shrink-0 truncate text-xs text-cream/50">{e.anonymous_id}</span>
                      <EventBadge eventName={e.event_name} />
                    </div>
                    <span className="truncate text-xs text-cream/40">
                      {e.product_group_clicked ?? e.result_type ?? e.landing_id ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
