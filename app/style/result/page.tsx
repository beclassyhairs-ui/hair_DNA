"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY, STYLE_PHOTO_KEY, STYLE_UNLOCKED_KEY } from "../constants";
import {
  getStyleEntry,
  getRefImagePath,
  buildCarePrescription,
  getStyleProduct,
} from "../recommend";
import type { StyleAnswers } from "../surveyData";

// ─── Kakao 타입 ───────────────────────────────────────────────────────────────

type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: { sendDefault: (config: Record<string, unknown>) => void };
  Auth?: { login: (opts: { success: (a: unknown) => void; fail: (e: unknown) => void }) => void };
};
declare const kakaoWin: Window & { Kakao?: KakaoSDK };

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? "";
const KAKAO_SDK = "https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js";

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    const w = window as typeof kakaoWin;
    if (w.Kakao) { resolve(); return; }
    if (document.querySelector(`script[src="${KAKAO_SDK}"]`)) {
      const poll = setInterval(() => { if (w.Kakao) { clearInterval(poll); resolve(); } }, 80);
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_SDK; s.onload = () => resolve(); s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

// ─── 카카오 잠금 모달 ─────────────────────────────────────────────────────────

function KakaoLockModal({ onUnlock }: { onUnlock: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    try {
      await loadKakaoSDK();
      const K = (window as typeof kakaoWin).Kakao;
      if (K) {
        if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
        if (K.isInitialized() && K.Auth) {
          K.Auth.login({ success: () => onUnlock(), fail: () => setTimeout(onUnlock, 1000) });
          return;
        }
      }
    } catch { /**/ }
    setTimeout(() => { setLoading(false); onUnlock(); }, 1500);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-charcoal/85 backdrop-blur-xl" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/25 bg-[#141210]"
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="px-7 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">A-Beauty</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-cream">결과지가 완성됐어요!</h2>
          <p className="mt-2 text-sm text-cream/50">AI 맞춤 스타일과 케어 처방전을 확인하세요.</p>
          <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-2xl">
            🔓
          </div>
          <button
            onClick={handleLogin} disabled={loading}
            className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span> 로그인 중...</>
            ) : (
              <><span className="text-xl">💬</span> 카카오 1초 로그인하고 결과 확인하기</>
            )}
          </button>
          <p className="mt-2.5 text-[11px] text-cream/25">별도 가입 없이 카카오 계정으로 바로 확인해요</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 케어 아이템 아이콘 ───────────────────────────────────────────────────────

function CareIcon({ type }: { type: string }) {
  if (type === "density") return (
    <svg className="w-7 h-7 flex-none text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  );
  if (type === "thickness") return (
    <svg className="w-7 h-7 flex-none text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 6v12M16 6v12" />
    </svg>
  );
  if (type === "curl") return (
    <svg className="w-7 h-7 flex-none text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5-3.358 7.5-7.5 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12c0-2.071 1.679-3.75 3.75-3.75" />
    </svg>
  );
  // history
  return (
    <svg className="w-7 h-7 flex-none text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  );
}

// ─── 레퍼런스 이미지 ─────────────────────────────────────────────────────────

function RefImage({ answers, locked }: { answers: StyleAnswers; locked: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <div className={`relative mx-auto w-full max-w-md aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30 transition-all duration-700 ${locked ? "blur-sm" : ""}`}>
      <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gold">
        Style Reference
      </span>
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getRefImagePath(answers)}
          alt="스타일 레퍼런스"
          className="h-full w-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-[9px] uppercase tracking-widest text-cream/20">Reference Image</p>
        </div>
      )}
      {locked && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-2xl">🔒</span></div>}
    </div>
  );
}

// ============================================================================
// 메인 결과 페이지
// ============================================================================

export default function StyleResultPage() {
  const [photo,   setPhoto]   = useState<string | null>(null);
  const [answers, setAnswers] = useState<StyleAnswers>({});
  const [locked,  setLocked]  = useState(true);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (p) setPhoto(p);
      const a = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (a) setAnswers(JSON.parse(a) as StyleAnswers);
      if (sessionStorage.getItem(STYLE_UNLOCKED_KEY) === "1") setLocked(false);
    } catch { /**/ }
    setReady(true);
  }, []);

  function handleUnlock() {
    try { sessionStorage.setItem(STYLE_UNLOCKED_KEY, "1"); } catch { /**/ }
    setLocked(false);
  }

  if (!ready) return (
    <main className="flex min-h-screen items-center justify-center bg-charcoal">
      <p className="text-cream/40">결과를 불러오는 중...</p>
    </main>
  );

  const entry   = getStyleEntry(answers);
  const care    = buildCarePrescription(answers);
  const product = getStyleProduct(answers);

  const LENGTH_LABEL: Record<string, string> = {
    short: "숏", bob: "숏단발", shoulder: "단발", collarbone: "중단발", chest: "긴머리",
  };
  const DESIGN_LABEL: Record<string, string> = {
    straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브",
  };
  const LAYER_LABEL: Record<string, string> = {
    heavy: "일자", medium: "소프트 레이어", light: "허쉬컷",
  };

  const CARE_ITEMS = [
    { type: "density",   label: "숱 케어",    text: care.densityNote },
    { type: "thickness", label: "굵기 케어",   text: care.thicknessNote },
    { type: "curl",      label: "모질 케어",   text: care.curlNote },
    { type: "history",   label: "시술 이력",   text: care.historyNote },
  ];

  return (
    <main className="min-h-screen bg-charcoal text-cream">

      {/* 카카오 잠금 모달 */}
      <AnimatePresence>{locked && <KakaoLockModal onUnlock={handleUnlock} />}</AnimatePresence>

      {/* ── 컨테이너 래퍼 ── */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between py-4">
          <Link href="/style/upload"
            className="flex items-center gap-1.5 text-sm font-bold text-cream/45 hover:text-cream transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            다시 찍기
          </Link>
          <h1 className="font-serif text-xl font-black text-cream">스타일 결과지</h1>
          <Link href="/style" className="text-sm font-bold text-cream/45 hover:text-cream transition-colors">
            처음부터
          </Link>
        </div>

        {/* ── 이미지 그리드 (항상 2열 — 모바일/PC 동일) ── */}
        <div className="mt-6 grid grid-cols-2 gap-3">

          {/* AI SCAN — 유저 사진 */}
          {photo ? (
            <div className={`relative mx-auto w-full max-w-md aspect-square overflow-hidden rounded-2xl border border-white/10 transition-all duration-700 ${locked ? "blur-sm" : ""}`}>
              <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 backdrop-blur-sm">
                <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gold">AI Scan</span>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="AI 스캔 결과"
                className="h-full w-full object-cover"
                style={{ objectPosition: "50% 12%" }} />
              {locked && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="text-2xl">🔒</span></div>}
            </div>
          ) : (
            /* 사진 없을 때 플레이스홀더 */
            <div className="relative mx-auto w-full max-w-md aspect-square flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <p className="text-[9px] uppercase tracking-widest text-cream/20">Your Photo</p>
            </div>
          )}

          {/* Style Reference */}
          <RefImage answers={answers} locked={locked} />
        </div>

        {/* ── 스타일 분석 박스 ── */}
        <div className={`mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-all duration-700 ${locked ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* 스크롤 힌트 */}
          <div className="flex items-center justify-center gap-2 border-b border-white/[0.06] py-4">
            <p className="text-xs text-cream/35 tracking-widest uppercase">
              스크롤하여 맞춤 처방을 확인하세요
            </p>
            <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }}
              className="text-cream/30 text-sm">↓</motion.span>
          </div>

          <div className="p-6">

            {/* 추천 스타일 */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold mb-2">✨ 추천 스타일</p>
                <h2 className="font-serif text-3xl font-extrabold leading-tight text-gold-light sm:text-4xl">
                  {entry.name}
                </h2>
                <p className="mt-2 text-base text-cream/70 leading-relaxed">{entry.mood}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                {[LENGTH_LABEL[answers.q11_length], DESIGN_LABEL[answers.q13_design], LAYER_LABEL[answers.q14_layer]]
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag}
                      className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-bold text-gold-light border border-gold/20">
                      #{tag}
                    </span>
                  ))}
              </div>
            </div>

            {/* 케어 분석 항목 */}
            <div className="space-y-5 border-t border-white/[0.07] pt-6">
              {CARE_ITEMS.map((item) => (
                <div key={item.type} className="flex items-start gap-4">
                  <CareIcon type={item.type} />
                  <div>
                    <h3 className="font-bold text-base text-cream">{item.label}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-cream/65">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 맞춤 제품 카드 */}
            <div className="mt-8 border-t border-white/[0.07] pt-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">맞춤 제품 처방</p>
              <a
                href={product.coupangUrl} target="_blank" rel="noopener noreferrer sponsored"
                className="group flex items-start gap-4 overflow-hidden rounded-2xl px-5 py-5 font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #FF7C98, #C084FC)" }}
              >
                <span className="flex-none text-3xl">{product.emoji}</span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{product.category}</p>
                  <p className="mt-0.5 text-base font-black">{product.name}</p>
                  <p className="mt-0.5 text-xs opacity-80">{product.tagline}</p>
                </div>
                <span className="flex-none pt-1 text-lg opacity-70 transition-transform group-hover:translate-x-1">→</span>
              </a>
              <p className="mt-1.5 text-center text-[10px] text-cream/18">
                이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
              </p>
            </div>

            {/* CTA 버튼 */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <a
                href={product.coupangUrl} target="_blank" rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark px-12 py-4 text-lg font-black text-charcoal shadow-[0_8px_32px_rgba(200,168,107,0.45)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(200,168,107,0.6)] active:scale-[0.98]"
              >
                맞춤 제품 확인하기 →
              </a>
              <div className="flex gap-3 mt-1">
                <Link href="/style"
                  className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-cream/55 transition-all hover:border-white/30 hover:text-cream">
                  다시 진단하기
                </Link>
                <button
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/style` : "/style";
                    if (navigator.share) { navigator.share({ title: "AI 헤어 변신 | 어뷰티", url }).catch(() => {}); }
                    else { navigator.clipboard?.writeText(url).then(() => alert("링크가 복사됐어요!")); }
                  }}
                  className="rounded-full border border-gold/25 bg-gold/10 px-6 py-2.5 text-sm font-semibold text-gold-light transition-all hover:bg-gold/20">
                  🔗 공유하기
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 하단 여백 */}
        <div className="h-12" />
      </div>

      {/* ── 하단 고정 CTA (잠금 상태일 때만) ── */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-charcoal/95 px-4 py-4 backdrop-blur-md sm:px-6"
          >
            <div className="mx-auto max-w-sm">
              <button
                onClick={() => setLocked(true)}
                className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] hover:brightness-95 active:scale-[0.98]"
              >
                <span className="text-lg">💬</span> 카카오 로그인하고 결과 보기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
