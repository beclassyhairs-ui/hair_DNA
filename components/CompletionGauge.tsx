"use client";

// ============================================================================
// A-1 완성도 게이지 — 헤어 프로필이 얼마나 채워졌는지 4칸으로 보여준다.
//
// 진단 4종(style/damage/bangs/hairquiz) 중 "서로 다른 kind를 몇 개 완료했는지"가
// 완성도다. 판별·집계는 lib/beautyProfile의 getCompletedKinds를 그대로 쓴다
// (kind 누락 = style 규칙까지 동일). 여기서 다시 계산하지 않는다.
//
// localStorage는 클라이언트에만 있으므로 첫 렌더는 0칸으로 그리고(SSR과 동일)
// 마운트 후 실제 값으로 채운다 — 하이드레이션 불일치 방지.
// ============================================================================

import { useEffect, useState } from "react";
import {
  ALL_DIAGNOSIS_KINDS,
  DIAGNOSIS_KIND_LABEL,
  getCompletedKinds,
  readDiaryEntries,
  type DiagnosisKind,
} from "@/lib/beautyProfile";

export default function CompletionGauge({ className = "" }: { className?: string }) {
  const [completed, setCompleted] = useState<DiagnosisKind[]>([]);

  useEffect(() => {
    setCompleted(getCompletedKinds(readDiaryEntries()));
  }, []);

  const total = ALL_DIAGNOSIS_KINDS.length; // 4
  const doneCount = completed.length;
  const percent = Math.round((doneCount / total) * 100);
  const isComplete = doneCount >= total;

  return (
    <section
      className={`rounded-card border border-line bg-card px-4 py-3.5 ${className}`}
      aria-label="헤어 프로필 완성도"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-aux text-ink-2">헤어 프로필 완성도</p>
        {isComplete ? (
          <span className="rounded-pill bg-ink px-2.5 py-0.5 text-[11px] font-bold text-white">
            프로필 완성
          </span>
        ) : (
          <span className="text-aux font-semibold tabular-nums text-ink">{percent}%</span>
        )}
      </div>

      {/* 4칸 진행바 — 칸 수 = 진단 종류 수 */}
      <div className="mt-2.5 flex gap-1.5" role="img" aria-label={`4개 중 ${doneCount}개 완료`}>
        {ALL_DIAGNOSIS_KINDS.map((kind) => {
          const filled = completed.includes(kind);
          return (
            <span
              key={kind}
              title={DIAGNOSIS_KIND_LABEL[kind]}
              className={`h-1.5 flex-1 rounded-pill transition-colors ${filled ? "bg-ink" : "bg-surface"}`}
            />
          );
        })}
      </div>

      <p className="mt-2 text-aux text-ink-2">
        {isComplete
          ? "네 가지 진단을 모두 마쳤어요. 추천이 가장 정확해집니다."
          : `진단 ${total}종 중 ${doneCount}개 완료 · 더 채울수록 추천이 정확해져요`}
      </p>
    </section>
  );
}
