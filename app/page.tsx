"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 루트 랜딩 (/)
//
// ★ 어떤 상태(로그인 여부, 진단 이력, 세션 잔류, 새로고침)에도
//   화면은 무조건 동일한 3가지 요소만 렌더링:
//   1. 메인 타이틀
//   2. [나의 맞춤 스타일 분석하기] 버튼
//   3. [이미 분석받으셨나요? 내 다이어리 보기] 링크
//
//   ⛔ 제품 추천(PersonalizedBanner), 진단 이력 체크, localStorage 읽기
//      전부 삭제 — 조건부 렌더링 0건
// ============================================================================

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "./style/constants";

export default function HomePage() {
  // 마운트 시 이전 스타일 서비스 세션 초기화
  // → 뒤로가기·새로고침·재진입 모두 동일 화면 보장
  useEffect(() => {
    try {
      sessionStorage.removeItem(STYLE_ANSWERS_KEY);
      sessionStorage.removeItem(STYLE_PHOTO_KEY);
      sessionStorage.removeItem(STYLE_GENERATED_KEY);
      sessionStorage.removeItem(STYLE_UNLOCKED_KEY);
    } catch { /**/ }
  }, []);

  return (
    <main className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0C0B0A] px-6 text-cream">

      {/* 배경 그리드 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }}
      />

      {/* 컨텐츠 — 정중앙 고정, 조건 없음 */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        {/* 브랜드 배지 */}
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · Hair Style AI
          <span className="h-px w-6 bg-gold/40" />
        </span>

        {/* 1. 메인 타이틀 */}
        <h1 className="mt-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-cream sm:text-4xl">
          AI가 분석해주는<br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}
          >
            내 인생 헤어스타일
          </span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-cream/50 sm:text-base">
          나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
        </p>

        {/* 2 + 3. CTA 버튼 묶음 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 w-full space-y-3"
        >
          {/* 2. 메인 CTA */}
          <Link
            href="/style/survey"
            className="flex h-16 w-full items-center justify-center rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
            style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
          >
            나의 맞춤 스타일 분석하기 →
          </Link>

          <p className="text-center text-[11px] text-cream/22">
            개인정보 미저장 · 약 2분 소요 · 무료
          </p>

          {/* 3. 재방문 다이어리 링크 — 메인 버튼과 동일 체급 */}
          <Link
            href="/my-diary"
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/[0.1] bg-transparent text-base font-semibold text-cream/45 underline underline-offset-[5px] transition-all duration-200 hover:border-white/20 hover:text-cream/70 active:scale-[0.98]"
          >
            이미 분석받으셨나요? · 내 다이어리 보기
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
