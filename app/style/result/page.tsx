"use client";

// ============================================================================
// 결과지 — 이중 로딩 없음, 세션에서 즉시 렌더링
// 캡처 방지 + 알림 신청 버튼 + 배열 다이어리 저장
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  KAKAO_LOGGED_IN_KEY,
  STYLE_ANSWERS_KEY,
  STYLE_DEBUG_ERROR_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "../constants";
import {
  getStyleEntry,
  getStyleProduct,
  getSecondStyleProduct,
  buildAhaText,
  getPrimaryConcern,
  type AhaBlock,
} from "../recommend";
import type { StyleAnswers } from "../surveyData";
import AdBanner from "@/app/components/AdBanner";
import { trackEvent } from "../../../lib/trackEvent";

// ─── 진단 결과 → /home 개인화 프로필 매핑 ────────────────────────────────────
const USER_PROFILE_KEY = "abeauty_user_profile";

function buildHairTags(answers: StyleAnswers): string[] {
  const tags: string[] = [];
  if (answers.q10_history_count === "count_7plus") tags.push("#손상모");
  if (answers.q8_density === "thin_density") tags.push("#볼륨처짐");
  if (answers.q7_thickness === "fine") tags.push("#가는모");
  if (answers.q3_curl === "curly_hair") tags.push("#곱슬모");
  return tags.length > 0 ? tags : ["#건강모"];
}

// ─── 카카오 세션 헬퍼 ─────────────────────────────────────────────────────────
function isKakaoLoggedIn(): boolean {
  try { return localStorage.getItem(KAKAO_LOGGED_IN_KEY) === "1"; } catch { return false; }
}
function markKakaoLoggedIn() {
  try { localStorage.setItem(KAKAO_LOGGED_IN_KEY, "1"); } catch { /**/ }
}

