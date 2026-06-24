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
  type StyleQuestion,
} from "../surveyData";
import { STYLE_ANSWERS_KEY } from "../constants";

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
    <main className="flex min-h-screen flex-col bg-charcoal text-cream">

      {/* 헤더 + 8칸 진행 바 */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-charcoal/92 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              {getStepLabel(qIdx)}
            </span>
            <span className="font-mono tabular-nums text-sm text-cream/35">
              {qIdx + 1} / {STYLE_TOTAL}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: STYLE_TOTAL }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx ? "bg-gold-dark" : i === qIdx ? "bg-gold" : "bg-white/10"
                }`}
                animate={{ scaleY: i === qIdx ? 1.22 : 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* 질문 본문 */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
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
            {/* 질문 헤더 */}
            <div className="mb-6">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-gold">
                Q{q.no}
              </p>
              <h2 className="font-serif text-xl font-bold leading-snug text-cream sm:text-2xl">
                {q.title}
              </h2>
              {q.hint && (
                <p className="mt-2 text-sm leading-relaxed text-cream/45">{q.hint}</p>
              )}
            </div>

            {/* 선택지 — Q1(연령대)만 compact, Q2~Q8 풀사이즈 */}
            <OptionList q={q} selected={answers[q.id]} onSelect={handleSelect} pending={pending} compact={qIdx === 0} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 하단 네비게이션 */}
      <div className="sticky bottom-0 z-10 border-t border-white/[0.07] bg-charcoal/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3 px-5 py-4 pb-8">
          {qIdx > 0 ? (
            <button onClick={goBack} disabled={pending}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 text-base font-medium text-cream/55 transition-colors hover:border-white/25 hover:text-cream disabled:opacity-40">
              ← 이전
            </button>
          ) : (
            <Link href="/style"
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 text-base font-medium text-cream/55 transition-colors hover:border-white/25 hover:text-cream">
              나가기
            </Link>
          )}
          <div className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-sm text-cream/20">
            선택하면 자동으로 넘어가요
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── 선택지 목록 ──────────────────────────────────────────────────────────────

function OptionList({
  q, selected, onSelect, pending, compact = false,
}: {
  q: StyleQuestion;
  selected: string | undefined;
  onSelect: (id: string) => void;
  pending: boolean;
  compact?: boolean; // true = Q1(연령대) 전용 축소 모드
}) {
  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {q.options.map((opt) => {
        const isSel = selected === opt.id;
        return (
          <motion.button
            key={opt.id}
            type="button"
            onClick={() => !pending && onSelect(opt.id)}
            whileTap={{ scale: 0.985 }}
            className={`flex w-full items-center text-left transition-all duration-200 ${
              compact
                ? "h-12 gap-3.5 rounded-xl border-2 px-4"
                : "h-14 gap-4 rounded-xl border-2 px-5"
            } ${
              isSel
                ? "border-gold bg-gold/[0.1] shadow-[0_2px_18px_rgba(200,168,107,0.2)]"
                : "border-white/[0.1] bg-white/[0.03] hover:border-gold/40 hover:bg-white/[0.06]"
            }`}
          >
            {/* 라디오 */}
            <span className={`flex flex-none items-center justify-center rounded-full border-2 transition-all duration-200 ${
              compact ? "h-5 w-5" : "h-6 w-6"
            } ${isSel ? "border-gold bg-gold" : "border-white/25"}`}>
              {isSel && (
                <svg viewBox="0 0 24 24" fill="none" className={compact ? "h-3 w-3 text-charcoal" : "h-3.5 w-3.5 text-charcoal"}>
                  <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {/* 텍스트 */}
            <span className="flex flex-1 items-baseline gap-2.5">
              <span className={`font-semibold leading-tight ${compact ? "text-sm" : "text-base"} ${isSel ? "text-gold-light" : "text-cream/85"}`}>
                {opt.label}
              </span>
              {opt.desc && (
                <span className={`text-xs ${isSel ? "text-cream/60" : "text-cream/35"}`}>
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
