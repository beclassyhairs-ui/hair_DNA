"use client";

// ============================================================================
// 어뷰티 — 마이헤어 (`/myhair`)  [다이어리 통합: /my-diary로 흡수]
//
// ⚠️ 이 페이지는 더미(가짜 기록) 껍데기였고, 실제 저장 기록·AI이미지·상품CTA·
//    시술이력은 전부 /my-diary(실체)에 있다. 다이어리 통합으로 하단탭 "마이헤어"
//    목적지를 /my-diary로 옮기고, 이 경로로 들어오는 손님은 /my-diary로 리다이렉트한다.
//    (아래 REDIRECT_TO_DIARY 플래그가 false가 되면 더미 화면이 다시 렌더 — 코드 보존)
//    더미 데이터·컴포넌트는 삭제하지 않고 그대로 둔다(가짜 2건은 절대 노출 안 됨).
// ============================================================================

import { redirect } from "next/navigation";
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

// 다이어리 통합 후 true. /my-diary(실체)로 흡수됐으므로 이 경로는 리다이렉트한다.
// (: boolean 명시 → 아래 더미 화면이 타입상 도달 가능 → unused/unreachable 경고 없이 보존)
const REDIRECT_TO_DIARY: boolean = true;

export default function MyHairPage() {
  if (REDIRECT_TO_DIARY) redirect("/my-diary");

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
