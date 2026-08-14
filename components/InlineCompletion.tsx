"use client";

// ============================================================================
// InlineCompletion — 완성도 게이지의 "카드 벗긴" 인라인 한 줄 버전.
// 아이보리 리뱀프 카드 다이어트(docs/ui-spec.html §5/§7)에 맞춰, 흰 카드
// CompletionGauge 대신 배경 위에 바로 얹는 플랫 게이지. 집계는 동일하게
// lib/beautyProfile의 getCompletedKinds를 재사용한다(중복 계산 금지).
//
// L-03: 아직 안 한 진단 칸은 해당 랜딩으로 바로 이동하는 링크가 된다(새 UI 없이
// 기존 게이지 칸만 링크화). 이동은 completion_nav_click 이벤트로 계측한다.
//
// 2026-08-15(옵션 A): 게이지는 "현재 노출 중인 진단"만 카운트·링크한다(VISIBLE_DIAGNOSIS_KINDS).
//   bangs·hairquiz 랜딩을 홈/허브에서 내렸으므로, 게이지 막대가 숨긴 페이지로 가는 라이브 링크가
//   되지 않게 style·damage 2종만 센다. lib의 공용 ALL_DIAGNOSIS_KINDS는 다른 소비처(홈 태그·집계)가
//   있어 건드리지 않고, 여기 게이지 전용 목록만 좁힌다. → 완성 2/2 도달 가능.
// ============================================================================

import Link from "next/link";
import { useEffect, useState } from "react";
import {
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

// 게이지가 세고 링크하는 "현재 노출 중인" 진단 목록. bangs·hairquiz는 랜딩을 내려 제외.
// (재노출 시 여기에 다시 추가하면 게이지·완성도 분모가 함께 따라온다.)
const VISIBLE_DIAGNOSIS_KINDS: DiagnosisKind[] = ["style", "damage"];

export default function InlineCompletion({ className = "" }: { className?: string }) {
  const [completed, setCompleted] = useState<DiagnosisKind[]>([]);

  useEffect(() => {
    // 집계는 공용 getCompletedKinds를 재사용하되, 게이지 표시는 노출 중인 종류로만 좁힌다.
    setCompleted(getCompletedKinds(readDiaryEntries()));
  }, []);

  const visibleDone = completed.filter((k) => VISIBLE_DIAGNOSIS_KINDS.includes(k));
  const total = VISIBLE_DIAGNOSIS_KINDS.length; // 2 (현재 노출: style·damage)
  const doneCount = visibleDone.length;
  const isComplete = doneCount >= total;

  return (
    <div
      className={`flex items-center gap-2.5 text-aux text-sub ${className}`}
      aria-label="헤어 프로필 완성도"
    >
      <span className="shrink-0">프로필 완성도</span>
      <div className="flex max-w-[120px] flex-1 items-center gap-1">
        {VISIBLE_DIAGNOSIS_KINDS.map((kind) => {
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
