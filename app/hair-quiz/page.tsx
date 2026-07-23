"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent, EVENT_NAMES } from "../../lib/eventTracking";
import { motion, AnimatePresence } from "framer-motion";
import { appendDiaryEntry, refreshBeautyUserProfileFromDiary } from "../../lib/beautyProfile";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";
import ResultHeroCard from "@/components/beauty-ui/ResultHeroCard";
import BottomStickyCTA from "@/components/beauty-ui/BottomStickyCTA";

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Option       = { key: string; label: string };
type QuestionData = { id: number; question: string; options: Option[] };
type Prescription = { title: string; detail: string };
type ResultData   = {
  badge: string;
  title: string;
  summary: string;
  causes: string[];
  prescriptions: Prescription[];
  salonScript: string;
};

// ── 질문 데이터 ───────────────────────────────────────────────────────────────

const QUESTIONS: QuestionData[] = [
  {
    id: 1,
    question: "평소 샴푸는 언제 하시나요?",
    options: [
      { key: "A", label: "밤에 씻고 잔다" },
      { key: "B", label: "아침 외출 전에 감는다" },
    ],
  },
  {
    id: 2,
    question: "머리를 감고 난 후,\n말리는 습관은?",
    options: [
      { key: "A", label: "시간 없다. 수건으로 털고 자연건조" },
      { key: "B", label: "두피만 대충 말린다" },
      { key: "C", label: "롤빗이나 고데기까지 써서 모양을 잡는다" },
    ],
  },
  {
    id: 3,
    question: "평소 낮 시간에 머리를\n어떻게 하고 계시나요?",
    options: [
      { key: "A", label: "주로 묶거나 집게핀으로 올린다" },
      { key: "B", label: "풀고 다닌다" },
    ],
  },
  {
    id: 4,
    question: "내 머리에 대해\n얼마나 알고 계신가요?",
    options: [
      { key: "A", label: "가르마 방향, 숱, 곱슬기 등을 잘 안다" },
      { key: "B", label: "솔직히 잘 모른다. 미용실 갈 때마다 헷갈린다" },
    ],
  },
  {
    id: 5,
    question: "미용실에서 디자이너와\n보통 어떻게 상담하시나요?",
    options: [
      { key: "A", label: "인스타 레퍼런스 사진을 보여준다" },
      { key: "B", label: "대략적인 길이만 말한다" },
      { key: "C", label: '"알아서 예쁘게 해주세요" 맡긴다' },
    ],
  },
  {
    id: 6,
    question: "지금 당장 내 머리의\n가장 큰 불만은?",
    options: [
      { key: "A", label: "푹 주저앉은 정수리 볼륨" },
      { key: "B", label: "붕 뜨고 부스스한 결" },
      { key: "C", label: "금방 풀리고 밋밋해지는 스타일" },
    ],
  },
];

// ── 결과 데이터 ───────────────────────────────────────────────────────────────

