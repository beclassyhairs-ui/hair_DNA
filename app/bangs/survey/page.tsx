"use client";

// ============================================================================
// 어뷰티 인생뱅 — 초간단 2문항 설문
// 1문항씩 표시 · 350ms 자동 이동 · 50대 최적화 큰 글씨/버튼
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { BANGS_SURVEY_KEY } from "../constants";

// ─── 설문 데이터 ─────────────────────────────────────────────────────────────

type PartingValue  = "side" | "center" | "allback";
type HasBangsValue = "yes"  | "no";

interface SurveyAnswer {
  parting:  PartingValue | "";
  hasBangs: HasBangsValue | "";
}

const PARTING_OPTIONS: { id: PartingValue; icon: string; label: string; desc: string }[] = [
  {
    id: "side",
    icon: "↗",
    label: "옆가르마",
    desc: "왼쪽 또는 오른쪽으로 가르마를 타요",
  },
  {
    id: "center",
    icon: "↑",
    label: "가운데 가르마",
    desc: "5:5로 정중앙에 가르마를 타요",
  },
  {
    id: "allback",
    icon: "↰",
    label: "가르마 없이 올백",
    desc: "이마를 드러내고 전체를 넘겨요",
  },
];

const BANGS_OPTIONS: { id: HasBangsValue; icon: string; label: string; desc: string }[] = [
  {
    id: "yes",
    icon: "💇",
    label: "앞머리 있음",
    desc: "현재 앞머리가 있어요",
  },
  {
    id: "no",
    icon: "🙆",
    label: "앞머리 없음",
    desc: "이마가 완전히 드러나 있어요",
  },
];

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function BangsSurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [dir, setDir]   = useState(1);
  const [answers, setAnswers] = useState<SurveyAnswer>({ parting: "", hasBangs: "" });
  const [pending, setPending] = useState(false);

  function selectParting(value: PartingValue) {
    if (pending) return;
    const next = { ...answers, parting: value };
    setAnswers(next);
    setPending(true);

    setTimeout(() => {
      setPending(false);
      setDir(1);
      setStep(1);
    }, 350);
  }

  function selectHasBangs(value: HasBangsValue) {
    if (pending) return;
    const next = { ...answers, hasBangs: value };
    setAnswers(next);
    setPending(true);

    setTimeout(() => {
      setPending(false);
      try { sessionStorage.setItem(BANGS_SURVEY_KEY, JSON.stringify(next)); } catch { /**/ }
      router.push("/bangs/upload");
    }, 350);
  }

  function goBack() {
    if (pending || step === 0) return;
    setDir(-1);
    setStep(0);
  }

  return (
    <main className="flex min-h-screen flex-col bg-charcoal text-cream">

      {/* ── 헤더: 2칸 진행 바 ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
              인생뱅 · 설문
            </span>
            <span className="tabular-nums text-sm font-semibold text-cream/50">
              {step + 1}<span className="mx-1 text-cream/20">/</span>2
            </span>
          </div>
          {/* 2칸 세그먼트 */}
          <div className="flex gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full transition-all duration-400 ${
                  i < step
                    ? "bg-gold-dark"
                    : i === step
                    ? "bg-gold"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── 질문 본문 ── */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col py-10"
          >
            {step === 0 ? (
              /* ─ STEP 1: 가르마 ─ */
              <>
                <div className="mb-10">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-gold">
                    Q1 · 가르마
                  </p>
                  <h2 className="font-serif text-[2rem] font-bold leading-snug text-cream">
                    평소 가르마를
                    <br />
                    어느 방향으로 타시나요?
                  </h2>
                </div>

                <div className="space-y-4">
                  {PARTING_OPTIONS.map((opt) => {
                    const isSel = answers.parting === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        onClick={() => selectParting(opt.id)}
                        disabled={pending}
                        whileTap={{ scale: 0.985 }}
                        className={`flex w-full items-center gap-5 rounded-2xl border-2 px-6 py-6 text-left transition-all duration-200 ${
                          isSel
                            ? "border-gold bg-gold/10 shadow-[0_2px_24px_rgba(200,168,107,0.3)]"
                            : "border-white/[0.1] bg-white/[0.04] hover:border-gold/40 hover:bg-white/[0.07]"
                        }`}
                      >
                        {/* 아이콘 */}
                        <span
                          className={`flex h-14 w-14 flex-none items-center justify-center rounded-xl text-2xl font-black transition-colors ${
                            isSel ? "bg-gold-dark text-charcoal" : "bg-white/10 text-cream/60"
                          }`}
                        >
                          {opt.icon}
                        </span>
                        <span className="flex-1">
                          <span className={`block text-2xl font-bold leading-snug ${isSel ? "text-gold-light" : "text-cream"}`}>
                            {opt.label}
                          </span>
                          <span className={`mt-1 block text-lg ${isSel ? "text-cream/70" : "text-cream/45"}`}>
                            {opt.desc}
                          </span>
                        </span>
                        {isSel && (
                          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 flex-none text-gold">
                            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ─ STEP 2: 앞머리 유무 ─ */
              <>
                <div className="mb-10">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-gold">
                    Q2 · 앞머리
                  </p>
                  <h2 className="font-serif text-[2rem] font-bold leading-snug text-cream">
                    현재 앞머리가
                    <br />
                    있으신가요?
                  </h2>
                </div>

                <div className="space-y-4">
                  {BANGS_OPTIONS.map((opt) => {
                    const isSel = answers.hasBangs === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        onClick={() => selectHasBangs(opt.id)}
                        disabled={pending}
                        whileTap={{ scale: 0.985 }}
                        className={`flex w-full items-center gap-5 rounded-2xl border-2 px-6 py-7 text-left transition-all duration-200 ${
                          isSel
                            ? "border-gold bg-gold/10 shadow-[0_2px_24px_rgba(200,168,107,0.3)]"
                            : "border-white/[0.1] bg-white/[0.04] hover:border-gold/40 hover:bg-white/[0.07]"
                        }`}
                      >
                        <span className={`flex h-16 w-16 flex-none items-center justify-center rounded-xl text-4xl transition-colors ${
                          isSel ? "bg-gold-dark/20" : "bg-white/10"
                        }`}>
                          {opt.icon}
                        </span>
                        <span className="flex-1">
                          <span className={`block text-2xl font-bold leading-snug ${isSel ? "text-gold-light" : "text-cream"}`}>
                            {opt.label}
                          </span>
                          <span className={`mt-1 block text-lg ${isSel ? "text-cream/70" : "text-cream/45"}`}>
                            {opt.desc}
                          </span>
                        </span>
                        {isSel && (
                          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 flex-none text-gold">
                            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 하단 네비게이션 ── */}
      <div className="sticky bottom-0 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 pb-8 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          {step > 0 ? (
            <button
              onClick={goBack}
              disabled={pending}
              className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-8 text-lg font-medium text-cream/60 transition-colors hover:border-white/30 hover:text-cream disabled:opacity-40"
            >
              ← 이전
            </button>
          ) : (
            <a
              href="/bangs"
              className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-8 text-lg font-medium text-cream/60 transition-colors hover:border-white/30 hover:text-cream"
            >
              나가기
            </a>
          )}
          <div className="flex h-16 flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-lg text-cream/30">
            선택하면 자동으로 넘어가요
          </div>
        </div>
      </div>
    </main>
  );
}
