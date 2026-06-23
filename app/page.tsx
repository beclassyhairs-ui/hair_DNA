"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 메인 랜딩 + 4문항 AI 헤어 진단 인라인 설문
// 청담동 프리미엄 헤어살롱 AI 앱 컨셉
// ============================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY } from "./style/constants";
import { getStyleProduct } from "./style/recommend";

// ─── 4문항 빠른 진단 데이터 ──────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "q8_density",
    no: "01",
    step: "모발 상태 파악 중",
    title: "모발 숱이 어느 정도인가요?",
    options: [
      { id: "thick_density",  label: "많음",  desc: "볼륨감이 있는 편이에요" },
      { id: "medium_density", label: "보통",  desc: "일반적인 숱이에요" },
      { id: "thin_density",   label: "적음",  desc: "볼륨이 부족한 편이에요" },
    ],
  },
  {
    id: "q7_thickness",
    no: "02",
    step: "모발 상태 파악 중",
    title: "모발 굵기는 어떤가요?",
    options: [
      { id: "coarse",            label: "굵음",  desc: "모발이 굵고 강한 편이에요" },
      { id: "medium_thickness",  label: "보통",  desc: "일반적인 굵기예요" },
      { id: "fine",              label: "얇음",  desc: "모발이 가늘고 약한 편이에요" },
    ],
  },
  {
    id: "q10_history_count",
    no: "03",
    step: "시술 이력 파악 중",
    title: "1년에 헤어 시술을 몇 번 받으세요?",
    hint: "펌, 염색, 탈색 등 전체 횟수",
    options: [
      { id: "count_1_2",   label: "1~2회",    desc: "전체 펌·염색 위주" },
      { id: "count_3_4",   label: "3~4회",    desc: "주기적인 전체 시술" },
      { id: "count_5_6",   label: "5~6회",    desc: "잦은 스타일 체인지" },
      { id: "count_7plus", label: "7회 이상", desc: "⚠️ 잦은 새치·뿌리 염색" },
    ],
  },
  {
    id: "q3_curl",
    no: "04",
    step: "모질 확인 중",
    title: "곱슬기가 있나요?",
    options: [
      { id: "straight_hair", label: "직모",      desc: "곱슬기 없이 매끈한 편이에요" },
      { id: "wavy_hair",     label: "반곱슬",    desc: "습하면 약간 부스스해져요" },
      { id: "curly_hair",    label: "강한곱슬",  desc: "곱슬이 뚜렷하거나 뻣뻣해요" },
    ],
  },
] as const;

type QId = typeof QUESTIONS[number]["id"];
type Answers = Record<string, string>;

// ─── 진단 결과 저장 타입 ──────────────────────────────────────────────────────

interface SavedDiagnosis {
  answers: Record<string, string>;
  styleName: string;
  savedAt: number;
  isSevereDamage: boolean;
  isLowDensity:   boolean;
  isFineHair:     boolean;
  isCurly:        boolean;
}

// ─── 맞춤 제품 배너 ───────────────────────────────────────────────────────────

function PersonalizedBanner({
  diagnosis, onDismiss,
}: { diagnosis: SavedDiagnosis; onDismiss: () => void }) {
  const product = getStyleProduct(diagnosis.answers);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 w-full overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] to-transparent"
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">맞춤 홈케어 추천</p>
            <p className="mt-0.5 text-sm font-semibold text-cream/80">
              {diagnosis.styleName} 고객님께 맞는 제품이에요
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="ml-3 flex h-6 w-6 flex-none items-center justify-center rounded-full text-cream/30 transition-colors hover:text-cream/60"
            aria-label="닫기"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <a
          href={product.coupangUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-3 flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.07] active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-lg">
            {product.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold/60">{product.category}</p>
            <p className="truncate text-sm font-bold text-cream/85">{product.name}</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-none text-cream/30" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <p className="mt-2 text-center text-[9px] text-cream/18">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
        </p>
      </div>
    </motion.div>
  );
}

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 64 : -64 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64 }),
};

// ─── AI 스캔 애니메이션 ───────────────────────────────────────────────────────

