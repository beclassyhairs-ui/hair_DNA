"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "./constants";
import { getRemainingUses, canUseToday, DAILY_MAX } from "@/lib/dailyLimit";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";

export default function StyleLandingPage() {
  const router = useRouter();
  const [remaining,      setRemaining]      = useState(DAILY_MAX);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem(STYLE_ANSWERS_KEY);
      sessionStorage.removeItem(STYLE_PHOTO_KEY);
      sessionStorage.removeItem(STYLE_GENERATED_KEY);
      sessionStorage.removeItem(STYLE_UNLOCKED_KEY);
    } catch { /**/ }
    setRemaining(getRemainingUses());
  }, []);

  function handleStart() {
    if (!canUseToday()) { setShowLimitModal(true); return; }
    router.push("/style/survey");
  }

  return (
    <SilkBackground>
      <main className="relative mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-6 text-[#2F2A22]">

        {/* ── 소진 모달 ── */}
        <AnimatePresence>
          {showLimitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm"
              onClick={() => setShowLimitModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 16 }}
                className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/90 p-7 text-center shadow-xl backdrop-blur-xl"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="font-serif text-lg font-bold text-[#2F2A22]">오늘의 무료 진단이 끝났어요</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B6355]">
                  하루 무료 진단 횟수({DAILY_MAX}회)를 모두 사용하셨습니다.<br />
                  내일 다시 찾아와 주세요!
                </p>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#F3EEE3] text-sm font-semibold text-[#2F2A22] transition hover:bg-[#EDE7DA]"
                >
                  확인
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-sm flex-col items-center text-center"
        >
          {/* 브랜드 배지 */}
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-[#A8884A]/70">
            <span className="h-px w-6 bg-[#C8A86B]/40" />
            A-Beauty
            <span className="h-px w-6 bg-[#C8A86B]/40" />
          </span>

          {/* 메인 타이틀 */}
          <h1 className="mt-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-[#2F2A22] sm:text-4xl">
            AI가 분석해주는<br />
            내 인생 헤어스타일
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-[#6B6355] sm:text-base">
            나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
          </p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 w-full space-y-3"
          >
            {/* 남은 횟수 뱃지 */}
            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                remaining === 0
                  ? "bg-red-500/10 text-red-500/80"
                  : "bg-[#F3EEE3] text-[#A8884A]"
              }`}>
                {remaining === 0
                  ? "오늘 무료 진단 횟수를 모두 사용했어요"
                  : `오늘 남은 무료 진단 횟수: ${remaining}회`}
              </span>
            </div>

            {/* CTA 버튼 — 횟수 차단 게이트(handleStart)를 그대로 태워야 해서 button 모드로 사용 */}
            <BlackCTAButton onClick={handleStart} className={remaining === 0 ? "opacity-45" : ""}>
              나의 맞춤 스타일 분석하기
            </BlackCTAButton>

            <p className="text-center text-[11px] text-[#9C9482]">
              개인정보 미저장 · 약 2분 소요 · 무료
            </p>

            {/* 재방문 링크 — /my-diary(구 다크 UI) 대신 /home으로 안내 */}
            <GlassCard>
              <Link
                href="/home"
                className="flex h-14 w-full items-center justify-center text-base font-semibold text-[#6B6355] underline underline-offset-[5px] transition-all duration-200 hover:text-[#2F2A22] active:scale-[0.98]"
              >
                이미 분석받으셨나요? · 저장한 진단 보기
              </Link>
            </GlassCard>
          </motion.div>
        </motion.div>
      </main>
    </SilkBackground>
  );
}
