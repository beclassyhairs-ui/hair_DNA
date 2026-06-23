"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 메인 랜딩
// 4문항 인라인 설문 제거 → /style/survey 직결 (8문항 논스톱 퍼널)
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getStyleProduct } from "./style/recommend";

// ─── 진단 결과 저장 타입 ──────────────────────────────────────────────────────

interface SavedDiagnosis {
  answers: Record<string, string>;
  styleName: string;
  savedAt:  number;
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
      className="w-full overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] to-transparent"
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
          <button onClick={onDismiss}
            className="ml-3 flex h-6 w-6 flex-none items-center justify-center rounded-full text-cream/30 transition-colors hover:text-cream/60"
            aria-label="닫기">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <a href={product.coupangUrl} target="_blank" rel="noopener noreferrer sponsored"
          className="mt-3 flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.07] active:scale-[0.98]">
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

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const [savedDiagnosis, setSavedDiagnosis] = useState<SavedDiagnosis | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("abeauty:savedDiagnosis");
      if (!raw) return;
      const data = JSON.parse(raw) as SavedDiagnosis;
      if (Date.now() - data.savedAt < 7 * 24 * 60 * 60 * 1000) setSavedDiagnosis(data);
    } catch { /**/ }
  }, []);

  function dismissDiagnosis() {
    setSavedDiagnosis(null);
    try { localStorage.removeItem("abeauty:savedDiagnosis"); } catch { /**/ }
  }

  return (
    <main className="relative flex h-screen flex-col items-center justify-between overflow-hidden bg-[#0C0B0A] px-6 py-10 text-cream">

      {/* 배경 그리드 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }} />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }} />

      {/* 브랜드 배지 */}
      <div className="relative w-full text-center">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · Hair Style AI
          <span className="h-px w-6 bg-gold/40" />
        </span>
      </div>

      {/* 히어로 */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        <h1 className="font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-cream sm:text-4xl">
          AI가 분석해주는<br />
          <span className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}>
            내 인생 헤어스타일
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-cream/50">
          나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
        </p>

        {/* 맞춤 배너 (진단 이력 있을 때만) */}
        {savedDiagnosis && (
          <div className="mt-6 w-full">
            <PersonalizedBanner diagnosis={savedDiagnosis} onDismiss={dismissDiagnosis} />
          </div>
        )}
      </motion.div>

      {/* CTA — /style/survey 직결 */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <Link
          href="/style/survey"
          className="flex h-16 w-full items-center justify-center rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
          style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
        >
          나의 맞춤 스타일 분석하기 →
        </Link>
        <p className="mt-3 text-center text-[11px] text-cream/25">
          개인정보 미저장 · 약 2분 소요 · 무료
        </p>
      </motion.div>
    </main>
  );
}
