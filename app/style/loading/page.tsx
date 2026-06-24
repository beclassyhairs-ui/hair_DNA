"use client";

// ============================================================================
// /style/loading — 비동기 AI 헤어 합성 로딩 페이지
// - 마운트 즉시 /api/hair-transform 호출 (가짜 타이머 없음)
// - API 응답 완료 즉시 /style/result 로 라우팅
// - 대기 중 구글 AdSense 플레이스홀더 노출
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY, STYLE_GENERATED_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";

const STEPS = [
  "AI가 고객님의 두상과 8가지 모질 데이터를 정밀 결합 중입니다...",
  "두상 구조와 희망 스타일 데이터를 정밀 매칭하고 있습니다...",
  "전문가 헤어 데이터베이스에서 최적 스타일을 도출하고 있습니다...",
  "맞춤 케어 처방전과 스타일을 최종 생성하고 있습니다...",
  "마지막 세부 조정 중입니다. 결과지가 곧 완성됩니다...",
];

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const calledRef  = useRef(false); // 중복 호출 방지

  // 텍스트 스텝 로테이션 (시각 연출 — API 와 독립)
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => (i + 1) % STEPS.length), 3_000);
    return () => clearInterval(t);
  }, []);

  // ── 마운트 즉시 API 호출 ────────────────────────────────────────────────────
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function analyze() {
      try {
        const photo   = sessionStorage.getItem(STYLE_PHOTO_KEY);
        const raw     = sessionStorage.getItem(STYLE_ANSWERS_KEY);
        const answers: StyleAnswers = raw ? JSON.parse(raw) : {};

        if (!photo) { router.replace("/style/upload"); return; }

        // Sheets/Blob 저장 — fire-and-forget (결과지 라우팅을 막지 않음)
        void fetch("/api/submit-diagnosis", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            photoDataUrl: photo,
            answers:      toSheetAnswers(answers),
            treatmentCounts: {},
          }),
        });

        // Replicate AI 합성 — 완료까지 대기
        const res  = await fetch("/api/hair-transform", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userPhoto: photo, answers }),
          signal:  AbortSignal.timeout(62_000),
        });
        const data = await res.json() as { ok: boolean; imageUrl?: string };
        if (data.ok && data.imageUrl) {
          try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
        }
      } catch { /**/ } finally {
        // 성공/실패 무관하게 즉시 결과지로 이동
        router.push("/style/result");
      }
    }

    analyze();
  }, [router]);

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-between overflow-hidden bg-[#0C0B0A] px-6 py-14 text-cream">

      {/* 브랜드 배지 */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/5 px-5 py-2 text-sm font-bold tracking-wide text-gold">
        ✦ 어뷰티 AI 스타일 합성 중
      </span>

      {/* 스피너 + 텍스트 */}
      <div className="flex flex-col items-center gap-8 text-center">
        {/* 골드 링 스피너 */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2.5px solid transparent", borderTopColor: "rgba(200,168,107,0.95)", borderRightColor: "rgba(200,168,107,0.25)" }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-5 rounded-full"
            style={{ border: "1.8px solid transparent", borderTopColor: "rgba(200,168,107,0.55)", borderLeftColor: "rgba(200,168,107,0.18)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-2.5 w-2.5 rounded-full bg-gold"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="max-w-xs text-center text-base font-medium leading-relaxed text-cream sm:text-lg"
          >
            {STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 구글 AdSense 플레이스홀더 */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
        <div className="border-b border-white/[0.05] px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold/35">
            Sponsored · A-Beauty
          </p>
        </div>
        <div className="flex min-h-[90px] items-center justify-center px-5 py-6 text-center">
          <div>
            <p className="text-sm leading-relaxed text-cream/22">
              맞춤형 뷰티 정보가 준비 중입니다
            </p>
            <p className="mt-1 text-[10px] text-cream/12">(Google Ads Area)</p>
          </div>
        </div>
      </div>

    </main>
  );
}
