"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 홈 (`/home`)
// 2026-08-15 구조 개편:
//   · '오늘케어 루틴' 섹션 제거, '퀵 진단 →' 배너 제거.
//   · 홈의 주인공 = 진단 랜딩 2장(스타일·데미지) 카드.
//   · '물어보세요' 소통 창구 블록은 feature flag(CONSULT_CHANNEL)로 숨김 —
//     카카오 채널 개설 후 링크 주입 + enabled=true. 갈 곳 없는 상태로는 절대 노출 안 함.
//   · 프로필 카드(최근 진단 요약/빈 상태)·완성도 게이지는 유지.
//
// 진단·매칭 로직은 건드리지 않는다 — coreKey는 기존 deriveCoreKeyFromEntries를
// 그대로 재사용(/items와 동일)해 스와치만 고른다.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import HairTypeImage from "../components/HairTypeImage";
import { deriveCoreKeyFromEntries } from "../../lib/itemsMatch";
import { trackEvent } from "../../lib/trackEvent";

// ─── 물어보세요(소통 창구) feature flag ──────────────────────────────────────
// 카카오 채널 개설 전까지 숨긴다. 개설 후 href에 채널 링크를 넣고 enabled=true로 켠다.
// enabled && href 둘 다 있어야 렌더 → "눌렀는데 갈 곳 없음"을 원천 차단.
const CONSULT_CHANNEL = {
  enabled: false,
  href: "", // 예: "https://pf.kakao.com/_xxxxx"
};
import {
  readDiaryEntries,
  readBeautyUserProfile,
  buildBeautyUserProfileFromDiary,
  getCompletedKinds,
  selectHomeTags,
  ALL_DIAGNOSIS_KINDS,
  DIAGNOSIS_KIND_LABEL,
  type DiagnosisKind,
} from "@/lib/beautyProfile";

// ─── mock 유저 데이터 (실 연동 전 — 저장된 진단 결과 없을 때의 기본값) ──────────────

// 가짜 기본 태그·범용 제목은 두지 않는다 — 진단 0건이면 빈 상태 블록을 보여준다.
const DEFAULT_PROFILE = {
  name: "고객",
  hairTags: [] as string[],
  lastDiagnosis: "",
  lastDiagnosisDate: "",
  mainConcern: "",
  latestResultSummary: "",
};

// 진단 이력을 한 번만 읽어 프로필·coreKey·완성도를 함께 계산한다.
// (첫 렌더는 서버와 동일한 기본값 → 마운트 후 실제 값으로 교체: 하이드레이션 안전)
function useHomeData() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [coreKey, setCoreKey] = useState<string | null>(null);
  const [completed, setCompleted] = useState<DiagnosisKind[]>([]);
  // 홈 노출 태그(kind 출처 규칙). 진단 0건이면 빈 배열 유지(가짜 태그 없음).
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    try {
      const entries = readDiaryEntries();
      const stored = readBeautyUserProfile();
      const derived =
        entries.length > 0 ? buildBeautyUserProfileFromDiary(entries, stored) : stored;
      if (derived) setProfile((prev) => ({ ...prev, ...derived }));
      setCoreKey(deriveCoreKeyFromEntries(entries));
      setCompleted(getCompletedKinds(entries));
      if (entries.length > 0) setTags(selectHomeTags(entries));
    } catch {
      /**/
    }
  }, []);

  return { profile, coreKey, completed, tags };
}

// ─── 위젯 1: 헤어 프로필 카드 (화면의 유일한 흰 카드) ────────────────────────────

