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
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";

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
    <SilkBackground>
      <main className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden text-[#2F2A22]">

        <TestHeader stepLabel={`손상도 진단 · ${q.stepTag}`} current={qIdx + 1} total={TOTAL}>
          <ProgressBar value={((qIdx + 1) / TOTAL) * 100} />
        </TestHeader>

        {/* ── 질문 본문 ── */}
        <div className="flex flex-1 flex-col overflow-y-auto px-5">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={q.qKey}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-center py-6"
            >
              <div className="mb-6">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A8884A]">
                  {q.no}
                </p>
                <h2 className="font-serif text-xl font-bold leading-snug text-[#2F2A22] whitespace-pre-line">
                  {q.title}
                </h2>
                {q.hint && (
                  <p className="mt-2 text-xs leading-relaxed text-[#9C9482]">{q.hint}</p>
                )}
              </div>

              <div className="space-y-2.5">
                {q.options.map((opt) => {
                  const isSel = q.multi
                    ? answers.q4_habits.includes(opt.id as HabitFlag)
                    : answers[q.qKey] === opt.id;

                  return (
                    <RoundedOptionButton
                      key={opt.id}
                      icon={opt.icon}
                      label={opt.label}
                      desc={opt.desc}
                      selected={isSel}
                      multi={q.multi}
                      disabled={!q.multi && pending}
                      onSelect={() => (q.multi ? toggleHabit(opt.id) : handleSelectSingle(opt.id))}
                    />
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── 하단 네비게이션 ── */}
        <div className="flex-none px-5 py-4">
          <div className="flex items-center gap-3">
            {qIdx > 0 ? (
              <button
                onClick={goBack}
                disabled={pending}
                className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22] disabled:opacity-40"
              >
                ← 이전
              </button>
            ) : (
              <a href="/damage-check" className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22]">
                나가기
              </a>
            )}

            {isMultiQuestion && (
              <div className="flex-1">
                <BlackCTAButton onClick={handleConfirmMulti} disabled={!canConfirmMulti} className="h-11">
                  진단 결과 보기 →
                </BlackCTAButton>
              </div>
            )}
          </div>
          {!isMultiQuestion && (
            <p className="mt-2 text-center text-[11px] text-[#9C9482]">선택하면 자동으로 넘어가요</p>
          )}
        </div>
      </main>
    </SilkBackground>
  );
}
