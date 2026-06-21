"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DIAGNOSTICS = [
  { code: "01", label: "Face Mesh 468-Point Scan",   desc: "MediaPipe 랜드마크 정밀 추출" },
  { code: "02", label: "Geometric Ratio Analysis",   desc: "세로·턱·이마 비율 교차 검증" },
  { code: "03", label: "Expert Bang Prescription",   desc: "40종 앞머리 × 8가지 얼굴형 매칭" },
];

export default function BangsLandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#0E0D0C] px-6 py-10 text-cream">

      {/* 배경 장식: 미세한 그리드 라인 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,168,107,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,107,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* 배경 장식: 중앙 원형 글로우 */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, rgba(200,168,107,1) 0%, transparent 70%)" }}
      />

      {/* ── 브랜드 ── */}
      <div className="relative w-full text-center">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.35em] text-gold/60">
          <span className="h-px w-8 bg-gold/40" />
          A-Beauty · Diagnostic System
          <span className="h-px w-8 bg-gold/40" />
        </span>
      </div>

      {/* ── 히어로 ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-full max-w-md flex-col items-center text-center"
      >
        {/* 스캐닝 아이콘 — 기하학적 얼굴 실루엣 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative mb-10 flex h-28 w-28 items-center justify-center"
        >
          {/* 외곽 회전 링 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-gold/20"
          />
          {/* 내부 글로우 원 */}
          <div className="absolute inset-3 rounded-full border border-gold/30 bg-gold/5" />
          {/* 중앙 기하 심벌 */}
          <svg viewBox="0 0 48 48" className="relative h-12 w-12" fill="none">
            <ellipse cx="24" cy="24" rx="10" ry="14" stroke="rgba(200,168,107,0.8)" strokeWidth="1.2" />
            <line x1="24" y1="6" x2="24" y2="14" stroke="rgba(200,168,107,0.5)" strokeWidth="1" />
            <line x1="24" y1="34" x2="24" y2="42" stroke="rgba(200,168,107,0.5)" strokeWidth="1" />
            <line x1="4" y1="24" x2="11" y2="24" stroke="rgba(200,168,107,0.5)" strokeWidth="1" />
            <line x1="37" y1="24" x2="44" y2="24" stroke="rgba(200,168,107,0.5)" strokeWidth="1" />
            <circle cx="24" cy="24" r="1.5" fill="rgba(200,168,107,0.9)" />
          </svg>
          {/* 펄스 링 */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border border-gold/30"
          />
        </motion.div>

        {/* 헤드라인 */}
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-gold/50">
          Bang Prescription System
        </p>
        <h1 className="font-serif text-[2.2rem] font-bold leading-[1.15] tracking-tight text-cream">
          내 인생 앞머리를
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, #E4D2A8, #C8A86B, #A8884A)" }}
          >
            찾아드릴게요
          </span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-cream/45">
          청담동 전문가의 시선으로<br />얼굴형을 분석하고 앞머리를 처방합니다.
        </p>

        {/* 진단 프로세스 카드들 */}
        <div className="mt-10 w-full space-y-2.5">
          {DIAGNOSTICS.map((d, i) => (
            <motion.div
              key={d.code}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.09, duration: 0.5 }}
              className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4"
            >
              <span className="flex-none font-mono text-xs text-gold/35 tracking-wider">{d.code}</span>
              <div className="h-6 w-px bg-gold/15" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-cream/80">{d.label}</p>
                <p className="mt-0.5 text-xs text-cream/30">{d.desc}</p>
              </div>
              <span className="flex-none text-xs text-gold/25">✦</span>
            </motion.div>
          ))}
        </div>

        {/* 소요 시간 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-7 flex items-center gap-5 text-xs text-cream/25"
        >
          <span>약 2분 소요</span>
          <span className="h-3 w-px bg-white/10" />
          <span>사진 1장</span>
          <span className="h-3 w-px bg-white/10" />
          <span>무료</span>
        </motion.div>
      </motion.div>

      {/* ── CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Link
          href="/bangs/survey"
          className="group relative flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl text-base font-bold text-charcoal shadow-[0_8px_28px_rgba(200,168,107,0.35)] transition-all hover:shadow-[0_10px_36px_rgba(200,168,107,0.5)] active:scale-[0.98]"
          style={{ background: "linear-gradient(105deg, #E4D2A8 0%, #C8A86B 50%, #A8884A 100%)" }}
        >
          <span className="relative flex items-center gap-3">
            <span className="text-charcoal/60 text-sm">✦</span>
            <span className="tracking-wide">진단 시작하기</span>
            <span className="text-charcoal/60">→</span>
          </span>
        </Link>
        <p className="mt-3 text-center text-[11px] text-cream/18">
          개인정보 미저장 · 결과는 디바이스에만 보관됩니다
        </p>
      </motion.div>

    </main>
  );
}
