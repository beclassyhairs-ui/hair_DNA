"use client";

// ============================================================================
// 어뷰티 인생뱅 — 5문항 정밀 설문
// 1문항씩 표시 · 350ms 자동 이동 · 50대 최적화 큰 글씨/버튼
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { BANGS_SURVEY_KEY } from "../constants";
import {
  SURVEY_QUESTIONS,
  type BangsSurveyAnswers,
  type SurveyOption,
} from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";

const LANDING_ID = "bang_test";
const TOTAL = SURVEY_QUESTIONS.length; // 5

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 64 : -64 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64 }),
};

export default function BangsSurveyPage() {
  const router = useRouter();
  const [qIdx, setQIdx]       = useState(0);
  const [dir, setDir]         = useState(1);
  const [pending, setPending] = useState(false);
  const [answers, setAnswers] = useState<BangsSurveyAnswers>({
    q1: "", q2: "", q3: "", q4: "", q5: "",
  });

  const q = SURVEY_QUESTIONS[qIdx];
  const isLast = qIdx === TOTAL - 1;

  function handleSelect(opt: SurveyOption) {
    if (pending) return;
    const newAnswers = { ...answers, [q.qKey]: opt.id };
    setAnswers(newAnswers);
    setPending(true);

    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      answers: { questionKey: q.qKey, optionId: opt.id },
    });

    setTimeout(() => {
      setPending(false);
      if (isLast) {
        try { sessionStorage.setItem(BANGS_SURVEY_KEY, JSON.stringify(newAnswers)); } catch { /**/ }
        router.push("/bangs/upload");
      } else {
        setDir(1);
        setQIdx((i) => i + 1);
      }
    }, 350);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  return (
    <main className="flex min-h-screen flex-col bg-charcoal text-cream">

      {/* ── 헤더: 5칸 진행 바 ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
              인생뱅 · {q.stepTag}
            </span>
            <span className="tabular-nums text-sm font-semibold text-cream/50">
              {qIdx + 1}
              <span className="mx-1 text-cream/20">/</span>
              {TOTAL}
            </span>
          </div>
          {/* 5칸 세그먼트 진행 바 */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx
                    ? "bg-gold-dark"
                    : i === qIdx
                    ? "bg-gold"
                    : "bg-white/10"
                }`}
                animate={{ scaleY: i === qIdx ? 1.18 : 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── 질문 본문 ── */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={q.qKey}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col py-9"
          >
            {/* 질문 헤더 */}
            <div className="mb-8">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-gold">
                {q.no}
              </p>
              <h2 className="font-serif text-[1.85rem] font-bold leading-snug text-cream">
                {q.title}
              </h2>
              {q.hint && (
                <p className="mt-2 text-base leading-relaxed text-cream/55">{q.hint}</p>
              )}
            </div>

            {/* 선택지 */}
            <div className="space-y-3">
              {q.options.map((opt) => {
                const isSel   = answers[q.qKey] === opt.id;
                const isNone  = Boolean(opt.isNone);
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    disabled={pending}
                    whileTap={{ scale: 0.985 }}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-3.5 text-left transition-all duration-200 ${
                      isSel
                        ? "border-gold bg-gold/10 shadow-[0_2px_20px_rgba(200,168,107,0.28)]"
                        : isNone
                        ? "border-white/[0.07] bg-white/[0.03] hover:border-white/15"
                        : "border-white/[0.1] bg-white/[0.05] hover:border-gold/40 hover:bg-white/[0.08]"
                    }`}
                  >
                    {/* 아이콘 */}
                    <span
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xl transition-colors ${
                        isSel
                          ? "bg-gold-dark text-charcoal"
                          : isNone
                          ? "bg-white/[0.07] text-cream/40"
                          : "bg-white/10 text-cream/70"
                      }`}
                    >
                      {opt.icon}
                    </span>

                    {/* 텍스트 */}
                    <span className="flex-1">
                      <span
                        className={`block font-bold leading-snug text-base ${
                          isSel ? "text-gold-light" : isNone ? "text-cream/45" : "text-cream"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-sm ${
                          isSel ? "text-cream/70" : "text-cream/40"
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </span>

                    {/* 선택 체크 */}
                    {isSel && (
                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 flex-none text-gold">
                        <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 하단 네비게이션 ── */}
      <div className="sticky bottom-0 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 pb-8 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          {qIdx > 0 ? (
            <button
              onClick={goBack}
              disabled={pending}
              className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-8 text-lg font-medium text-cream/55 transition-colors hover:text-cream disabled:opacity-40"
            >
              ← 이전
            </button>
          ) : (
            <a
              href="/bangs"
              className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-8 text-lg font-medium text-cream/55 transition-colors hover:text-cream"
            >
              나가기
            </a>
          )}
          <div className="flex h-16 flex-1 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-base text-cream/25">
            선택하면 자동으로 넘어가요
          </div>
        </div>
      </div>
    </main>
  );
}
