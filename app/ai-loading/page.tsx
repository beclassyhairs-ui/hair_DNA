"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SELECTED_STYLE_KEY } from "../result/recommend";

const TOTAL_MS = 16000; // 16초
const TICK_MS = 80;

const LOADING_STEPS = [
  { at: 0,    icon: "🔍", text: "얼굴형 데이터를 분석하고 있어요" },
  { at: 25,   icon: "✂️", text: "최적의 기장을 탐색하고 있어요" },
  { at: 52,   icon: "🎨", text: "맞춤 컬러·텍스처를 처방하고 있어요" },
  { at: 76,   icon: "💫", text: "마지막 디테일을 다듬고 있어요" },
  { at: 94,   icon: "✨", text: "완성됐어요! 결과지를 불러오는 중..." },
];

const HAIR_TIPS = [
  { title: "볼륨 유지 비법", body: "드라이 후 찬바람으로 마무리하면 큐티클이 닫혀 볼륨이 오래 유지돼요." },
  { title: "가르마 변화의 효과", body: "가르마를 반대 방향으로 바꾸면 정수리 볼륨이 즉각적으로 살아나요." },
  { title: "새치 커버 팁", body: "염색 주기 사이엔 헤어라인 섀도우 파우더로 자연스럽게 커버해 보세요." },
  { title: "손상모 응급 처방", body: "린스 대신 주 2회 집중 트리트먼트를 사용하면 큐티클 복구에 효과적이에요." },
  { title: "숱 많아 보이는 법", body: "레이어드 컷으로 층을 넣으면 볼륨감이 살아나고 두상이 더 풍성해 보여요." },
];

export default function AiLoadingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<{ id: string; label: string } | null>(null);
  const [showAd, setShowAd] = useState(false);
  const elapsed = useRef(0);
  const done = useRef(false);

  // 선택된 기장 로드
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SELECTED_STYLE_KEY);
      if (raw) setSelectedStyle(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // 프로그레스 타이머
  useEffect(() => {
    const id = setInterval(() => {
      elapsed.current += TICK_MS;
      const next = Math.min(100, (elapsed.current / TOTAL_MS) * 100);
      setProgress(next);

      // 팁 로테이션 (3.5초마다)
      setTipIndex(Math.floor(elapsed.current / 3500) % HAIR_TIPS.length);

      // 4초 후 광고 영역 노출
      if (elapsed.current >= 4000) setShowAd(true);

      // 완료
      if (next >= 100 && !done.current) {
        done.current = true;
        clearInterval(id);
        setTimeout(() => router.push("/result"), 400);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [router]);

  // 현재 로딩 메시지
  const currentStep = [...LOADING_STEPS]
    .reverse()
    .find((s) => progress >= s.at) ?? LOADING_STEPS[0];

  const circumference = 2 * Math.PI * 54; // r=54

  return (
    <main className="flex min-h-screen flex-col bg-charcoal text-cream">
      <Stepper />

      {/* 메인 영역 */}
      <div className="flex flex-1 flex-col items-center justify-start px-6 pt-10 pb-6">
        <div className="w-full max-w-2xl">

          {/* 선택 기장 배지 */}
          {selectedStyle && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex items-center justify-center gap-2"
            >
              <span className="rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold-light">
                ✦ {selectedStyle.label} 스타일 AI 합성 중
              </span>
            </motion.div>
          )}

          {/* 원형 프로그레스 */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-40 w-40 items-center justify-center">
              {/* 배경 원 */}
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <motion.circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="url(#goldGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress / 100)}
                  style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear` }}
                />
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d4a853" />
                    <stop offset="100%" stopColor="#f0c97a" />
                  </linearGradient>
                </defs>
              </svg>

              {/* 중앙 숫자 */}
              <div className="relative flex flex-col items-center">
                <span className="text-4xl font-bold tabular-nums text-gold-light">
                  {Math.floor(progress)}
                </span>
                <span className="text-sm font-medium text-cream/50">%</span>
              </div>
            </div>

            {/* 현재 단계 메시지 */}
            <div className="mt-6 h-12 text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-lg font-medium text-cream/80"
                >
                  <span className="mr-2">{currentStep.icon}</span>
                  {currentStep.text}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* 바 형태 프로그레스 */}
            <div className="mt-5 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                style={{ width: `${progress}%`, transition: `width ${TICK_MS}ms linear` }}
              />
            </div>
          </div>

          {/* 광고 / 리워드 영역 */}
          <AnimatePresence>
            {showAd && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-10"
              >
                {/* 광고 플레이스홀더 */}
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
                    <span className="text-xs text-cream/30">광고</span>
                    <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-cream/25">AD</span>
                  </div>
                  <div className="flex aspect-[5/2] w-full items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                    <div className="text-center">
                      <p className="text-2xl">💄</p>
                      <p className="mt-2 text-sm font-medium text-cream/40">광고 영역</p>
                      <p className="text-xs text-cream/25">Google AdSense · 네이버 GFA</p>
                    </div>
                  </div>
                </div>

                {/* 헤어 팁 카드 */}
                <div className="mt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold/60">
                    Hair Tip
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tipIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4"
                    >
                      <p className="font-semibold text-gold-light">
                        {HAIR_TIPS[tipIndex].title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-cream/65">
                        {HAIR_TIPS[tipIndex].body}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* 팁 인디케이터 */}
                  <div className="mt-3 flex justify-center gap-1.5">
                    {HAIR_TIPS.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === tipIndex ? "w-4 bg-gold" : "w-1.5 bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function Stepper() {
  const steps = ["사진 추가", "AI 합성", "결과 확인"];
  const active = 1;
  return (
    <div className="border-b border-white/10 bg-charcoal/80 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                i <= active ? "bg-gold/15 text-gold-light" : "text-cream/40"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i < active
                    ? "bg-gold-dark text-charcoal"
                    : i === active
                      ? "bg-gold text-charcoal"
                      : "bg-white/10 text-cream/50"
                }`}
              >
                {i < active ? "✓" : i + 1}
              </span>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-white/15 sm:w-6" />}
          </div>
        ))}
      </div>
    </div>
  );
}
