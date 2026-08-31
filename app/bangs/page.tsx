"use client";

// ============================================================================
// 인생 앞머리 진단 랜딩  [아이보리 리뱀프 3단계 · 진단 랜딩]
// 디자인 SSOT: docs/ui-spec.html §3 — 액자 히어로(모델 사진) + 명조 헤드라인
//   + 차콜 CTA. 흰 카드는 액자 1장뿐. 완성도 게이지는 인라인(플랫).
// ============================================================================

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { EVENT_NAMES, trackEvent } from "../../lib/eventTracking";
import InlineCompletion from "@/components/InlineCompletion";
import LandingFrameHero from "@/app/components/LandingFrameHero";

const LANDING_ID = "bang_test";

export default function BangsLandingPage() {
  useEffect(() => {
    trackEvent(EVENT_NAMES.LANDING_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
    });
  }, []);

  return (
    <div className="relative min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-page py-10 text-ink">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-sm flex-col items-center text-center"
        >
          <span className="font-serif text-[13px] tracking-[0.3em] text-sub">MIALTIP</span>

          {/* 액자 히어로 (유일한 흰 카드) */}
          <div className="mt-5 w-full">
            <LandingFrameHero src="/landing/bangs-hero.jpg" caption="EXAMPLE · 앞머리 진단" />
          </div>

          <span className="mt-6 inline-flex items-center rounded-pill bg-soft px-4 py-1.5 text-aux font-medium tracking-wide text-sub">
            5초 얼굴형 분석
          </span>

          <h1 className="mt-4 font-serif text-h1 font-semibold leading-[1.4] text-ink">
            AI가 찾아주는<br />내 인생 앞머리
          </h1>
          <p className="mt-4 text-body leading-relaxed text-sub">
            나의 얼굴 윤곽과 콤플렉스를 분석하여<br />완벽한 앞머리를 처방받으세요.
          </p>

          <div className="mt-8 w-full space-y-4">
            {/* 완성도 게이지 — 인라인(카드 아님) */}
            <InlineCompletion className="justify-center" />

            <Link
              href="/bangs/survey"
              onClick={() => trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID })}
              className="btn-primary w-full"
            >
              테스트 시작하기
            </Link>
            {/* ⚠️ 실동작 — 사진은 받지 않지만 문항 답변은 이벤트로 서버에 적재된다.
                "개인정보 미저장"으로 되돌리지 말 것. */}
            <p className="text-center text-aux text-sub">사진 촬영 없음 · 결과는 내 기기에 보관돼요</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
