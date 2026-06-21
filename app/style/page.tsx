"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { STYLE_ANSWERS_KEY } from "./constants";

export default function StyleLandingPage() {
  function clearAndStart() {
    try { sessionStorage.removeItem(STYLE_ANSWERS_KEY); } catch { /**/ }
  }

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-between overflow-hidden bg-[#0C0B0A] px-6 py-10 text-cream">

      {/* 배경 그리드 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
      <div className="pointer-events-none absolute left-1/2 top-2/5 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }} />

      {/* 브랜드 */}
      <div className="relative w-full text-center">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · Hair Style AI
          <span className="h-px w-6 bg-gold/40" />
        </span>
      </div>

      {/* 히어로 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center"
      >
        {/* 스캔 아이콘 */}
        <div className="relative mb-10 flex h-32 w-32 items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-gold/20" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border border-dashed border-gold/15" />
          <div className="absolute inset-8 rounded-full border border-gold/35 bg-gold/5" />
          <motion.div animate={{ scale: [1, 1.45, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border border-gold/25" />
          <svg viewBox="0 0 48 48" className="relative h-10 w-10" fill="none">
            <ellipse cx="24" cy="24" rx="9" ry="13" stroke="rgba(200,168,107,0.85)" strokeWidth="1.2" />
            <line x1="24" y1="7"  x2="24" y2="13" stroke="rgba(200,168,107,0.45)" strokeWidth="1" />
            <line x1="24" y1="35" x2="24" y2="41" stroke="rgba(200,168,107,0.45)" strokeWidth="1" />
            <line x1="5"  y1="24" x2="11" y2="24" stroke="rgba(200,168,107,0.45)" strokeWidth="1" />
            <line x1="37" y1="24" x2="43" y2="24" stroke="rgba(200,168,107,0.45)" strokeWidth="1" />
            <circle cx="24" cy="24" r="1.4" fill="rgba(200,168,107,0.9)" />
          </svg>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-gold/45">
          Hair Prescription System
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-cream sm:text-4xl">
          AI가 분석해주는<br />
          <span className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}>
            내 인생 헤어스타일
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-cream/45 sm:text-base">
          나의 모질과 희망 스타일을 분석해<br className="sm:hidden" /> 최적의 헤어를 처방합니다.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <Link
          href="/style/survey"
          onClick={clearAndStart}
          className="flex h-16 w-full items-center justify-center rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
          style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
        >
          나의 맞춤 스타일 분석하기 →
        </Link>
        <p className="mt-3 text-center text-[11px] text-cream/18">
          개인정보 미저장 · 약 2분 소요 · 무료
        </p>
      </motion.div>

    </main>
  );
}
