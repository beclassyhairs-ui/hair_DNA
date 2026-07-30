"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 홈 대시보드 (`/home`)  [아이보리 리뱀프 3단계]
// 디자인 SSOT: docs/ui-spec.html §5 / §7.
//   · 흰 카드는 프로필 1장뿐 — 완성도 게이지·루틴·퀵배너는 카드 벗겨 배경 위에 플랫.
//   · 프로필 카드 = 텍스처 스와치 + 최근 진단 기준·날짜 + 타입명(명조) + 태그(≤4).
//   · 색은 아이보리+차콜 2톤. 색은 스와치(사진)가 담당.
//   · 0P·진행률% 제거(루틴은 순수 체크 리스트).
//
// 진단·매칭 로직은 건드리지 않는다 — coreKey는 기존 deriveCoreKeyFromEntries를
// 그대로 재사용(/items와 동일)해 스와치만 고른다. 폰트 "크기"는 현행 토큰 유지.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../components/layout/AppShell";
import TextureSwatch from "../components/TextureSwatch";
import { swatchForCoreKey } from "@/lib/textures";
import { deriveCoreKeyFromEntries } from "../../lib/itemsMatch";
import { trackEvent } from "../../lib/trackEvent";
import {
  readDiaryEntries,
  readBeautyUserProfile,
  buildBeautyUserProfileFromDiary,
  getCompletedKinds,
  ALL_DIAGNOSIS_KINDS,
  DIAGNOSIS_KIND_LABEL,
  type DiagnosisKind,
} from "@/lib/beautyProfile";

// ─── mock 유저 데이터 (실 연동 전 — 저장된 진단 결과 없을 때의 기본값) ──────────────

const DEFAULT_PROFILE = {
  name: "고객",
  hairTags: ["곱슬모", "정수리 부스스함", "앞머리 갈라짐", "볼륨 처짐"],
  lastDiagnosis: "AI 헤어 분석",
  lastDiagnosisDate: "오늘",
  mainConcern: "습도 높은 날 정수리와 앞머리 라인이 쉽게 무너짐",
  latestResultSummary: "",
};

// 진단 이력을 한 번만 읽어 프로필·coreKey·완성도를 함께 계산한다.
// (첫 렌더는 서버와 동일한 기본값 → 마운트 후 실제 값으로 교체: 하이드레이션 안전)
function useHomeData() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [coreKey, setCoreKey] = useState<string | null>(null);
  const [completed, setCompleted] = useState<DiagnosisKind[]>([]);

  useEffect(() => {
    try {
      const entries = readDiaryEntries();
      const stored = readBeautyUserProfile();
      const derived =
        entries.length > 0 ? buildBeautyUserProfileFromDiary(entries, stored) : stored;
      if (derived) setProfile((prev) => ({ ...prev, ...derived }));
      setCoreKey(deriveCoreKeyFromEntries(entries));
      setCompleted(getCompletedKinds(entries));
    } catch {
      /**/
    }
  }, []);

  return { profile, coreKey, completed };
}

// ─── 위젯 1: 헤어 프로필 카드 (화면의 유일한 흰 카드) ────────────────────────────

