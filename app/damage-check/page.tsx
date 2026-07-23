"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { EVENT_NAMES, trackEvent } from "../../lib/eventTracking";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";

const LANDING_ID = "damage_check";

export default function DamageCheckLandingPage() {
  useEffect(() => {
    trackEvent(EVENT_NAMES.LANDING_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
    });
  }, []);

  return (
    <SilkBackground>
      <main className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-between px-page py-12 text-ink">

        {/* ── 브랜드 ── */}
        <div className="w-full text-center">
          <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.35em] text-ink-2">
            <span className="h-px w-8 bg-line" />
            A-Beauty
            <span className="h-px w-8 bg-line" />
          </span>
        </div>

        {/* ── 히어로 ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-md flex-col items-center text-center"
        >
          <GlassCard className="mb-9 flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 48 48" className="h-10 w-10 text-ink-2" fill="none">
              <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="1.2" />
              <path d="M15 24l6 6 12-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </GlassCard>

          <span className="mb-4 inline-flex items-center rounded-pill border border-line bg-surface px-4 py-1.5 text-aux font-medium tracking-wide text-ink-2">
            미용실 가기 전 1분 팩트체크
          </span>

          <h1 className="text-h1 text-ink">
            내 머리, 진짜
            <br />
            손상도는 얼마나 될까?
          </h1>
          <p className="mt-5 text-body leading-relaxed text-ink-2">
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
          {/* ⚠️ 실동작 — 사진은 받지 않지만 문항 답변은 이벤트로 서버에 적재된다.
              "개인정보 미저장"으로 되돌리지 말 것. */}
          <p className="mt-3 text-center text-aux text-ink-2">
            사진 촬영 없음 · 4문항 · 약 1분 소요
          </p>
        </motion.div>

      </main>
    </SilkBackground>
  );
}
