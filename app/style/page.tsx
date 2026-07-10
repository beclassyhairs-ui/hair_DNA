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
    <main className="relative mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center overflow-hidden bg-[#F9FAFB] px-6 text-[#2F2F2F]">

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
              className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="mb-4 text-4xl">🌙</p>
              <h2 className="font-serif text-lg font-bold text-[#2F2F2F]">오늘의 무료 진단이 끝났어요</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                하루 무료 진단 횟수({DAILY_MAX}회)를 모두 사용하셨습니다.<br />
                내일 다시 찾아와 주세요!
              </p>
              <button
                onClick={() => setShowLimitModal(false)}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-gray-100 text-sm font-semibold text-[#2F2F2F] transition hover:bg-gray-200"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 배경 그리드 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }} />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        {/* 브랜드 배지 */}
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · Hair Style AI
          <span className="h-px w-6 bg-gold/40" />
        </span>

        {/* 메인 타이틀 */}
        <h1 className="mt-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-[#2F2F2F] sm:text-4xl">
          AI가 분석해주는<br />
          <span className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}>
            내 인생 헤어스타일
          </span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-[#6B7280] sm:text-base">
          나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
        </p>

        {/* CTA 버튼 2개 */}
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
                ? "bg-red-500/15 text-red-400/80"
                : "bg-gold/10 text-gold"
            }`}>
              {remaining === 0
                ? "오늘 무료 진단 횟수를 모두 사용했어요"
                : `✦ 오늘 남은 무료 진단 횟수: ${remaining}회`}
            </span>
          </div>

          {/* CTA 버튼 — Link → button (횟수 차단 게이트) */}
          <button
            onClick={handleStart}
            className="flex h-16 w-full items-center justify-center rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
            style={{
              background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)",
              opacity: remaining === 0 ? 0.45 : 1,
            }}
          >
            나의 맞춤 스타일 분석하기 →
          </button>

          <p className="text-center text-[11px] text-[#9CA3AF]">
            개인정보 미저장 · 약 2분 소요 · 무료
          </p>

          {/* 재방문 다이어리 링크 */}
          <Link
            href="/my-diary"
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-gray-200 bg-transparent text-base font-semibold text-[#6B7280] underline underline-offset-[5px] transition-all duration-200 hover:border-gray-300 hover:text-[#2F2F2F] active:scale-[0.98]"
          >
            이미 분석받으셨나요? · 내 다이어리 보기
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
