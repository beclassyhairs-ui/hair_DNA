"use client";

// ============================================================================
// 어뷰티 — 마이헤어 다이어리 (`/myhair`)
// 과거 진단 결과와 다이어리가 저장되는 개인 보관함. 하단 탭바 "마이헤어"의 목적지.
// 지금은 뼈대(더미 기록) — 실 연동 시 카카오 로그인 세션 기준으로 저장된
// 진단 이력 목록으로 대체.
//
// 참고: 기존 `/my-diary`(로컬스토리지 기반 스타일 진단 기록)와 개념이 겹치지만,
// 이번 작업 범위에는 통합/정리가 포함되지 않아 별개로 둔다.
// ============================================================================

import AppShell from "../components/layout/AppShell";

const userName = "지환";

const DIAGNOSIS_HISTORY = [
  { id: "1", date: "2026-07-05", type: "AI 헤어 분석", summary: "곱슬모 · 정수리 부스스함 · 앞머리 갈라짐" },
  { id: "2", date: "2026-06-20", type: "헤어 MBTI", summary: "볼륨 처짐 · 손상모 경향" },
];

function HistoryCard({ item }: { item: (typeof DIAGNOSIS_HISTORY)[number] }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-2">
          {item.type}
        </span>
        <span className="text-[11px] text-ink-2">{item.date}</span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">{item.summary}</p>
    </div>
  );
}

export default function MyHairPage() {
  return (
    <AppShell>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <p className="text-[11px] font-semibold tracking-wide text-ink-2">마이헤어 다이어리</p>
        <h1 className="mt-1 text-[19px] font-bold tracking-tight text-ink">{userName}님의 헤어 기록</h1>
      </div>

      <div>
        <h2 className="text-[15px] font-bold tracking-tight text-ink">나의 지난 진단 기록</h2>
        <div className="mt-3 space-y-3">
          {DIAGNOSIS_HISTORY.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
