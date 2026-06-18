"use client";

// ============================================================================
// 어뷰티 인생뱅 — 레고 블록식 결과지
// Block 1: AI 얼굴형 분석   Block 2: Q1 팩트체크
// Block 3: 고민 정밀 분석   Block 4: ✨ 인생뱅 처방
// Block 5: 맞춤 제품 추천 (커머스)
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { BANGS_PHOTO_KEY, BANGS_FACESHAPE_KEY, BANGS_SURVEY_KEY } from "../constants";
import {
  FACE_SHAPE_INFO,
  recommendBang,
  getQ1FactBlock,
  buildConcernBlocks,
  getProductRecommendation,
  BANG_LABELS,
  type FaceShapeKey,
} from "../bangRecommend";
import type { BangsSurveyAnswers } from "../surveyData";

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ─── 마크다운 볼드(**text**) 렌더러 ──────────────────────────────────────────

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

// ─── 고민 분석 블록 ───────────────────────────────────────────────────────────

function ConcernCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-5 py-4">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-amber-400">
        ◉ {label}
      </p>
      <p className="text-lg leading-[1.75] text-cream/80">{text}</p>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function BangsResultPage() {
  const [photo,    setPhoto]   = useState<string | null>(null);
  const [survey,   setSurvey]  = useState<BangsSurveyAnswers | null>(null);
  const [faceKey,  setFaceKey] = useState<FaceShapeKey>("round");
  const [copied,   setCopied]  = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem(BANGS_PHOTO_KEY);
      if (p) setPhoto(p);
      const s = sessionStorage.getItem(BANGS_SURVEY_KEY);
      if (s) setSurvey(JSON.parse(s) as BangsSurveyAnswers);
      const f = sessionStorage.getItem(BANGS_FACESHAPE_KEY) as FaceShapeKey | null;
      if (f && f in FACE_SHAPE_INFO) setFaceKey(f);
    } catch { /**/ }
  }, []);

  const faceInfo    = FACE_SHAPE_INFO[faceKey];
  const safeAnswers: BangsSurveyAnswers = survey ?? { q1: "", q2: "", q3: "", q4: "", q5: "" };

  const q1Block      = getQ1FactBlock(safeAnswers.q1, faceKey);
  const concernBlocks = buildConcernBlocks(safeAnswers.q2, safeAnswers.q3, safeAnswers.q4);
  const bangRec      = recommendBang(faceKey, safeAnswers);
  const product      = getProductRecommendation(safeAnswers.q5);

  function handleShare() {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/bangs?utm_source=result_share`
      : "/bangs";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "내 인생 앞머리 찾기",
        text: `나는 ${faceInfo.title}! 인생 앞머리는 ${bangRec.primaryLabel}이에요 💇`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert("링크가 복사되었습니다! 카톡 채팅방에 붙여넣기 해주세요 🚀");
      });
    }
  }

  return (
    <main className="min-h-screen bg-charcoal pb-40 text-cream">

      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-charcoal/90 px-5 py-4 backdrop-blur-md">
        <Link href="/bangs/upload" className="text-base font-medium text-cream/40 hover:text-cream">
          ← 다시 찍기
        </Link>
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
          인생뱅 결과지
        </span>
        <button onClick={handleShare} className="text-base font-medium text-cream/40 hover:text-cream">
          {copied ? "복사됨 ✓" : "공유"}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg px-5">
        <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-5 pt-6">

          {/* ══════════════════════════════════════════════════════════════════
              BLOCK 1: AI 얼굴형 분석 카드
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div variants={FADE_UP} className="overflow-hidden rounded-3xl">
            {photo ? (
              <div className="relative" style={{ aspectRatio: "3/4" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="분석 사진"
                  className="h-full w-full object-cover" />
                {/* 하단 그라디언트 */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-7">
                  <p className="mb-1 text-sm font-bold uppercase tracking-widest text-gold">✦ AI 분석 결과</p>
                  <h1 className="font-serif text-[2rem] font-bold leading-snug text-cream">
                    고객님은<br />
                    <span className="text-gold-light">{faceInfo.title}</span>
                  </h1>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-white/[0.04] py-14">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 text-4xl">✦</div>
                <p className="text-base text-cream/50">AI 분석 결과</p>
                <p className="mt-1 font-serif text-2xl font-bold text-gold-light">{faceInfo.title}</p>
              </div>
            )}
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCK 2: 기본 정의 카드
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
              얼굴형 정의
            </p>
            <p className="text-xl leading-[1.8] text-cream/85">{faceInfo.summary}</p>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCK 2(b): Q1 팩트체크 카드
          ══════════════════════════════════════════════════════════════════ */}
          {safeAnswers.q1 && (
            <motion.div variants={FADE_UP}
              className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
                현재 스타일 팩트체크 · {q1Block.label}
              </p>
              <p className="text-xl leading-[1.8] text-cream/85">{q1Block.text}</p>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              BLOCK 3: 콤플렉스 정밀 분석 (Q2+Q3+Q4 Additive)
          ══════════════════════════════════════════════════════════════════ */}
          {concernBlocks.length > 0 && (
            <motion.div variants={FADE_UP}
              className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                콤플렉스 정밀 분석 ({concernBlocks.length}개 고민 감지)
              </p>
              <div className="space-y-3">
                {concernBlocks.map((b) => (
                  <ConcernCard key={b.key} label={b.label} text={b.text} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              BLOCK 4: ✨ AI 추천 인생 앞머리 (강조 카드)
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div variants={FADE_UP} className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/12 to-transparent">
            <div className="h-1 w-full bg-gradient-to-r from-gold-light via-gold to-gold-dark" />
            <div className="p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold">
                ✨ AI 추천 인생 앞머리
              </p>

              {/* 뱃지 */}
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-gold-dark px-6 py-2.5 font-serif text-2xl font-black text-charcoal">
                  {bangRec.primaryLabel}
                </span>
                <span className="text-cream/40">+</span>
                <span className="rounded-xl border border-gold/45 px-5 py-2 font-serif text-xl font-bold text-gold-light">
                  {bangRec.secondaryLabel}
                </span>
              </div>

              {/* 처방 이유 */}
              <p className="text-xl leading-[1.8] text-cream/85">
                <BoldText text={bangRec.reasonText} />
              </p>

              {/* 피해야 할 스타일 요약 */}
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-5 py-3.5">
                <p className="text-base font-semibold text-red-300/85">
                  ❌ 주의: 지금 스타일에서 무거운 일자 앞머리·강한 볼드 뱅은 피해주세요.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCK 5: 맞춤 제품 추천 (Q5 커머스)
          ══════════════════════════════════════════════════════════════════ */}
          <motion.div variants={FADE_UP}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
              전문가 맞춤 처방 · 제품
            </p>
            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex w-full items-start justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 text-left font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #FF7C98, #C084FC)" }}
            >
              <div className="flex-1 leading-snug">
                <span className="mb-1 block text-3xl">{product.emoji}</span>
                <span className="block text-base font-semibold uppercase tracking-wider opacity-85">
                  {product.headline}
                </span>
                <span className="mt-1 block text-xl font-black">
                  어뷰티 {product.productName}
                </span>
                <span className="mt-1.5 block text-base font-normal opacity-80">
                  {product.description}
                </span>
              </div>
              <span className="flex-none pt-1 text-2xl opacity-80">→</span>
            </a>
            <p className="mt-2 text-center text-xs text-cream/20">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </motion.div>

          {/* 공유 카드 */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-5 text-center">
            <p className="text-lg font-semibold text-cream/85">친구도 인생 앞머리 찾아줄까요? 🤔</p>
            <p className="mt-1 text-base text-cream/40">공유하고 서로 결과를 비교해 보세요</p>
            <button onClick={handleShare}
              className="mt-4 w-full rounded-xl border border-white/15 py-4 text-lg font-semibold text-cream/70 transition-all hover:border-white/30 hover:text-cream active:scale-[0.98]">
              🔗 결과 링크 공유하기
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          <Link href="/bangs"
            className="flex h-16 flex-none items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-6 text-base font-medium text-cream/60 transition-colors hover:text-cream">
            처음부터
          </Link>
          <a href={product.link} target="_blank" rel="noopener noreferrer sponsored"
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-lg font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98]">
            🎁 맞춤 제품 확인하기
          </a>
        </div>
      </div>
    </main>
  );
}
