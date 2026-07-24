"use client";

// ============================================================================
// 어뷰티 — AI 진단 허브 (`/diagnosis`)
// 헤어MBTI 하나로 바로 넘어가는 게 아니라, 여러 랜딩/진단 콘텐츠를 모아 보여주고
// 유저가 고르게 하는 허브 페이지. 하단 탭바 "AI진단"의 목적지.
//
// 기존에 이 경로(`/diagnosis`)에 있던 8문항 설문 페이지는 `/diagnosis/quick`으로
// 옮겼고(`app/upload/page.tsx`, `app/result/page.tsx`의 재진단 링크도 함께 이동),
// 아래 목록의 "빠른 헤어 진단" 카드로 여전히 연결된다.
// ============================================================================

import Link from "next/link";
import AppShell from "../components/layout/AppShell";
import { trackEvent } from "../../lib/trackEvent";

const DIAGNOSIS_HUB_ITEMS = [
  {
    type: "style",
    label: "AI 헤어 스타일 분석",
    desc: "얼굴형 기반 인생 헤어스타일 찾기",
    href: "/style",
  },
  {
    type: "damage",
    label: "손상도 체크",
    desc: "미용실 가기 전 1분 팩트체크",
    href: "/damage-check",
  },
  {
    type: "bangs",
    label: "인생 앞머리 찾기",
    desc: "얼굴형 기반 앞머리 스타일 진단",
    href: "/bangs",
  },
  {
    type: "hair_quiz",
    label: "머리가 미용실에서만 예쁜 이유",
    desc: "3문항 퀵 진단",
    href: "/hair-quiz",
  },
] as const;

function DiagnosisCard({ item }: { item: (typeof DIAGNOSIS_HUB_ITEMS)[number] }) {
  return (
    <Link
      href={item.href}
      onClick={() => trackEvent("diagnosis_card_click", { diagnosisType: item.type, source: "diagnosis_hub_page" })}
      className="block rounded-2xl border border-line bg-card p-5 shadow-soft transition-colors active:bg-surface"
    >
      <p className="text-[15px] font-bold text-ink">{item.label}</p>
      <p className="mt-1 text-[13px] text-ink-2">{item.desc}</p>
    </Link>
  );
}

export default function DiagnosisHubPage() {
  return (
    <AppShell>
      <div>
        <h1 className="text-[19px] font-bold tracking-tight text-ink">AI 진단 허브</h1>
        <p className="mt-1 text-[13px] text-ink-2">진단이 쌓일수록 발견템 추천이 더 정확해져요.</p>
      </div>

      <div className="space-y-3">
        {DIAGNOSIS_HUB_ITEMS.map((item) => (
          <DiagnosisCard key={item.type} item={item} />
        ))}
      </div>
    </AppShell>
  );
}
