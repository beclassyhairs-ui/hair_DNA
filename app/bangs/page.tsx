"use client";

// ============================================================================
// 어뷰티 — 인생뱅(内生 Bang) 랜딩 페이지
// Deep Charcoal 다크 톤 · 50대 여성 타깃
// ============================================================================

import Link from "next/link";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: "💆", text: "얼굴형 AI 정밀 분석" },
  { icon: "✦",  text: "40종 앞머리 처방 DB" },
  { icon: "🎁", text: "유형별 전문가 제품 추천" },
];

export default function BangsLandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-charcoal px-6 py-10 text-cream">

      {/* ── 브랜드 뱃지 ── */}
      <div className="w-full text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          ✦ 어뷰티(A-Beauty)
        </span>
      </div>

      {/* ── 히어로 섹션 ── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-md flex-col items-center text-center"
      >
        {/* 아이콘 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-5xl"
        >
          💇
        </motion.div>

        {/* 헤드라인 */}
        <h1 className="font-serif text-[2.4rem] font-bold leading-tight text-cream">
          내 인생 앞머리를
          <br />
          <span className="bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">
            찾아드릴게요
          </span>
        </h1>

        <p className="mt-5 text-xl leading-relaxed text-cream/65">
          AI가 얼굴형 · 가르마를 분석해
          <br />
          딱 맞는 앞머리를 처방해 드립니다.
        </p>

        {/* 특징 배지 */}
        <div className="mt-8 flex flex-col gap-3 w-full">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4"
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-lg font-medium text-cream/85">{f.text}</span>
            </motion.div>
          ))}
        </div>

        {/* 소요 시간 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="mt-6 flex items-center gap-4 text-base text-cream/35"
        >
          <span>⏱ 약 2분 소요</span>
          <span className="h-3 w-px bg-white/10" />
          <span>📷 사진 1장</span>
          <span className="h-3 w-px bg-white/10" />
          <span>🆓 무료</span>
        </motion.div>
      </motion.div>

      {/* ── CTA 버튼 ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          href="/bangs/survey"
          className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-xl font-bold text-charcoal shadow-[0_8px_32px_rgba(200,168,107,0.45)] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <span>✦</span>
          내 인생 앞머리 찾기
          <span>→</span>
        </Link>
        <p className="mt-3 text-center text-sm text-cream/25">
          개인정보는 저장되지 않아요 · 언제든 무료로 이용 가능
        </p>
      </motion.div>
    </main>
  );
}
