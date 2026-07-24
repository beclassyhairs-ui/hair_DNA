"use client";

// ============================================================================
// A-3 시술 이력 — "칸만" 심는 단계.
//
// 저장·회수만 한다. 시술 주기 알림 · 손상 경고 · 재구매 트리거는 의도적으로
// 만들지 않았다(첫 손님 데이터를 보고 확장할 영역). 여기에 그런 로직을 붙이기
// 전에 반드시 사업주와 합의할 것.
//
// 저장소는 lib/beautyProfile의 addTreatmentRecord/readTreatmentHistory를 쓴다
// (프로필에 얹혀 저장되고, 진단 재합산 시에도 보존된다).
// ============================================================================

import { useEffect, useState } from "react";
import {
  addTreatmentRecord,
  readTreatmentHistory,
  type TreatmentRecord,
} from "@/lib/beautyProfile";

export default function TreatmentHistoryField({ className = "" }: { className?: string }) {
  const [history, setHistory] = useState<TreatmentRecord[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setHistory(readTreatmentHistory());
  }, []);

  function handleAdd() {
    const type = draft.trim();
    if (!type) return;
    const today = new Date().toISOString().slice(0, 10);
    setHistory(addTreatmentRecord({ date: today, type }));
    setDraft("");
  }

  return (
    <section className={`rounded-card border border-line bg-card px-4 py-4 ${className}`}>
      <p className="text-aux font-semibold text-ink">시술 이력</p>
      <p className="mt-1 text-aux text-ink-2">
        펌·염색·클리닉처럼 기억해두고 싶은 시술을 적어두세요.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="예: 뿌리펌"
          aria-label="시술 이력 입력"
          className="min-h-[48px] flex-1 rounded-btn border border-line bg-bg px-3.5 text-body text-ink outline-none transition-colors focus:border-ink"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="min-h-[48px] shrink-0 px-3 text-body font-bold text-ink transition-opacity disabled:opacity-40"
        >
          추가
        </button>
      </div>

      {history.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {history.map((record, i) => (
            <li key={`${record.date ?? ""}-${record.type ?? ""}-${i}`} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-body text-ink">{record.type}</span>
              {record.date && <span className="shrink-0 text-aux text-ink-2">{record.date}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
