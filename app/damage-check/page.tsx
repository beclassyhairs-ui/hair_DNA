"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { EVENT_NAMES, trackEvent, getUtmSource } from "../../lib/eventTracking";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";

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
    <SilkBackground>
      <main className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-between px-6 py-12 text-[#2F2A22]">

        {/* ── 브랜드 ── */}
        <div className="w-full text-center">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.35em] text-[#A8884A]/70">
            <span className="h-px w-8 bg-[#C8A86B]/40" />
            A-Beauty
            <span className="h-px w-8 bg-[#C8A86B]/40" />
          </span>
        </div>

        {/* ── 히어로 ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-md flex-col items-center text-center"
        >
          <GlassCard className="mb-9 flex h-24 w-24 items-center justify-center text-4xl" accent>
            🔍
          </GlassCard>

          <span className="mb-4 inline-flex items-center rounded-full border border-[#EDE7DA] bg-white/60 px-4 py-1.5 text-xs font-bold tracking-wide text-[#A8884A]">
            ✦ 미용실 가기 전 1분 팩트체크
          </span>

          <h1 className="font-serif text-[2.1rem] font-bold leading-[1.25] tracking-tight text-[#2F2A22]">
            내 머리, 진짜
            <br />
            손상도는 얼마나 될까?
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[#6B6355]">
            현업 미용사들이 쓰는 시크릿 테스트 3가지로<br />
            비싼 케어 무작정 받기 전에 먼저 확인해보세요.
          </p>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <BlackCTAButton
            href="/damage-check/survey"
            onClick={() => trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID })}
          >
            1분 자가진단 시작하기
          </BlackCTAButton>
          <p className="mt-3 text-center text-[11px] text-[#9C9482]">
            개인정보 미저장 · 4문항 · 약 1분 소요
          </p>
        </motion.div>

      </main>
    </SilkBackground>
  );
}