function HairProfileCard({
  profile,
  coreKey,
}: {
  profile: typeof DEFAULT_PROFILE;
  coreKey: string | null;
}) {
  const swatch = swatchForCoreKey(coreKey);
  const hasDiagnosis = Boolean(profile.latestResultSummary);
  // 타입명 = 최신 진단 요약(없으면 프로필 기본 문구). 태그는 화면 표시상 최대 4개.
  const typeName = hasDiagnosis ? profile.latestResultSummary : `${profile.name}님의 헤어 프로필`;
  const tags = profile.hairTags.slice(0, 4);

  return (
    <section className="card-soft flex items-center gap-3.5 p-4">
      <TextureSwatch
        primary={swatch.primary}
        secondary={swatch.secondary}
        className="h-[100px] w-[84px] shrink-0 rounded-[14px]"
      />
      <div className="min-w-0">
        <p className="text-aux text-sub">
          최근 진단 기준{hasDiagnosis && profile.lastDiagnosisDate ? ` · ${profile.lastDiagnosisDate}` : ""}
        </p>
        <h2 className="mt-1 font-serif text-h2 font-semibold leading-snug text-ink">
          {typeName}
        </h2>
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-soft px-2.5 py-1 text-aux font-medium text-sub"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 위젯 2: 완성도 게이지 — 인라인 한 줄 (카드 아님) ────────────────────────────

function InlineCompletion({ completed }: { completed: DiagnosisKind[] }) {
  const total = ALL_DIAGNOSIS_KINDS.length; // 4
  const doneCount = completed.length;
  const isComplete = doneCount >= total;

  return (
    <div className="flex items-center gap-2.5 text-aux text-sub" aria-label="헤어 프로필 완성도">
      <span className="shrink-0">프로필 완성도</span>
      <div className="flex max-w-[120px] flex-1 gap-1" role="img" aria-label={`4개 중 ${doneCount}개 완료`}>
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

// ─── 위젯 3: 오늘의 루틴 — 플랫 리스트 (카드 아님, 0P·진행률% 제거) ────────────────

type RoutineStepId = "scalp_volume_dry" | "tip_essence_light" | "bangs_line_fixing";

const PERSONALIZED_ROUTINE: { id: RoutineStepId; label: string }[] = [
  { id: "scalp_volume_dry", label: "두피 쪽은 완전히 말려 정수리 볼륨 살리기" },
  { id: "tip_essence_light", label: "모발 끝에만 가벼운 에센스 바르기" },
  { id: "bangs_line_fixing", label: "앞머리 라인은 픽싱 제품으로 얇게 고정하기" },
];

function RoutineList() {
  const [checked, setChecked] = useState<Record<RoutineStepId, boolean>>({
    scalp_volume_dry: false,
    tip_essence_light: false,
    bangs_line_fixing: false,
  });

  const toggleStep = (id: RoutineStepId) => {
    setChecked((prev) => {
      const nextChecked = !prev[id];
      trackEvent("diary_checkin", {
        stepId: id,
        checked: nextChecked,
        source: "home_personalized_routine",
      });
      return { ...prev, [id]: nextChecked };
    });
  };

  return (
    <section>
      <h2 className="font-serif text-emphasis font-semibold text-ink">오늘의 루틴</h2>
      <ul className="mt-2">
        {PERSONALIZED_ROUTINE.map((step) => {
          const isChecked = checked[step.id];
          return (
            <li key={step.id} className="border-b border-line last:border-b-0">
              <button
                onClick={() => toggleStep(step.id)}
                className="flex w-full items-start gap-3 py-3 text-left"
              >
                <span
                  className={`mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                    isChecked ? "border-ink bg-ink" : "border-line bg-transparent"
                  }`}
                >
                  {isChecked && (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} className="h-3 w-3 text-bg">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span
                  className={`flex-1 text-body leading-snug transition-opacity ${
                    isChecked ? "text-ink-3 line-through" : "text-ink"
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

// ─── 위젯 4: 1분 퀵 진단 배너 (보조 CTA · 카드 벗김) ──────────────────────────────

function QuickDiagnosisBanner() {
  return (
    <Link
      href="/hair-quiz"
      onClick={() =>
        trackEvent("quick_diagnosis_start", { diagnosisType: "salon_only", source: "home_quick_banner" })
      }
      className="flex items-center justify-between gap-3 border-t border-line pt-4 active:opacity-70"
    >
      <div className="min-w-0">
        <p className="text-aux text-sub">아직 안 해본 진단이 있어요</p>
        <p className="mt-0.5 text-body font-medium leading-snug text-ink">
          내 머리가 미용실에서만 예쁜 이유, 3문항으로 확인하기
        </p>
      </div>
      <span className="shrink-0 text-aux text-sub">퀵 진단 →</span>
    </Link>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const { profile, coreKey, completed } = useHomeData();

  return (
    <AppShell>
      <HairProfileCard profile={profile} coreKey={coreKey} />
      <InlineCompletion completed={completed} />
      <RoutineList />
      <QuickDiagnosisBanner />

      <Link
        href="/my-diary"
        className="block py-2 text-center text-aux text-sub transition-colors active:text-ink"
      >
        지난 진단 기록 보기 →
      </Link>
    </AppShell>
  );
}
