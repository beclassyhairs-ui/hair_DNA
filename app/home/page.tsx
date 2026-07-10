"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 홈 대시보드 (`/home`)
// 재방문 유저용 "오늘의 헤어 컨디션" 요약 화면. 발견템/진단허브/고민상담소는
// 각자 전용 탭(/items, /diagnosis, /consulting)으로 옮기고, 홈에는 하루 단위로
// 자주 확인할 3개 위젯만 남긴다: 헤어 프로필, 오늘의 루틴, 퀵진단 배너.
//
// userProfile은 실 데이터 연동 전 mock — 실 연동 시 카카오 로그인 세션 기준으로
// 저장된 최신 진단 결과(hairTags, mainConcern 등)를 조회해 그대로 대체하면 되도록
// 필드명을 실제 스키마에 맞춰뒀다.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../components/layout/AppShell";
import { trackEvent } from "../../lib/trackEvent";

// ─── mock 유저 데이터 (실 연동 전 — 저장된 진단 결과 없을 때의 기본값) ──────────────

const DEFAULT_PROFILE = {
  name: "지환",
  hairTags: ["곱슬모", "정수리 부스스함", "앞머리 갈라짐", "볼륨 처짐"],
  lastDiagnosis: "AI 헤어 분석",
  lastDiagnosisDate: "오늘",
  mainConcern: "습도 높은 날 정수리와 앞머리 라인이 쉽게 무너짐",
};

// 결과지 페이지가 abeauty_user_profile 키로 저장한 진단 데이터를 읽어와 병합한다.
function useUserProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("abeauty_user_profile");
      if (raw) setProfile((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch { /**/ }
  }, []);

  return profile;
}

// ─── 개인화 데일리 루틴 데이터 (userProfile.hairTags 기반 추천 루틴 — 설문 아님) ──────

type RoutineStepId = "scalp_volume_dry" | "tip_essence_light" | "bangs_line_fixing";

const POINTS_PER_STEP = 10;

const PERSONALIZED_ROUTINE: { id: RoutineStepId; label: string }[] = [
  { id: "scalp_volume_dry", label: "두피 쪽은 완전히 말려 정수리 볼륨 살리기" },
  { id: "tip_essence_light", label: "모발 끝에만 가벼운 에센스 바르기" },
  { id: "bangs_line_fixing", label: "앞머리 라인은 픽싱 제품으로 얇게 고정하기" },
];

// ─── 위젯 1: 상단 개인화 헤어 프로필 카드 ───────────────────────────────────────

function HairProfileWidget() {
  const userProfile = useUserProfile();
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
            {tag.startsWith("#") ? tag : `#${tag}`}
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

// ─── 위젯 2: 진단 기반 개인화 루틴 (+ 포인트 리워드 UI 뼈대) ───────────────────

function PersonalizedRoutineWidget() {
  const userProfile = useUserProfile();
  const [checked, setChecked] = useState<Record<RoutineStepId, boolean>>({
    scalp_volume_dry: false,
    tip_essence_light: false,
    bangs_line_fixing: false,
  });

  const completedCount = Object.values(checked).filter(Boolean).length;
  const total = PERSONALIZED_ROUTINE.length;
  const progress = (completedCount / total) * 100;
  const earnedPoints = completedCount * POINTS_PER_STEP;

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

      {/* 포인트 리워드 UI 뼈대 — 실 백엔드 포인트 연동 전, 체크 개수 기반으로 미리 계산해 보여줌 */}
      <div className="mt-2 flex justify-end">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF0DA] px-2.5 py-1 text-[11px] font-bold text-[#8A6D2F]">
          ✨ 오늘 획득 {earnedPoints}P
        </span>
      </div>

      <ul className="mt-5 space-y-3.5">
        {PERSONALIZED_ROUTINE.map((step) => {
          const isChecked = checked[step.id];
          return (
            <li key={step.id}>
              <button
                onClick={() => toggleStep(step.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
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
                  className={`flex-1 text-sm leading-snug transition-opacity ${
                    isChecked ? "text-gray-400 line-through opacity-60" : "text-[#2F2F2F]"
                  }`}
                >
                  {step.label}
                </span>
                {isChecked && (
                  <span className="shrink-0 rounded-full bg-[#FBF0DA] px-2 py-0.5 text-[10px] font-bold text-[#8A6D2F]">
                    +{POINTS_PER_STEP}P
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── 위젯 3: 1분 퀵 진단 배너 (보조 CTA) ────────────────────────────────────────

function QuickDiagnosisBanner() {
  return (
    <Link
      href="/hair-quiz"
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
    <AppShell>
      <HairProfileWidget />
      <PersonalizedRoutineWidget />
      <QuickDiagnosisBanner />
    </AppShell>
  );
}
