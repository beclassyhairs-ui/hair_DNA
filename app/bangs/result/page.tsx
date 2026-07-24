"use client";

// ============================================================================
// 어뷰티 인생뱅 — 결과지 v3 (beauty-ui 파일럿)
// 1순위+서브 추천, 이미지 2장 + 라이트박스, 얼굴형 분석 요약, 현재 스타일 체크,
// /home 저장 연동까지 한 장의 분석 흐름으로 구성한다. 제품/발견템 노출 없음
// (발견템은 /home 전용 영역 — 서비스 방향 원칙).
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { BANGS_SURVEY_KEY } from "../constants";
import {
  diagnoseBangs, FACE_SHAPE_SHORT_LABEL, BANG_SHORT_LABEL, BANG_SUB_LABEL,
  type BangType, type BangsDiagnosisResult,
} from "../bangRecommend";
import type { BangsSurveyAnswers } from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { trackEvent as trackHomeEvent } from "../../../lib/trackEvent";
import { appendDiaryEntry, refreshBeautyUserProfileFromDiary } from "../../../lib/beautyProfile";
import CompletionGauge from "@/components/CompletionGauge";
import LockedPreviewCard from "@/components/LockedPreviewCard";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import ResultHeroCard from "@/components/beauty-ui/ResultHeroCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";
import BottomStickyCTA from "@/components/beauty-ui/BottomStickyCTA";

// 일반 결과 화면에서는 항상 숨김. 테스트할 때만 true로 바꾸거나,
// URL에 ?debug=1을 붙이면 이 상수와 무관하게 그 세션에서만 보인다.
const SHOW_BANG_DEBUG = false;

const LANDING_ID = "bang_test";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (config: Record<string, unknown>) => void };
    };
  }
}

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? "";
const KAKAO_CDN = "https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js";

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    if (window.Kakao) { resolve(); return; }
    if (document.querySelector(`script[src="${KAKAO_CDN}"]`)) {
      const poll = setInterval(() => { if (window.Kakao) { clearInterval(poll); resolve(); } }, 80);
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_CDN;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

// ─── 앞머리 화보 이미지 경로 매핑 ───────────────────────────────────────────────
// /public/images/bangs/[type].jpg 준비되면 자동으로 실 이미지로 대체된다 (없으면
// 아래 카드가 자체적으로 이모지 플레이스홀더로 우아하게 폴백한다).

const BANG_IMAGE_PATH: Record<BangType, string> = {
  see_through: "/images/bangs/see_through.png",
  curtain:     "/images/bangs/curtain.png",
  side_swept:  "/images/bangs/side_swept.png",
  long_side:   "/images/bangs/long_side.png",
  wisp:        "/images/bangs/wisp.png",
  soft_full:   "/images/bangs/soft_full.png",
  inner:       "/images/bangs/inner.jpg",
  hippy:       "/images/bangs/hippy.jpg",
  block:       "/images/bangs/block.jpg",
  face_line:   "/images/bangs/face_line.png",
  round_bang:  "/images/bangs/round_bang.png",
  volume_bang: "/images/bangs/volume_bang.png",
  side_bang:   "/images/bangs/side_bang.png",
};

// ─── 앞머리 화보 카드 (썸네일, 클릭 시 라이트박스) ───────────────────────────────

function BangImageCard({
  bangType, bangLabel, badge, onExpand,
}: {
  bangType:  BangType;
  bangLabel: string;
  badge:     string;
  onExpand:  () => void;
}) {
  const src = BANG_IMAGE_PATH[bangType];
  const [imgOk, setImgOk] = useState(true);

  return (
    <button
      type="button"
      onClick={onExpand}
      className="relative block w-full overflow-hidden rounded-2xl border border-white/60 text-left active:scale-[0.98] transition-transform"
      style={{ aspectRatio: "3/4" }}
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={bangLabel}
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 20%" }}
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface">
          <p className="px-2 text-center text-[12px] font-bold text-ink-2">{bangLabel}</p>
        </div>
      )}

      {/* 확대 힌트 아이콘 */}
      <div className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-white/80" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 뱃지 */}
      <div className="absolute left-2 top-2 z-10 rounded-full bg-black/65 px-2 py-1 backdrop-blur-sm">
        <span className="text-[8px] font-bold uppercase tracking-wider text-white">{badge}</span>
      </div>

      {/* 하단 라벨 */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-8"
        style={{ background: "linear-gradient(to top, rgba(28,26,24,0.90) 0%, transparent 100%)" }}
      >
        <p className="mt-0.5 text-[13px] font-semibold leading-tight text-white">{bangLabel}</p>
      </div>
    </button>
  );
}

