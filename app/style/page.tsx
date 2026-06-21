"use client";

// ============================================================================
// 어뷰티 스타일 서비스 — 4×4 마이크로 설문 (다크 테마)
// 1문항씩 표시 · 350ms 자동 슬라이드 · Deep Charcoal + Gold
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
  type StyleQuestion,
} from "./surveyData";
import { STYLE_ANSWERS_KEY } from "./constants";

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

// ============================================================================
// 메인 설문 페이지
// ============================================================================
export default function StyleSurveyPage() {
  const router = useRouter();
  const [qIdx,    setQIdx]    = useState(0);
  const [dir,     setDir]     = useState(1);
  const [answers, setAnswers] = useState<StyleAnswers>({});
  const [pending, setPending] = useState(false);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (raw) setAnswers(JSON.parse(raw) as StyleAnswers);
    } catch { /**/ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(STYLE_ANSWERS_KEY, JSON.stringify(answers)); } catch { /**/ }
  }, [answers, ready]);

  useEffect(() => { window.scrollTo(0, 0); }, [qIdx]);

  const q        = ALL_STYLE_QUESTIONS[qIdx];
  const isLast   = qIdx === STYLE_TOTAL - 1;
  const isAnswered = q ? Boolean(answers[q.id]) : false;

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

  function goNext() {
    if (!isAnswered || pending) return;
    setPending(true);
    setTimeout(() => { setPending(false); advance(answers); }, 160);
  }

  if (!q) return null;

  return (
    <main className="flex min-h-screen flex-col bg-charcoal text-cream">

      {/* ── 상단 헤더: 스텝 라벨 + 8칸 진행 바 ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-charcoal/92 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              {getStepLabel(qIdx)}
            </span>
            <span className="tabular-nums text-sm font-semibold text-cream/40">
              {qIdx + 1}
              <span className="mx-1 text-cream/20">/</span>
              {STYLE_TOTAL}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: STYLE_TOTAL }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx ? "bg-gold-dark" : i === qIdx ? "bg-gold" : "bg-white/10"
                }`}
                animate={{ scaleY: i === qIdx ? 1.2 : 1 }}
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
            key={q.id}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col py-8"
          >
            {/* 질문 헤더 */}
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-gold">
                {q.no}
              </p>
              <h2 className="font-serif text-[1.75rem] font-bold leading-snug text-cream">
                {q.title}
              </h2>
              {q.hint && (
                <p className="mt-2.5 text-base leading-relaxed text-cream/50">
                  {q.hint}
                </p>
              )}
            </div>

            {/* 선택지 */}
            <OptionList
              q={q}
              selected={answers[q.id]}
              onSelect={handleSelect}
              pending={pending}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 하단 고정 네비게이션 ── */}
      <div className="sticky bottom-0 z-10 border-t border-white/[0.07] bg-charcoal/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3 px-5 py-4 pb-8">
          {qIdx > 0 ? (
            <button
              onClick={goBack}
              disabled={pending}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 text-base font-medium text-cream/60 transition-colors hover:border-white/25 hover:text-cream active:scale-[0.98] disabled:opacity-40"
            >
              ← 이전
            </button>
          ) : (
            <Link
              href="/"
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 text-base font-medium text-cream/60 transition-colors hover:border-white/25 hover:text-cream"
            >
              나가기
            </Link>
          )}
          <button
            onClick={goNext}
            disabled={!isAnswered || pending}
            className={`flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl text-base font-bold transition-all active:scale-[0.98] ${
              isAnswered && !pending
                ? "bg-gradient-to-r from-gold-light via-gold to-gold-dark text-charcoal shadow-gold hover:brightness-105"
                : "cursor-not-allowed bg-white/10 text-cream/25"
            }`}
          >
            {isLast ? "사진 등록하기" : "다음"} →
          </button>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// 선택지 목록 (다크 테마)
// ============================================================================
function OptionList({
  q, selected, onSelect, pending,
}: {
  q: StyleQuestion;
  selected: string | undefined;
  onSelect: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3">
      {q.options.map((opt) => {
        const isSel = selected === opt.id;
        return (
          <motion.button
            key={opt.id}
            type="button"
            onClick={() => !pending && onSelect(opt.id)}
            whileTap={{ scale: 0.985 }}
            className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 ${
              isSel
                ? "border-gold bg-gold/[0.1] shadow-[0_2px_20px_rgba(200,168,107,0.2)]"
                : "border-white/[0.1] bg-white/[0.03] hover:border-gold/40 hover:bg-white/[0.06]"
            }`}
          >
            {/* 라디오 인디케이터 */}
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 transition-all duration-200 ${
                isSel ? "border-gold bg-gold" : "border-white/25 bg-transparent"
              }`}
            >
              {isSel && (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-charcoal">
                  <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {/* 텍스트 */}
            <span className="flex-1">
              <span className={`block text-lg font-bold leading-snug ${isSel ? "text-gold-light" : "text-cream/85"}`}>
                {opt.label}
              </span>
              {opt.desc && (
                <span className={`mt-0.5 block text-sm ${isSel ? "text-cream/70" : "text-cream/40"}`}>
                  {opt.desc}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
