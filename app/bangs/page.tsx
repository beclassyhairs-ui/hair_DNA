"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

import { EVENT_NAMES, trackEvent } from "../../lib/eventTracking";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";
import CompletionGauge from "@/components/CompletionGauge";

const LANDING_ID = "bang_test";

export default function BangsLandingPage() {
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
          <GlassCard className="mb-9 flex h-28 w-28 items-center justify-center">
            <svg viewBox="0 0 48 48" className="h-12 w-12 text-ink-2" fill="none">
              <ellipse cx="24" cy="24" rx="10" ry="14" stroke="currentColor" strokeWidth="1.2" />
              <line x1="24" y1="6" x2="24" y2="14" stroke="currentColor" strokeWidth="1" />
              <line x1="24" y1="34" x2="24" y2="42" stroke="currentColor" strokeWidth="1" />
              <line x1="4" y1="24" x2="11" y2="24" stroke="currentColor" strokeWidth="1" />
              <line x1="37" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1" />
              <circle cx="24" cy="24" r="1.5" fill="currentColor" />
            </svg>
          </GlassCard>

          <span className="mb-4 inline-flex items-center rounded-pill border border-line bg-surface px-4 py-1.5 text-aux font-medium tracking-wide text-ink-2">
5초 얼굴형 분석
          </span>

          <h1 className="text-h1 text-ink">
            AI가 찾아주는
            <br />
            내 인생 앞머리
          </h1>
          <p className="mt-5 text-body leading-relaxed text-ink-2">
            나의 얼굴 윤곽과 콤플렉스를 분석하여<br />완벽한 앞머리를 처방받으세요.
          </p>
        </motion.div>

        {/* A-1 완성도 게이지 — 랜딩 진입부 */}
        <div className="mb-5 w-full max-w-md">
          <CompletionGauge />
        </div>

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="w-full max-w-md"
        >
          <BlackCTAButton
            href="/bangs/survey"
            onClick={() => trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID })}
          >
            테스트 시작하기
          </BlackCTAButton>
          {/* ⚠️ 실동작 — 사진은 받지 않지만 문항 답변은 이벤트로 서버에 적재된다.
              "개인정보 미저장"으로 되돌리지 말 것. */}
          <p className="mt-3 text-center text-aux text-ink-2">
            사진 촬영 없음 · 결과는 내 기기에 보관돼요
          </p>
        </motion.div>

      </main>
    </SilkBackground>
  );
}
