"use client";

// ============================================================================
// 어뷰티 셀프 손상도 자가진단 — 4문항 설문 (Q1~Q3 단일선택 자동진행 / Q4 다중선택)
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { DAMAGE_SURVEY_KEY } from "../constants";
import { SURVEY_QUESTIONS, type DamageSurveyAnswers, type HabitFlag } from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";

const LANDING_ID = "damage_check";
const TOTAL = SURVEY_QUESTIONS.length; // 4

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 64 : -64 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64 }),
};

export default function DamageCheckSurveyPage() {
  const router = useRouter();
  const [qIdx, setQIdx]       = useState(0);
  const [dir, setDir]         = useState(1);
  const [pending, setPending] = useState(false);
  const [answers, setAnswers] = useState<DamageSurveyAnswers>({
    q1_pull: "", q2_friction: "", q3_dry: "", q4_habits: [],
  });

  const q = SURVEY_QUESTIONS[qIdx];
  const isLast = qIdx === TOTAL - 1;

  function finishAndGoToResult(finalAnswers: DamageSurveyAnswers) {
    try { sessionStorage.setItem(DAMAGE_SURVEY_KEY, JSON.stringify(finalAnswers)); } catch { /**/ }
    router.push("/damage-check/result");
  }

  function handleSelectSingle(optId: string) {
    if (pending || q.multi) return;
    const newAnswers = { ...answers, [q.qKey]: optId } as DamageSurveyAnswers;
    setAnswers(newAnswers);
    setPending(true);

    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      answers: { questionKey: q.qKey, optionId: optId },
    });

    setTimeout(() => {
      setPending(false);
      if (isLast) {
        finishAndGoToResult(newAnswers);
      } else {
        setDir(1);
        setQIdx((i) => i + 1);
      }
    }, 350);
  }

  function toggleHabit(optId: string) {
    setAnswers((prev) => {
      const id = optId as HabitFlag;
      let habits = prev.q4_habits;
      if (id === "none") {
        habits = habits.includes("none") ? [] : ["none"];
      } else if (habits.includes("none")) {
        habits = [id];
      } else {
        habits = habits.includes(id) ? habits.filter((h) => h !== id) : [...habits, id];
      }
      return { ...prev, q4_habits: habits };
    });
  }

  function handleConfirmMulti() {
    if (answers.q4_habits.length === 0) return;

    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      answers: { questionKey: q.qKey, optionId: answers.q4_habits },
    });

    finishAndGoToResult(answers);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  const isMultiQuestion = q.multi;
  const canConfirmMulti = isMultiQuestion && answers.q4_habits.length > 0;

  return (
    <main className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden bg-[#F9FAFB] text-[#2F2F2F]">

      {/* ── 헤더: 세그먼트 진행 바 ── */}
      <header className="flex-none border-b border-gray-100 bg-[#F9FAFB]/95 backdrop-blur-md">
        <div className="px-4 pb-2 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
              손상도 진단 · {q.stepTag}
            </span>
            <span className="tabular-nums text-xs font-semibold text-[#6B7280]">
              {qIdx + 1}
              <span className="mx-1 text-[#9CA3AF]">/</span>
              {TOTAL}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx ? "bg-gold-dark" : i === qIdx ? "bg-gold" : "bg-gray-100"
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
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                {q.no}
              </p>
              <h2 className="font-serif text-lg font-bold leading-snug text-[#2F2F2F] whitespace-pre-line">
                {q.title}
              </h2>
              {q.hint && (
                <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{q.hint}</p>
              )}
            </div>

            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSel = q.multi
                  ? answers.q4_habits.includes(opt.id as HabitFlag)
                  : answers[q.qKey] === opt.id;

                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => (q.multi ? toggleHabit(opt.id) : handleSelectSingle(opt.id))}
                    disabled={!q.multi && pending}
                    whileTap={{ scale: 0.985 }}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left transition-all duration-200 ${
                      isSel
                        ? "border-gold bg-gold/10 shadow-[0_2px_16px_rgba(200,168,107,0.22)]"
                        : "border-gray-100 bg-white shadow-sm hover:border-gold/40 hover:bg-[#FBF6EA]"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-base transition-colors ${
                        isSel ? "bg-gold-dark text-charcoal" : "bg-gray-100 text-[#6B7280]"
                      }`}
                    >
                      {opt.icon}
                    </span>

                    <span className="flex-1">
                      <span className={`block font-bold leading-snug text-sm ${isSel ? "text-gold-dark" : "text-[#2F2F2F]"}`}>
                        {opt.label}
                      </span>
                      <span className={`mt-0.5 block text-xs text-gray-500 ${isSel ? "text-gray-600" : ""}`}>
                        {opt.desc}
                      </span>
                    </span>

                    {q.multi ? (
                      <span
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors ${
                          isSel ? "border-gold bg-gold" : "border-gray-200 bg-white"
                        }`}
                      >
                        {isSel && (
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-charcoal">
                            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    ) : (
                      isSel && (
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 flex-none text-gold">
                          <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )
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
              href="/damage-check"
              className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#2F2F2F]"
            >
              나가기
            </a>
          )}

          {isMultiQuestion ? (
            <button
              onClick={handleConfirmMulti}
              disabled={!canConfirmMulti}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold text-charcoal transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(105deg, #E4D2A8 0%, #C8A86B 50%, #A8884A 100%)" }}
            >
              진단 결과 보기 →
            </button>
          ) : (
            <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-xs text-[#9CA3AF]">
              선택하면 자동으로 넘어가요
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
