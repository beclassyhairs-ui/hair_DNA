"use client";

// ============================================================================
// /my-diary — 내 헤어 다이어리
// 저장된 변신 결과(Before/After) + 8문항 분석 데이터 + 케어 알림
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

// ─── 8문항 레이블 매핑 ───────────────────────────────────────────────────────

const Q_LABELS: Record<string, string> = {
  q1_age:            "연령대",
  q11_length:        "희망 기장",
  q14_layer:         "레이어드",
  q13_design:        "웨이브",
  q8_density:        "모발 숱",
  q7_thickness:      "모발 굵기",
  q3_curl:           "곱슬 유무",
  q10_history_count: "연간 시술 횟수",
};

const A_LABELS: Record<string, Record<string, string>> = {
  q1_age:            { age_20: "20대", age_30: "30대", age_40: "40대", age_50: "50대", age_60plus: "60대 이상" },
  q11_length:        { short: "숏", bob: "숏단발", shoulder: "단발", collarbone: "중단발", chest: "긴머리" },
  q14_layer:         { heavy: "무거움(일자)", medium: "중간(소프트)", light: "가벼움(허쉬)" },
  q13_design:        { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" },
  q8_density:        { thick_density: "많음", medium_density: "보통", thin_density: "적음" },
  q7_thickness:      { coarse: "두꺼움", medium_thickness: "보통", fine: "얇음" },
  q3_curl:           { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair: "악성곱슬" },
  q10_history_count: { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회 이상" },
};

const Q_ORDER = [
  "q1_age", "q11_length", "q14_layer", "q13_design",
  "q8_density", "q7_thickness", "q3_curl", "q10_history_count",
];

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface SavedDiagnosis {
  answers:           Record<string, string>;
  styleName:         string;
  savedAt:           number;
  generatedImageUrl: string | null;
  isSevereDamage:    boolean;
  isLowDensity:      boolean;
  isFineHair:        boolean;
  isCurly:           boolean;
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default function MyDiaryPage() {
  const [diagnosis, setDiagnosis] = useState<SavedDiagnosis | null>(null);
  const [selfie,    setSelfie]    = useState<string | null>(null);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("abeauty:savedDiagnosis");
      if (raw) setDiagnosis(JSON.parse(raw) as SavedDiagnosis);
    } catch { /**/ }
    try {
      const photo = sessionStorage.getItem("style:photo");
      if (photo) setSelfie(photo);
    } catch { /**/ }
    setReady(true);
  }, []);

  // 로딩 중 — 다크 배경만 표시 (hydration mismatch 방지)
  if (!ready) {
    return <main className="min-h-screen bg-[#0C0B0A]" aria-hidden="true" />;
  }

  // 저장된 데이터 없음
  if (!diagnosis) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0C0B0A] px-6" style={{ color: "#FDFBFA" }}>
        <div className="text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "rgba(200,168,107,0.55)" }}>
            A-Beauty Diary
          </p>
          <p className="mb-6 text-sm" style={{ color: "rgba(253,251,250,0.4)" }}>
            아직 저장된 진단 결과가 없어요.
          </p>
          <Link
            href="/style"
            className="inline-flex h-14 items-center justify-center rounded-2xl px-8 text-base font-bold"
            style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)", color: "#0C0B0A" }}
          >
            AI 헤어 분석 시작하기 →
          </Link>
          <div className="mt-4">
            <Link href="/" className="text-sm underline underline-offset-4" style={{ color: "rgba(200,168,107,0.5)" }}>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const savedDate = new Date(diagnosis.savedAt).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#0C0B0A]" style={{ color: "#FDFBFA" }}>

      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0C0B0A]/90 px-5 py-4 backdrop-blur-md">
        <Link href="/" className="text-sm font-medium transition-colors" style={{ color: "rgba(253,251,250,0.4)" }}>
          ← 홈
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "#C8A86B" }}>
          내 다이어리
        </span>
        <div className="w-10" />
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-24 pt-6">

        {/* 날짜 + 스타일 명 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "rgba(200,168,107,0.55)" }}>
            A-Beauty Hair Diary
          </p>
          <h1 className="mt-1.5 font-serif text-xl font-bold" style={{ color: "#FDFBFA" }}>
            {diagnosis.styleName}
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(253,251,250,0.3)" }}>
            {savedDate} 진단 완료
          </p>
        </motion.div>

        {/* Before / After 사진 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Before */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,251,250,0.4)" }}>Before</span>
            <div
              className="relative overflow-hidden rounded-2xl bg-black/40"
              style={{ aspectRatio: "3/4", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {selfie ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selfie} alt="원본 사진" className="h-full w-full object-cover"
                  style={{ objectPosition: "50% 10%" }} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(253,251,250,0.2)" }}>Before</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(253,251,250,0.55)" }}>Before</span>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#C8A86B" }}>After ✦</span>
            <div
              className="relative overflow-hidden rounded-2xl bg-black/40"
              style={{ aspectRatio: "3/4", border: "1px solid rgba(200,168,107,0.25)" }}
            >
              {diagnosis.generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={diagnosis.generatedImageUrl} alt="AI 변신 스타일"
                  className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-3 text-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="rgba(200,168,107,0.3)" strokeWidth={1.2}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" />
                  </svg>
                  <p className="text-[10px] leading-snug" style={{ color: "rgba(253,251,250,0.25)" }}>AI 이미지 없음</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#C8A86B" }}>After ✦</span>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ boxShadow: "inset 0 0 0 1.5px rgba(200,168,107,0.25)" }} />
            </div>
          </div>
        </motion.div>

        {/* 8문항 진단 데이터 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl px-5 py-4"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "#C8A86B" }}>
            진단 데이터 · 8문항
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Q_ORDER.map(qId => {
              const val   = diagnosis.answers[qId] ?? "";
              const label = Q_LABELS[qId] ?? qId;
              const ans   = A_LABELS[qId]?.[val] ?? "—";
              return (
                <div key={qId} className="rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[10px]" style={{ color: "rgba(253,251,250,0.38)" }}>{label}</p>
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: "rgba(253,251,250,0.8)" }}>{ans}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 집중 케어 알림 */}
        {diagnosis.isSevereDamage && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl px-5 py-4"
            style={{ border: "1px solid rgba(200,168,107,0.15)", background: "rgba(200,168,107,0.04)" }}
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(200,168,107,0.7)" }}>
              집중 케어 필요
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(253,251,250,0.6)" }}>
              잦은 새치 염색으로 두피와 모발이 예민해진 상태예요.
              약산성 홈케어와 시술 주기를 줄이는 것을 추천합니다.
            </p>
          </motion.div>
        )}

        {/* 맞춤 커머스 영역 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(200,168,107,0.3), transparent)" }} />
          <div className="px-5 py-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(200,168,107,0.45)" }}>
              맞춤 홈케어 라인업
            </p>
            <p className="mt-2 text-xs" style={{ color: "rgba(253,251,250,0.25)" }}>
              진단 데이터 기반 맞춤 제품이 곧 추가될 예정입니다.
            </p>
          </div>
        </motion.div>

        {/* 재진단 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href="/style/survey"
            className="flex h-14 w-full items-center justify-center rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
            style={{ border: "1px solid rgba(200,168,107,0.25)", background: "rgba(200,168,107,0.06)", color: "#E4D2A8" }}
          >
            새로운 스타일로 다시 진단하기
          </Link>
        </motion.div>

      </div>
    </main>
  );
}
