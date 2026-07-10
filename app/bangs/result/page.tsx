"use client";

// ============================================================================
// 어뷰티 인생뱅 — 결과지 v2
// 1순위+서브 추천, 이미지 2장 + 라이트박스, 얼굴형 분석 요약, 현재 스타일 체크,
// /home 저장 연동까지 한 장의 분석 흐름으로 구성한다. 제품/발견템 노출 없음
// (발견템은 /home 전용 영역 — 서비스 방향 원칙).
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { BANGS_SURVEY_KEY } from "../constants";
import { diagnoseBangs, FACE_SHAPE_SHORT_LABEL, type BangType, type BangsDiagnosisResult } from "../bangRecommend";
import type { BangsSurveyAnswers } from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { trackEvent as trackHomeEvent } from "../../../lib/trackEvent";
import { appendDiaryEntry, refreshBeautyUserProfileFromDiary } from "../../../lib/beautyProfile";

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
  see_through: "/images/bangs/see_through.jpg",
  curtain:     "/images/bangs/curtain.jpg",
  side_swept:  "/images/bangs/side_swept.jpg",
  long_side:   "/images/bangs/long_side.jpg",
  wisp:        "/images/bangs/wisp.jpg",
  soft_full:   "/images/bangs/soft_full.jpg",
  inner:       "/images/bangs/inner.jpg",
  hippy:       "/images/bangs/hippy.jpg",
  block:       "/images/bangs/block.jpg",
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
      className="relative block w-full overflow-hidden rounded-2xl border border-gold/20 text-left active:scale-[0.98] transition-transform"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gold/[0.08] to-transparent">
          <span className="text-2xl">💇</span>
          <p className="px-2 text-center text-[10px] font-bold text-gold-light">{bangLabel}</p>
        </div>
      )}

      {/* 확대 힌트 아이콘 */}
      <div className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-white/80" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 뱃지 */}
      <div className="absolute left-2 top-2 z-10 rounded-full border border-gold/50 bg-black/65 px-2 py-1 backdrop-blur-sm">
        <span className="text-[8px] font-bold uppercase tracking-wider text-gold">{badge}</span>
      </div>

      {/* 하단 라벨 */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-8"
        style={{ background: "linear-gradient(to top, rgba(28,26,24,0.90) 0%, transparent 100%)" }}
      >
        <p className="mt-0.5 font-serif text-xs font-bold leading-tight text-gold-light">{bangLabel}</p>
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

        <div className="w-full overflow-hidden rounded-2xl border border-gold/25 bg-black/40">
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
              <span className="text-5xl">💇</span>
              <p className="font-serif text-lg font-bold text-gold-light">{bangLabel}</p>
            </div>
          )}
        </div>
        <p className="mt-3 font-serif text-base font-bold text-cream">{bangLabel}</p>
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
          ? <strong key={i} className="font-bold text-gold-light">{p.slice(2, -2)}</strong>
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
  const [saved,     setSaved]     = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);
  const [lightbox,  setLightbox]  = useState<{ type: BangType; label: string } | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(BANGS_SURVEY_KEY);
      if (s) setAnswers(JSON.parse(s) as BangsSurveyAnswers);
    } catch { /**/ }
    setReady(true);
  }, []);

  const result: BangsDiagnosisResult = diagnoseBangs(answers);

  useEffect(() => {
    if (!ready) return;
    trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      result_type: result.finalFaceShape,
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
      `#${FACE_SHAPE_SHORT_LABEL[result.finalFaceShape]}`,
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
        inferredFaceShape: result.inferredFaceShape,
        finalFaceShape: result.finalFaceShape,
        faceMatchStatus: result.faceMatchStatus,
        currentStyle: answers.q1,
        primaryBang: result.primaryBang,
        primaryBangLabel: result.primaryBangLabel,
        secondaryBang: result.secondaryBang,
        secondaryBangLabel: result.secondaryBangLabel,
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

  if (!ready) return <main className="min-h-screen bg-[#F9FAFB]" />;

  return (
    <main className="mx-auto min-h-screen max-w-[430px] bg-[#F9FAFB] pb-40 text-[#2F2F2F]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-[#F9FAFB]/92 px-5 py-3.5 backdrop-blur-md">
        <Link href="/bangs/survey" className="text-sm font-medium text-[#6B7280] hover:text-[#2F2F2F] transition-colors">
          ← 다시 하기
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">진단 결과지</span>
        <button onClick={handleKakaoShare} className="text-sm font-medium text-[#6B7280] hover:text-[#2F2F2F] transition-colors">
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

          {/* 1. 최종 타이틀 */}
          <motion.div variants={FADE_UP} className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">AI DIAGNOSIS</p>
            <h1 className="mt-1.5 font-serif text-[1.7rem] font-bold text-[#2F2F2F]">
              당신에게 가장 잘 맞는 앞머리
            </h1>
          </motion.div>

          {/* 2. 1순위 + 서브 추천 이미지 2장 */}
          <motion.div variants={FADE_UP} className="grid grid-cols-2 gap-3">
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
          </motion.div>
          <motion.p variants={FADE_UP} className="-mt-2 text-center text-[10px] text-[#9CA3AF]">
            이미지를 탭하면 크게 볼 수 있어요
          </motion.p>

          {/* 3. 1순위 추천 설명 */}
          <motion.div variants={FADE_UP}
            className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">✦ 가장 잘 맞는 추천</p>
              <div className="mt-4 flex justify-center">
                <span className="rounded-xl bg-gold px-8 py-2.5 font-serif text-2xl font-black text-charcoal shadow-gold">
                  {result.primaryBangLabel}
                </span>
              </div>
              <p className="mt-4 text-base leading-[1.85] text-[#374151]">
                <BoldText text={result.primaryReason} />
              </p>
            </div>
          </motion.div>

          {/* 4. 서브 추천 설명 */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">✦ 함께 고려해볼 스타일</p>
            <p className="mt-2 font-serif text-lg font-bold text-[#2F2F2F]">{result.secondaryBangLabel}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">{result.secondaryReason}</p>
          </motion.div>

          {/* 5. 얼굴형 분석 요약 */}
          <motion.div variants={FADE_UP} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">얼굴형 분석 요약</p>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">{result.faceAnalysisText}</p>
          </motion.div>

          {/* 6. 현재 스타일 체크 */}
          <motion.div variants={FADE_UP} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">현재 스타일 체크</p>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">{result.currentStyleCheck.text}</p>
          </motion.div>

          {/* 7. 피하면 좋은 스타일 */}
          <motion.div variants={FADE_UP} className="rounded-xl border border-red-400/15 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-500">❌ 피해주세요 — {result.ngStyle}</p>
          </motion.div>

          {/* 8. 저장 CTA */}
          <motion.div variants={FADE_UP} className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
            <p className="text-center text-base font-semibold text-[#2F2F2F]">이 결과, 계속 보관하고 싶다면?</p>
            <p className="mt-1 text-center text-sm text-[#6B7280]">저장하면 홈 화면과 다이어리에서 다시 확인할 수 있어요</p>
            <button
              onClick={handleSaveAndGoHome}
              disabled={saved}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
              style={{ background: "linear-gradient(105deg, #E4D2A8 0%, #C8A86B 50%, #A8884A 100%)" }}
            >
              {saved ? "저장 완료 ✓ 이동 중..." : "✨ 결과 저장하고 오늘헤어에서 보기"}
            </button>
          </motion.div>

          {/* 공유 */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
            <p className="text-center text-base font-semibold text-[#2F2F2F]">친구도 인생 앞머리 찾아줄까요?</p>
            <p className="mt-1 text-center text-sm text-[#6B7280]">결과를 공유하고 서로 비교해 보세요</p>
            <button
              onClick={handleKakaoShare}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3.5 text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
            >
              <span className="text-lg">💬</span>
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "카카오톡으로 공유하기"}
            </button>
            <button
              onClick={handleCopyLink}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-[#6B7280] transition-all hover:border-gray-300 hover:text-[#2F2F2F] active:scale-[0.98]"
            >
              {copied ? "✓ 복사됨" : "🔗 링크 복사"}
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg space-y-2">
          <button
            onClick={handleSaveAndGoHome}
            disabled={saved}
            className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
          >
            <motion.span
              className="pointer-events-none absolute inset-0"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 70%)" }}
            />
            <span className="relative">✨ 내 맞춤 헤어홈으로 이동하기</span>
          </button>
          <Link href="/bangs"
            className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#2F2F2F]">
            ← 처음부터 다시 하기
          </Link>
        </div>
      </div>

    </main>
  );
}
