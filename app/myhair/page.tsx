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

const userName = "고객"; // 로그인 전 기본 호칭 통일("고객님"). 실명 연결은 WORKORDER-01.

const DIAGNOSIS_HISTORY = [
  { id: "1", date: "2026-07-05", type: "AI 헤어 분석", summary: "곱슬모 · 정수리 부스스함 · 앞머리 갈라짐" },
  { id: "2", date: "2026-06-20", type: "헤어 MBTI", summary: "볼륨 처짐 · 손상모 경향" },
];

// 진단 기록 한 줄 — 흰 카드/그림자 없이 선 구분 리스트(5-B).
// 한 줄 = [뱃지(--soft 톤)] + [요약] + [날짜]. 항목 사이 얇은 선(--line).
function HistoryRow({ item }: { item: (typeof DIAGNOSIS_HISTORY)[number] }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-line py-4 first:border-t last:border-b-0">
      <div className="min-w-0">
        <span className="inline-flex rounded-pill bg-soft px-2.5 py-1 text-aux font-medium text-sub">
          {item.type}
        </span>
        <p className="mt-2 text-body leading-relaxed text-ink">{item.summary}</p>
      </div>
      <span className="shrink-0 pt-1 text-aux text-sub">{item.date}</span>
    </li>
  );
}

export default function MyHairPage() {
  return (
    <AppShell>
      {/* 배너 카드 제거 → 명조 제목만(5-B). 히어로 이미지는 다음 라운드. */}
      <header>
        <h1 className="font-serif text-h1 text-ink">{userName}님의 헤어 기록</h1>
        <p className="mt-1 text-aux text-sub">지난 진단 기록 {DIAGNOSIS_HISTORY.length}건</p>
      </header>

      <ul>
        {DIAGNOSIS_HISTORY.map((item) => (
          <HistoryRow key={item.id} item={item} />
        ))}
      </ul>
    </AppShell>
  );
}
