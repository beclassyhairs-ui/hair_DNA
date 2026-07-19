"use client";

// ============================================================================
// 어뷰티 스타일 서비스 — 8문항 설문 (항상 Q1부터 시작, 텍스트 최적화)
// STEP 1(1~4) 스타일 결정 → STEP 2(5~8) 모질 파악 → /style/upload
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ALL_STYLE_QUESTIONS,
  STYLE_SURVEY,
  isShortLength,
  type StyleAnswers,
} from "../surveyData";
import { STYLE_ANSWERS_KEY } from "../constants";
import { EVENT_NAMES, trackEvent } from "@/lib/eventTracking";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";

// 질문 id → STEP 라벨 (visibleQuestions로 필터링돼도 인덱스와 무관하게 항상 정확함)
const STEP_LABEL_BY_QID: Record<string, string> = Object.fromEntries(
  STYLE_SURVEY.flatMap((step) => step.questions.map((sq) => [sq.id, step.label])),
);

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -56 : 56 }),
};

export default function StyleSurveyPage() {
  const router = useRouter();
  const [qIdx,    setQIdx]    = useState(0);
  const [dir,     setDir]     = useState(1);
  const [answers, setAnswers] = useState<StyleAnswers>({});
  const [pending, setPending] = useState(false);

  // ★ Next.js Router Cache 대응: 네비게이션 복원 상태가 남아있어도 항상 Q1부터 강제 시작
  useEffect(() => {
    setQIdx(0);
    setDir(1);
    setAnswers({});
  }, []);

  // short/short_bob이면 q14_layer 질문 자체를 화면에서 숨긴다(값은 handleSelect에서 자동 저장)
  const visibleQuestions = useMemo(
    () => ALL_STYLE_QUESTIONS.filter(
      (item) => item.id !== "q14_layer" || !isShortLength(answers.q11_length),
    ),
    [answers.q11_length],
  );
  const visibleTotal = visibleQuestions.length;

  const q      = visibleQuestions[qIdx];
  const isLast = qIdx === visibleTotal - 1;

  // q13_design은 질문 자체는 유지하고 short/short_bob일 때 s_curl 옵션만 숨긴다
  const visibleOptions =
    q?.id === "q13_design" && isShortLength(answers.q11_length)
      ? q.options.filter((opt) => opt.id !== "s_curl")
      : q?.options ?? [];

  function advance(next: StyleAnswers) {
    try { sessionStorage.setItem(STYLE_ANSWERS_KEY, JSON.stringify(next)); } catch { /**/ }
    if (isLast) {
      router.push("/style/upload");
    } else {
      setDir(1);
      setQIdx((i) => i + 1);
    }
  }

  function handleSelect(optId: string) {
    if (pending) return;
    const next: StyleAnswers = { ...answers, [q.id]: optId };

    if (q.id === "q11_length") {
      if (isShortLength(optId)) {
        // 레이어드 질문이 숨겨지므로 내부적으로 "가벼움"을 자동 저장
        next.q14_layer = "light";
        // 새 정책상 short/short_bob + s_curl 조합은 없으므로 남아있던 값 정리
        if (next.q13_design === "s_curl") delete next.q13_design;
      } else if (isShortLength(answers.q11_length)) {
        // short/short_bob → 단발 이상으로 전환: 자동 저장값을 지워 재선택을 유도
        delete next.q14_layer;
      }
    }

    // 문항 답변 — 진단 드롭오프 분석용 (qIdx는 0-based → 1-based 문항번호로 기록)
    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: "style",
      diagnosis_type: "style",
      answers: { questionId: q.id, choice: optId, step: qIdx + 1 },
    });

    setAnswers(next);
    setPending(true);
    setTimeout(() => { setPending(false); advance(next); }, 350);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  if (!q) return null;

  return (
    <SilkBackground>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col text-[#2F2A22]">

        <TestHeader stepLabel={STEP_LABEL_BY_QID[q.id] ?? ""} current={qIdx + 1} total={visibleTotal}>
          <ProgressBar value={((qIdx + 1) / visibleTotal) * 100} />
        </TestHeader>

        {/* 질문 본문 */}
        <div className="flex flex-1 flex-col px-5">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={q.id}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col py-7"
            >
              <div className="mb-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#A8884A]">
                  Q{q.no}
                </p>
                <h2 className="font-serif text-xl font-bold leading-snug text-[#2F2A22] sm:text-2xl">
                  {q.title}
                </h2>
                {q.hint && (
                  <p className="mt-2 text-sm leading-relaxed text-[#9C9482]">{q.hint}</p>
                )}
              </div>

              <div className="space-y-2.5">
                {visibleOptions.map((opt) => (
                  <RoundedOptionButton
                    key={opt.id}
                    label={opt.label}
                    desc={opt.desc}
                    selected={answers[q.id] === opt.id}
                    disabled={pending}
                    onSelect={() => handleSelect(opt.id)}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 하단 네비게이션 */}
        <div className="flex-none px-5 pb-8 pt-4">
          {qIdx > 0 ? (
            <button onClick={goBack} disabled={pending}
              className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22] disabled:opacity-40">
              ← 이전
            </button>
          ) : (
            <Link href="/style" className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22]">
              나가기
            </Link>
          )}
          <p className="mt-2 text-center text-[11px] text-[#9C9482]">선택하면 자동으로 넘어가요</p>
        </div>
      </main>
    </SilkBackground>
  );
}