function AIScanIcon() {
  return (
    <div className="relative flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">

      {/* Ring 1: 최외곽 회전 점선 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-gold/18"
      />

      {/* Ring 2: 중간 역방향 회전 */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        className="absolute inset-5 rounded-full border border-dashed border-gold/20"
      />

      {/* Ring 3: 내부 펄스 */}
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-10 rounded-full border border-gold/40"
      />

      {/* 코너 브래킷 SVG + 얼굴 윤곽 */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" fill="none">
        {/* 코너 브래킷 */}
        <path d="M16 16 L16 34 M16 16 L34 16" stroke="rgba(200,168,107,0.55)" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M184 16 L184 34 M184 16 L166 16" stroke="rgba(200,168,107,0.55)" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M16 184 L16 166 M16 184 L34 184" stroke="rgba(200,168,107,0.55)" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M184 184 L184 166 M184 184 L166 184" stroke="rgba(200,168,107,0.55)" strokeWidth="2.2" strokeLinecap="round"/>

        {/* 얼굴 타원 */}
        <ellipse cx="100" cy="100" rx="34" ry="46"
          stroke="rgba(200,168,107,0.85)" strokeWidth="1.5" />

        {/* 측정 기준선 */}
        <line x1="100" y1="52" x2="100" y2="148"
          stroke="rgba(200,168,107,0.28)" strokeWidth="0.8" strokeDasharray="3 5"/>
        <line x1="64"  y1="100" x2="136" y2="100"
          stroke="rgba(200,168,107,0.28)" strokeWidth="0.8" strokeDasharray="3 5"/>

        {/* 핵심 포인트 */}
        <circle cx="100" cy="54"  r="2.2" fill="rgba(200,168,107,0.9)"/>
        <circle cx="100" cy="146" r="2.2" fill="rgba(200,168,107,0.9)"/>
        <circle cx="66"  cy="100" r="2.2" fill="rgba(200,168,107,0.9)"/>
        <circle cx="134" cy="100" r="2.2" fill="rgba(200,168,107,0.9)"/>
        <circle cx="100" cy="100" r="3"   fill="rgba(200,168,107,0.6)"/>
      </svg>

      {/* 스캔 라인 */}
      <motion.div
        className="pointer-events-none absolute left-12 right-12 h-px"
        style={{
          background: "linear-gradient(to right, transparent, rgba(200,168,107,0.9), transparent)",
          boxShadow: "0 0 10px 2px rgba(200,168,107,0.5)",
        }}
        animate={{ top: ["22%", "78%", "22%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 중앙 글로우 */}
      <div
        className="absolute inset-14 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(200,168,107,0.5) 0%, transparent 70%)" }}
      />
    </div>
  );
}

// ─── 랜딩 뷰 ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "◈", label: "얼굴형 정밀 분석",  sub: "468포인트 AI 랜드마크" },
  { icon: "◉", label: "모질 맞춤 진단",    sub: "3가지 비율 교차 검증" },
  { icon: "◆", label: "전문가 스타일 처방", sub: "60종 헤어 데이터베이스" },
];

function LandingView({
  onStart, savedDiagnosis, onDismissDiagnosis,
}: {
  onStart: () => void;
  savedDiagnosis: SavedDiagnosis | null;
  onDismissDiagnosis: () => void;
}) {
  return (
    <motion.main
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.45 }}
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#0C0B0A] px-6 py-10 text-cream"
    >
      {/* 배경 그리드 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }} />
      {/* 배경 글로우 */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }} />

      {/* 브랜드 */}
      <div className="w-full text-center">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · AI Diagnostic System
          <span className="h-px w-6 bg-gold/40" />
        </span>
      </div>

      {/* 히어로 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-xs flex-col items-center text-center"
      >
        {/* 스캔 아이콘 */}
        <AIScanIcon />

        {/* 타이틀 */}
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.32em] text-gold/50">
          Hair Prescription System
        </p>
        <h1 className="mt-3 font-serif text-[2.1rem] font-bold leading-[1.2] tracking-tight text-cream sm:text-4xl">
          AI 얼굴형 &<br />
          <span className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}>
            헤어 분석
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-cream/45 sm:text-base">
          청담동 헤어 전문가가 설계한 AI가<br />
          나만의 최적 헤어스타일을 처방합니다.
        </p>

        {/* 맞춤 배너 OR 피처 배지 */}
        {savedDiagnosis ? (
          <div className="mt-6 w-full">
            <PersonalizedBanner diagnosis={savedDiagnosis} onDismiss={onDismissDiagnosis} />
          </div>
        ) : (
          <div className="mt-8 flex w-full flex-col gap-2.5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="flex items-center gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
              >
                <span className="flex-none text-base text-gold/60">{f.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-cream/80">{f.label}</p>
                  <p className="text-[11px] text-cream/30">{f.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 소요시간 */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          className="mt-5 text-xs text-cream/22">
          약 1분 소요 · 사진 1장 · 무료
        </motion.p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={onStart}
          className="group relative flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
          style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
        >
          <span className="relative flex items-center gap-3 tracking-wide">
            <span className="text-charcoal/55 text-sm">✦</span>
            나의 인생 헤어 찾기 (AI 분석 시작)
            <span className="text-charcoal/55">→</span>
          </span>
        </button>
        <p className="mt-3 text-center text-[11px] text-cream/18">
          개인정보 미저장 · 결과는 디바이스에만 보관됩니다
        </p>
      </motion.div>
    </motion.main>
  );
}

// ─── 설문 뷰 ─────────────────────────────────────────────────────────────────

function SurveyView({
  qIdx, total, dir, q, answers, pending, onSelect, onBack,
}: {
  qIdx: number; total: number; dir: number;
  q: typeof QUESTIONS[number];
  answers: Answers; pending: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <motion.main
      key="survey"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-screen flex-col bg-[#0C0B0A] text-cream"
    >
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0C0B0A]/92 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">
              {q.step}
            </span>
            <span className="font-mono text-sm tabular-nums text-cream/35">
              {qIdx + 1} / {total}
            </span>
          </div>

          {/* 4칸 세그먼트 진행 바 */}
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  i < qIdx ? "bg-gold-dark" : i === qIdx ? "bg-gold" : "bg-white/10"
                }`}
                animate={{ scaleY: i === qIdx ? 1.25 : 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* 질문 영역 */}
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
            className="flex flex-1 flex-col py-8"
          >
            {/* 질문 헤더 */}
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-gold">
                Q{q.no}
              </p>
              <h2 className="font-serif text-[1.75rem] font-bold leading-snug text-cream">
                {q.title}
              </h2>
              {"hint" in q && q.hint && (
                <p className="mt-2 text-sm text-cream/45">{q.hint}</p>
              )}
            </div>

            {/* 선택지 */}
            <div className="space-y-3">
              {q.options.map((opt) => {
                const isSel = answers[q.id] === opt.id;
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
                    {/* 라디오 */}
                    <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      isSel ? "border-gold bg-gold" : "border-white/25"
                    }`}>
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
                      <span className={`mt-0.5 block text-sm ${isSel ? "text-cream/65" : "text-cream/38"}`}>
                        {opt.desc}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 하단 네비게이션 */}
      <div className="sticky bottom-0 z-10 border-t border-white/[0.07] bg-[#0C0B0A]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3 px-5 py-4 pb-8">
          <button
            onClick={onBack}
            disabled={qIdx === 0 || pending}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-7 text-base font-medium text-cream/55 transition-colors hover:border-white/22 hover:text-cream disabled:opacity-30"
          >
            ← 이전
          </button>
          <div className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-sm text-cream/22">
            선택하면 자동으로 넘어가요
          </div>
        </div>
      </div>
    </motion.main>
  );
}

