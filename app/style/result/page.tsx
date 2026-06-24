"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY, STYLE_GENERATED_KEY, STYLE_PHOTO_KEY, STYLE_UNLOCKED_KEY } from "../constants";
import {
  getStyleEntry,
  buildCarePrescription,
  getStyleProduct,
} from "../recommend";
// getRefImagePath 의도적 미임포트 — 레퍼런스 이미지는 저작권 보호상 폴백 미사용
import type { StyleAnswers } from "../surveyData";

// ─── Kakao 타입 ───────────────────────────────────────────────────────────────

type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: { sendDefault: (config: Record<string, unknown>) => void };
  Auth?: { login: (opts: { success: (a: unknown) => void; fail: (e: unknown) => void }) => void };
};
declare const kakaoWin: Window & { Kakao?: KakaoSDK };

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? "";
const KAKAO_SDK = "https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js";

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    const w = window as typeof kakaoWin;
    if (w.Kakao) { resolve(); return; }
    if (document.querySelector(`script[src="${KAKAO_SDK}"]`)) {
      const poll = setInterval(() => { if (w.Kakao) { clearInterval(poll); resolve(); } }, 80);
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_SDK; s.onload = () => resolve(); s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

async function kakaoLogin(onSuccess: () => void) {
  try {
    await loadKakaoSDK();
    const K = (window as typeof kakaoWin).Kakao;
    if (K) {
      if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
      if (K.isInitialized() && K.Auth) {
        K.Auth.login({ success: () => onSuccess(), fail: () => setTimeout(onSuccess, 800) });
        return;
      }
    }
  } catch { /**/ }
  setTimeout(onSuccess, 1500);
}

// ─── 카카오 결과 잠금 모달 ────────────────────────────────────────────────────

function KakaoLockModal({ onUnlock }: { onUnlock: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    await kakaoLogin(() => { setLoading(false); onUnlock(); });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-charcoal/85 backdrop-blur-xl" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/25 bg-[#141210]"
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="px-7 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">A-Beauty</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-cream">결과지가 완성됐어요!</h2>
          <p className="mt-2 text-sm text-cream/50">맞춤 헤어스타일과 케어 처방전을 확인하세요.</p>
          <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-2xl">🔓</div>
          <button onClick={handleLogin} disabled={loading}
            className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70">
            {loading
              ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span> 로그인 중...</>
              : <><span className="text-xl">💬</span> 카카오 1초 로그인하고 결과 확인하기</>}
          </button>
          <p className="mt-2.5 text-[11px] text-cream/25">별도 가입 없이 카카오 계정으로 바로 확인</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 카카오 저장 → 메인 라우팅 모달 ─────────────────────────────────────────

function KakaoSaveModal({
  answers, styleName, onClose,
}: { answers: StyleAnswers; styleName: string; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSaveAndRoute() {
    if (loading) return;
    setLoading(true);

    await kakaoLogin(() => {
      try {
        // AI 생성 이미지 URL 포함 저장 (다이어리 페이지에서 사용)
        const generatedImageUrl = sessionStorage.getItem(STYLE_GENERATED_KEY) ?? null;
        localStorage.setItem("abeauty:savedDiagnosis", JSON.stringify({
          answers,
          styleName,
          savedAt: Date.now(),
          generatedImageUrl,
          isSevereDamage: answers.q10_history_count === "count_7plus",
          isLowDensity:   answers.q8_density === "thin_density",
          isFineHair:     answers.q7_thickness === "fine",
          isCurly:        answers.q3_curl === "curly_hair",
        }));
      } catch { /**/ }

      // 내 다이어리로 강제 이동
      router.push("/my-diary");
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl border-t border-gold/20 bg-[#141210] px-6 pb-10 pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">A-Beauty Diary</p>
        <h3 className="mt-2 font-serif text-xl font-bold text-cream">
          내 다이어리에 저장하고 평생 소장하기
        </h3>
        <p className="mt-2 text-sm text-cream/45 leading-relaxed">
          진단 결과를 저장하면 나만의 맞춤 홈케어 제품과<br className="hidden sm:block" />
          스타일 히스토리가 메인 페이지에서 계속 확인됩니다.
        </p>

        {/* 저장 혜택 */}
        <div className="mt-4 space-y-2">
          {[
            "맞춤 홈케어 제품 상단 노출 (시술 이력 기반)",
            "내 헤어 스타일 히스토리 보관",
            "전문가 케어 처방전 PDF 저장",
          ].map((b) => (
            <div key={b} className="flex items-center gap-2.5 text-sm text-cream/65">
              <span className="text-gold text-xs">✦</span>
              {b}
            </div>
          ))}
        </div>

        <button onClick={handleSaveAndRoute} disabled={loading}
          className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70">
          {loading
            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span> 저장 중...</>
            : <><span className="text-xl">💬</span> 카카오 1초 로그인/가입으로 저장하기</>}
        </button>
        <button onClick={onClose}
          className="mt-2.5 flex h-11 w-full items-center justify-center rounded-xl text-sm text-cream/40 hover:text-cream/70">
          나중에 저장하기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Before / After 이미지 섹션 ───────────────────────────────────────────────

// After 섹션 상태 타입
type AfterState =
  | { kind: "generating" }           // 폴링 중 (Replicate 처리 중)
  | { kind: "done"; url: string }    // 생성 완료
  | { kind: "error" };               // 실패 / 타임아웃

function BeforeAfterSection({
  photo, locked, afterState, onRetry,
}: {
  photo:      string | null;
  locked:     boolean;
  afterState: AfterState;
  onRetry:    () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">

      {/* BEFORE */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-all duration-700 ${locked ? "blur-sm" : ""}`}
        style={{ aspectRatio: "3/4" }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="원본 사진" className="h-full w-full object-cover" style={{ objectPosition: "50% 10%" }} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[9px] uppercase tracking-widest text-cream/20">Your Photo</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Before</span>
        </div>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-cream/40" stroke="currentColor" strokeWidth={1.5}>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* AFTER — 레퍼런스 이미지 폴백 없음, 생성 실패 시 에러 UI만 표시 */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-gold/25 bg-black/40 transition-all duration-700 ${locked ? "blur-sm" : ""}`}
        style={{ aspectRatio: "3/4" }}
      >
        {afterState.kind === "done" ? (
          // AI 생성 완료 — Replicate 결과물만 표시
          // eslint-disable-next-line @next/next/no-img-element
          <img src={afterState.url} alt="AI 변신 스타일" className="h-full w-full object-cover" />

        ) : afterState.kind === "generating" ? (
          // 생성 중 — 골드 스피너
          <div className="flex h-full flex-col items-center justify-center gap-3 px-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "rgba(200,168,107,0.9)", borderRightColor: "rgba(200,168,107,0.2)" }}
            />
            <p className="text-center text-[10px] font-medium leading-snug text-cream/45">
              AI 합성 중...
            </p>
          </div>

        ) : (
          // 생성 실패 — 에러 UI + 다시 시도 버튼 (레퍼런스 이미지 절대 미노출)
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-cream/25" stroke="currentColor" strokeWidth={1.2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] leading-snug text-cream/40">
              AI 합성에<br />실패했어요
            </p>
            <button
              onClick={onRetry}
              className="rounded-xl border border-gold/35 bg-gold/[0.08] px-3.5 py-1.5 text-[11px] font-bold text-gold transition-colors hover:bg-gold/15"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 하단 레이블 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">After ✦</span>
        </div>
        {/* 골드 프레임 글로우 */}
        {!locked && afterState.kind === "done" && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 1.5px rgba(200,168,107,0.3)" }} />
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-gold/40" stroke="currentColor" strokeWidth={1.5}>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 케어 요약 3줄 ────────────────────────────────────────────────────────────

function CareSummary({ answers }: { answers: StyleAnswers }) {
  const care = buildCarePrescription(answers);

  const lines = [
    care.historyNote,
    answers.q8_density === "thin_density" || answers.q7_thickness === "fine"
      ? care.densityNote
      : care.curlNote,
    care.thicknessNote,
  ];

  return (
    <div className={`space-y-3 ${care.isSevereDamage ? "rounded-xl border border-gold/15 bg-gold/[0.04] p-4" : ""}`}>
      {care.isSevereDamage && (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gold/70">집중 케어 필요</p>
      )}
      {lines.map((text, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="mt-2 h-1 w-1 flex-none rounded-full bg-gold/55" />
          <p className="text-sm leading-relaxed text-cream/70">{text}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 메인 결과 페이지
// ============================================================================

// 최대 폴링 시간 (Replicate가 13초 로딩 이후에도 처리 중일 수 있음)
const POLL_INTERVAL_MS = 1_500;
const POLL_MAX_ATTEMPTS = 30; // 최대 45초 (30 × 1.5s)

export default function StyleResultPage() {
  const router = useRouter();

  const [photo,      setPhoto]      = useState<string | null>(null);
  const [afterState, setAfterState] = useState<AfterState>({ kind: "generating" });
  const [answers,    setAnswers]    = useState<StyleAnswers>({});
  const [locked,     setLocked]     = useState(true);
  const [ready,      setReady]      = useState(false);
  const [showSave,   setShowSave]   = useState(false);

  // ─── 초기 데이터 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (p) setPhoto(p);
      const a = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (a) setAnswers(JSON.parse(a) as StyleAnswers);
      if (sessionStorage.getItem(STYLE_UNLOCKED_KEY) === "1") setLocked(false);
    } catch { /**/ }
    setReady(true);
  }, []);

  // ─── Replicate 결과 폴링 ─────────────────────────────────────────────────
  // 로딩 13초 이후 페이지 진입 시점에도 아직 처리 중일 수 있음 → 최대 45초 폴링
  // 성공: afterState = { kind: "done", url }
  // 실패/타임아웃: afterState = { kind: "error" } — 레퍼런스 이미지 절대 미노출
  useEffect(() => {
    // 즉시 확인
    try {
      const cached = sessionStorage.getItem(STYLE_GENERATED_KEY);
      if (cached) { setAfterState({ kind: "done", url: cached }); return; }
    } catch { /**/ }

    // sessionStorage에 없으면 폴링 시작
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      try {
        const url = sessionStorage.getItem(STYLE_GENERATED_KEY);
        if (url) {
          clearInterval(timer);
          setAfterState({ kind: "done", url });
          return;
        }
      } catch { /**/ }
      if (attempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        setAfterState({ kind: "error" });
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  function handleUnlock() {
    try { sessionStorage.setItem(STYLE_UNLOCKED_KEY, "1"); } catch { /**/ }
    setLocked(false);
  }

  function handleRetryGenerate() {
    // 세션 초기화 후 업로드 페이지로 이동 → 재촬영/재생성
    try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
    router.push("/style/upload");
  }

  if (!ready) return (
    <main className="flex min-h-screen items-center justify-center bg-charcoal">
      <p className="text-cream/40">결과를 불러오는 중...</p>
    </main>
  );

  const entry   = getStyleEntry(answers);
  const product = getStyleProduct(answers);

  const DESIGN_LABEL: Record<string, string> = { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" };
  const LAYER_LABEL:  Record<string, string> = { heavy: "일자", medium: "소프트", light: "허쉬컷" };
  const LENGTH_LABEL: Record<string, string> = { short: "숏", bob: "숏단발", shoulder: "단발", collarbone: "중단발", chest: "긴머리" };

  return (
    <main className="min-h-screen bg-charcoal text-cream">

      {/* 결과 잠금 모달 */}
      <AnimatePresence>{locked && <KakaoLockModal onUnlock={handleUnlock} />}</AnimatePresence>

      {/* 저장 바텀시트 */}
      <AnimatePresence>
        {showSave && (
          <KakaoSaveModal
            answers={answers}
            styleName={entry.name}
            onClose={() => setShowSave(false)}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-lg px-4 py-6 pb-32 sm:px-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4">
          <Link href="/style/upload"
            className="flex items-center gap-1 text-sm font-medium text-cream/40 hover:text-cream transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            다시 찍기
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">스타일 결과지</span>
          <Link href="/style" className="text-sm font-medium text-cream/40 hover:text-cream transition-colors">
            처음부터
          </Link>
        </div>

        {/* Before / After — 레퍼런스 이미지 폴백 없음, 에러 시 retry UI */}
        <BeforeAfterSection
          photo={photo}
          locked={locked}
          afterState={afterState}
          onRetry={handleRetryGenerate}
        />

        {/* 콘텐츠 (잠금 시 블러) */}
        <div className={`mt-5 space-y-4 transition-all duration-700 ${locked ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* 추천 스타일 카드 */}
          <div className="overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">추천 스타일</p>
              <h2 className="mt-1.5 font-serif text-2xl font-extrabold text-gold-light">
                {entry.name}
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[LENGTH_LABEL[answers.q11_length], DESIGN_LABEL[answers.q13_design], LAYER_LABEL[answers.q14_layer]]
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag} className="rounded-full border border-gold/25 bg-gold/[0.08] px-3 py-0.5 text-xs font-semibold text-gold-light">
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* 케어 처방 3줄 요약 */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">모발 케어 처방</p>
            <CareSummary answers={answers} />
          </div>

          {/* 저장 + 공유 버튼 */}
          <div className="space-y-2.5 pt-2">
            {/* 저장 → 카카오 로그인 → 메인 라우팅 */}
            <button
              onClick={() => setShowSave(true)}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-gold/30 bg-gold/[0.08] text-base font-bold text-gold-light transition-all hover:bg-gold/15 active:scale-[0.98]"
            >
              🤍 내 다이어리에 저장하고 평생 소장하기
            </button>

            <div className="flex gap-2.5">
              <Link href="/style/survey"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/12 text-sm font-medium text-cream/50 transition-all hover:border-white/25 hover:text-cream">
                다시 진단하기
              </Link>
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/style` : "/style";
                  if (navigator.share) navigator.share({ title: "AI 헤어 변신 | 어뷰티", url }).catch(() => {});
                  else navigator.clipboard?.writeText(url).then(() => alert("링크가 복사됐어요!"));
                }}
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.06] text-sm font-semibold text-gold-light transition-all hover:bg-gold/12">
                🔗 공유하기
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-charcoal/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          {locked ? (
            <button
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] hover:brightness-95 active:scale-[0.98]"
              onClick={() => {/* 모달은 자동 표시 중 */}}
            >
              <span className="text-lg">💬</span> 카카오 로그인하고 결과 보기
            </button>
          ) : (
            <a href={product.coupangUrl} target="_blank" rel="noopener noreferrer sponsored"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}>
              맞춤 제품 확인하기 →
            </a>
          )}
        </div>
      </div>

    </main>
  );
}
