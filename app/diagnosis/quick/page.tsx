"use client";

// ============================================================================
// 어뷰티 — 린(Lean) 설문 페이지  |  1문항씩 표시 / 자동 다음 이동
// 4060 타깃: 큰 글씨(text-xl+), 큰 터치 영역, 빠른 진행감
//
// 원래 `/diagnosis`였던 페이지. `/diagnosis`가 "AI 진단 허브"로 바뀌면서
// 기존 8문항 설문 플로우는 이 경로로 이동했다. `app/upload/page.tsx`,
// `app/result/page.tsx`의 재진단 링크도 함께 이 경로로 옮겼다.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SURVEY, type Answers, type Question } from "../surveyData";
import { RESULT_STORAGE_KEY, TREATMENT_COUNTS_KEY } from "../../result/recommend";

// 모든 질문을 평탄화 → 8문항 순서 배열
const ALL_QUESTIONS = SURVEY.flatMap((s) => s.questions);
const TOTAL = ALL_QUESTIONS.length; // 8

// q9_damage 선택 → q10_history 자동 파생 (추천 엔진 호환)
const DAMAGE_TO_HISTORY: Record<string, string[]> = {
  healthy: ["none_history"],
  slight:  ["color_regular"],
  damaged: ["perm_regular", "bleach"],
  severe:  ["bleach"],
};

function getStepLabel(idx: number) {
  return idx < 4 ? "STEP 1 · 스타일 결정" : "STEP 2 · 모질 파악";
}

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -56 : 56 }),
};