// UUID 생성 (저장 시 고유 ID)
function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

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
    await kakaoLogin(() => {
      markKakaoLoggedIn();
      setLoading(false);
      onUnlock();
    });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-charcoal/85 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/25 bg-[#141210]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="px-7 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">A-Beauty</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-cream">결과지가 완성됐어요!</h2>
          <p className="mt-2 text-sm text-cream/50">맞춤 헤어스타일과 케어 처방전을 확인하세요.</p>
          <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-2xl">🔓</div>
          <button onClick={handleLogin} disabled={loading}
            className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70">
            {loading
              ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block text-lg">⏳</motion.span>
              : <><span className="text-xl">💬</span> 카카오 1초 로그인하고 결과 확인하기</>}
          </button>
          <p className="mt-2.5 text-[11px] text-cream/25">별도 가입 없이 카카오 계정으로 바로 확인</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 카카오 저장 → 다이어리 라우팅 모달 ─────────────────────────────────────

function KakaoSaveModal({
  answers, styleName, onClose,
}: { answers: StyleAnswers; styleName: string; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function executeSaveAndRoute() {
    try {
      const generatedImageUrl = sessionStorage.getItem(STYLE_GENERATED_KEY) ?? null;
      const id = uid();
      const entry = {
        id,
        answers,
        styleName,
        savedAt:           Date.now(),
        generatedImageUrl,
        isSevereDamage:    answers.q10_history_count === "count_7plus",
        isLowDensity:      answers.q8_density === "thin_density",
        isFineHair:        answers.q7_thickness === "fine",
        isCurly:           answers.q3_curl === "curly_hair",
      };
      // 배열에 누적 저장 (UUID로 중복 방지)
      let arr: typeof entry[] = [];
      try {
        const raw = localStorage.getItem("abeauty:diaryEntries");
        if (raw) arr = JSON.parse(raw);
      } catch { /**/ }
      // 중복 ID 방어
      arr = arr.filter(e => e.id !== id);
      arr.unshift(entry);
      localStorage.setItem("abeauty:diaryEntries", JSON.stringify(arr));
      // 최신 진단 단일 키도 유지 (하위 호환)
      localStorage.setItem("abeauty:savedDiagnosis", JSON.stringify(entry));
      // /home 대시보드가 읽어갈 개인화 프로필
      localStorage.setItem(
        USER_PROFILE_KEY,
        JSON.stringify({ name: "고객", hairTags: buildHairTags(answers) }),
      );
    } catch { /**/ }
    trackEvent("save_result_go_home", { source: "diagnosis_result_page" });
    router.push("/home");
  }

  async function handleSaveAndRoute() {
    if (loading) return;
    if (isKakaoLoggedIn()) { executeSaveAndRoute(); return; }
    setLoading(true);
    await kakaoLogin(() => { markKakaoLoggedIn(); executeSaveAndRoute(); });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl border-t border-gold/20 bg-[#141210] px-6 pb-10 pt-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">A-Beauty Diary</p>
        <h3 className="mt-2 font-serif text-xl font-bold text-cream">내 다이어리에 저장하고 평생 소장하기</h3>
        <p className="mt-2 text-sm text-cream/45 leading-relaxed">
          진단 결과를 저장하면 나만의 맞춤 홈케어 제품과 스타일 히스토리가 보관됩니다.
        </p>
        <div className="mt-4 space-y-2">
          {["맞춤 홈케어 제품 상단 노출 (시술 이력 기반)", "내 헤어 스타일 히스토리 보관", "전문가 케어 처방전 저장"].map(b => (
            <div key={b} className="flex items-center gap-2.5 text-sm text-cream/65">
              <span className="text-gold text-xs">✦</span>{b}
            </div>
          ))}
        </div>
        <button onClick={handleSaveAndRoute} disabled={loading}
          className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70">
          {loading
            ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block text-lg">⏳</motion.span>
            : <><span className="text-xl">💬</span> 카카오 1초 로그인/가입으로 저장하기</>}
        </button>
        <button onClick={onClose} className="mt-2.5 flex h-11 w-full items-center justify-center rounded-xl text-sm text-cream/40 hover:text-cream/70">
          나중에 저장하기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Before / After 이미지 섹션 ───────────────────────────────────────────────
// ★ 폴링 없음 — sessionStorage에서 즉시 읽은 URL만 표시

function BeforeAfterSection({
  photo, locked, generatedUrl, debugError, onRetry,
}: {
  photo:        string | null;
  locked:       boolean;
  generatedUrl: string | null;
  debugError:   string | null;
  onRetry:      () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* BEFORE */}
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-all duration-700 ${locked ? "blur-sm" : ""}`}
        style={{ aspectRatio: "3/4" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="원본 사진" draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ objectPosition: "50% 10%", pointerEvents: "none", WebkitTouchCallout: "none" }} />
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
              <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* AFTER */}
      <div className={`relative overflow-hidden rounded-2xl border border-gold/25 bg-black/40 transition-all duration-700 ${locked ? "blur-sm" : ""}`}
        style={{ aspectRatio: "3/4" }}>
        {generatedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={generatedUrl} alt="AI 변신 스타일" draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ pointerEvents: "none", WebkitTouchCallout: "none" }}
            onError={(e) => console.error("[Result] ❌ AI 이미지 로드 실패. src:", (e.target as HTMLImageElement).src)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center overflow-y-auto py-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-cream/25" stroke="currentColor" strokeWidth={1.2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] leading-snug text-cream/40">AI 합성에<br />실패했어요</p>
            {debugError && (
              <div className="w-full rounded-lg border border-red-500/40 bg-red-950/60 px-2 py-2 text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1">[개발자 디버그] 에러 원인:</p>
                <p className="text-[10px] leading-snug text-red-300 break-all">{debugError}</p>
              </div>
            )}
            <button onClick={onRetry}
              className="rounded-xl border border-gold/35 bg-gold/[0.08] px-3.5 py-1.5 text-[11px] font-bold text-gold transition-colors hover:bg-gold/15">
              다시 시도
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">After ✦</span>
        </div>
        {!locked && generatedUrl && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 1.5px rgba(200,168,107,0.3)" }} />
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-gold/40" stroke="currentColor" strokeWidth={1.5}>
              <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 아하! 공감형 3-Block 카드 ───────────────────────────────────────────────

function AhaCard({ aha }: { aha: AhaBlock }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="px-5 py-4 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">AI 모발 진단</p>

        {/* Block A: 원인 */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex-none rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold text-gold whitespace-nowrap">원인</span>
          <p className="text-sm leading-relaxed text-cream/70">{aha.cause}</p>
        </div>

        {/* Block B: 아하! 공감 */}
        <div className="flex items-start gap-3 rounded-xl border border-gold/15 bg-gold/[0.05] px-3.5 py-3">
          <span className="flex-none text-base leading-none mt-0.5">😮</span>
          <p className="text-sm font-medium leading-relaxed text-cream/90">{aha.sympathy}</p>
        </div>

        {/* Block C: 솔루션 */}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex-none rounded-full bg-teal-400/15 px-2 py-0.5 text-[9px] font-bold text-teal-400 whitespace-nowrap">처방</span>
          <p className="text-sm leading-relaxed text-cream/70">{aha.solution}</p>
        </div>
      </div>
    </div>
  );
}

// ─── 기획자용 진단 로직 디버그 패널 ──────────────────────────────────────────

const Q_DEBUG_LABELS: Record<string, [string, Record<string, string>]> = {
  q1_age:            ["연령대",    { age_20: "20대", age_30: "30대", age_40: "40대", age_50: "50대", age_60plus: "60대+" }],
  q11_length:        ["기장",      { short: "숏", short_bob: "턱선 위", bob: "단발", collarbone: "쇄골", chest: "가슴선", long: "롱" }],
  q14_layer:         ["레이어",    { heavy: "층 없음", medium: "층 중간", light: "층 많음" }],
  q13_design:        ["웨이브",    { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" }],
  q8_density:        ["숱",        { thick_density: "많음", medium_density: "보통", thin_density: "적음" }],
  q7_thickness:      ["굵기",      { coarse: "굵음", medium_thickness: "보통", fine: "가늘음" }],
  q3_curl:           ["곱슬",      { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair: "악성곱슬" }],
  q10_history_count: ["시술 횟수", { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회+" }],
};

function DiagnosisDebugPanel({
  answers, styleName, concern,
}: { answers: StyleAnswers; styleName: string; concern: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-3 z-40 flex items-center gap-1 rounded-full border border-white/15 bg-charcoal/85 px-2.5 py-1.5 text-[9px] font-mono font-bold text-cream/35 backdrop-blur-sm hover:text-cream/65"
      >
        🔍 진단 로직
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="relative z-10 max-h-[78vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#111] px-5 pb-10 pt-5 font-mono text-[11px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <p className="mb-3 font-bold uppercase tracking-widest text-yellow-400">🔍 진단 로직 디버그</p>

              {/* 유저 답변 */}
              <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-yellow-400/70">유저 답변 원본</p>
                {Object.entries(Q_DEBUG_LABELS).map(([key, [label, map]]) => (
                  <div key={key} className="flex justify-between border-b border-white/[0.05] py-1 last:border-0">
                    <span className="text-cream/35">{label}</span>
                    <span className="text-cream/65">{map[answers[key] ?? ""] ?? answers[key] ?? "—"}</span>
                  </div>
                ))}
              </div>

              {/* 스타일 계산 */}
              <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-yellow-400/70">스타일 계산 결과</p>
                <div className="flex justify-between py-1">
                  <span className="text-cream/35">생성 스타일명</span>
                  <span className="font-bold text-yellow-300">{styleName}</span>
                </div>
              </div>

              {/* 아하! 블록 선택 */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-yellow-400/70">아하! 블록 선택</p>
                <div className="flex justify-between py-1">
                  <span className="text-cream/35">우선 고민</span>
                  <span className="font-bold text-yellow-300">{concern}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── 알림 신청 버튼 (하단 고정 CTA 교체) ──────────────────────────────────────

type NotifyState = "idle" | "loading" | "done";

function NotifyButton() {
  const [state, setState] = useState<NotifyState>("idle");

  async function handleNotify() {
    if (state !== "idle") return;
    setState("loading");
    try {
      localStorage.setItem("abeauty:notifyConsent", JSON.stringify({ ts: Date.now(), src: "result" }));
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "notify_consent" }),
      });
      await new Promise(r => setTimeout(r, 700));
      setState("done");
    } catch { setState("done"); }
  }

  if (state === "done") {
    return (
      <div className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.1] text-base font-semibold text-gold-light">
        ✓ 알림 신청이 완료되었습니다!
      </div>
    );
  }
  return (
    <button onClick={handleNotify} disabled={state === "loading"}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60">
      {state === "loading"
        ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span>
        : "🔔 새로운 AI 분석 서비스 오픈 알림 받기"}
    </button>
  );
}

// ============================================================================
// 메인 결과 페이지 — 폴링 없음, sessionStorage 즉시 읽기
// ============================================================================

export default function StyleResultPage() {
  const router = useRouter();

  const [photo,      setPhoto]      = useState<string | null>(null);
  const [generated,  setGenerated]  = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<StyleAnswers>({});
  const [locked,     setLocked]     = useState(true);
  const [ready,      setReady]      = useState(false);
  const [showSave,   setShowSave]   = useState(false);


  // 세션 데이터 즉시 로드 (폴링 없음)
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (p) setPhoto(p);
      const a = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (a) setAnswers(JSON.parse(a) as StyleAnswers);
      if (sessionStorage.getItem(STYLE_UNLOCKED_KEY) === "1") setLocked(false);
      // ★ AI 이미지 — 한 번만 읽기 (loading 페이지가 완성 후 넘겨줌)
      const g = sessionStorage.getItem(STYLE_GENERATED_KEY);
      console.log("[Result] sessionStorage STYLE_GENERATED_KEY 값:", g ?? "(없음)");
      if (g) {
        setGenerated(g);
      } else {
        const dbgErr = sessionStorage.getItem(STYLE_DEBUG_ERROR_KEY);
        console.warn("[Result] ⚠️ AI 이미지 URL 없음. debugError:", dbgErr ?? "(없음)");
        if (dbgErr) setDebugError(dbgErr);
      }
    } catch { /**/ }
    setReady(true);
  }, []);

  function handleUnlock() {
    try { sessionStorage.setItem(STYLE_UNLOCKED_KEY, "1"); } catch { /**/ }
    setLocked(false);
  }

  function handleRetry() {
    try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
    router.push("/style/upload");
  }

  if (!ready) return <main className="min-h-screen bg-charcoal" />;

  const entry   = getStyleEntry(answers);
  const product  = getStyleProduct(answers);
  const product2 = getSecondStyleProduct(answers);
  const aha      = buildAhaText(answers);
  const concern  = getPrimaryConcern(answers);

  const DESIGN_LABEL: Record<string, string> = { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" };
  const LAYER_LABEL:  Record<string, string> = { heavy: "층 없음", medium: "소프트", light: "허쉬컷" };
  const LENGTH_LABEL: Record<string, string> = { short: "숏", short_bob: "턱선 위", bob: "단발", collarbone: "쇄골선", chest: "가슴선", long: "롱" };

  return (
    <main className="min-h-screen bg-charcoal text-cream" style={{ touchAction: "pan-y" }}>

      <AnimatePresence>{locked && <KakaoLockModal onUnlock={handleUnlock} />}</AnimatePresence>
      <AnimatePresence>
        {showSave && <KakaoSaveModal answers={answers} styleName={entry.name} onClose={() => setShowSave(false)} />}
      </AnimatePresence>

      <div className="mx-auto max-w-lg px-4 py-6 pb-32 sm:px-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4">
          <Link href="/style/upload" className="flex items-center gap-1 text-sm font-medium text-cream/40 hover:text-cream transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            다시 찍기
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">스타일 결과지</span>
          <Link href="/style" className="text-sm font-medium text-cream/40 hover:text-cream transition-colors">처음부터</Link>
        </div>

        {/* Before / After — 세션 즉시 렌더 */}
        <BeforeAfterSection photo={photo} locked={locked} generatedUrl={generated} debugError={debugError} onRetry={handleRetry} />

        {/* 스크롤 유도 — 강조 텍스트 */}
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-gold/60" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <p className="text-base font-medium text-cream/55">
            아래로 내려서 AI 맞춤 처방을 확인하세요 ⬇️
          </p>
        </div>

        {/* AdSense 수평 띠 배너 — 블러 바깥, 항상 표시 */}
        <div className="mt-5 w-full">
          <AdBanner slot="4013466421" format="horizontal" />
        </div>

        {/* 잠금 시 블러 */}
        <div className={`mt-5 space-y-4 transition-all duration-700 ${locked ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* 추천 스타일 */}
          <div className="overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">추천 스타일</p>
              <h2 className="mt-1.5 font-serif text-2xl font-extrabold text-gold-light">{entry.name}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[LENGTH_LABEL[answers.q11_length], DESIGN_LABEL[answers.q13_design], LAYER_LABEL[answers.q14_layer]]
                  .filter(Boolean).map(tag => (
                    <span key={tag} className="rounded-full border border-gold/25 bg-gold/[0.08] px-3 py-0.5 text-xs font-semibold text-gold-light">{tag}</span>
                  ))}
              </div>
            </div>
          </div>

          {/* 아하! 공감형 3-Block 모발 진단 카드 */}
          <AhaCard aha={aha} />

          {/* 맞춤 제품 2개 */}
          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">맞춤 추천 제품</p>
            <div className="space-y-2.5">
              {[product, product2].map((p, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <div className="flex h-[72px] items-center justify-center border-b border-white/[0.05] bg-gradient-to-r from-gold/[0.05] to-transparent">
                    <span className="text-3xl">{p.emoji}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold/60">{p.category}</p>
                    <p className="mt-0.5 text-sm font-bold text-cream/85">{p.name}</p>
                    <p className="mt-0.5 text-xs text-cream/45">{p.tagline}</p>
                  </div>
                  <div className="px-4 pb-4">
                    <a href={p.coupangUrl} target="_blank" rel="noopener noreferrer sponsored"
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-xs font-bold text-charcoal transition-all hover:brightness-105 active:scale-[0.98]">
                      나의 맞춤 제품 구매하러 가기 →
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-cream/18">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </div>

          {/* 저장 + 공유 */}
          <div className="space-y-2.5 pt-2">
            <button onClick={() => setShowSave(true)}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-gold/30 bg-gold/[0.08] text-base font-bold text-gold-light transition-all hover:bg-gold/15 active:scale-[0.98]">
              📥 사진 다운받기 (다이어리 저장 후 가능)
            </button>
            <p className="text-center text-xs text-cream/40 -mt-1">
              다이어리에 저장하면 AI 변신 사진을 갤러리에 저장할 수 있어요
            </p>
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

      {/* 기획자용 진단 로직 디버그 패널 */}
      <DiagnosisDebugPanel
        answers={answers}
        styleName={entry.name}
        concern={concern}
      />

      {/* ★ 하단 고정 — 잠금 시 카카오 / 해제 시 알림 신청 버튼 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-charcoal/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          {locked ? (
            <button
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] hover:brightness-95 active:scale-[0.98]"
              onClick={() => {/* 모달 자동 표시 */}}>
              <span className="text-lg">💬</span> 카카오 로그인하고 결과 보기
            </button>
          ) : (
            <NotifyButton />
          )}
        </div>
      </div>

    </main>
  );
}
