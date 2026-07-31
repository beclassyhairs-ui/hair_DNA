"use client";

// ============================================================================
// InlineCompletion — 완성도 게이지의 "카드 벗긴" 인라인 한 줄 버전.
// 아이보리 리뱀프 카드 다이어트(docs/ui-spec.html §5/§7)에 맞춰, 흰 카드
// CompletionGauge 대신 배경 위에 바로 얹는 플랫 게이지. 집계는 동일하게
// lib/beautyProfile의 getCompletedKinds를 재사용한다(중복 계산 금지).
// ============================================================================

import { useEffect, useState } from "react";
import {
  ALL_DIAGNOSIS_KINDS,
  DIAGNOSIS_KIND_LABEL,
  getCompletedKinds,
  readDiaryEntries,
  type DiagnosisKind,
} from "@/lib/beautyProfile";

export default function InlineCompletion({ className = "" }: { className?: string }) {
  const [completed, setCompleted] = useState<DiagnosisKind[]>([]);

  useEffect(() => {
    setCompleted(getCompletedKinds(readDiaryEntries()));
  }, []);

  const total = ALL_DIAGNOSIS_KINDS.length; // 4
  const doneCount = completed.length;
  const isComplete = doneCount >= total;

  return (
    <div
      className={`flex items-center gap-2.5 text-aux text-sub ${className}`}
      aria-label="헤어 프로필 완성도"
    >
      <span className="shrink-0">프로필 완성도</span>
      <div
        className="flex max-w-[120px] flex-1 gap-1"
        role="img"
        aria-label={`4개 중 ${doneCount}개 완료`}
      >
        {ALL_DIAGNOSIS_KINDS.map((kind) => {
          const filled = completed.includes(kind);
          return (
            <span
              key={kind}
              title={DIAGNOSIS_KIND_LABEL[kind]}
              className={`h-1 flex-1 rounded-pill ${filled ? "bg-ink" : "bg-line"}`}
            />
          );
        })}
      </div>
      <b className="shrink-0 font-semibold text-ink">
        {isComplete ? "완성" : `${doneCount}/${total}`}
      </b>
    </div>
  );
}
