"use client";

// ============================================================================
// /admin/coupang-check — 쿠팡 링크 점검 페이지
//
// 목적: 폰으로 위에서부터 '열기'를 하나씩 눌러 21개 쿠팡 파트너스 링크가 살아있는지
//   손으로 확인하는 용도. 서버 curl 은 쿠팡 anti-bot(403) 때문에 링크 생사 판정이
//   불가능해(PROJECT_STATE 기록), 사람이 실제 브라우저로 여는 수밖에 없다.
//
// ★ config 직결: lib/coupangCards.ts 의 STYLE_CARDS + DAMAGE_CARDS 를 직접 읽어 나열한다.
//   제품이 추가/삭제/링크 교체되면 이 화면이 자동으로 최신 목록을 반영한다(별도 데이터 없음).
//   g 코드가 스타일·데미지 양쪽에 있는 카드(G05 등)는 한 줄로 합치고 노출면을 배지로 표시.
//
// '확인함' 체크는 localStorage(이 브라우저에만) 저장 — 어디까지 눌러봤는지 표시용일 뿐,
//   서비스/서버와 무관하다(체크해도 노출 여부는 안 바뀐다).
// ============================================================================

import { useEffect, useState } from "react";
import { STYLE_CARDS, DAMAGE_CARDS, COUPANG_CARDS_LIVE } from "@/lib/coupangCards";

type Surface = "style" | "damage";

interface MergedCard {
  g: string;
  name: string;
  reason: string;
  emoji: string;
  link: string;
  surfaces: Surface[];
  parked: boolean;
}

// STYLE_CARDS + DAMAGE_CARDS 를 g 기준으로 합친다(중복 g 는 노출면만 누적).
function buildMergedCards(): MergedCard[] {
  const byG = new Map<string, MergedCard>();

  const add = (
    c: { g: string; name: string; reason: string; emoji: string; link: string; parked?: boolean },
    surface: Surface,
  ) => {
    const existing = byG.get(c.g);
    if (existing) {
      if (!existing.surfaces.includes(surface)) existing.surfaces.push(surface);
      existing.parked = existing.parked && (c.parked ?? false); // 한 면이라도 실노출이면 보류 아님
      return;
    }
    byG.set(c.g, {
      g: c.g, name: c.name, reason: c.reason, emoji: c.emoji, link: c.link,
      surfaces: [surface], parked: c.parked ?? false,
    });
  };

  STYLE_CARDS.forEach((c) => add(c, "style"));
  DAMAGE_CARDS.forEach((c) => add(c, "damage"));

  // g 코드 오름차순(G01, G02…)으로 정렬 — 폰에서 순서대로 확인하기 좋게.
  return Array.from(byG.values()).sort((a, b) => a.g.localeCompare(b.g));
}

const CHECK_KEY = (g: string) => `abeauty:coupang-check:${g}`;

function SurfaceBadge({ surface }: { surface: Surface }) {
  const isStyle = surface === "style";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        isStyle ? "bg-sky-500/15 text-sky-300/80" : "bg-rose-500/15 text-rose-300/80"
      }`}
    >
      {isStyle ? "스타일" : "데미지"}
    </span>
  );
}

export default function CoupangCheckPage() {
  const cards = buildMergedCards();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // 마운트 시 localStorage 에서 체크 상태 복원(하이드레이션 안전: 첫 렌더는 빈 상태).
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const c of cards) {
      try { if (localStorage.getItem(CHECK_KEY(c.g)) === "1") next[c.g] = true; } catch { /**/ }
    }
    setChecked(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (g: string) => {
    setChecked((prev) => {
      const value = !prev[g];
      try {
        if (value) localStorage.setItem(CHECK_KEY(g), "1");
        else localStorage.removeItem(CHECK_KEY(g));
      } catch { /**/ }
      return { ...prev, [g]: value };
    });
  };

  const doneCount = cards.filter((c) => checked[c.g]).length;

  return (
    <div className="px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl font-bold text-cream">쿠팡 링크 점검</h1>
          <p className="text-sm tabular-nums text-cream/45">
            확인 {doneCount} / {cards.length}
          </p>
        </div>
        <p className="mt-1 text-sm text-cream/45">
          폰에서 위에서부터 <b className="text-cream/70">열기</b>를 눌러 링크가 정상인지 확인하세요.
          목록은 <code className="text-cream/60">lib/coupangCards.ts</code>와 직결 — 제품이 바뀌면 자동 반영됩니다.
        </p>

        {/* 라이브 상태 안내 — 링크 점검과 실노출은 별개임을 명시(혼동 방지). */}
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
            COUPANG_CARDS_LIVE
              ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300/80"
              : "border-amber-500/25 bg-amber-500/[0.07] text-amber-300/80"
          }`}
        >
          {COUPANG_CARDS_LIVE
            ? "현재 COUPANG_CARDS_LIVE = true — 결과지에 카드가 노출 중입니다."
            : "현재 COUPANG_CARDS_LIVE = false — 결과지에 카드가 안 뜹니다(점검은 가능)."}
          <br />
          <span className="text-cream/35">
            아래 &ldquo;보류&rdquo; 표시 카드는 링크는 있지만 결과지에 노출되지 않습니다(문항 신설 시 노출).
            체크 표시는 이 브라우저에만 저장되며 노출 여부와 무관합니다.
          </span>
        </div>

        <ol className="mt-5 space-y-2.5">
          {cards.map((c, i) => (
            <li
              key={c.g}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                checked[c.g] ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm tabular-nums text-cream/30">{i + 1}</span>
              <span className="shrink-0 text-xl" aria-hidden>{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-cream/35">{c.g}</span>
                  <span className="font-semibold text-cream/90">{c.name}</span>
                  {c.surfaces.map((s) => <SurfaceBadge key={s} surface={s} />)}
                  {c.parked && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-cream/45">보류</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-cream/45">{c.reason}</p>
              </div>
              <a
                href={c.link}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="shrink-0 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-light transition-colors hover:bg-gold/20"
              >
                열기 ↗
              </a>
              <label className="flex shrink-0 cursor-pointer items-center" title="확인함">
                <input
                  type="checkbox"
                  checked={!!checked[c.g]}
                  onChange={() => toggle(c.g)}
                  className="h-5 w-5 cursor-pointer accent-emerald-500"
                />
              </label>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
