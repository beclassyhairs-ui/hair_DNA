"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 홈 대시보드 (`/home`)
// 단순 "오늘케어 앱"이 아니라 "랜딩별 AI 진단 → 카카오 로그인 → 고민 데이터 저장 →
// 맞춤 발견템 추천 → 커머스 전환" 구조의 데이터 기반 헤어 커머스 플랫폼 홈이다.
// 홈은 새 설문을 다시 받는 곳이 아니라, 이미 저장된 진단 결과(userProfile)를
// 바탕으로 개인화된 루틴/발견템을 보여주는 곳이라는 원칙을 지킨다.
//
// userProfile / recommendedItem은 실 데이터 연동 전 mock — 실 연동 시 카카오 로그인
// 세션 기준으로 저장된 최신 진단 결과(hairTags, mainConcern 등)를 조회해 그대로
// 대체하면 되도록 필드명을 실제 스키마에 맞춰뒀다.
//
// trackEvent: 실제 analytics 연동 경로(lib/analytics.ts, lib/eventTracking.ts)가
// 두 갈래로 나뉘어 있어, 우선 아래 로컬 fallback으로 이벤트를 남긴다. 추후 실 연동
// 시 이 함수 내부만 교체하면 되도록 시그니처(name, payload)를 통일해둔다.
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const trackEvent = (eventName: string, payload?: Record<string, unknown>) => {
  console.log("[trackEvent]", eventName, payload);
};

// ─── mock 유저 데이터 (실 연동 전 — 카카오 로그인 세션 기준 저장된 진단 결과로 대체 예정) ──

const userProfile = {
  name: "지환",
  hairTags: ["곱슬모", "정수리 부스스함", "앞머리 갈라짐", "볼륨 처짐"],
  lastDiagnosis: "AI 헤어 분석",
  lastDiagnosisDate: "오늘",
  mainConcern: "습도 높은 날 정수리와 앞머리 라인이 쉽게 무너짐",
};

const recommendedItem = {
  id: "fixing_mascara_001",
  name: "앞머리 픽싱 마스카라",
  matchedTags: ["앞머리 갈라짐", "습도 높은 날", "정수리 처짐"],
  badges: ["앞머리갈라짐진단", "습도높은날", "정수리처짐", "가벼운고정템"],
  reason:
    "최근 진단에서 앞머리 갈라짐과 정수리 처짐 고민이 확인되어, 무겁게 떡지지 않고 앞머리와 잔머리 라인을 가볍게 고정하는 제품을 추천해요.",
};

// ─── 개인화 데일리 루틴 데이터 (userProfile.hairTags 기반 추천 루틴 — 설문 아님) ──────

type RoutineStepId = "scalp_volume_dry" | "tip_essence_light" | "bangs_line_fixing";

const PERSONALIZED_ROUTINE: { id: RoutineStepId; label: string }[] = [
  { id: "scalp_volume_dry", label: "두피 쪽은 완전히 말려 정수리 볼륨 살리기" },
  { id: "tip_essence_light", label: "모발 끝에만 가벼운 에센스 바르기" },
  { id: "bangs_line_fixing", label: "앞머리 라인은 픽싱 제품으로 얇게 고정하기" },
];

// ─── AI 진단 허브 미리보기 데이터 ────────────────────────────────────────────────

const DIAGNOSIS_HUB_ITEMS = [
  { type: "hair_mbti", label: "헤어 MBTI", href: "/diagnosis/hair-mbti" },
  { type: "bangs", label: "인생 앞머리 찾기", href: "/diagnosis/bangs" },
  { type: "ai_hair", label: "AI 헤어 분석", href: "/diagnosis/ai-hair" },
  { type: "salon_only", label: "내 머리가 미용실에서만 예쁜 이유", href: "/diagnosis/salon-only" },
] as const;