// ============================================================================
// 메인 페이지
// ============================================================================
export default function DiagnosisQuickPage() {
  const router = useRouter();
  const [qIdx, setQIdx]     = useState(0);
  const [dir, setDir]       = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [pending, setPending] = useState(false); // 자동-이동 대기 중
  const [ready, setReady]   = useState(false);

  // 이전 답변 복원
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw) as Answers);
    } catch { /**/ }
    setReady(true);
  }, []);

  // 답변 변경 시 자동 저장
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(answers)); } catch { /**/ }
  }, [answers, ready]);

  // 질문 전환 시 스크롤 초기화
  useEffect(() => { window.scrollTo(0, 0); }, [qIdx]);

  const q      = ALL_QUESTIONS[qIdx];
  const isLast = qIdx === TOTAL - 1;
  const isAnswered = q ? Boolean(answers[q.id]) : false;

  // 다음 질문으로 이동 (또는 업로드 화면)
  function advance(newAnswers: Answers) {
    try { sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(newAnswers)); } catch { /**/ }
    if (isLast) {
      try { sessionStorage.setItem(TREATMENT_COUNTS_KEY, "{}"); } catch { /**/ }
      router.push("/upload");
    } else {
      setDir(1);
      setQIdx((i) => i + 1);
    }
  }

  // 선택지 클릭 → 하이라이트 후 350ms 뒤 자동 이동
  function handleSelect(optionId: string) {
    if (pending) return;

    const extra: Answers = {};
    if (q.id === "q9_damage") {
      extra.q10_history = DAMAGE_TO_HISTORY[optionId] ?? ["none_history"];
    }
    const newAnswers = { ...answers, [q.id]: optionId, ...extra };
    setAnswers(newAnswers);
    setPending(true);

    setTimeout(() => {
      setPending(false);
      advance(newAnswers);
    }, 350);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  function goNext() {
    if (!isAnswered || pending) return;
    setPending(true);
    setTimeout(() => {
      setPending(false);
      advance(answers);
    }, 160);
  }

  if (!q) return null;

  return (
    <main className="flex min-h-screen flex-col bg-cream">

      {/* ── 상단 헤더: 스텝 라벨 + 8칸 진행 바 ── */}
      <header className="sticky top-0 z-20 border-b border-accent/10 bg-cream/92 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">
              {getStepLabel(qIdx)}
            </span>
            <span className="tabular-nums text-sm font-semibold text-brown-light">
              {qIdx + 1}
              <span className="mx-1 text-brown/25">/</span>
              {TOTAL}
            </span>
          </div>
          {/* 8칸 세그먼트 바 — 완료칸은 gold-dark, 현재칸은 gold(밝게), 미완료는 연하게 */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx
                    ? "bg-gold-dark"
                    : i === qIdx
                    ? "bg-gold"
                    : "bg-accent/12"
                }`}
                animate={{ scaleY: i === qIdx ? 1.15 : 1 }}
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
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-gold-dark">
                {q.no}
              </p>
              <h2 className="font-serif text-[1.8rem] font-bold leading-snug text-brown sm:text-3xl">
                {q.title}
              </h2>
              {q.hint && (
                <p className="mt-2.5 text-base leading-relaxed text-brown-light/80">
                  {q.hint}
                </p>
              )}
            </div>

            {/* 선택지 — 일러스트형 vs 텍스트형 분기 */}
            {q.illustrated ? (
              <IllustratedGrid
                q={q}
                selected={answers[q.id] as string | undefined}
                onSelect={handleSelect}
                pending={pending}
              />
            ) : (
              <OptionList
                q={q}
                selected={answers[q.id] as string | undefined}
                onSelect={handleSelect}
                pending={pending}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 하단 고정 네비게이션 ── */}
      <div className="sticky bottom-0 z-10 border-t border-accent/10 bg-cream/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3 px-5 py-4 pb-8">
          {qIdx > 0 ? (
            <button
              onClick={goBack}
              disabled={pending}
              className="flex h-16 items-center justify-center rounded-2xl border border-accent/25 bg-white px-8 text-lg font-medium text-brown-light transition-colors hover:border-accent/50 active:scale-[0.98] disabled:opacity-40"
            >
              ← 이전
            </button>
          ) : (
            <Link
              href="/"
              className="flex h-16 items-center justify-center rounded-2xl border border-accent/25 bg-white px-8 text-lg font-medium text-brown-light transition-colors hover:border-accent/50"
            >
              나가기
            </Link>
          )}
          <button
            onClick={goNext}
            disabled={!isAnswered || pending}
            className={`flex h-16 flex-1 items-center justify-center gap-1.5 rounded-2xl text-xl font-bold transition-all active:scale-[0.98] ${
              isAnswered && !pending
                ? "bg-brown text-cream shadow-lg shadow-brown/20 hover:bg-brown-dark"
                : "cursor-not-allowed bg-brown/15 text-brown/35"
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
// 텍스트 선택지 목록 — 큰 탭 영역, 큰 글씨
// ============================================================================
function OptionList({
  q,
  selected,
  onSelect,
  pending,
}: {
  q: Question;
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
            className={`flex w-full items-center gap-5 rounded-2xl border-2 px-6 py-5 text-left transition-all duration-200 ${
              isSel
                ? "border-gold bg-champagne shadow-[0_2px_20px_rgba(200,168,107,0.28)]"
                : "border-accent/20 bg-white hover:border-gold/50 hover:bg-champagne/25"
            }`}
          >
            {/* 라디오 인디케이터 */}
            <span
              className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 transition-all duration-200 ${
                isSel
                  ? "border-gold-dark bg-gold-dark"
                  : "border-accent/30 bg-transparent"
              }`}
            >
              {isSel && (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-cream">
                  <path
                    d="M5 12.5l4.5 4.5L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {/* 텍스트 */}
            <span className="flex-1">
              <span
                className={`block text-xl font-bold leading-snug ${
                  isSel ? "text-brown" : "text-brown/80"
                }`}
              >
                {opt.label}
              </span>
              {opt.desc && (
                <span
                  className={`mt-1 block text-base ${
                    isSel ? "text-brown-light" : "text-brown-light/60"
                  }`}
                >
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

// ============================================================================
// 이미지 카드 선택지 — q14_layer(3개 3열) / q13_design(4개 2×2)
// ============================================================================
function IllustratedGrid({
  q,
  selected,
  onSelect,
  pending,
}: {
  q: Question;
  selected: string | undefined;
  onSelect: (id: string) => void;
  pending: boolean;
}) {
  const gridCols = q.options.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {q.options.map((opt) => {
        const isSel = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => !pending && onSelect(opt.id)}
            className={`overflow-hidden rounded-2xl border-2 transition-all duration-200 active:scale-[0.96] ${
              isSel
                ? "border-gold shadow-[0_2px_20px_rgba(200,168,107,0.35)]"
                : "border-accent/15 hover:border-gold/45"
            }`}
          >
            {/* 이미지 영역 */}
            <div
              className={`relative w-full overflow-hidden ${
                isSel ? "bg-champagne/50" : "bg-stone-50"
              }`}
              style={{ aspectRatio: "1 / 1" }}
            >
              {opt.imageSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opt.imageSrc}
                  alt={opt.label}
                  className="absolute inset-0 h-full w-full object-contain p-3"
                />
              )}
              {/* 선택 체크 뱃지 */}
              {isSel && (
                <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold-dark shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-cream">
                    <path
                      d="M5 12.5l4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
            {/* 라벨 */}
            <div className={`px-2 pb-3 pt-2 text-center ${isSel ? "bg-champagne/50" : "bg-white"}`}>
              <p className={`text-base font-bold leading-tight ${isSel ? "text-brown" : "text-brown/80"}`}>
                {opt.label}
              </p>
              {opt.desc && (
                <p className={`mt-0.5 text-xs ${isSel ? "text-brown-light" : "text-brown-light/55"}`}>
                  {opt.desc}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
