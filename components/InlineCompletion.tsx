"use client";

// ============================================================================
// InlineCompletion — 완성도 게이지의 "카드 벗긴" 인라인 한 줄 버전.
// 아이보리 리뱀프 카드 다이어트(docs/ui-spec.html §5/§7)에 맞춰, 흰 카드
// CompletionGauge 대신 배경 위에 바로 얹는 플랫 게이지. 집계는 동일하게
// lib/beautyProfile의 getCompletedKinds를 재사용한다(중복 계산 금지).
//
// L-03: 아직 안 한 진단 칸은 해당 랜딩으로 바로 이동하는 링크가 된다(새 UI 없이
// 기존 게이지 칸만 링크화). 이동은 completion_nav_click 이벤트로 계측한다.
// ============================================================================

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ALL_DIAGNOSIS_KINDS,
  DIAGNOSIS_KIND_LABEL,
  getCompletedKinds,
  readDiaryEntries,
  type DiagnosisKind,
} from "@/lib/beautyProfile";
import { trackEvent } from "@/lib/eventTracking";

// 각 진단 kind → 해당 랜딩 경로. (landing_view가 발화되는 진입 페이지)
const KIND_ROUTE: Record<DiagnosisKind, string> = {
  style:    "/style",
  damage:   "/damage-check",
  bangs:    "/bangs",
  hairquiz: "/hair-quiz",
};

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
      <div className="flex max-w-[120px] flex-1 items-center gap-1">
        {ALL_DIAGNOSIS_KINDS.map((kind) => {
          const filled = completed.includes(kind);
          const label = DIAGNOSIS_KIND_LABEL[kind];
          // 완료한 칸: 정적 막대. 아직 안 한 칸: 랜딩으로 이동하는 링크(탭 영역 확대).
          if (filled) {
            return (
              <span
                key={kind}
                title={label}
                className="h-1 flex-1 rounded-pill bg-ink"
              />
            );
          }
          return (
            <Link
              key={kind}
              href={KIND_ROUTE[kind]}
              title={`${label} 진단하러 가기`}
              aria-label={`${label} 진단하러 가기`}
              onClick={() =>
                void trackEvent("completion_nav_click", {
                  target_kind: kind,
                  source: "inline_completion",
                })
              }
              className="-my-2.5 flex flex-1 items-center py-2.5"
            >
              <span className="h-1 w-full rounded-pill bg-line transition-colors hover:bg-sub" />
            </Link>
          );
        })}
      </div>
      <b className="shrink-0 font-semibold text-ink">
        {isComplete ? "완성" : `${doneCount}/${total}`}
      </b>
    </div>
  );
}