// ─── 확대 라이트박스 ──────────────────────────────────────────────────────────

function ImageLightbox({
  bangType, bangLabel, onClose,
}: {
  bangType:  BangType;
  bangLabel: string;
  onClose:   () => void;
}) {
  const src = BANG_IMAGE_PATH[bangType];
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-h-[85dvh] w-full max-w-sm flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="닫기"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="w-full overflow-hidden rounded-2xl border border-white/20 bg-black/40">
          {imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={bangLabel}
              className="max-h-[70dvh] w-full object-contain"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3">
              <p className="text-lg font-semibold text-white">{bangLabel}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-base font-semibold text-white">{bangLabel}</p>
      </motion.div>
    </motion.div>
  );
}

// ─── BoldText 렌더러 ──────────────────────────────────────────────────────────

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="font-bold text-ink">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ─── 애니메이션 상수 ──────────────────────────────────────────────────────────

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const FADE_UP = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const DEFAULT_ANSWERS: BangsSurveyAnswers = {
  qFaceShape: "", q1: "", q2: "", q3: "", q4: "", q5: "",
};

// ─── 메인 결과 페이지 ─────────────────────────────────────────────────────────

export default function BangsResultPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<BangsSurveyAnswers>(DEFAULT_ANSWERS);
  const [ready,   setReady]   = useState(false);
  const [debugParam, setDebugParam] = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);
  const [lightbox,  setLightbox]  = useState<{ type: BangType; label: string } | null>(null);
  const showDebug = process.env.NODE_ENV === "development" && (SHOW_BANG_DEBUG || debugParam);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(BANGS_SURVEY_KEY);
      if (s) setAnswers(JSON.parse(s) as BangsSurveyAnswers);
      setDebugParam(new URLSearchParams(window.location.search).get("debug") === "1");
    } catch { /**/ }
    setReady(true);
  }, []);

  const result: BangsDiagnosisResult = diagnoseBangs(answers);
  const sameFaceBang = result.selectedFaceBang === result.signalBasedBang;

  // primaryBang/secondaryBang은 항상 selectedFaceBang 또는 signalBasedBang 중 하나거나
  // (둘이 같을 때) 신호 점수표의 다음 후보다 — 어느 쪽 이유 문구를 보여줄지 매칭한다.
  function reasonFor(bang: BangType, label: string): string {
    if (bang === result.selectedFaceBang) return result.selectedFaceReason;
    if (bang === result.signalBasedBang) return result.signalBasedReason;
    return `${label}도 자연스럽게 잘 어울리는 다음 후보예요.`;
  }

  useEffect(() => {
    if (!ready) return;
    trackEvent(EVENT_NAMES.REPORT_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      result_type: result.primaryBang,
      concern_tags: result.concernTags,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function handleSaveAndGoHome() {
    // 이 진단이 통합 프로필에 기여하는 태그 — /home의 abeauty_user_profile.hairTags에
    // 우선순위(style>damage>bangs>hairquiz) 합산될 재료. bangs는 3순위라 이 태그가
    // /style·/damage-check 태그를 절대 덮어쓰지 않는다(아래 refresh가 diaryEntries
    // 전체를 다시 합산하기 때문).
    const hairTags = [
      ...result.concernTags,
      result.hairTextureTag,
      `#${result.primaryBangLabel}`,
      `#${result.secondaryBangLabel}`,
      `#${FACE_SHAPE_SHORT_LABEL[result.selectedFaceShape]}`,
      `#${FACE_SHAPE_SHORT_LABEL[result.signalBasedFaceShape]}`,
    ];

    try {
      appendDiaryEntry({
        id: result.resultId,
        kind: "bangs",
        savedAt: Date.now(),
        diagnosisType: "bangs",
        landingId: LANDING_ID,
        resultId: result.resultId,

        selectedFaceShape: result.selectedFaceShape,
        selectedFaceBang: result.selectedFaceBang,
        selectedFaceBangLabel: result.selectedFaceBangLabel,
        selectedFaceReason: result.selectedFaceReason,

        signalBasedFaceShape: result.signalBasedFaceShape,
        signalBasedBang: result.signalBasedBang,
        signalBasedBangLabel: result.signalBasedBangLabel,
        signalBasedReason: result.signalBasedReason,

        primaryBang: result.primaryBang,
        primaryBangLabel: result.primaryBangLabel,
        secondaryBang: result.secondaryBang,
        secondaryBangLabel: result.secondaryBangLabel,

        debugReasonSummary: result.debugReasonSummary,
        topBangScores: result.topBangScores,

        currentStyle: answers.q1,
        concernTags: result.concernTags,
        hairTextureTag: result.hairTextureTag,
        hairTags,
        answers,
        diagnosisSummary: result.diagnosisSummary,
        // /my-diary 사진첩용 — 파일이 없으면 카드가 알아서 이모지 플레이스홀더로 폴백한다.
        resultImages: [
          { label: `1순위 추천 ${result.primaryBangLabel}`, url: BANG_IMAGE_PATH[result.primaryBang] },
          { label: `서브 추천 ${result.secondaryBangLabel}`, url: BANG_IMAGE_PATH[result.secondaryBang] },
        ],
        createdAt: new Date().toISOString(),
      });
      // diaryEntries 전체를 다시 읽어 우선순위 기반으로 profile을 재생성 —
      // 이 결과지가 profile을 단독으로 덮어쓰지 않는다.
      refreshBeautyUserProfileFromDiary();
    } catch { /**/ }

    setSaved(true);
    trackHomeEvent("save_result_go_home", { source: "bangs_result_page", result_id: result.resultId });
    router.push("/home");
  }

  async function handleKakaoShare() {
    const shareUrl = `${SITE_URL}/bangs?utm_source=kakao_share`;
    try {
      await loadKakaoSDK();
      const K = window.Kakao;
      if (K) {
        if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
        if (K.isInitialized()) {
          K.Share.sendDefault({
            objectType: "feed",
            content: {
              title: "어뷰티 | 내 인생 앞머리 진단 결과",
              description: `AI가 처방한 나의 인생 앞머리는 [${result.primaryBangLabel}] 입니다.`,
              imageUrl: `${SITE_URL}/images/bangs-og.png`,
              link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
            },
            buttons: [{ title: "나도 인생 앞머리 찾기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
          });
          setKakaoSent(true);
          setTimeout(() => setKakaoSent(false), 2500);
          return;
        }
      }
    } catch { /**/ }
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "어뷰티 | 내 인생 앞머리 찾기", text: `내 인생 앞머리는 ${result.primaryBangLabel}이에요`, url: shareUrl }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyLink() {
    const url = `${SITE_URL}/bangs?utm_source=copy_share`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!ready) return <main className="min-h-screen bg-surface" />;

  return (
    <SilkBackground>
      <main className="mx-auto min-h-screen max-w-[430px] pb-40 text-ink">

        {/* ── 헤더 ── */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-surface/92 px-5 py-3.5 backdrop-blur-md">
          <Link href="/bangs/survey" className="shrink-0 whitespace-nowrap text-[15px] font-medium text-ink-2 hover:text-ink transition-colors">
            ← 다시 하기
          </Link>
          <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">진단 결과지</span>
          <button onClick={handleKakaoShare} className="shrink-0 whitespace-nowrap text-[15px] font-medium text-ink-2 hover:text-ink transition-colors">
            {kakaoSent ? "전송됨 ✓" : "공유"}
          </button>
        </header>

        {/* ── 확대 라이트박스 ── */}
        <AnimatePresence>
          {lightbox && (
            <ImageLightbox
              bangType={lightbox.type}
              bangLabel={lightbox.label}
              onClose={() => setLightbox(null)}
            />
          )}
        </AnimatePresence>

        <div className="mx-auto w-full max-w-lg px-5">
          <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-4 pt-6">

            {/* A-1 완성도 게이지 — 결과지 상단 */}
            <motion.div variants={FADE_UP}>
              <CompletionGauge />
            </motion.div>

            {/* 1. 결과 히어로 — 이미지 2장 + 최종 1순위 + 이유 */}
            <motion.div variants={FADE_UP}>
              <ResultHeroCard
                eyebrow="AI DIAGNOSIS"
                visual={
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <BangImageCard
                        bangType={result.primaryBang}
                        bangLabel={result.primaryBangLabel}
                        badge="1순위 추천"
                        onExpand={() => setLightbox({ type: result.primaryBang, label: result.primaryBangLabel })}
                      />
                      <BangImageCard
                        bangType={result.secondaryBang}
                        bangLabel={result.secondaryBangLabel}
                        badge="서브 추천"
                        onExpand={() => setLightbox({ type: result.secondaryBang, label: result.secondaryBangLabel })}
                      />
                    </div>
                    <p className="mt-2 text-[13px] text-ink-2">이미지를 탭하면 크게 볼 수 있어요</p>
                  </>
                }
                badge={
                  <>
                    <span>{BANG_SHORT_LABEL[result.primaryBang]}</span>
                    {BANG_SUB_LABEL[result.primaryBang] && (
                      <span className="text-[13px] font-normal text-white/85">{BANG_SUB_LABEL[result.primaryBang]}</span>
                    )}
                  </>
                }
                description={<BoldText text={reasonFor(result.primaryBang, result.primaryBangLabel)} />}
              />
            </motion.div>

            {/* 2. 서브 추천 */}
            <motion.div variants={FADE_UP}>
              <GlassCard className="p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">함께 고려해볼 스타일</p>
                <p className="mt-2 text-h2 text-ink">{result.secondaryBangLabel}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  {reasonFor(result.secondaryBang, result.secondaryBangLabel)}
                </p>
              </GlassCard>
            </motion.div>

            {/* 3. 추천 이유 요약 — 두 기준이 같으면 카드 1개로 합치고, 다르면 나란히 비교한다 */}
            {sameFaceBang ? (
              <motion.div variants={FADE_UP}>
                <GlassCard accent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-2">추천 이유</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                    선택하신 얼굴형과 추가 답변이 같은 방향을 가리켰어요.<br />
                    두 기준 모두 <strong className="font-bold text-ink">{result.selectedFaceBangLabel}</strong>이 잘 맞는 것으로 나타나 최종 1순위로 추천드려요.
                  </p>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div variants={FADE_UP} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <GlassCard className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-2">내가 고른 얼굴형 기준</p>
                  <p className="mt-1 text-[15px] font-bold text-ink">{result.selectedFaceBangLabel}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{result.selectedFaceReason}</p>
                </GlassCard>
                <GlassCard accent className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-2">추가 답변까지 반영한 추천</p>
                  <p className="mt-1 text-[15px] font-bold text-ink">{result.signalBasedBangLabel}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{result.signalBasedReason}</p>
                </GlassCard>
              </motion.div>
            )}

            {/* 현재 스타일 체크 */}
            <motion.div variants={FADE_UP}>
              <GlassCard className="p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">현재 스타일 체크</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">{result.currentStyleCheck.text}</p>
              </GlassCard>
            </motion.div>

            {/* 5. 피하면 좋은 스타일 — 차분한 톤(경고색 제거) */}
            <motion.div variants={FADE_UP}>
              <GlassCard className="px-4 py-3">
                <p className="text-[15px] font-medium text-ink-2">이런 스타일은 피해보세요 — {result.ngStyle}</p>
              </GlassCard>
            </motion.div>

            {/* 6. 테스트용 디버그 박스 — "왜 이 앞머리가 추천됐나요?" */}
            {showDebug && (
              <motion.div variants={FADE_UP} className="rounded-2xl border border-dashed border-yellow-400/50 bg-yellow-50 p-5 font-mono">
                <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-yellow-700">
                  왜 이 앞머리가 추천됐나요? (테스트용)
                </p>

                <div className="mt-3 space-y-1 text-[11px] text-yellow-900">
                  <p>선택 얼굴형: <b>{FACE_SHAPE_SHORT_LABEL[result.selectedFaceShape]}</b></p>
                  <p>답변 신호 기반 얼굴형: <b>{FACE_SHAPE_SHORT_LABEL[result.signalBasedFaceShape]}</b></p>
                </div>

                {result.debugSignalNotes.length > 0 && (
                  <div className="mt-3 rounded-lg bg-white/60 p-2.5">
                    <p className="mb-1 text-[10px] font-bold text-yellow-700">답변 신호:</p>
                    {result.debugSignalNotes.map((note) => (
                      <p key={note} className="text-[10px] leading-relaxed text-yellow-900">- {note}</p>
                    ))}
                  </div>
                )}

                <div className="mt-3 rounded-lg bg-white/60 p-2.5">
                  <p className="text-[10px] font-bold text-yellow-700">분석:</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-yellow-900">{result.debugReasonSummary}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-yellow-900">
                  <p>선택 얼굴형 기준 추천: <b>{result.selectedFaceBangLabel}</b></p>
                  <p>답변 신호 기준 추천: <b>{result.signalBasedBangLabel}</b></p>
                  <p>최종 1순위: <b>{result.primaryBangLabel}</b></p>
                  <p>서브 추천: <b>{result.secondaryBangLabel}</b></p>
                </div>

                <div className="mt-3 rounded-lg bg-white/60 p-2.5">
                  <p className="mb-1 text-[10px] font-bold text-yellow-700">앞머리 점수 TOP 5 (답변 신호 기준):</p>
                  {result.topBangScores.map((row, i) => (
                    <p key={row.bang} className="text-[10px] leading-relaxed text-yellow-900">
                      {i + 1}. {row.label} ({row.score}점)
                    </p>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 8. 저장 CTA */}
            <motion.div variants={FADE_UP}>
              <GlassCard className="px-5 py-5">
                <p className="text-center text-base font-semibold text-ink">이 결과, 계속 보관하고 싶다면?</p>
                <p className="mt-1 text-center text-[15px] text-ink-2">저장하면 홈 화면과 다이어리에서 다시 확인할 수 있어요</p>
                <div className="mt-4">
                  <BlackCTAButton onClick={handleSaveAndGoHome} disabled={saved}>
                    {saved ? "저장 완료 ✓ 이동 중..." : "결과 저장하고 오늘헤어에서 보기"}
                  </BlackCTAButton>
                </div>
              </GlassCard>
            </motion.div>

            {/* 공유 */}
            <motion.div variants={FADE_UP}>
              <GlassCard className="px-5 py-5">
                <p className="text-center text-base font-semibold text-ink">친구도 인생 앞머리 찾아줄까요?</p>
                <p className="mt-1 text-center text-[15px] text-ink-2">결과를 공유하고 서로 비교해 보세요</p>
                <button
                  onClick={handleKakaoShare}
                  className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-base font-semibold text-ink transition-all hover:bg-surface active:scale-[0.98]"
                >
                  {kakaoSent ? "카카오톡 전송 완료 ✓" : "카카오톡으로 공유하기"}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-medium text-ink-2 transition-all hover:text-ink active:scale-[0.98]"
                >
                  {copied ? "✓ 복사됨" : "링크 복사"}
                </button>
              </GlassCard>
            </motion.div>

            {/* A-2 잠금 미리보기 — /style(AI 합성)로 넘기는 카드 */}
            <motion.div variants={FADE_UP}>
              <LockedPreviewCard
                onCtaClick={() => trackEvent("locked_preview_cta_click", { landing_id: "bangs" })}
              />
            </motion.div>

            {/* 재진단 — 우선순위 최하위라 본문 끝 텍스트 링크로만 둔다 */}
            <motion.div variants={FADE_UP} className="flex justify-center pb-2">
              <Link href="/bangs"
                className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink">
                ↺ 처음부터 다시 하기
              </Link>
            </motion.div>

          </motion.div>
        </div>

        {/* ── 하단 고정 CTA — 최우선 행동은 '저장·프로필 누적' ── */}
        <BottomStickyCTA>
          <BlackCTAButton onClick={handleSaveAndGoHome} disabled={saved}>
            {saved ? "저장 완료 ✓ 이동 중..." : "결과 저장하고 내 헤어홈으로"}
          </BlackCTAButton>
        </BottomStickyCTA>

      </main>
    </SilkBackground>
  );
}
