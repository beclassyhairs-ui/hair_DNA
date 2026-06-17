"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

// ============================================================================
// 질문 데이터 — 12문항
// 축 순서: EI(Q1-3) / JP(Q4-6) / TF(Q7-9) / SN(Q10-12)
// A 선택 → E, J, T, S 점수 +1 / B 선택 → 해당 축 점수 변화 없음
// ============================================================================
type Axis = "EI" | "JP" | "TF" | "SN";

interface Question {
  id: number;
  axis: Axis;
  emoji: string;
  text: string;
  a: { label: string; hint: string };
  b: { label: string; hint: string };
}

const MBTI_QUESTIONS: Question[] = [
  // ── 에너지 방향 (E vs I) ─────────────────────────────────────────────────
  {
    id: 1, axis: "EI", emoji: "💆",
    text: "미용실 의자에 앉았을 때,\n당신의 마음속 생각은?",
    a: {
      label: "\"원장님 오늘 점심 뭐 드셨어요?\"",
      hint: "스몰토크 시동 부릉부릉",
    },
    b: {
      label: "'제발... 말 걸지 말고 빨리 끝내주세요...'",
      hint: "눈 감고 자는 척",
    },
  },
  {
    id: 2, axis: "EI", emoji: "✨",
    text: "헤어스타일을 확 바꾼 다음 날,\n친구가 \"머리 예쁘다!\"라고 할 때 내 반응은?",
    a: {
      label: "\"그치?! 나 이번에 청담동 스타일로 레이어드 빡! 넣었잖아~\"",
      hint: "TMI 무한 방출",
    },
    b: {
      label: "\"아, 고, 고마워...\"",
      hint: "주목받는 게 머쓱한데 속으론 입꼬리 씰룩",
    },
  },
  {
    id: 3, axis: "EI", emoji: "📅",
    text: "미용실 예약 당일,\n당신의 기분은?",
    a: {
      label: "\"오늘 기분 전환 제대로 해야지! 수다 떨 생각에 힐링 됨\"",
      hint: "샵이 놀이터",
    },
    b: {
      label: "\"아... 또 3시간 앉아있어야 하네. 기 빨린다...\"",
      hint: "에너지 방전 예약됨",
    },
  },
  // ── 일상 관리 습관 (J vs P) ──────────────────────────────────────────────
  {
    id: 4, axis: "JP", emoji: "⏰",
    text: "아침에 늦잠을 잤다!\n당신의 선택은?",
    a: {
      label: "지각하더라도 머리는 감고 세팅해야지!",
      hint: "앞머리 볼륨은 내 자존심",
    },
    b: {
      label: "드라이샴푸 칙칙 뿌리고 모자 푹 눌러쓰면 외출 준비 끝!",
      hint: "이미 최적화돼 있음",
    },
  },
  {
    id: 5, axis: "JP", emoji: "📋",
    text: "내일 결혼식 등 정말 중요한 약속이 있다.\n전날 밤 당신은?",
    a: {
      label: "입을 옷, 헤어 롤 위치, 고데기 온도까지 미리 시뮬레이션 완료",
      hint: "내일 아침은 실행만 하면 됨",
    },
    b: {
      label: "\"음~ 내일 아침에 삘 꽂히는 대로 해야지~ 일단 자자\"",
      hint: "미리 걱정해봤자",
    },
  },
  {
    id: 6, axis: "JP", emoji: "🪞",
    text: "평소 외출 직전,\n거울 앞 당신의 모습은?",
    a: {
      label: "앞머리 볼륨부터 뒷머리 뻗침까지 확인하고 픽서로 완벽 고정",
      hint: "오차 범위 0%",
    },
    b: {
      label: "거울 쓱 보고 \"음, 사람 몰골이네. 나가자.\"",
      hint: "10초 컷",
    },
  },
  // ── 위기 대처 방식 (T vs F) ──────────────────────────────────────────────
  {
    id: 7, axis: "TF", emoji: "😱",
    text: "큰맘 먹고 파마를 했는데,\n해그리드가 되었다.",
    a: {
      label: "\"원장님, 이거 AS 되나요? 매직으로 펴려면 며칠 뒤에 오죠?\"",
      hint: "감정 접고 현실 파악부터",
    },
    b: {
      label: "\"아아악!! 당분간 아무도 안 만날 거야 ㅠㅠ\"",
      hint: "오열하며 캡모자 쇼핑",
    },
  },
  {
    id: 8, axis: "TF", emoji: "😢",
    text: "디자이너가\n\"모발이 상해서 펌이 다 녹았어요...\"라고 하면?",
    a: {
      label: "\"상한 거 다 잘라내면 몇 cm? 클리닉은 얼마죠?\"",
      hint: "현실적 대안 즉시 모색",
    },
    b: {
      label: "\"네...? 헐... 내 머리...ㅠㅠ 저 진짜 어떡해요...\"",
      hint: "세상이 무너지는 기분",
    },
  },
  {
    id: 9, axis: "TF", emoji: "🥺",
    text: "친구가 앞머리를 처참하게 쥐 파먹고 와서\n우울해할 때, 나의 첫마디는?",
    a: {
      label: "\"근데 앞머리 금방 자라. '망한 앞머리 넘기는 법' 유튜브 쳐봐\"",
      hint: "현실 솔루션 제공",
    },
    b: {
      label: "\"헐 미친!! 어느 미용실이야? 환불받으러 같이 가자ㅠㅠ\"",
      hint: "같이 분노해 줌",
    },
  },
  // ── 변화에 대한 태도 (S vs N) ────────────────────────────────────────────
  {
    id: 10, axis: "SN", emoji: "💭",
    text: "미용실에 가야겠다고 마음먹는\n결정적인 순간은?",
    a: {
      label: "뿌리 염색 시기가 됐거나 뻗쳐서 물리적으로 지저분해 보일 때",
      hint: "현실적·물리적 신호에 반응",
    },
    b: {
      label: "새벽 2시, 릴스에 뜬 아이돌 단발머리를 보고 삘 꽂혔을 때",
      hint: "감성적 충동 신호에 반응",
    },
  },
  {
    id: 11, axis: "SN", emoji: "💬",
    text: "디자이너가 \"오늘은 어떻게 해드릴까요?\"\n라고 물었을 때 당신의 대답은?",
    a: {
      label: "\"끝에 3cm만 다듬고 층은 내지 마세요. 이 사진이랑 똑같이요.\"",
      hint: "정확한 지시서 지참",
    },
    b: {
      label: "\"요즘 유행하는 걸로 원장님이 알아서 예쁘게 해 주세요!\"",
      hint: "원장님께 전권 위임",
    },
  },
  {
    id: 12, axis: "SN", emoji: "💈",
    text: "머리 스타일을 크게 바꾸고 싶을 때\n당신의 행동 패턴은?",
    a: {
      label: "내 얼굴형·모질·옷 스타일에 맞을지 한 달 내내 후기만 찾아봄",
      hint: "확신이 생겨야 결정",
    },
    b: {
      label: "일단 지르고 본다. \"머리는 어차피 다시 자라니까!\"",
      hint: "결과는 나중에 생각",
    },
  },
];

