"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { EVENT_NAMES, trackEvent, getUtmSource } from "../../lib/eventTracking";

const LANDING_ID = "damage_check";

export default function DamageCheckLandingPage() {
  useEffect(() => {
    trackEvent(EVENT_NAMES.LANDING_VIEW, {
      landing_id: LANDING_ID,
      source: getUtmSource(),
      diagnosis_type: LANDING_ID,
    });
  }, []);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-between overflow-hidden bg-[#F9FAFB] px-6 py-10 text-[#2F2F2F]">

      {/* 배경 장식: 미세한 그리드 라인 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,168,107,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,107,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
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
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative mb-9 flex h-24 w-24 items-center justify-center rounded-full border border-gold/25 bg-gold/5 text-4xl"
        >
          🔍
        </motion.div>

        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/5 px-4 py-1.5 text-xs font-bold tracking-wide text-gold">
          ✦ 미용실 가기 전 1분 팩트체크
        </span>

        <h1 className="font-serif text-[2.1rem] font-bold leading-[1.2] tracking-tight text-[#2F2F2F]">
          내 머리, 진짜
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, #E4D2A8, #C8A86B, #A8884A)" }}
          >
            손상도는 얼마나 될까?
          </span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[#6B7280]">
          현업 미용사들이 쓰는 시크릿 테스트 3가지로<br />
          비싼 케어 무작정 받기 전에 먼저 확인해보세요.
        </p>
      </motion.div>

      {/* ── CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Link
          href="/damage-check/survey"
          onClick={() => trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID })}
          className="group relative flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl text-base font-bold text-charcoal shadow-[0_8px_28px_rgba(200,168,107,0.35)] transition-all hover:shadow-[0_10px_36px_rgba(200,168,107,0.5)] active:scale-[0.98]"
          style={{ background: "linear-gradient(105deg, #E4D2A8 0%, #C8A86B 50%, #A8884A 100%)" }}
        >
          <span className="relative flex items-center gap-3">
            <span className="text-charcoal/60 text-sm">✦</span>
            <span className="tracking-wide">1분 자가진단 시작하기</span>
            <span className="text-charcoal/60">→</span>
          </span>
        </Link>
        <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">
          개인정보 미저장 · 4문항 · 약 1분 소요
        </p>
      </motion.div>

    </main>
  );
}