const RESULTS: Record<string, ResultData> = {
  A: {
    badge: "진단 유형 A  ·  가장 흔한 케이스",
    title: "수면 압박·자연건조로 인한\n뿌리 구조 붕괴 상태",
    summary:
      "미용실 문을 나서는 순간이 절정이고, 이후는 빠른 하향 곡선. 국내 여성의 약 60%가 이 유형에 해당합니다.",
    causes: [
      "아침에 감고 불완전하게 말린 채 출근하면, 두피 수분이 빠져나가며 뿌리가 눌린 방향 그대로 굳습니다. 볼륨이 살아날 구조적 기반 자체가 무너진 상태입니다.",
      "자연건조 중 큐티클이 열린 채 1~2시간 외부 환경에 노출됩니다. 미세먼지·열기·산화 자극에 무방비로 방치되어 윤기와 탄성이 소실됩니다.",
      "수건으로 문지르는 습관이 큐티클을 물리적으로 파괴합니다. 이 손상이 반복되면 미용실 트리트먼트 효과도 48시간 이상 버티지 못합니다.",
    ],
    prescriptions: [
      {
        title: "취침 전 샴푸로 반드시 전환",
        detail:
          "수면 중 두피 세포가 재생됩니다. 아침에 감으면 열린 큐티클에 하루치 자외선·먼지 스트레스가 그대로 쌓입니다.",
      },
      {
        title: "뿌리부터 100% 완전 건조, 마지막은 찬바람",
        detail:
          "뿌리가 방향을 잡고 굳어야 볼륨이 생깁니다. 찬바람 10초가 큐티클을 닫아 하루 종일 윤기를 유지시킵니다.",
      },
      {
        title: "타월 블로팅으로 전환, 문지름 금지",
        detail:
          "꾹꾹 눌러 흡수시키세요. 큐티클 손상의 70%가 이 단계에서 발생합니다. 마이크로파이버 타월이면 효과가 2배입니다.",
      },
    ],
    salonScript:
      "\"저 뿌리 볼륨이 잘 안 사는 편인데, 집에서 드라이할 때 뿌리가 방향을 잡을 수 있게 커트해 주실 수 있을까요? 눌리기 쉬운 부위도 같이 봐주시면 좋겠고, 혼자서도 20분 안에 재현할 수 있는 스타일로 부탁드려요.\"",
  },
  B: {
    badge: "진단 유형 B  ·  아깝게 반만 완성",
    title: "루틴 이행률 50% —\n노력이 반만 살아있는 상태",
    summary:
      "분명히 노력은 하고 있습니다. 밤에 감거나 어느 정도 말리기도 하죠. 문제는 루틴이 완성되지 않아 효과가 절반 이하로 떨어진다는 것입니다.",
    causes: [
      "헤어 관리는 '완성도'가 전부입니다. 80%까지 말리고 잠들면 나머지 20% 수분이 밤새 뿌리를 무너뜨립니다. 90%까지 왔다가 마지막을 빠뜨리면 처음부터 안 한 것과 큰 차이가 없습니다.",
      "묶는 습관이 있다면, 아무리 아침에 잘 세팅해도 고무줄 자국과 눌림이 하루를 망칩니다. 한번 눌린 모발은 열을 가하지 않으면 스스로 복원되지 않습니다.",
      "미용실에서 정보 전달이 부족하면 디자이너는 '범용 커트'를 선택합니다. 내 두피·모질에 최적화된 커스텀 커트를 받지 못하고 있을 가능성이 높습니다.",
    ],
    prescriptions: [
      {
        title: "드라이 완성 기준을 100%로 올리기",
        detail:
          "손으로 두피를 쓸었을 때 서늘한 느낌이 없어야 합니다. '대충 말랐겠지'는 가장 위험한 판단입니다.",
      },
      {
        title: "집에서 '핀 없는 날' 주 3일 설정",
        detail:
          "모발이 자연스러운 흐름을 기억할 시간이 필요합니다. 묶지 않는 날, 탄성과 방향이 서서히 살아납니다.",
      },
      {
        title: "모발 지도 한 번만 그리기",
        detail:
          "샤워 후 거울 앞에서 가르마 방향·뻗치는 부위·볼륨이 사는 방향을 파악하세요. 이 정보 하나가 미용실 상담을 완전히 바꿉니다.",
      },
    ],
    salonScript:
      "\"저 머리가 금방 눌리는 편이고 묶는 날이 많아요. 묶어도 풀었을 때 자국이 적고 자연스럽게 떨어지는 레이어로 커트해 주실 수 있을까요? 집에서 드라이할 때 볼륨 살리는 방법도 간단히 알려주시면 감사하겠어요.\"",
  },
  C: {
    badge: "진단 유형 C  ·  노력 방향이 틀어진 경우",
    title: "관리는 하는데 결과가 없는 —\n방향성 미스매치 상태",
    summary:
      "노력의 양은 충분합니다. 그런데 방향이 조금 틀어져 있어요. 올바른 방법으로 바꾸면 같은 시간으로 3배의 결과를 낼 수 있는 유형입니다.",
    causes: [
      "관리 루틴은 갖추고 있지만, 미용실에서 정보 전달이 안 되면 효과가 반감됩니다. 내 모발에 최적화된 커트가 아닌 디자이너 재량의 커트를 매번 받고 있는 상태입니다.",
      "'알아서 예쁘게'는 디자이너에게 가장 어려운 요청입니다. 결국 디자이너가 선호하는 스타일, 혹은 가장 무난한 선택으로 귀결되어 당신의 두상·모질과 맞지 않을 수 있습니다.",
      "홈케어 루틴이 있어도 트리트먼트 위치·열 보호제 순서·찬바람 마무리 같은 디테일에서 효과가 새고 있을 가능성이 높습니다.",
    ],
    prescriptions: [
      {
        title: "레퍼런스 사진 3장 법칙",
        detail:
          "좋아하는 스타일 1장 + 싫어하는 스타일 1장 + 현재 내 모습 1장. 이 세 장이 디자이너에게 완벽한 지도가 됩니다.",
      },
      {
        title: "트리트먼트는 '귀 아래'만 도포",
        detail:
          "두피에 닿으면 모공이 막혀 역효과입니다. 모발 중간부터 끝까지만, 5분 후 완전히 헹궈냅니다.",
      },
      {
        title: "열 스타일링 전 열 보호제 필수화",
        detail:
          "관리를 잘 하면서 열 보호제를 생략하면 매번 원점입니다. 180°C 한 번이 큐티클 수십 개를 영구 손상시킵니다.",
      },
    ],
    salonScript:
      "\"제가 사진을 몇 장 가져왔어요. 이 느낌은 좋고, 이 느낌은 싫어요. 제 모질이 (건성/지성/곱슬)인데 이걸 감안해서 봐주시면 좋겠어요. 오늘 집에서 혼자 재현할 수 있는 스타일로 부탁드리고, 홈케어 팁도 알려주세요.\"",
  },
  D: {
    badge: "진단 유형 D  ·  전국 상위 5%",
    title: "전국 상위 5% 헤어 관리 레벨 —\n마지막 협업 단계만 남은 상태",
    summary:
      "이 정도면 제대로 관리하고 있습니다. 아쉬운 점이 있다면 '더 잘할 수 있는데'라는 느낌. 마지막 1%는 미용실 소통의 정밀화에 있습니다.",
    causes: [
      "루틴과 지식은 충분합니다. 그러나 홈케어의 한계는 분명히 존재합니다. 내 손이 닿지 않는 뒷머리, 매번 달라지는 모발 상태, 계절에 따른 변화를 혼자 대응하기엔 전문가의 눈이 필요합니다.",
      "잘 아는 만큼 미용실에서 '과잉 요청'을 하거나 반대로 너무 맡겨버리는 경향이 생깁니다. 디자이너와 대등한 정보 교환을 할 때 비로소 100%에 도달합니다.",
      "AI 진단을 더하면 두상·모질·라이프스타일에 완전히 최적화된 스타일을 데이터 기반으로 찾는 것이 가능해집니다. 감이 아닌 데이터로 접근할 차례입니다.",
    ],
    prescriptions: [
      {
        title: "계절마다 케어 루틴 업데이트",
        detail:
          "여름엔 두피 케어·수분 공급 집중, 겨울엔 정전기 방지·영양 처방으로 분기마다 루틴을 전환하세요.",
      },
      {
        title: "두피 스케일링 주기 체크",
        detail:
          "아무리 관리를 잘해도 두피 각질은 쌓입니다. 월 1회 두피 스케일링 샴푸 또는 살롱 관리를 루틴에 추가하세요.",
      },
      {
        title: "헤어 오일은 '끝에 500원 동전 크기'만",
        detail:
          "많이 바를수록 좋다는 건 오해입니다. 소량을 끝에만 발라야 무게감 없이 자연스러운 윤기가 삽니다.",
      },
    ],
    salonScript:
      "\"오늘 컨디션은 이렇고요, 요즘 이 부분이 신경 쓰여요. 지난번에 이 부분이 마음에 들었는데, 이번엔 여기를 조금 더 살릴 수 있을까요? 집에서 재현할 때 뭘 더 하면 효과가 올라갈지도 알려주세요.\"",
  },
};

