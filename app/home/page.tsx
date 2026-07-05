"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 홈 대시보드 (`/home`)
// "AI 진단 앱"이 아니라 "헤어계의 해피문데이" — 재방문 유저가 매일 들어와
// 오늘의 헤어 컨디션·루틴·발견템·고민을 확인하는 습관 형성형 홈 화면.
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

// ─── 데일리 미션 데이터 ────────────────────────────────────────────────────────

type MissionId = "dry_scalp" | "tip_essence" | "reverse_part_brush";

const DAILY_MISSIONS: { id: MissionId; label: string }[] = [
  { id: "dry_scalp", label: "샴푸 후 두피 쪽 따뜻한 바람으로 100% 말리기" },
  { id: "tip_essence", label: "모발 끝부분에만 수분 에센스 가볍게 바르기" },
  { id: "reverse_part_brush", label: "정수리 가르마 방향 반대로 10초 빗질 드라이" },
];

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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-[430px] items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
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
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-lg font-bold tracking-tight text-[#2F2F2F]">어뷰티</p>
          <p className="mt-0.5 text-xs font-medium text-[#6B7280]">오늘의 헤어 케어</p>
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

// ─── 위젯 1: 오늘의 헤어 컨설팅 & 날씨 알림 ────────────────────────────────────

function WeatherConsultingWidget() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E9D2] px-2.5 py-1 text-xs font-semibold text-[#8A6D2F]">
          🌧️ 습도 78%
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
          곱슬모 위험도 · 보통
        </span>
      </div>

      <p className="mt-3 text-[15px] leading-relaxed text-[#2F2F2F]">
        <span className="font-bold">지환</span>님, 오늘은 습도가 높아 곱슬모발은 정수리 부스스함이
        올라올 수 있어요 🌧️
        <br />
        무거운 오일보다는 가벼운 수분 픽싱 미스트를 추천해요.
      </p>

      <button
        onClick={() => trackEvent("today_hair_check_click", { source: "home_weather_card" })}
        className="mt-4 w-full rounded-xl bg-[#2F2F2F] py-3 text-sm font-semibold text-white transition-opacity active:opacity-80"
      >
        오늘 헤어 체크하기
      </button>
    </section>
  );
}

// ─── 위젯 2: 오늘케어 미션 & 데일리 루틴 ───────────────────────────────────────

function DailyMissionWidget() {
  const [checked, setChecked] = useState<Record<MissionId, boolean>>({
    dry_scalp: false,
    tip_essence: false,
    reverse_part_brush: false,
  });

  const completedCount = Object.values(checked).filter(Boolean).length;
  const total = DAILY_MISSIONS.length;
  const progress = (completedCount / total) * 100;

  const toggleMission = (id: MissionId) => {
    setChecked((prev) => {
      const nextChecked = !prev[id];
      trackEvent("diary_checkin", { stepId: id, checked: nextChecked, source: "home_daily_routine" });
      return { ...prev, [id]: nextChecked };
    });
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#2F2F2F]">오늘의 홈케어 미션</h2>
        <span className="text-xs font-semibold text-[#C8A96A]">
          {total}개 중 {completedCount}개 완료
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#C8A96A] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-4 space-y-3">
        {DAILY_MISSIONS.map((mission) => {
          const isChecked = checked[mission.id];
          return (
            <li key={mission.id}>
              <button
                onClick={() => toggleMission(mission.id)}
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
                  {mission.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── 위젯 3: 오늘의 발견템 ─────────────────────────────────────────────────────

function DiscoveryItemWidget() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#2F2F2F]">오늘의 발견템</h2>

      <div className="mt-3 flex gap-3">
        <div className="h-20 w-20 shrink-0 rounded-xl bg-gradient-to-br from-[#F3E9D2] to-[#C8A96A]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#2F2F2F]">앞머리 픽싱 마스카라</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {["앞머리 갈라짐", "정수리 처짐", "비 오는 날 추천"].map((tag) => (
              <span key={tag} className="rounded-full bg-[#F3E9D2] px-2 py-0.5 text-[11px] font-medium text-[#8A6D2F]">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
        오후만 되면 앞머리가 갈라지는 분들에게 가볍게 고정감을 주는 발견템이에요.
      </p>

      <button
        onClick={() =>
          trackEvent("product_card_view", { productId: "fixing_mascara_001", source: "home_discovery_item" })
        }
        className="mt-4 w-full rounded-xl border border-[#C8A96A] py-3 text-sm font-semibold text-[#8A6D2F] transition-colors active:bg-[#F3E9D2]"
      >
        이 제품이 필요한 이유 보기
      </button>
    </section>
  );
}

// ─── 위젯 4: 나와 비슷한 고민상담소 ─────────────────────────────────────────────

function ConsultSnackWidget() {
  const QUESTION_ID = "perm_drop_001";
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
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#2F2F2F]">나와 비슷한 고민상담소</h2>

      <p className="mt-3 rounded-xl bg-[#F9FAFB] px-4 py-3 text-sm leading-relaxed text-[#2F2F2F]">
        “펌 한 지 2주 됐는데 벌써 처지는 느낌이에요. 정상인가요?”
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
            liked ? "border-[#C8A96A] bg-[#F3E9D2] text-[#8A6D2F]" : "border-gray-200 text-[#6B7280]"
          }`}
        >
          👍 나도 그래요 {likeCount}명
        </button>
        <button
          onClick={handleViewAnswer}
          className="flex-1 rounded-xl bg-[#2F2F2F] py-2 text-xs font-semibold text-white transition-opacity active:opacity-80"
        >
          전문가 답변 보기
        </button>
      </div>
    </section>
  );
}

// ─── 위젯 5: 1분 퀵 진단 배너 ──────────────────────────────────────────────────

function QuickDiagnosisBanner() {
  return (
    <Link
      href="/diagnosis"
      onClick={() =>
        trackEvent("quick_diagnosis_start", { diagnosisType: "shampoo_scalp", source: "home_quick_banner" })
      }
      className="block rounded-2xl border border-gray-100 bg-gradient-to-br from-[#2F2F2F] to-[#4A4A4A] p-5 shadow-sm"
    >
      <p className="text-[15px] font-bold leading-snug text-white">
        내 샴푸가 두피를 망치고 있진 않을까?
      </p>
      <p className="mt-1 text-xs text-white/60">3문항 퀵 진단으로 바로 확인해보세요.</p>
      <span className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[#C8A96A] px-4 py-2.5 text-sm font-semibold text-[#2F2F2F]">
        1분 진단 시작
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
        <main className="space-y-4 px-5 py-4">
          <WeatherConsultingWidget />
          <DailyMissionWidget />
          <DiscoveryItemWidget />
          <ConsultSnackWidget />
          <QuickDiagnosisBanner />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
