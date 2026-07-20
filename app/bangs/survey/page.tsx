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
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";

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
        // 진단 완료 — 마지막 문항 제출 시점. 결과지 열람은 report_view로 별도 계측.
        trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID });
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
    <SilkBackground>
      <main className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden text-[#2F2A22]">

        <TestHeader stepLabel={`인생뱅 · ${q.stepTag}`} current={qIdx + 1} total={TOTAL}>
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
                <h2 className="font-serif text-lg font-bold leading-snug text-[#2F2A22]">
                  {q.title}
                </h2>
                {q.hint && (
                  <p className="mt-2 text-xs leading-relaxed text-[#9C9482]">{q.hint}</p>
                )}
              </div>

              <div className="space-y-2.5">
                {q.options.map((opt) => {
                  const isSel = answers[q.qKey] === opt.id;
                  return (
                    <RoundedOptionButton
                      key={opt.id}
                      icon={opt.icon}
                      label={opt.label}
                      desc={opt.desc}
                      selected={isSel}
                      muted={Boolean(opt.isNone)}
                      disabled={pending}
                      onSelect={() => handleSelect(opt)}
                    />
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── 하단 네비게이션 ── */}
        <div className="flex-none px-5 py-4">
          {qIdx > 0 ? (
            <button
              onClick={goBack}
              disabled={pending}
              className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22] disabled:opacity-40"
            >
              ← 이전
            </button>
          ) : (
            <a href="/bangs" className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22]">
              나가기
            </a>
          )}
          <p className="mt-2 text-center text-[11px] text-[#9C9482]">선택하면 자동으로 넘어가요</p>
        </div>
      </main>
    </SilkBackground>
  );
}
