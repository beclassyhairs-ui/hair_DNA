"use client";

// ============================================================================
// 어뷰티 — AI 진단 허브 (`/diagnosis`)  [아이보리 리뱀프 3단계 · §4]
// 하단 탭바 "AI진단"의 목적지. 여러 진단 랜딩을 사진 썸네일 카드로 모아 보여준다.
// 디자인 SSOT: docs/ui-spec.html §4/§7 — 사진 썸네일 카드 4장(목록 예외로 허용),
//   대표 진단(AI 헤어 스타일) 1개만 차콜 카드로 강조. 나머지는 흰 카드.
//   사진은 public/landing/ 모델 6장 중 4장(next/image, 4:5). 없으면 텍스트 폴백.
//
// 기존에 이 경로에 있던 8문항 설문은 `/diagnosis/quick`으로 옮겼고, 아래 목록의
// "머리가 미용실에서만 예쁜 이유"(=/hair-quiz)와는 별개다.
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "../components/layout/AppShell";
import { trackEvent } from "../../lib/trackEvent";

interface HubItem {
  type: string;
  label: string;
  desc: string;
  href: string;
  image?: string;
  /** 대표 진단(차콜 카드) 여부 — 화면의 유일한 진한 덩어리. */
  feat?: boolean;
}

const DIAGNOSIS_HUB_ITEMS: HubItem[] = [
  {
    type: "style",
    label: "AI 헤어 스타일 분석",
    desc: "얼굴형 기반 인생 헤어스타일 찾기",
    href: "/style",
    image: "/landing/style-hero.jpg",
    feat: true,
  },
  {
    type: "damage",
    label: "손상도 체크",
    desc: "미용실 가기 전 1분 팩트체크",
    href: "/damage-check",
    image: "/landing/damage-hero.jpg",
  },
  {
    type: "bangs",
    label: "인생 앞머리 찾기",
    desc: "얼굴형 기반 앞머리 스타일 진단",
    href: "/bangs",
    image: "/landing/bangs-hero.jpg",
  },
  {
    type: "hair_quiz",
    label: "머리가 미용실에서만 예쁜 이유",
    desc: "3문항 퀵 진단",
    href: "/hair-quiz",
    image: "/landing/quiz-hero.jpg",
  },
];

// 썸네일 — 4:5, next/image. 사진 없거나 로드 실패면 렌더 안 함(텍스트 카드로 폴백).
function HubThumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl">
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="64px"
        priority
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function DiagnosisCard({ item }: { item: HubItem }) {
  const feat = item.feat;
  return (
    <Link
      href={item.href}
      onClick={() => trackEvent("diagnosis_card_click", { diagnosisType: item.type, source: "diagnosis_hub_page" })}
      className={`flex items-center gap-3.5 rounded-2xl p-3.5 transition-colors ${
        feat ? "bg-ink active:opacity-90" : "bg-card shadow-soft active:bg-soft"
      }`}
    >
      <HubThumb src={item.image} />
      <div className="min-w-0">
        <p className={`text-[15px] font-bold ${feat ? "text-bg" : "text-ink"}`}>{item.label}</p>
        <p className={`mt-1 text-[13px] ${feat ? "text-bg/70" : "text-sub"}`}>{item.desc}</p>
        {feat && (
          <span className="mt-2 inline-block rounded-pill bg-bg px-2 py-0.5 text-[10px] font-bold text-ink">
            대표 진단 · 약 2분
          </span>
        )}
      </div>
    </Link>
  );
}

export default function DiagnosisHubPage() {
  return (
    <AppShell>
      <div>
        <h1 className="font-serif text-[19px] font-bold tracking-tight text-ink">AI 진단 허브</h1>
        <p className="mt-1 text-[13px] text-sub">진단이 쌓일수록 발견템 추천이 더 정확해져요.</p>
      </div>

      {/* 카드 4장 — 허브는 목록 화면이라 다이어트 예외(스펙 §7) */}
      <div className="space-y-3">
        {DIAGNOSIS_HUB_ITEMS.map((item) => (
          <DiagnosisCard key={item.type} item={item} />
        ))}
      </div>
    </AppShell>
  );
}
