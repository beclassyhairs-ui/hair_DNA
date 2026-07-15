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
import { STYLE_ANSWERS_KEY, STYLE_DEBUG_ERROR_KEY, STYLE_GENERATED_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";
import { incrementUsage } from "@/lib/dailyLimit";
import AdBanner from "@/app/components/AdBanner";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";

const STEPS = [
  "AI가 고객님의 두상과 8가지 모질 데이터를 정밀 결합 중입니다...",
  "두상 구조와 희망 스타일 데이터를 정밀 매칭하고 있습니다...",
  "전문가 헤어 데이터베이스에서 최적 스타일을 도출하고 있습니다...",
  "맞춤 케어 처방전과 스타일을 최종 생성하고 있습니다...",
  "마지막 세부 조정 중입니다. 결과지가 곧 완성됩니다...",
];

const HAIR_TIPS = [
  "드라이 마지막 10초는 찬바람으로 마무리하세요. 큐티클이 닫히며 윤기가 살고, 아침에 잡은 스타일이 저녁까지 유지됩니다.",
  "샴푸 전 건식 브러싱 2분이면 두피 노폐물이 떠오르고 모발 엉킴이 풀려, 같은 샴푸로도 세정력이 훨씬 높아집니다.",
  "트리트먼트가 두피에 닿으면 모공을 막아 탈모를 유발합니다. 반드시 귀 아래 모발에만 얇게 도포하세요.",
  "열 스타일링 전 열 보호제는 선택이 아닌 필수입니다. 180°C 고온 한 번이 모발 단백질 구조를 영구 손상시킵니다.",
  "샴푸 시 손끝으로 두피를 30초 마사지하면 혈액순환이 활성화되어 모발 성장 주기 자체가 달라집니다.",
  "펌·컬러 후 48시간은 황금 시간입니다. 이 시간 안에 모발이 젖으면 웨이브가 풀리거나 색이 빠질 수 있어요.",
];

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [tipIdx,  setTipIdx]  = useState(0);
  const calledRef  = useRef(false); // 중복 호출 방지

  // 텍스트 스텝 로테이션 (시각 연출 — API 와 독립)
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => (i + 1) % STEPS.length), 3_000);
    return () => clearInterval(t);
  }, []);

  // 꿀팁 롤링 (2.5초 간격 — STEPS 와 독립)
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % HAIR_TIPS.length), 2_500);
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

        // 이전 디버그 에러 초기화
        try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }

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
              incrementUsage(); // 실제 API 비용 발생 시점에 횟수 차감
              console.log("[AI] /api/hair-transform 호출 시작...");
              const res  = await fetch("/api/hair-transform", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ userPhoto: photo, answers }),
                signal:  AbortSignal.timeout(62_000),
              });
              const data = await res.json() as { ok: boolean; imageUrl?: string; reason?: string; debugError?: string };

              // ★ 콘솔 디버그 — 어떤 URL이 돌아오는지 확인
              console.log("[AI] 응답 전체:", data);
              if (data.ok && data.imageUrl) {
                console.log("[AI] ✅ 최종 AI 이미지 URL:", data.imageUrl);
                try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
                try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
              } else {
                const errMsg = data.debugError ?? `reason: ${data.reason ?? "unknown"} (debugError 없음)`;
                console.warn("[AI] ⚠️ 이미지 생성 실패 —", errMsg);
                // 결과 페이지에서 붉은 글씨로 표시할 실제 에러 저장
                try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
              }
            } catch (e) {
              console.error("[AI] ❌ API 호출 예외:", e);
            }
          })(),
        ]);
      } catch { /**/ } finally {
        // 15초 + API 모두 완료 → 결과지 이동 (결과지에서 이중 로딩 없음)
        // replace 사용: loading을 히스토리에서 제거해 결과지에서 뒤로가기 시
        // 분석중 화면(및 API 재호출)으로 돌아가지 않고 upload로 이동하게 한다.
        router.replace("/style/result");
      }
    }

    analyze();
  }, [router]);

  return (
    <SilkBackground>
      <main className="flex h-[100dvh] flex-col overflow-hidden text-[#2F2A22]">

        {/* ── 상단 40% — 브랜드 배지 + 스피너 + 텍스트 ── */}
        <div className="flex flex-none flex-col items-center justify-center gap-5 px-6 pb-4 pt-10"
          style={{ flex: "0 0 40%" }}>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EDE7DA] bg-white/60 px-4 py-1.5 text-xs font-bold tracking-wide text-[#A8884A]">
            AI 스타일 합성 중
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
              className="h-2 w-2 rounded-full bg-[#C8A86B]" />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={stepIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="max-w-[260px] text-center text-sm font-medium leading-relaxed text-[#4A453B]"
            >
              {STEPS[stepIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── 하단 60% — 헤어 꿀팁 콘텐츠 + AdSense 광고 ── */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 pb-6">

          {/* 헤어 꿀팁 — 롤링 애니메이션 (구글 게시자 콘텐츠 영역) */}
          <div className="flex-none">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#A8884A]">
              기다리는 동안 읽는 헤어 꿀팁
            </p>

            {/* 단일 팁 카드 — fade 롤링 */}
            <GlassCard className="relative flex min-h-[72px] items-center px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 flex-none h-1 w-1 rounded-full bg-[#A8884A]" />
                  <p className="text-[12px] leading-relaxed text-[#4A453B]">{HAIR_TIPS[tipIdx]}</p>
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            {/* 진행 도트 */}
            <div className="mt-2.5 flex justify-center gap-1.5">
              {HAIR_TIPS.map((_, i) => (
                <span key={i}
                  className={`inline-block h-1 rounded-full transition-all duration-300 ${i === tipIdx ? "w-4 bg-[#C8A86B]/70" : "w-1 bg-[#EDE7DA]"}`}
                />
              ))}
            </div>
          </div>

          {/* 구글 AdSense — 슬롯 ID는 AdSense 대시보드에서 발급 후 입력 */}
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm" style={{ minHeight: "250px" }}>
              <AdBanner slot="4013466421" />
            </div>
          </div>

        </div>

      </main>
    </SilkBackground>
  );
}