// ============================================================================
// 점수 합산 → 결과 ID 계산 (0~15, 화면 비노출)
// ============================================================================
type Scores = { EI: number; JP: number; TF: number; SN: number };

function calcResultId(scores: Scores): number {
  const e = scores.EI >= 2 ? 0 : 1;  // 0=E, 1=I
  const s = scores.SN >= 2 ? 0 : 1;  // 0=S, 1=N
  const t = scores.TF >= 2 ? 0 : 1;  // 0=T, 1=F
  const j = scores.JP >= 2 ? 0 : 1;  // 0=J, 1=P
  // 0=ESTJ 1=ESTP 2=ESFJ 3=ESFP 4=ENTJ 5=ENTP 6=ENFJ 7=ENFP
  // 8=ISTJ 9=ISTP 10=ISFJ 11=ISFP 12=INTJ 13=INTP 14=INFJ 15=INFP
  return e * 8 + s * 4 + t * 2 + j;
}

// ============================================================================
// 애니메이션
// ============================================================================
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

// ============================================================================
// 인트로 화면
// ============================================================================
function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 text-center"
    >
      {/* 콘텐츠 덩어리 — 수직 중앙 고정 */}
      <div className="flex flex-col items-center w-full max-w-xs">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-serif text-4xl font-bold leading-tight text-cream"
        >
          퍼스널 헤어
          <br />
          <span className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            DNA 테스트
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-4 text-base leading-relaxed text-cream/60"
        >
          나의 평소 관리 습관과 미용실 성향으로
          <br />
          <strong className="text-cream/90">알아보는 헤어 DNA</strong>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-7 flex items-center gap-4 text-sm text-cream/35"
        >
          <span>⏱ 약 1분 소요</span>
          <span className="h-3 w-px bg-white/10" />
          <span>📊 12문항</span>
          <span className="h-3 w-px bg-white/10" />
          <span>🎯 16가지 결과</span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          onClick={onStart}
          whileTap={{ scale: 0.97 }}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 py-5 text-lg font-bold text-white shadow-[0_8px_32px_rgba(168,85,247,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          내 헤어 DNA 찾기 →
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <Link href="/" className="text-sm text-cream/30 hover:text-cream/60 transition-colors">
            메인으로 돌아가기
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 메인 페이지
// ============================================================================
export default function MbtiPage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [scores, setScores] = useState<Scores>({ EI: 0, JP: 0, TF: 0, SN: 0 });
  const [pending, setPending] = useState<"A" | "B" | null>(null);

  const q = MBTI_QUESTIONS[index];
  const isLast = index === MBTI_QUESTIONS.length - 1;
  const progressPct = (index / MBTI_QUESTIONS.length) * 100;

  function handleSelect(choice: "A" | "B") {
    if (pending) return;
    setPending(choice);

    const next = { ...scores };
    if (choice === "A") next[q.axis] += 1;

    if (isLast) {
      // 마지막 문항: 즉시 결과 페이지 이동 (로딩 없음)
      const id = calcResultId(next);
      try { sessionStorage.setItem("hair_dna_id", String(id)); } catch { /**/ }
      router.push(`/mbti/result?r=${id}`);
      return;
    }

    setTimeout(() => {
      setScores(next);
      setDirection(1);
      setIndex((i) => i + 1);
      setPending(null);
    }, 220);
  }

  function handleBack() {
    if (index === 0 || pending) return;
    setDirection(-1);
    setIndex((i) => i - 1);
    setPending(null);
  }

  return (
    <main className="min-h-screen bg-charcoal text-cream">
      <AnimatePresence mode="wait">
        {!started && (
          <IntroScreen key="intro" onStart={() => setStarted(true)} />
        )}

        {started && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen flex-col"
          >
            {/* 헤더 + 프로그레스 바 */}
            <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-charcoal/90 backdrop-blur-md">
              <div className="mx-auto w-full max-w-lg px-5 pb-3 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className={`text-sm font-medium transition-all ${
                      index === 0 || pending
                        ? "pointer-events-none opacity-0"
                        : "text-cream/50 hover:text-cream"
                    }`}
                  >
                    ← 이전
                  </button>
                  <span className="text-xs font-semibold tracking-[0.22em] uppercase text-gold">
                    퍼스널 헤어 DNA
                  </span>
                  <span className="tabular-nums text-sm text-cream/40">
                    {index + 1}
                    <span className="text-cream/20"> / </span>
                    {MBTI_QUESTIONS.length}
                  </span>
                </div>
                <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-500 to-violet-500"
                    animate={{ width: `${Math.max(progressPct, 3)}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>
            </header>

            {/* 질문 영역 */}
            <div className="flex flex-1 flex-col justify-center px-5 py-10 mx-auto w-full max-w-lg">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={q.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-8"
                >
                  {/* 질문 */}
                  <div className="text-center">
                    <motion.div
                      key={`emoji-${q.id}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.05, type: "spring", stiffness: 320, damping: 22 }}
                      className="mb-5 text-5xl"
                    >
                      {q.emoji}
                    </motion.div>
                    <h2 className="font-serif text-[1.55rem] font-semibold leading-snug text-cream whitespace-pre-line">
                      {q.text}
                    </h2>
                  </div>

                  {/* 선택지 */}
                  <div className="space-y-3">
                    <OptionButton choice="A" option={q.a} pending={pending} onSelect={() => handleSelect("A")} />
                    <OptionButton choice="B" option={q.b} pending={pending} onSelect={() => handleSelect("B")} />
                  </div>

                  <p className="text-center text-sm text-cream/25">
                    선택하면 자동으로 다음 질문으로 넘어가요
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ============================================================================
// 선택지 버튼
// ============================================================================
function OptionButton({
  choice, option, pending, onSelect,
}: {
  choice: "A" | "B";
  option: { label: string; hint: string };
  pending: "A" | "B" | null;
  onSelect: () => void;
}) {
  const isSelected = pending === choice;
  const isDimmed = pending !== null && !isSelected;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.975 }}
      disabled={pending !== null}
      className={`w-full text-left rounded-2xl border px-5 py-5 transition-all duration-200 ${
        isSelected
          ? "border-transparent bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 shadow-[0_0_28px_rgba(168,85,247,0.4)]"
          : isDimmed
          ? "border-white/[0.05] bg-white/[0.02] opacity-35"
          : "border-white/[0.11] bg-white/[0.05] hover:border-fuchsia-500/40 hover:bg-white/[0.09]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold transition-colors ${
            isSelected ? "bg-white/25 text-white" : "bg-white/[0.09] text-cream/55"
          }`}
        >
          {choice}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`text-[1.0625rem] font-semibold leading-snug ${isSelected ? "text-white" : "text-cream"}`}>
            {option.label}
          </p>
          <p className={`mt-1.5 text-sm ${isSelected ? "text-white/65" : "text-cream/40"}`}>
            {option.hint}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
