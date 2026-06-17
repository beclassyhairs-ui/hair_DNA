"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  SURVEY,
  TOTAL_QUESTIONS,
  isStepComplete,
  prioritize,
  type Answers,
  type Option,
  type Question,
} from "./surveyData";
import { RESULT_STORAGE_KEY, TREATMENT_COUNTS_KEY } from "../result/recommend";
import { Illustration } from "./Illustrations";

// 이미지 카드용 플레이스홀더 이모지
const IMAGE_CARD_ICON: Record<string, string> = {
  front: "💆", part: "〰️", top: "⬆️", side: "↔️", back: "⬇️",
  add_much: "🚀", reduce: "🍃", none_volume: "✋",
};

const pageVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function DiagnosisPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [treatmentCounts, setTreatmentCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 토스트 자동 소멸
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // 마운트: 저장된 답변 + 시술 횟수 복원
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw) as Answers);
      const rawCounts = sessionStorage.getItem(TREATMENT_COUNTS_KEY);
      if (rawCounts) setTreatmentCounts(JSON.parse(rawCounts) as Record<string, number>);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  // 답변 변경 시 즉시 저장
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(answers)); } catch { /* ignore */ }
  }, [answers, ready]);

  // 시술 횟수 변경 시 즉시 저장
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(TREATMENT_COUNTS_KEY, JSON.stringify(treatmentCounts)); } catch { /* ignore */ }
  }, [treatmentCounts, ready]);

  // 스텝 전환 시 최상단으로
  useEffect(() => { if (typeof window !== "undefined") window.scrollTo(0, 0); }, [stepIndex]);

  const step = SURVEY[stepIndex];
  const isLastStep = stepIndex === SURVEY.length - 1;
  const stepComplete = isStepComplete(step, answers);

  const answeredCount = useMemo(
    () => Object.entries(answers).filter(([, v]) => Array.isArray(v) ? v.length > 0 : Boolean(v)).length,
    [answers],
  );
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  // --- 답변 핸들러 --------------------------------------------------------

  function selectSingle(q: Question, optionId: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
  }

  function toggleMulti(q: Question, optionId: string) {
    // Q3: "해당없음" 배타 + maxSelect 제한
    if (q.id === "q2b_extra_concern") {
      if (optionId === "none_extra") {
        setAnswers((prev) => {
          const arr: string[] = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
          return { ...prev, [q.id]: arr.includes("none_extra") ? [] : ["none_extra"] };
        });
        return;
      }
      const curArr: string[] = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
      const nonNone = curArr.filter((id) => id !== "none_extra");
      if (q.maxSelect && !nonNone.includes(optionId) && nonNone.length >= q.maxSelect) {
        setToastMsg(`최대 ${q.maxSelect}개까지 선택할 수 있어요.`);
        return;
      }
      setAnswers((prev) => {
        const arr: string[] = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
        const withoutNone = arr.filter((id) => id !== "none_extra");
        const next = withoutNone.includes(optionId)
          ? withoutNone.filter((id) => id !== optionId)
          : [...withoutNone, optionId];
        return { ...prev, [q.id]: next };
      });
      return;
    }

    // Q11: '해당없음' ↔ 나머지 항목 상호 배타 처리
    if (q.id === "q10_history") {
      const cur: string[] = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
      if (optionId === "none_history") {
        const isNoneSelected = cur.includes("none_history");
        setAnswers((prev) => ({ ...prev, [q.id]: isNoneSelected ? [] : ["none_history"] }));
        if (!isNoneSelected) setTreatmentCounts({});
      } else {
        const withoutNone = cur.filter((id) => id !== "none_history");
        const isSelected = withoutNone.includes(optionId);
        const next = isSelected
          ? withoutNone.filter((id) => id !== optionId)
          : [...withoutNone, optionId];
        setAnswers((prev) => ({ ...prev, [q.id]: next }));
        if (isSelected) {
          setTreatmentCounts((prev) => { const c = { ...prev }; delete c[optionId]; return c; });
        } else {
          setTreatmentCounts((prev) => ({ ...prev, [optionId]: prev[optionId] ?? 1 }));
        }
      }
      return;
    }

    // 일반 복수 선택 — maxSelect 제한
    if (q.maxSelect) {
      const cur: string[] = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
      if (!cur.includes(optionId) && cur.length >= q.maxSelect) {
        setToastMsg(`최대 ${q.maxSelect}개까지 선택할 수 있어요.`);
        return;
      }
    }
    setAnswers((prev) => {
      const curInner = Array.isArray(prev[q.id]) ? (prev[q.id] as string[]) : [];
      const next = curInner.includes(optionId)
        ? curInner.filter((id) => id !== optionId)
        : [...curInner, optionId];
      return { ...prev, [q.id]: prioritize(q.id, next) };
    });
  }

  function adjustCount(optionId: string, delta: number) {
    setTreatmentCounts((prev) => ({
      ...prev,
      [optionId]: Math.max(1, Math.min(24, (prev[optionId] ?? 1) + delta)),
    }));
  }

  function isSelected(q: Question, optionId: string) {
    const a = answers[q.id];
    return q.type === "multi" ? Array.isArray(a) && a.includes(optionId) : a === optionId;
  }

  function priorityRank(q: Question, optionId: string): number | null {
    if (!q.priority) return null;
    const a = answers[q.id];
    if (!Array.isArray(a)) return null;
    const idx = a.indexOf(optionId);
    return idx >= 0 ? idx + 1 : null;
  }

  // --- 네비게이션 --------------------------------------------------------
  function goNext() {
    if (!stepComplete) return;
    if (isLastStep) {
      try { sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(answers)); } catch { /* ignore */ }
      router.push("/upload");
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
  }

  function goPrev() {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }

  return (
    <main className="min-h-screen bg-cream">
      {/* 토스트 알림 */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28 }}
            className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl bg-brown px-6 py-3 text-sm font-semibold text-cream shadow-xl"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단 진행바 */}
      <header className="sticky top-0 z-20 border-b border-accent/10 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-sm tracking-wide text-brown-light">
            <span className="inline-flex items-center gap-1.5 font-medium text-accent">✦ 어뷰티 정밀 문진</span>
            <span className="tabular-nums">{stepIndex + 1} / {SURVEY.length} 단계</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/15">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark"
              animate={{ width: `${Math.max(progress, 4)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <div className="mx-auto w-full max-w-2xl px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section
            key={step.page}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pt-10 text-center">
              <span className="text-sm font-medium uppercase tracking-[0.2em] text-gold-dark">Step {step.page}</span>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-snug text-brown">{step.section}</h2>
              <p className="mt-3 text-lg text-brown-light">{step.subtitle}</p>
            </div>

            <motion.div className="mt-10 space-y-12" variants={listVariants} initial="hidden" animate="show">
              {step.questions.map((q) => (
                <motion.div key={q.id} variants={itemVariants}>
                  <QuestionBlock
                    q={q}
                    answers={answers}
                    isSelected={isSelected}
                    priorityRank={priorityRank}
                    onSingle={selectSingle}
                    onMulti={toggleMulti}
                    treatmentCounts={treatmentCounts}
                    onAdjustCount={adjustCount}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        </AnimatePresence>

        {/* 하단 네비게이션 — 일반 문서 흐름 (스크롤 후 도달) */}
        <div className="mt-12 border-t border-accent/10">
          <div className="flex w-full items-center gap-3 py-6 pb-16">
            {stepIndex > 0 ? (
              <button
                onClick={goPrev}
                className="flex h-16 items-center justify-center rounded-2xl border border-accent/30 bg-white px-7 text-lg font-medium text-brown-light transition-colors hover:border-accent/50 hover:text-brown active:scale-[0.98]"
              >
                이전
              </button>
            ) : (
              <Link
                href="/"
                className="flex h-16 items-center justify-center rounded-2xl border border-accent/30 bg-white px-7 text-lg font-medium text-brown-light transition-colors hover:border-accent/50 hover:text-brown active:scale-[0.98]"
              >
                나가기
              </Link>
            )}
            <button
              onClick={goNext}
              disabled={!stepComplete}
              className={`flex h-16 flex-1 items-center justify-center rounded-2xl text-xl font-bold transition-all duration-200 active:scale-[0.98] ${
                stepComplete
                  ? "bg-brown text-cream shadow-lg shadow-brown/20 hover:bg-brown-dark"
                  : "cursor-not-allowed bg-brown/20 text-cream/70"
              }`}
            >
              {isLastStep ? "사진 등록하러 가기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// 문항 블록 (렌더 전략 분기)
// ============================================================================
function QuestionBlock({
  q,
  answers,
  isSelected,
  priorityRank,
  onSingle,
  onMulti,
  treatmentCounts,
  onAdjustCount,
}: {
  q: Question;
  answers: Answers;
  isSelected: (q: Question, id: string) => boolean;
  priorityRank: (q: Question, id: string) => number | null;
  onSingle: (q: Question, id: string) => void;
  onMulti: (q: Question, id: string) => void;
  treatmentCounts: Record<string, number>;
  onAdjustCount: (id: string, delta: number) => void;
}) {
  const handle = (opt: Option) =>
    q.type === "multi" ? onMulti(q, opt.id) : onSingle(q, opt.id);

  // 이미지 카드 레이아웃을 사용할 문항
  const isImageCard = q.id === "q15_volume";
  // 시술 이력 문항 (카운터 포함)
  const isTreatmentHistory = q.id === "q10_history";

  return (
    <div>
      {/* 문항 헤더 */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-lg font-semibold text-gold-dark">{q.no}</span>
          {q.type === "multi" && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              {q.maxSelect ? `복수 선택 (최대 ${q.maxSelect}개)` : "복수 선택"}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-2xl font-semibold leading-snug text-brown">{q.title}</h3>
        {q.hint && <p className="mt-2 text-base text-brown-light/80">{q.hint}</p>}
      </div>

      {/* 이미지 카드 그리드 */}
      {isImageCard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 items-start">
          {q.options.map((opt) => (
            <ImageCardOption
              key={opt.id}
              opt={opt}
              selected={isSelected(q, opt.id)}
              rank={priorityRank(q, opt.id)}
              onClick={() => handle(opt)}
            />
          ))}
        </div>
      )}

      {/* 일러스트형 그리드 */}
      {q.illustrated && !isImageCard && (
        <div className="grid grid-cols-2 gap-3 items-start">
          {q.options.map((opt) => (
            <IllustratedOption
              key={opt.id}
              opt={opt}
              selected={isSelected(q, opt.id)}
              rank={priorityRank(q, opt.id)}
              onClick={() => handle(opt)}
            />
          ))}
        </div>
      )}

      {/* 시술 이력 (카운터 포함) */}
      {isTreatmentHistory && (
        <div className="space-y-2">
          {q.options.map((opt) => {
            const sel = isSelected(q, opt.id);
            return (
              <div key={opt.id}>
                <TextOption
                  opt={opt}
                  multi
                  selected={sel}
                  rank={null}
                  onClick={() => handle(opt)}
                />
                <AnimatePresence>
                  {sel && opt.id !== "none_history" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <CounterRow
                        count={treatmentCounts[opt.id] ?? 1}
                        onAdjust={(d) => onAdjustCount(opt.id, d)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* 기본 텍스트 목록 */}
      {!isImageCard && !q.illustrated && !isTreatmentHistory && (
        <div className="space-y-3">
          {q.options.map((opt) => (
            <TextOption
              key={opt.id}
              opt={opt}
              multi={q.type === "multi"}
              selected={isSelected(q, opt.id)}
              rank={priorityRank(q, opt.id)}
              onClick={() => handle(opt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 텍스트형 옵션
// ============================================================================
function TextOption({
  opt, multi, selected, rank, onClick,
}: {
  opt: Option; multi: boolean; selected: boolean; rank: number | null; onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className={`group flex w-full items-center gap-4 rounded-2xl border px-6 py-5 text-left transition-all duration-300 ${
        selected
          ? "border-gold bg-champagne shadow-gold"
          : "border-accent/20 bg-white hover:border-gold/50 hover:bg-champagne/40"
      }`}
    >
      <span
        className={`flex h-7 w-7 flex-none items-center justify-center border-2 transition-all duration-300 ${
          multi ? "rounded-lg" : "rounded-full"
        } ${
          selected
            ? "border-gold-dark bg-gold-dark text-cream"
            : "border-accent/30 bg-transparent text-transparent group-hover:border-gold/60"
        }`}
      >
        <CheckMark show={selected} />
      </span>
      <span className="flex-1">
        <span className={`block text-xl font-semibold transition-colors ${selected ? "text-brown" : "text-brown/90"}`}>
          {opt.label}
        </span>
        {opt.desc && <span className="mt-0.5 block text-base text-brown-light/75">{opt.desc}</span>}
      </span>
      <PriorityBadge rank={rank} />
    </motion.button>
  );
}

// ============================================================================
// 일러스트형 옵션 (Q14, Q15) — peer 방식, 테두리·배경 없음
// ============================================================================
function IllustratedOption({
  opt, selected, rank: _rank, onClick,
}: {
  opt: Option; selected: boolean; rank: number | null; onClick: () => void;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={selected}
        onChange={onClick}
      />
      <div className="bg-stone-50 transition-colors peer-checked:bg-stone-200">
        <div className="relative h-32 w-full overflow-hidden">
          {opt.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={opt.imageSrc}
              alt={opt.label}
              className="absolute top-0 w-full h-[130%] object-contain object-top"
            />
          ) : opt.illustration ? (
            <div className="flex h-full items-center justify-center p-4">
              <Illustration name={opt.illustration} />
            </div>
          ) : null}
        </div>
        <p className="mt-1 px-2 pb-2 text-center text-sm font-semibold text-brown/80">
          {opt.label}
        </p>
        {opt.desc && (
          <p className="pb-1 px-2 text-center text-xs text-brown-light/65">{opt.desc}</p>
        )}
      </div>
    </label>
  );
}

// ============================================================================
// 이미지 카드형 옵션 (Q16, Q17) — peer 방식, 테두리·배경 없음
// ============================================================================
function ImageCardOption({
  opt, selected, rank: _rank, onClick,
}: {
  opt: Option; selected: boolean; rank: number | null; onClick: () => void;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={selected}
        onChange={onClick}
      />
      <div className="bg-stone-50 transition-colors peer-checked:bg-stone-200">
        <div className="relative h-32 w-full overflow-hidden">
          {opt.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={opt.imageSrc}
              alt={opt.label}
              className="absolute top-0 w-full h-[130%] object-contain object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">
              <span>{IMAGE_CARD_ICON[opt.id] ?? "🔲"}</span>
            </div>
          )}
        </div>
        <p className="mt-1 px-1 pb-2 text-center text-xs font-semibold text-brown/80">
          {opt.label}
        </p>
      </div>
    </label>
  );
}

// ============================================================================
// 시술 횟수 카운터
// ============================================================================
function CounterRow({ count, onAdjust }: { count: number; onAdjust: (d: number) => void }) {
  return (
    <div className="mx-4 mb-1 flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-2.5">
      <span className="text-sm text-brown-light">연간 횟수</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/20 bg-white text-lg font-bold text-brown-light transition-colors hover:border-gold/50 hover:text-brown active:scale-95"
        >
          −
        </button>
        <span className="min-w-[2.5ch] text-center text-lg font-bold text-brown">{count}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdjust(+1); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/20 bg-white text-lg font-bold text-brown-light transition-colors hover:border-gold/50 hover:text-brown active:scale-95"
        >
          ＋
        </button>
      </div>
      <span className="text-sm text-brown-light">회</span>
    </div>
  );
}

// ============================================================================
// 공용 조각
// ============================================================================
function CheckMark({ show, small }: { show: boolean; small?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={small ? "h-3.5 w-3.5" : "h-4 w-4"}
      initial={false}
      animate={{ scale: show ? 1 : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.18 }}
    >
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function PriorityBadge({ rank }: { rank: number | null }) {
  return (
    <AnimatePresence>
      {rank !== null && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="inline-flex h-7 min-w-7 flex-none items-center justify-center rounded-full bg-gold-dark px-2 text-sm font-bold text-cream"
          title={`${rank}순위`}
        >
          {rank}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
