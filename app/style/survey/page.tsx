"use client";

// ============================================================================
// 어뷰티 스타일 서비스 — 8문항 설문 (항상 Q1부터 시작, 텍스트 최적화)
// STEP 1(1~4) 스타일 결정 → STEP 2(5~8) 모질 파악 → /style/upload
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ALL_STYLE_QUESTIONS,
  STYLE_TOTAL,
  STYLE_SURVEY,
  type StyleAnswers,
} from "../surveyData";
import { STYLE_ANSWERS_KEY } from "../constants";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";

function getStepLabel(idx: number) {
  let count = 0;
  for (const step of STYLE_SURVEY) {
    const next = count + step.questions.length;
    if (idx < next) return step.label;
    count = next;
  }
  return "";
}

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

  const q      = ALL_STYLE_QUESTIONS[qIdx];
  const isLast = qIdx === STYLE_TOTAL - 1;

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
    const next = { ...answers, [q.id]: optId };
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

        <TestHeader stepLabel={getStepLabel(qIdx)} current={qIdx + 1} total={STYLE_TOTAL}>
          <ProgressBar value={((qIdx + 1) / STYLE_TOTAL) * 100} />
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
                {q.options.map((opt) => (
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