function HairProfileCard({
  profile,
  coreKey,
  tags,
}: {
  profile: typeof DEFAULT_PROFILE;
  coreKey: string | null;
  tags: string[];
}) {
  const hasDiagnosis = Boolean(profile.latestResultSummary);

  // 진단 0건 — 가짜 태그·범용 제목 없이 빈 상태 전용 블록.
  if (!hasDiagnosis) {
    return (
      <section className="card-soft p-6 text-center">
        <p className="font-serif text-h2 font-semibold text-ink">아직 진단 전이에요</p>
        <p className="mt-2 text-body leading-relaxed text-sub">
          첫 진단을 마치면 내 모발 타입과 오늘의 관리 포인트가 여기에 정리돼요.
        </p>
        <Link href="/diagnosis" className="btn-primary mt-4 inline-flex">
          진단 시작하기
        </Link>
      </section>
    );
  }

  return (
    <section className="card-soft flex items-center gap-3.5 p-4">
      {/* 곱슬축 이미지 (4:5) — coreKey 없거나 로드 실패면 렌더 안 됨(텍스트만) */}
      <HairTypeImage coreKey={coreKey} />
      <div className="min-w-0">
        <p className="text-aux text-sub">
          최근 진단 기준{profile.lastDiagnosisDate ? ` · ${profile.lastDiagnosisDate}` : ""}
        </p>
        <h2 className="mt-1 font-serif text-h2 font-semibold leading-snug text-ink">
          {profile.latestResultSummary}
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

// ─── 위젯 3: 진단 랜딩 2장 카드 (홈의 주인공) ────────────────────────────────────

interface LandingCard {
  type: string;
  label: string;
  desc: string;
  href: string;
  image: string;
}

const HOME_LANDINGS: LandingCard[] = [
  {
    type: "style",
    label: "AI 헤어 스타일 분석",
    desc: "얼굴형 기반 인생 헤어스타일 찾기",
    href: "/style",
    image: "/landing/style-hero.jpg",
  },
  {
    type: "damage",
    label: "손상도 체크",
    desc: "미용실 가기 전 1분 팩트체크",
    href: "/damage-check",
    image: "/landing/damage-hero.jpg",
  },
];

// 히어로 썸네일 — 사진 없거나 로드 실패면 렌더 안 함(텍스트 카드로 폴백).
function LandingThumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl">
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="80px"
        priority
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function DiagnosisLandings() {
  return (
    <section>
      <h2 className="font-serif text-emphasis font-semibold text-ink">어떤 진단부터 시작할까요?</h2>
      <div className="mt-3 space-y-3">
        {HOME_LANDINGS.map((item) => (
          <Link
            key={item.type}
            href={item.href}
            onClick={() =>
              trackEvent("diagnosis_card_click", { diagnosisType: item.type, source: "home_landing" })
            }
            className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft transition-colors active:bg-soft"
          >
            <LandingThumb src={item.image} />
            <div className="min-w-0 flex-1">
              <p className="text-emphasis font-bold text-ink">{item.label}</p>
              <p className="mt-1 text-body leading-snug text-sub">{item.desc}</p>
            </div>
            <span aria-hidden className="shrink-0 text-h2 text-ink-2">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 위젯 4: 물어보세요(소통 창구) — feature flag로 숨김 ───────────────────────────
// 카카오 채널 개설 후에만 노출(CONSULT_CHANNEL.enabled && href). 그 전엔 렌더 자체를 안 함.

function ConsultBlock() {
  if (!CONSULT_CHANNEL.enabled || !CONSULT_CHANNEL.href) return null;
  return (
    <a
      href={CONSULT_CHANNEL.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("consult_channel_click", { source: "home_consult_block" })}
      className="flex items-center justify-between gap-3 rounded-2xl bg-soft p-4 transition-colors active:opacity-80"
    >
      <div className="min-w-0">
        <p className="text-emphasis font-bold text-ink">궁금한 걸 물어보세요</p>
        <p className="mt-1 text-body leading-snug text-sub">
          내 모발·시술 고민, 현직 디자이너에게 편하게 물어보세요.
        </p>
      </div>
      <span aria-hidden className="shrink-0 text-h2 text-ink-2">→</span>
    </a>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const { profile, coreKey, completed, tags } = useHomeData();

  return (
    <AppShell>
      <HairProfileCard profile={profile} coreKey={coreKey} tags={tags} />
      <DiagnosisLandings />
      <InlineCompletion completed={completed} />
      <ConsultBlock />

      <Link
        href="/my-diary"
        className="flex min-h-[44px] items-center justify-center gap-1.5 py-2 text-center text-aux text-sub transition-colors active:text-ink"
      >
        {/* 🟡-⑥: 나의 헤어 탭과 동일한 결과지(FileText) 아이콘 — "내 결과지" 시각 통일. */}
        <FileText size={15} strokeWidth={1.8} aria-hidden />
        지난 진단 기록 보기 →
      </Link>
    </AppShell>
  );
}
