"use client";

// ============================================================================
// 미알팁 — 홈 (`/home`)
// 2026-08-15 구조 개편:
//   · '오늘케어 루틴' 섹션 제거, '퀵 진단 →' 배너 제거.
//   · 홈의 주인공 = 진단 랜딩 2장(스타일·데미지) 카드.
//   · '물어보세요' 소통 창구 블록은 feature flag(CONSULT_CHANNEL)로 숨김 —
//     카카오 채널 개설 후 링크 주입 + enabled=true. 갈 곳 없는 상태로는 절대 노출 안 함.
//   · 최상단 '나의 스타일' 카드(빈 상태/채워진 상태)·완성도 게이지는 유지.
//
// 2026-09-01 최상단 블록 교체(B라운드):
//   · 옛 HairProfileCard(곱슬축 참고사진 HairTypeImage + 해시태그)를 제거하고,
//     "손님 본인의 것"이 놓이는 '나의 스타일' 카드로 재설계. 진단·매칭 로직은 무변경.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, User } from "lucide-react";
import AppShell from "../components/layout/AppShell";
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
  getCompletedKinds,
  ALL_DIAGNOSIS_KINDS,
  DIAGNOSIS_KIND_LABEL,
  type DiagnosisKind,
  type DiaryEntryLike,
} from "@/lib/beautyProfile";

// 진단 이력을 한 번만 읽어 완성도를 계산한다.
// (첫 렌더는 서버와 동일한 기본값 → 마운트 후 실제 값으로 교체: 하이드레이션 안전)
function useHomeData() {
  const [completed, setCompleted] = useState<DiagnosisKind[]>([]);
  const [latest, setLatest] = useState<MyStyleData | null>(null);

  useEffect(() => {
    try {
      const entries = readDiaryEntries();
      setCompleted(getCompletedKinds(entries));
      setLatest(selectLatestDiagnosis(entries));
    } catch {
      /**/
    }
  }, []);

  return { completed, latest };
}

// ─── 위젯 1: '나의 스타일' 카드 (홈 최상단 · 손님 본인의 것이 놓이는 자리) ──────────
// 빈 상태(신규 방문자): 채우고 싶게 만드는 빈 카드 — 어떤 사진도 넣지 않는다.
// 채워진 상태(재방문자): 저장된 최신 진단 1건을 "이름/결론이 주인공"으로 렌더.
//   주인공 = 스타일명(style) 또는 레벨·유형 headline(damage). 합성 사진은 있으면 표식 크기
//   썸네일, 없으면 실루엣 유지. 저장된 필드만 쓰고 없는 값은 만들지 않는다(2-3).

type MyStyleData = { title: string; imageUrl: string | null; savedAt: number };

function readString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function entryTime(e: DiaryEntryLike): number {
  if (typeof e.savedAt === "number") return e.savedAt;
  if (typeof e.createdAt === "string") {
    const t = Date.parse(e.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

// 큰 제목(주인공) — kind별 "그 진단이 저장하는 제목 필드"만 쓴다. 교차 대체 없음(가짜 금지).
//   ★ 데미지는 headline("N단계 · 유형")을 직접 읽는다 — 요약문(diagnosisSummary)이 아니라.
function titleForEntry(e: DiaryEntryLike, kind: string): string {
  if (kind === "damage") return readString(e.headline);
  if (kind === "style")  return readString(e.styleName);
  return readString(e.diagnosisSummary); // bangs / hairquiz
}

// 저장된 진단 중 가장 최근 1건을 카드용으로 정규화. 표시할 제목이 없으면 null(→ 빈 상태).
function selectLatestDiagnosis(entries: DiaryEntryLike[]): MyStyleData | null {
  let latest: DiaryEntryLike | null = null;
  let latestTime = -Infinity;
  for (const e of entries) {
    const t = entryTime(e); // 선택(정렬)용 — savedAt 없으면 createdAt 폴백 허용
    if (t > latestTime) { latestTime = t; latest = e; }
  }
  if (!latest) return null;
  const kind = readString(latest.kind) || "style";
  const title = titleForEntry(latest, kind);
  if (!title) return null;
  // 날짜는 "표시 전용" — 반드시 numeric savedAt만 쓴다. 없으면 0 → 카드가 줄을 생략(가짜 날짜 금지).
  const savedAt = typeof latest.savedAt === "number" ? latest.savedAt : 0;
  return { title, imageUrl: readString(latest.generatedImageUrl) || null, savedAt };
}

function FaceSilhouette() {
  // 옅은 회색 얼굴 실루엣 — 사진이 아니라 도형/아이콘. 채워진 상태의 합성 썸네일과 같은 자리·크기.
  return (
    <div
      aria-hidden
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-soft"
    >
      <User size={30} strokeWidth={1.6} className="text-ink-3" />
    </div>
  );
}

// 합성 사진 썸네일(표식 크기 · 키우지 않는다). 로드 실패면 실루엣으로 폴백 — 깨진 이미지 금지(2-4).
function StyleThumb({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <FaceSilhouette />;
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-soft">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden className="h-full w-full object-cover" onError={() => setOk(false)} />
    </div>
  );
}

function MyStyleCard({ latest }: { latest: MyStyleData | null }) {
  // 빈 상태 — 채우고 싶게 만드는 빈 카드. 사진 없음.
  if (!latest) {
    return (
      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <p className="text-aux text-sub">나의 스타일</p>
        <div className="mt-2 flex items-center gap-3.5">
          <FaceSilhouette />
          <div className="min-w-0 flex-1">
            <p className="text-emphasis font-bold text-ink">아직 비어 있어요</p>
            <p className="mt-1 text-body text-sub">3분이면 채워집니다</p>
          </div>
        </div>
        <div className="mt-3 text-right">
          <Link
            href="/style"
            className="inline-flex min-h-[44px] items-center justify-end text-body font-semibold text-ink transition-colors active:text-sub"
          >
            내 스타일 찾기 →
          </Link>
        </div>
      </section>
    );
  }

  // 채워진 상태 — 이름/결론이 주인공. 날짜는 savedAt에서 실제 값(없으면 줄 생략).
  const date =
    latest.savedAt > 0
      ? new Date(latest.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
      : "";
  return (
    <section className="rounded-2xl bg-card p-4 shadow-soft">
      <p className="text-aux text-sub">나의 스타일</p>
      <div className="mt-2 flex items-center gap-3.5">
        {latest.imageUrl ? <StyleThumb url={latest.imageUrl} /> : <FaceSilhouette />}
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-h2 font-semibold leading-snug text-ink">{latest.title}</h2>
          {date && <p className="mt-1 text-aux text-sub">최근 진단 · {date}</p>}
        </div>
      </div>
      <div className="mt-3 text-right">
        <Link
          href="/my-diary"
          className="inline-flex min-h-[44px] items-center justify-end text-body font-semibold text-ink transition-colors active:text-sub"
        >
          나의 헤어에서 보기 →
        </Link>
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
  const { completed, latest } = useHomeData();

  return (
    <AppShell>
      <MyStyleCard latest={latest} />
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