// ─── 완료 전환 화면 ───────────────────────────────────────────────────────────

function DoneView() {
  return (
    <motion.main
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-screen flex-col items-center justify-center bg-[#0C0B0A] text-cream"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="mb-6 text-5xl"
      >
        ✦
      </motion.div>
      <p className="text-base font-semibold text-gold">AI 분석 데이터 저장 완료</p>
      <p className="mt-2 text-sm text-cream/40">사진 등록 페이지로 이동하고 있어요...</p>
    </motion.main>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

type Phase = "landing" | "survey" | "done";

export default function HomePage() {
  const router = useRouter();
  const [phase,          setPhase]          = useState<Phase>("landing");
  const [qIdx,           setQIdx]           = useState(0);
  const [dir,            setDir]            = useState(1);
  const [answers,        setAnswers]        = useState<Answers>({});
  const [pending,        setPending]        = useState(false);
  const [savedDiagnosis, setSavedDiagnosis] = useState<SavedDiagnosis | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("abeauty:savedDiagnosis");
      if (!raw) return;
      const data = JSON.parse(raw) as SavedDiagnosis;
      // 7일 이내 저장 데이터만 표시
      if (Date.now() - data.savedAt < 7 * 24 * 60 * 60 * 1000) {
        setSavedDiagnosis(data);
      }
    } catch { /**/ }
  }, []);

  function handleDismissDiagnosis() {
    setSavedDiagnosis(null);
    try { localStorage.removeItem("abeauty:savedDiagnosis"); } catch { /**/ }
  }

  const q = QUESTIONS[qIdx];

  function handleSelect(optId: string) {
    if (pending) return;
    const next = { ...answers, [q.id]: optId };
    setAnswers(next);
    setPending(true);

    setTimeout(() => {
      setPending(false);
      if (qIdx < QUESTIONS.length - 1) {
        setDir(1);
        setQIdx((i) => i + 1);
      } else {
        // 마지막 문항 완료 → 저장 후 이동
        try { sessionStorage.setItem(STYLE_ANSWERS_KEY, JSON.stringify(next)); } catch { /**/ }
        setPhase("done");
        setTimeout(() => router.push("/style/upload"), 1400);
      }
    }, 350);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  return (
    <AnimatePresence mode="wait">
      {phase === "landing" && (
        <LandingView
          key="landing"
          onStart={() => setPhase("survey")}
          savedDiagnosis={savedDiagnosis}
          onDismissDiagnosis={handleDismissDiagnosis}
        />
      )}
      {phase === "survey" && (
        <SurveyView
          key="survey"
          qIdx={qIdx}
          total={QUESTIONS.length}
          dir={dir}
          q={q}
          answers={answers}
          pending={pending}
          onSelect={handleSelect}
          onBack={goBack}
        />
      )}
      {phase === "done" && <DoneView key="done" />}
    </AnimatePresence>
  );
}
