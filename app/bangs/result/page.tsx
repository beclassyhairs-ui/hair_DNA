"use client";

// ============================================================================
// 어뷰티 인생뱅 — 결과지  [아이보리 리뱀프 3단계 · 미끼 2/3]
// 디자인 SSOT: docs/ui-spec.html §6/§7 — 히어로(이미지+그라데이션+명조 흰색 타입명)
//   + 본문 흰 카드 ≤2.
//   · 앞머리 진단은 자체 결과 이미지(추천 앞머리 사진)가 진단의 핵심 산출물이라,
//     텍스처 스와치 대신 "1순위 추천 앞머리 사진"을 히어로로 쓴다(사업주 확정).
//     스펙의 히어로 구성(220px 이미지 + 하단 그라데이션 + 명조 흰색 타입명)은 동일.
//   · 흰 카드 2장(추천 상세 / A-2 잠금)만, 나머지는 배경 위 플랫.
//   · 저장/공유/이벤트/라이트박스/디버그 로직 무변경.
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
import InlineCompletion from "@/components/InlineCompletion";
import LockedPreviewCard from "@/components/LockedPreviewCard";

// 일반 결과 화면에서는 항상 숨김. URL에 ?debug=1이면 그 세션에서만 보인다.
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
// /public/images/bangs/[type].* 준비되면 실 이미지, 없으면 우아하게 폴백(bg-soft).

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

// ─── 히어로 — 1순위 추천 앞머리 이미지 (220px + 그라데이션 + 명조 흰색 타입명) ─────

function BangHero({
  bangType, title, subLabel, eyebrow, onExpand,
}: {
  bangType: BangType;
  title: string;
  subLabel?: string;
  eyebrow: string;
  onExpand: () => void;
}) {
  const src = BANG_IMAGE_PATH[bangType];
  const [imgOk, setImgOk] = useState(true);

  return (
    <button
      type="button"
      onClick={onExpand}
      className="relative block h-[220px] w-full overflow-hidden rounded-[18px] text-left active:scale-[0.99] transition-transform"
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 20%" }}
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="absolute inset-0 bg-soft" />
      )}

      {/* 하단 그라데이션 — 타입명 가독용 */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: "linear-gradient(to top, rgba(42,38,31,0.74), transparent)" }}
      />

      {/* 확대 힌트 */}
      <div className="absolute right-3 top-3 rounded-full bg-black/45 p-1.5 backdrop-blur-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-white/85" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-white/80">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-h1 font-semibold leading-snug text-white">
          {title}
          {subLabel && <span className="ml-2 text-[14px] font-normal text-white/85">{subLabel}</span>}
        </h1>
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

// ─── 서브 추천 썸네일 (카드 1 내부, 탭 → 라이트박스) ─────────────────────────────

