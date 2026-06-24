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

        // Sheets/Blob 저장 — fire-and-forget
        void fetch("/api/submit-diagnosis", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            photoDataUrl: photo,
            answers:      toSheetAnswers(answers),
            treatmentCounts: {},
          }),
        });

        // ★ Promise.allSettled — 두 작업을 병렬 실행, 둘 다 끝났을 때만 결과지로 이동
        // [1] 최소 15초 대기 (광고 노출 + AdSense 수익 보장)
        // [2] Replicate AI 합성 (62초 타임아웃)
        // → API가 15초보다 빠르면 15초 채운 뒤 이동, 느리면 API 완료 시 이동
        await Promise.allSettled([
          new Promise<void>(resolve => setTimeout(resolve, 15_000)),
          (async () => {
            try {
              console.log("[AI] /api/hair-transform 호출 시작...");
              const res  = await fetch("/api/hair-transform", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ userPhoto: photo, answers }),
                signal:  AbortSignal.timeout(62_000),
              });
              const data = await res.json() as { ok: boolean; imageUrl?: string; reason?: string };

              // ★ 콘솔 디버그 — 어떤 URL이 돌아오는지 확인
              console.log("[AI] 응답 전체:", data);
              if (data.ok && data.imageUrl) {
                console.log("[AI] ✅ 최종 AI 이미지 URL:", data.imageUrl);
                try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
              } else {
                console.warn("[AI] ⚠️ 이미지 생성 실패 — reason:", data.reason ?? "unknown");
                console.warn("[AI] ⚠️ REPLICATE_API_TOKEN이 .env.local에 설정되어 있는지 확인하세요.");
              }
            } catch (e) {
              console.error("[AI] ❌ API 호출 예외:", e);
            }
          })(),
        ]);
      } catch { /**/ } finally {
        // 15초 + API 모두 완료 → 결과지 이동 (결과지에서 이중 로딩 없음)
        router.push("/style/result");
      }
    }

    analyze();
  }, [router]);

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#0C0B0A] text-cream">

      {/* ── 상단 40% — 브랜드 배지 + 스피너 + 텍스트 ── */}
      <div className="flex flex-none flex-col items-center justify-center gap-5 px-6 pb-4 pt-10"
        style={{ flex: "0 0 40%" }}>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-wide text-gold">
          ✦ AI 스타일 합성 중
        </span>

        {/* 소형 골드 링 스피너 */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid transparent", borderTopColor: "rgba(200,168,107,0.95)", borderRightColor: "rgba(200,168,107,0.2)" }} />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full"
            style={{ border: "1.5px solid transparent", borderTopColor: "rgba(200,168,107,0.5)", borderLeftColor: "rgba(200,168,107,0.15)" }} />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-gold" />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="max-w-[260px] text-center text-sm font-medium leading-relaxed text-cream/75"
          >
            {STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── 하단 60% — 구글 AdSense 전면 광고 영역 (300×250 이상) ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]"
          style={{ minHeight: "300px" }}>
          <div className="border-b border-white/[0.05] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold/35">
              Sponsored · A-Beauty
            </p>
          </div>
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-8 text-center">
            <div className="mb-3 h-8 w-8 rounded-full border border-gold/20 bg-gold/[0.06] flex items-center justify-center">
              <span className="text-gold/50 text-sm">A</span>
            </div>
            <p className="text-sm font-medium text-cream/22">
              맞춤형 뷰티 정보가 준비 중입니다
            </p>
            <p className="mt-2 text-[11px] text-cream/12">
              Google Ads 300×250 영역
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