// ── 점수 계산 ─────────────────────────────────────────────────────────────────

function calcScore(answers: string[]): number {
  let score = 0;
  if (answers[0] === "A") score += 1;            // 밤에 감음 +1
  if (answers[1] === "C") score += 2;            // 완전히 말림 +2
  else if (answers[1] === "B") score += 1;       // 두피만 +1
  if (answers[2] === "B") score += 1;            // 풀고 다님 +1
  if (answers[3] === "A") score += 1;            // 내 머리 잘 앎 +1
  if (answers[4] === "A") score += 2;            // 사진 보여줌 +2
  else if (answers[4] === "B") score += 1;       // 길이만 말함 +1
  return score;                                  // 0 ~ 7
}

function getResultKey(score: number): string {
  if (score <= 1) return "A";
  if (score <= 3) return "B";
  if (score <= 5) return "C";
  return "D";
}

// ── 저장용 헬퍼 ───────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildAnswersObject(answers: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  QUESTIONS.forEach((q, i) => { obj[`q${q.id}`] = answers[i] ?? ""; });
  return obj;
}

// Q6(지금 당장 내 머리의 가장 큰 불만)만 채점(calcScore)에 안 쓰이던 죽은 입력값이었다 —
// 결과 저장 시엔 이 답변을 콘서른 태그로 살려서 hairTags에 반영한다.
const COMPLAINT_CONCERN_TAG: Record<string, string> = {
  A: "#볼륨처짐",
  B: "#부스스",
  C: "#스타일유지어려움",
};