function BangThumb({ bangType, label, onExpand }: { bangType: BangType; label: string; onExpand: () => void }) {
  const src = BANG_IMAGE_PATH[bangType];
  const [imgOk, setImgOk] = useState(true);
  return (
    <button
      type="button"
      onClick={onExpand}
      className="relative h-[80px] w-[64px] shrink-0 overflow-hidden rounded-[11px] active:scale-[0.97] transition-transform"
      aria-label={`${label} 크게 보기`}
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" style={{ objectPosition: "50% 20%" }} onError={() => setImgOk(false)} />
      ) : (
        <div className="absolute inset-0 bg-soft" />
      )}
    </button>
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
    // 통합 프로필 기여 태그 — bangs는 우선순위 3순위(홈 노출에선 selectHomeTags가 제외).
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
        resultImages: [
          { label: `1순위 추천 ${result.primaryBangLabel}`, url: BANG_IMAGE_PATH[result.primaryBang] },
          { label: `서브 추천 ${result.secondaryBangLabel}`, url: BANG_IMAGE_PATH[result.secondaryBang] },
        ],
        createdAt: new Date().toISOString(),
      });
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

  if (!ready) return <main className="min-h-screen" />;

  return (
    <main className="mx-auto min-h-screen max-w-[430px] pb-40 text-ink">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/85 px-5 py-3.5 backdrop-blur-md">
        <Link href="/bangs/survey" className="shrink-0 whitespace-nowrap text-[15px] font-medium text-sub transition-colors hover:text-ink">
          ← 다시 하기
        </Link>
        <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.28em] text-sub">진단 결과지</span>
        <button onClick={handleKakaoShare} className="shrink-0 whitespace-nowrap text-[15px] font-medium text-sub transition-colors hover:text-ink">
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

      <div className="mx-auto w-full max-w-lg px-page">
        <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-5 pt-5">

          {/* 히어로 — 1순위 추천 앞머리 이미지 */}
          <motion.div variants={FADE_UP}>
            <BangHero
              bangType={result.primaryBang}
              title={BANG_SHORT_LABEL[result.primaryBang]}
              subLabel={BANG_SUB_LABEL[result.primaryBang] || undefined}
              eyebrow="AI 앞머리 진단 · 1순위 추천"
              onExpand={() => setLightbox({ type: result.primaryBang, label: result.primaryBangLabel })}
            />
          </motion.div>

          {/* 완성도 게이지 — 인라인 */}
          <motion.div variants={FADE_UP}><InlineCompletion /></motion.div>

          {/* ── 흰 카드 1 : 추천 상세 (1순위 이유 + 서브 추천 썸네일·이유) ── */}
          <motion.div variants={FADE_UP}>
            <section className="card-soft space-y-4 p-5">
              <div>
                <p className="text-aux font-bold tracking-[0.14em] text-sub">1순위 추천 이유</p>
                <p className="mt-2 text-body leading-relaxed text-ink">
                  <BoldText text={reasonFor(result.primaryBang, result.primaryBangLabel)} />
                </p>
              </div>
              <div className="flex gap-3 border-t border-line pt-4">
                <BangThumb
                  bangType={result.secondaryBang}
                  label={result.secondaryBangLabel}
                  onExpand={() => setLightbox({ type: result.secondaryBang, label: result.secondaryBangLabel })}
                />
                <div className="min-w-0">
                  <p className="text-aux font-bold tracking-[0.14em] text-sub">함께 고려</p>
                  <p className="mt-1 font-serif text-h2 font-semibold text-ink">{result.secondaryBangLabel}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-sub">
                    {reasonFor(result.secondaryBang, result.secondaryBangLabel)}
                  </p>
                </div>
              </div>
            </section>
          </motion.div>

          {/* ── 추천 이유 요약 — 플랫(카드 벗김) ── */}
          <motion.div variants={FADE_UP}>
            {sameFaceBang ? (
              <div className="border-t border-line pt-4">
                <p className="text-aux font-bold tracking-[0.14em] text-sub">추천 이유</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                  선택하신 얼굴형과 추가 답변이 같은 방향을 가리켰어요. 두 기준 모두{" "}
                  <strong className="font-bold text-ink">{result.selectedFaceBangLabel}</strong>이 잘 맞아 최종 1순위로 추천드려요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-aux font-bold tracking-[0.14em] text-sub">내가 고른 얼굴형 기준</p>
                  <p className="mt-1 text-[15px] font-bold text-ink">{result.selectedFaceBangLabel}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-sub">{result.selectedFaceReason}</p>
                </div>
                <div>
                  <p className="text-aux font-bold tracking-[0.14em] text-sub">추가 답변까지 반영</p>
                  <p className="mt-1 text-[15px] font-bold text-ink">{result.signalBasedBangLabel}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-sub">{result.signalBasedReason}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* 현재 스타일 체크 — 플랫 */}
          <motion.div variants={FADE_UP} className="border-t border-line pt-4">
            <p className="text-aux font-bold tracking-[0.14em] text-sub">현재 스타일 체크</p>
            <p className="mt-2 text-body leading-relaxed text-ink">{result.currentStyleCheck.text}</p>
          </motion.div>

          {/* 피하면 좋은 스타일 — 플랫 */}
          <motion.div variants={FADE_UP}>
            <p className="text-[15px] font-medium text-sub">이런 스타일은 피해보세요 — {result.ngStyle}</p>
          </motion.div>

          {/* 디버그(개발 전용) */}
          {showDebug && (
            <motion.div variants={FADE_UP} className="rounded-2xl border border-dashed border-yellow-400/50 bg-yellow-50 p-5 font-mono">
              <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-yellow-700">왜 이 앞머리가 추천됐나요? (테스트용)</p>
              <div className="mt-3 space-y-1 text-[11px] text-yellow-900">
                <p>선택 얼굴형: <b>{FACE_SHAPE_SHORT_LABEL[result.selectedFaceShape]}</b></p>
                <p>답변 신호 기반 얼굴형: <b>{FACE_SHAPE_SHORT_LABEL[result.signalBasedFaceShape]}</b></p>
              </div>
              <div className="mt-3 rounded-lg bg-white/60 p-2.5">
                <p className="text-[10px] font-bold text-yellow-700">분석:</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-yellow-900">{result.debugReasonSummary}</p>
              </div>
              <div className="mt-3 rounded-lg bg-white/60 p-2.5">
                <p className="mb-1 text-[10px] font-bold text-yellow-700">앞머리 점수 TOP 5:</p>
                {result.topBangScores.map((row, i) => (
                  <p key={row.bang} className="text-[10px] leading-relaxed text-yellow-900">{i + 1}. {row.label} ({row.score}점)</p>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── 흰 카드 2 : A-2 잠금 미리보기(→ /style) ── */}
          <motion.div variants={FADE_UP}>
            <LockedPreviewCard
              onCtaClick={() => trackEvent("locked_preview_cta_click", { landing_id: "bangs" })}
            />
          </motion.div>

          {/* 공유 + 재진단 — 플랫 */}
          <motion.div variants={FADE_UP} className="flex flex-col items-center gap-3 pt-1">
            <button onClick={handleKakaoShare} className="btn-textlink text-[15px]">
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "결과 공유하기"}
            </button>
            <button onClick={handleCopyLink} className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
              {copied ? "✓ 복사됨" : "링크 복사"}
            </button>
            <Link href="/bangs" className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
              ↺ 처음부터 다시 하기
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA — 최우선 행동 = 저장·프로필 누적 ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg">
          <button onClick={handleSaveAndGoHome} disabled={saved} className="btn-primary w-full disabled:opacity-50">
            {saved ? "저장 완료 ✓ 이동 중..." : "결과 저장하고 내 헤어홈으로"}
          </button>
        </div>
      </div>

    </main>
  );
}