// ─── 하단 탭바 ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/diagnosis", icon: "🔍", label: "AI진단" },
  { href: "/consulting", icon: "💬", label: "고민상담소" },
  { href: "/home", icon: "🏠", label: "오늘케어" },
  { href: "/items", icon: "🎁", label: "발견템" },
  { href: "/myhair", icon: "👤", label: "마이헤어" },
] as const;

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/90 shadow-[0_-12px_32px_-14px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center"
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span
                className={`text-[11px] font-medium ${active ? "text-[#C8A96A]" : "text-gray-400"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── 상단 헤더 ────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-[#F9FAFB]/90 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[19px] font-bold tracking-tight text-[#2F2F2F]">어뷰티</p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-[#6B7280]">오늘의 헤어 케어</p>
        </div>
        <button
          aria-label="알림"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2F2F2F] shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className="h-5 w-5">
            <path
              d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ─── 위젯 1: 상단 개인화 헤어 프로필 카드 ───────────────────────────────────────

function HairProfileWidget() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#EADFC5] bg-gradient-to-br from-[#FBF6EA] via-[#F8F1E1] to-[#EFD9AE] p-6 shadow-[0_12px_28px_-16px_rgba(200,169,106,0.55)]">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/40 blur-2xl" />

      <p className="relative text-[11px] font-semibold tracking-wide text-[#8A6D2F]">최근 진단 기준</p>
      <h2 className="relative mt-1 text-[17px] font-bold tracking-tight text-[#2F2F2F]">
        {userProfile.name}님의 헤어 프로필
      </h2>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {userProfile.hairTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-[#8A6D2F] backdrop-blur"
          >
            #{tag}
          </span>
        ))}
      </div>

      <p className="relative mt-4 text-[15px] leading-relaxed text-[#2F2F2F]">
        오늘은 습도가 높아 정수리와 앞머리 라인이 쉽게 무너질 수 있어요.
        <br />
        무거운 오일보다는 가벼운 픽싱 미스트와 뿌리 볼륨 루틴을 추천해요.
      </p>

      <button
        onClick={() => trackEvent("profile_result_view", { source: "home_profile_card" })}
        className="relative mt-5 w-full rounded-xl bg-[#2F2F2F] py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(47,47,47,0.6)] transition-opacity active:opacity-80"
      >
        내 진단 결과 다시보기
      </button>
    </section>
  );
}

// ─── 위젯 2: 진단 기반 개인화 루틴 ──────────────────────────────────────────────

function PersonalizedRoutineWidget() {
  const [checked, setChecked] = useState<Record<RoutineStepId, boolean>>({
    scalp_volume_dry: false,
    tip_essence_light: false,
    bangs_line_fixing: false,
  });

  const completedCount = Object.values(checked).filter(Boolean).length;
  const total = PERSONALIZED_ROUTINE.length;
  const progress = (completedCount / total) * 100;

  const toggleStep = (id: RoutineStepId) => {
    setChecked((prev) => {
      const nextChecked = !prev[id];
      trackEvent("diary_checkin", { stepId: id, checked: nextChecked, source: "home_personalized_routine" });
      return { ...prev, [id]: nextChecked };
    });
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold tracking-tight text-[#2F2F2F]">
          오늘 {userProfile.name}님에게 맞는 루틴
        </h2>
        <span className="text-xs font-semibold text-[#C8A96A]">
          {total}개 중 {completedCount}개 완료
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#C8A96A] to-[#E8D4A0] shadow-[0_1px_6px_rgba(200,169,106,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[#C8A96A]">
          {Math.round(progress)}%
        </span>
      </div>

      <ul className="mt-5 space-y-3.5">
        {PERSONALIZED_ROUTINE.map((step) => {
          const isChecked = checked[step.id];
          return (
            <li key={step.id}>
              <button
                onClick={() => toggleStep(step.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isChecked ? "border-[#C8A96A] bg-[#C8A96A]" : "border-gray-300 bg-white"
                  }`}
                >
                  {isChecked && (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} className="h-3 w-3 text-white">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm leading-snug transition-opacity ${
                    isChecked ? "text-gray-400 line-through opacity-60" : "text-[#2F2F2F]"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── 위젯 3: 진단 기반 발견템 ───────────────────────────────────────────────────

function PersonalizedDiscoveryWidget() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold tracking-wide text-[#C8A96A]">{userProfile.lastDiagnosis} 결과 기반</p>
      <h2 className="mt-1 text-[17px] font-bold tracking-tight text-[#2F2F2F]">
        {userProfile.name}님 진단 기반 발견템
      </h2>

      <div className="mt-4 flex gap-3.5">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FBF6EA] to-[#E8D4A0]">
          <span className="text-2xl">✨</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#2F2F2F]">{recommendedItem.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {recommendedItem.badges.map((badge) => (
              <span key={badge} className="rounded-full bg-[#F9F4E8] px-2 py-0.5 text-[11px] font-medium text-[#8A6D2F]">
                #{badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-[#6B7280]">{recommendedItem.reason}</p>

      <button
        onClick={() =>
          trackEvent("product_card_view", {
            productId: recommendedItem.id,
            matchedTags: recommendedItem.matchedTags,
            source: "home_personalized_item",
          })
        }
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F9F4E8] py-3.5 text-sm font-semibold text-[#8A6D2F] transition-colors active:bg-[#F3E9D2]"
      >
        왜 나에게 필요한지 보기 →
      </button>
    </section>
  );
}

// ─── 위젯 4: AI 진단 허브 미리보기 ──────────────────────────────────────────────

function DiagnosisHubWidget() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-[17px] font-bold tracking-tight text-[#2F2F2F]">다른 진단도 해볼까요?</h2>
      <p className="mt-1 text-xs text-[#6B7280]">진단이 쌓일수록 발견템 추천이 더 정확해져요.</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {DIAGNOSIS_HUB_ITEMS.map((item) => (
          <Link
            key={item.type}
            href={item.href}
            onClick={() => trackEvent("diagnosis_card_click", { diagnosisType: item.type, source: "home_diagnosis_hub" })}
            className="flex min-h-[64px] items-center rounded-xl border border-gray-100 bg-[#F9FAFB] px-3.5 py-3 text-[13px] font-semibold leading-snug text-[#2F2F2F] transition-colors active:bg-[#F3E9D2]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 위젯 5: 나와 비슷한 고민상담소 ─────────────────────────────────────────────

function ConsultSnackWidget() {
  const QUESTION_ID = "bangs_rainy_day_001";
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(128);

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    trackEvent("consult_like_click", { questionId: QUESTION_ID, source: "home_consult_card" });
  };

  const handleViewAnswer = () => {
    trackEvent("consult_answer_view", { questionId: QUESTION_ID, source: "home_consult_card" });
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-[17px] font-bold tracking-tight text-[#2F2F2F]">나와 비슷한 고민상담소</h2>
      <p className="mt-1 text-xs text-[#6B7280]">나처럼 습도 높은 날 앞머리가 갈라지는 분들이 많이 묻는 질문</p>

      <p className="mt-4 rounded-xl bg-[#F9FAFB] px-4 py-3.5 text-sm leading-relaxed text-[#2F2F2F]">
        “비 오는 날만 되면 앞머리가 갈라지고 정수리가 처져요. 제품 문제일까요?”
      </p>

      <div className="mt-3.5 flex items-center gap-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
            liked ? "border-[#C8A96A] bg-[#F3E9D2] text-[#8A6D2F]" : "border-gray-200 text-[#6B7280]"
          }`}
        >
          👍 나도 그래요 {likeCount}명
        </button>
        <button
          onClick={handleViewAnswer}
          className="flex-1 rounded-xl bg-[#2F2F2F] py-2.5 text-xs font-semibold text-white transition-opacity active:opacity-80"
        >
          전문가 답변 보기
        </button>
      </div>
    </section>
  );
}

// ─── 위젯 6: 1분 퀵 진단 배너 (보조 CTA, 맨 아래) ───────────────────────────────

function QuickDiagnosisBanner() {
  return (
    <Link
      href="/diagnosis/salon-only"
      onClick={() =>
        trackEvent("quick_diagnosis_start", { diagnosisType: "salon_only", source: "home_quick_banner" })
      }
      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#C8A96A]">아직 안 해본 진단이 있어요</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-[#2F2F2F]">
          내 머리가 미용실에서만 예쁜 이유, 3문항으로 확인하기
        </p>
      </div>
      <span className="shrink-0 rounded-lg bg-[#2F2F2F] px-3.5 py-2.5 text-xs font-semibold text-white">
        퀵 진단 시작
      </span>
    </Link>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto min-h-screen max-w-[430px] pb-28">
        <Header />
        <main className="space-y-5 px-5 py-6">
          <HairProfileWidget />
          <PersonalizedRoutineWidget />
          <PersonalizedDiscoveryWidget />
          <DiagnosisHubWidget />
          <ConsultSnackWidget />
          <QuickDiagnosisBanner />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