function buildConcernTags(answers: string[]): string[] {
  const tag = COMPLAINT_CONCERN_TAG[answers[5]];
  return tag ? [tag] : [];
}

// ── 인트로 화면 ───────────────────────────────────────────────────────────────

function IntroView({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <span className="mb-5 inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-4 py-1.5 text-aux font-medium tracking-wide text-ink-2">
청담동 헤어 클리닉 전문가 진단
      </span>

      <h1 className="text-h1 text-ink">
        내 머리가<br />미용실에서만<br />예쁜 진짜 이유
      </h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-2">feat. 미용실 100% 활용법</p>

      <div className="my-7 h-px w-16 bg-line" />

      <p className="max-w-[270px] text-[15px] leading-relaxed text-ink-2">
        6문항으로 당신의 헤어 홈케어 습관을 분석합니다.<br />
        청담동 수석 원장급 팩트 폭격이 기다리고 있습니다.
      </p>

      <div className="mt-10 w-full max-w-sm">
        <BlackCTAButton onClick={onStart}>진단 시작하기</BlackCTAButton>
      </div>
      <p className="mt-3 text-[13px] text-ink-2">약 1분 소요 · 총 6문항</p>
    </motion.div>
  );
}

// ── 설문 화면 ─────────────────────────────────────────────────────────────────

