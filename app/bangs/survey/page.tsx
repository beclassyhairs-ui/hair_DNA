"use client";

// ============================================================================
// 어뷰티 인생뱅 — 6문항 텍스트 전용 설문 (사진 촬영/업로드 단계 없음)
// 1문항씩 표시 · 350ms 자동 이동 · 컴팩트 사이즈로 스크롤 없이 한 화면에 노출
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
const TOTAL = SURVEY_QUESTIONS.length; // 6

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
    qFaceShape: "", q1: "", q2: "", q3: "", q4: "", q5: "",
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
        router.push("/bangs/result");
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
    <main className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-[#F9FAFB] text-[#2F2F2F]">

      {/* ── 헤더: 세그먼트 진행 바 ── */}
      <header className="flex-none border-b border-gray-100 bg-[#F9FAFB]/95 backdrop-blur-md">
        <div className="px-4 pb-2 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
              인생뱅 · {q.stepTag}
            </span>
            <span className="tabular-nums text-xs font-semibold text-[#6B7280]">
              {qIdx + 1}
              <span className="mx-1 text-[#9CA3AF]">/</span>
              {TOTAL}
            </span>
          </div>
          {/* 세그먼트 진행 바 */}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx
                    ? "bg-gold-dark"
                    : i === qIdx
                    ? "bg-gold"
                    : "bg-gray-100"
                }`}
                animate={{ scaleY: i === qIdx ? 1.18 : 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── 질문 본문 ── */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={q.qKey}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col justify-center py-4"
          >
            {/* 질문 헤더 */}
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                {q.no}
              </p>
              <h2 className="font-serif text-lg font-bold leading-snug text-[#2F2F2F]">
                {q.title}
              </h2>
              {q.hint && (
                <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{q.hint}</p>
              )}
            </div>

            {/* 선택지 */}
            <div className="space-y-2">
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
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left transition-all duration-200 ${
                      isSel
                        ? "border-gold bg-gold/10 shadow-[0_2px_16px_rgba(200,168,107,0.22)]"
                        : isNone
                        ? "border-gray-100 bg-white hover:border-gray-200"
                        : "border-gray-100 bg-white shadow-sm hover:border-gold/40 hover:bg-[#FBF6EA]"
                    }`}
                  >
                    {/* 아이콘 */}
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-base transition-colors ${
                        isSel
                          ? "bg-gold-dark text-charcoal"
                          : isNone
                          ? "bg-gray-100 text-[#9CA3AF]"
                          : "bg-gray-100 text-[#6B7280]"
                      }`}
                    >
                      {opt.icon}
                    </span>

                    {/* 텍스트 */}
                    <span className="flex-1">
                      <span
                        className={`block font-bold leading-snug text-sm ${
                          isSel ? "text-gold-dark" : isNone ? "text-[#9CA3AF]" : "text-[#2F2F2F]"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs text-gray-500 ${
                          isSel ? "text-gray-600" : ""
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </span>

                    {/* 선택 체크 */}
                    {isSel && (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 flex-none text-gold">
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
      <div className="flex-none border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2.5">
          {qIdx > 0 ? (
            <button
              onClick={goBack}
              disabled={pending}
              className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#2F2F2F] disabled:opacity-40"
            >
              ← 이전
            </button>
          ) : (
            <a
              href="/bangs"
              className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#2F2F2F]"
            >
              나가기
            </a>
          )}
          <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-xs text-[#9CA3AF]">
            선택하면 자동으로 넘어가요
          </div>
        </div>
      </div>
    </main>
  );
}
