"use client";

// ============================================================================
// /my-diary — 내 헤어 다이어리
// 저장된 변신 결과(Before/After) + 8문항 분석 데이터 + 케어 메모
// 추후 맞춤 커머스 제품 리스트 추가 예정
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { STYLE_PHOTO_KEY } from "@/app/style/constants";

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

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function MyDiaryPage() {
  const [diagnosis, setDiagnosis] = useState<SavedDiagnosis | null>(null);
  const [selfie,    setSelfie]    = useState<string | null>(null);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("abeauty:savedDiagnosis");
      if (raw) setDiagnosis(JSON.parse(raw) as SavedDiagnosis);
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (photo) setSelfie(photo);
    } catch { /**/ }
    setReady(true);
  }, []);

  if (!ready) return null;

  // 저장된 데이터 없음
  if (!diagnosis) {
    return (
      <main className="flex h-[100dvh] flex-col items-center justify-center bg-[#0C0B0A] px-6 text-cream">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold/50 mb-4">
            A-Beauty Diary
          </p>
          <p className="text-cream/40 text-sm mb-6">아직 저장된 진단 결과가 없어요.</p>
          <Link
            href="/style"
            className="inline-flex h-14 items-center justify-center rounded-2xl px-8 text-base font-bold text-charcoal"
            style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
          >
            AI 헤어 분석 시작하기 →
          </Link>
        </div>
      </main>
    );
  }

  const savedDate = new Date(diagnosis.savedAt).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#0C0B0A] text-cream">

      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0C0B0A]/90 px-5 py-4 backdrop-blur-md">
        <Link href="/" className="text-sm font-medium text-cream/40 hover:text-cream transition-colors">
          ← 홈
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">내 다이어리</span>
        <div className="w-12" />
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-24 pt-6">

        {/* 날짜 + 타이틀 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold/55">
            A-Beauty Hair Diary
          </p>
          <h1 className="mt-1.5 font-serif text-xl font-bold text-cream">
            {diagnosis.styleName}
          </h1>
          <p className="mt-0.5 text-xs text-cream/30">{savedDate} 진단 완료</p>
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-cream/40">Before</span>
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40"
              style={{ aspectRatio: "3/4" }}
            >
              {selfie ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selfie} alt="원본 사진" className="h-full w-full object-cover"
                  style={{ objectPosition: "50% 10%" }} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-[9px] uppercase tracking-widest text-cream/20">No Photo</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-cream/55">Before</span>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">After ✦</span>
            <div
              className="relative overflow-hidden rounded-2xl border border-gold/25 bg-black/40"
              style={{ aspectRatio: "3/4" }}
            >
              {diagnosis.generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={diagnosis.generatedImageUrl} alt="AI 변신 스타일"
                  className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center">
                  <p className="text-[10px] leading-snug text-cream/25">결과 이미지</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">After ✦</span>
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
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
            진단 데이터 · 8문항
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Q_ORDER.map(qId => {
              const val   = diagnosis.answers[qId] ?? "";
              const label = Q_LABELS[qId] ?? qId;
              const ans   = A_LABELS[qId]?.[val] ?? "—";
              return (
                <div key={qId} className="rounded-xl bg-white/[0.03] px-3.5 py-3">
                  <p className="text-[10px] text-cream/38">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-cream/80">{ans}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 집중 케어 알림 (잦은 시술 유저) */}
        {diagnosis.isSevereDamage && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-gold/15 bg-gold/[0.04] px-5 py-4"
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-gold/70">
              집중 케어 필요
            </p>
            <p className="text-sm leading-relaxed text-cream/60">
              잦은 새치 염색으로 두피와 모발이 예민해진 상태예요.
              약산성 홈케어와 시술 주기를 줄이는 것을 추천합니다.
            </p>
          </motion.div>
        )}

        {/* 맞춤 커머스 영역 (추후 확장) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="px-5 py-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/45">
              맞춤 홈케어 라인업
            </p>
            <p className="mt-2 text-xs text-cream/25">
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
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.06] text-base font-bold text-gold-light transition-all hover:bg-gold/12 active:scale-[0.98]"
          >
            새로운 스타일로 다시 진단하기
          </Link>
        </motion.div>

      </div>
    </main>
  );
}