function SurveyView({
  currentQ,
  onAnswer,
  onBack,
}: {
  currentQ: number;
  onAnswer: (key: string) => void;
  onBack: () => void;
}) {
  const q = QUESTIONS[currentQ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col"
    >
      <TestHeader stepLabel="헤어 습관 진단" current={currentQ + 1} total={QUESTIONS.length}>
        <ProgressBar value={((currentQ + 1) / QUESTIONS.length) * 100} />
      </TestHeader>

      {/* 질문 + 보기 */}
      <div className="flex flex-1 flex-col justify-center px-6 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-ink-2">
              Q{currentQ + 1}
            </p>
            <h2 className="mb-8 whitespace-pre-line text-2xl font-semibold leading-snug text-ink">
              {q.question}
            </h2>
            <div className="space-y-3">
              {q.options.map((opt) => (
                <RoundedOptionButton
                  key={opt.key}
                  icon={opt.key}
                  label={opt.label}
                  selected={false}
                  onSelect={() => onAnswer(opt.key)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {currentQ > 0 && (
        <div className="flex-none px-6 pb-4">
          <button onClick={onBack} className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink">
            ← 이전
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── 분석 중 화면 ──────────────────────────────────────────────────────────────

function AnalyzingView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-center gap-5"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        className="h-10 w-10 rounded-full"
        style={{
          border: "2px solid transparent",
          borderTopColor: "rgba(51,48,44,0.9)",
          borderRightColor: "rgba(51,48,44,0.15)",
        }}
      />
      <p className="text-[15px] font-medium text-ink-2">진단 결과 분석 중...</p>
    </motion.div>
  );
}

// ── 결과 화면 ─────────────────────────────────────────────────────────────────

function ResultView({
  result, onCta, onRetry, onSave, saved,
}: {
  result: ResultData;
  onCta: () => void;
  onRetry: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-36"
    >
      <div className="mx-auto max-w-[430px] px-4 pt-8 pb-6 sm:px-6 space-y-4">

        <ResultHeroCard
          eyebrow="청담동 헤어 클리닉 진단 완료"
          badge={result.badge}
          title={result.title}
          description={result.summary}
        />

        {/* ① 원인 분석 */}
        <GlassCard accent className="px-5 py-4">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">
            원인 분석 — 팩트 폭격
          </p>
          <div className="space-y-3">
            {result.causes.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 flex-none rounded-full bg-ink-2" />
                <p className="text-[15px] leading-relaxed text-ink-2">{c}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ② 전문가 데일리 처방전 */}
        <GlassCard className="px-5 py-4">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">
            전문가 데일리 처방전
          </p>
          <div className="space-y-2.5">
            {result.prescriptions.map((p, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="mb-1 text-[13px] font-bold text-ink">{p.title}</p>
                <p className="text-[13px] leading-relaxed text-ink-2">{p.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ③ 미용실 소통 팁 */}
        <GlassCard className="px-5 py-4">
          <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">
            Feat. 미용실 소통 팁
          </p>
          <p className="mb-3 text-[13px] text-ink-2">
            다음 미용실 갈 때 이 대본을 그대로 읽으세요
          </p>
          <div className="rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-[15px] italic leading-relaxed text-ink-2">{result.salonScript}</p>
          </div>
        </GlassCard>

        {/* 저장 CTA */}
        <GlassCard className="px-5 py-5">
          <p className="text-center text-base font-semibold text-ink">이 결과, 계속 보관하고 싶다면?</p>
          <p className="mt-1 text-center text-[15px] text-ink-2">저장하면 홈 화면과 다이어리에서 다시 확인할 수 있어요</p>
          <div className="mt-4">
            <BlackCTAButton onClick={onSave} disabled={saved}>
              {saved ? "저장 완료 ✓ 이동 중..." : "저장하고 홈에서 케어 시작하기"}
            </BlackCTAButton>
          </div>
        </GlassCard>

        {/* 교차 진단 — 발견템·다른 진단 연결 */}
        <GlassCard className="space-y-3 px-5 py-4">
          <Link
            href="/items"
            className="flex items-center justify-between gap-3 text-[15px] font-medium text-ink hover:text-ink"
          >
            내 모발에 맞는 홈케어 제품 보기
            <span className="flex-none text-ink-2">→</span>
          </Link>
          <div className="h-px bg-line" />
          <button
            onClick={onCta}
            className="flex w-full items-center justify-between gap-3 text-left text-[15px] font-medium text-ink hover:text-ink"
          >
            AI 헤어 분석으로 내 스타일 찾기
            <span className="flex-none text-ink-2">→</span>
          </button>
          <div className="h-px bg-line" />
          <Link
            href="/damage-check"
            className="flex items-center justify-between gap-3 text-[15px] font-medium text-ink hover:text-ink"
          >
            내 손상도도 확인해보기
            <span className="flex-none text-ink-2">→</span>
          </Link>
        </GlassCard>

        {/* 재진단 — 우선순위 최하위라 본문 끝 텍스트 링크로만 둔다 */}
        <div className="flex justify-center pb-2">
          <button
            onClick={onRetry}
            className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            ↺ 다시 진단받기
          </button>
        </div>
      </div>

      {/* CTA 고정 하단 — 최우선 행동은 '저장·프로필 누적' */}
      <BottomStickyCTA>
        <BlackCTAButton onClick={onSave} disabled={saved}>
          {saved ? "저장 완료 ✓ 이동 중..." : "저장하고 홈에서 케어 시작하기"}
        </BlackCTAButton>
      </BottomStickyCTA>
    </motion.div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

type Phase = "intro" | "survey" | "analyzing" | "result";

const LANDING_ID = "hair-quiz";

export default function HairQuizPage() {
  const router = useRouter();
  const [phase,     setPhase]     = useState<Phase>("intro");
  const [currentQ,  setCurrentQ]  = useState(0);
  const [answers,   setAnswers]   = useState<string[]>([]);
  const [resultKey, setResultKey] = useState("A");
  const [saved,     setSaved]     = useState(false);

  // 연타 잠금 — 다른 설문(style/bangs/damage-check)의 `pending` 가드에 대응한다.
  // state가 아니라 ref인 이유: 같은 렌더 사이클 안에서 들어온 두 번째 클릭을 동기적으로 막아야
  // 문항 건너뛰기와 이벤트 중복 발화(answer_selected/diagnosis_complete)를 함께 차단할 수 있다.
  const lockRef      = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 해제는 문항 번호가 바뀐 직후가 아니라 "퇴장 애니메이션이 끝난 뒤"여야 한다.
  // AnimatePresence mode="wait"는 퇴장(0.35s) 동안 이전 문항을 화면에 그대로 두는데,
  // 그 사이 이전 선택지를 다시 누르면 옛 closure로 answer_selected가 중복 발화하고
  // setCurrentQ(q => q + 1)가 한 번 더 돌아 문항을 건너뛴다.
  // 이 화면의 최장 퇴장 애니메이션에 맞춘다: intro 0.45s(268행) > 문항 0.35s(327행).
  // 짧게 잡으면 intro 퇴장 잔여 구간에서 시작 버튼이 다시 눌려 diagnosis_start가 중복 발화한다.
  const TRANSITION_LOCK_MS = 520;
  function lockDuringTransition() {
    lockRef.current = true;
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => { lockRef.current = false; }, TRANSITION_LOCK_MS);
  }

  useEffect(() => () => { if (lockTimerRef.current) clearTimeout(lockTimerRef.current); }, []);

  // 유입 — 랜딩 진입 시 1회. first-touch UTM은 trackEvent가 자동으로 실어보낸다.
  useEffect(() => {
    trackEvent(EVENT_NAMES.LANDING_VIEW, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID });
  }, []);

  // 리포트 열람 — 이 진단은 단일 페이지라 결과 phase 진입이 곧 결과지 열람이다.
  useEffect(() => {
    if (phase !== "result") return;
    trackEvent(EVENT_NAMES.REPORT_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      result_type: resultKey,
      concern_tags: buildConcernTags(answers),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleStart() {
    if (lockRef.current) return;
    lockDuringTransition();
    trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID });
    setPhase("survey");
  }

  function handleAnswer(key: string) {
    if (lockRef.current) return;
    lockDuringTransition();

    const newAnswers = [...answers, key];
    setAnswers(newAnswers);

    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      answers: { questionId: QUESTIONS[currentQ].id, choice: key, step: currentQ + 1 },
    });

    if (currentQ === QUESTIONS.length - 1) {
      const score = calcScore(newAnswers);
      const nextKey = getResultKey(score);
      setResultKey(nextKey);
      // 진단 완료 — 마지막 문항 제출 시점. 결과지 열람은 위 report_view로 별도 계측.
      trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, {
        landing_id: LANDING_ID,
        diagnosis_type: LANDING_ID,
        result_type: nextKey,
        concern_tags: buildConcernTags(newAnswers),
      });
      setPhase("analyzing");
      setTimeout(() => setPhase("result"), 1800);
    } else {
      setCurrentQ((q) => q + 1);
    }
  }

  function handleBack() {
    if (lockRef.current) return;
    lockDuringTransition();
    if (currentQ === 0) {
      setPhase("intro");
      return;
    }
    setAnswers((a) => a.slice(0, -1));
    setCurrentQ((q) => q - 1);
  }

  function handleRetry() {
    if (lockRef.current) return;
    lockDuringTransition();
    setAnswers([]);
    setCurrentQ(0);
    setSaved(false);
    setPhase("intro");
  }

  function handleSave() {
    try {
      appendDiaryEntry({
        id: uid(),
        kind: "hairquiz",
        savedAt: Date.now(),
        resultKey,
        badge: RESULTS[resultKey].badge,
        title: RESULTS[resultKey].title,
        diagnosisSummary: RESULTS[resultKey].summary,
        hairTags: buildConcernTags(answers),
        concernTags: buildConcernTags(answers),
        answers: buildAnswersObject(answers),
      });
      refreshBeautyUserProfileFromDiary();
    } catch { /**/ }
    setSaved(true);
    router.push("/home");
  }

  return (
    <SilkBackground>
      <main className="mx-auto max-w-[430px] min-h-screen text-ink">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <IntroView key="intro" onStart={handleStart} />
          )}
          {phase === "survey" && (
            <SurveyView
              key="survey"
              currentQ={currentQ}
              onAnswer={handleAnswer}
              onBack={handleBack}
            />
          )}
          {phase === "analyzing" && (
            <AnalyzingView key="analyzing" />
          )}
          {phase === "result" && (
            <ResultView
              key="result"
              result={RESULTS[resultKey]}
              onCta={() => router.push("/style")}
              onRetry={handleRetry}
              onSave={handleSave}
              saved={saved}
            />
          )}
        </AnimatePresence>
      </main>
    </SilkBackground>
  );
}
