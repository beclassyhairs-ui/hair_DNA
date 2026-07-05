"use client";

// ============================================================================
// 동안비법 — 맞춤 진단 결과지 (3탭 + Paywall/Sharewall + 다이어리 저장)
// ============================================================================

// ─── Kakao SDK 전역 타입 선언 ─────────────────────────────────────────────────
declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init:          (key: string) => void;
      Share: {
        sendDefault: (config: Record<string, unknown>) => void;
      };
    };
  }
}

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app";
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? "";
const KAKAO_CDN = "https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js";

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    if (window.Kakao) { resolve(); return; }
    if (document.querySelector(`script[src="${KAKAO_CDN}"]`)) {
      const poll = setInterval(() => {
        if (window.Kakao) { clearInterval(poll); resolve(); }
      }, 80);
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_CDN;
    s.onload  = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PHOTO_KEY, generateFacePrescription, type FacePrescriptionResult } from "./recommend";
import { Illustration } from "../diagnosis/Illustrations";
import type { Answers } from "../diagnosis/surveyData";
import {
  recommend,
  RESULT_STORAGE_KEY,
  type DiagnosisResult,
  type RankedItem,
} from "./recommend";
import type { BeautyProduct } from "./masterData";
import { EVENTS, track, trackServer } from "../../lib/analytics";
import {
  captureReferral,
  buildReferralUrl,
  getOrCreateMyRef,
} from "../../lib/referral";

// ─── 공통 애니메이션 ──────────────────────────────────────────────────────────
const RISE = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

const TABS = [
  { id: 0, label: "얼굴형 처방전" },
  { id: 1, label: "AI 헤어 스타일링" },
  { id: 2, label: "맞춤 헤어 케어" },
] as const;

// ─── 폭죽 파티클 설정 ─────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#C8A86B", "#F5E6C8", "#E8C87A", "#FFFFFF", "#FFD700", "#FF8C00"];

// ============================================================================
// 메인 페이지
// ============================================================================
export default function ResultPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [myRefId, setMyRefId] = useState("anon");
  const [incomingRef, setIncomingRef] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // ── Paywall 상태 ────────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(true);   // 5~8초 로딩
  const [isUnlocked, setIsUnlocked] = useState(false);    // 잠금 해제 여부
  const [showConfetti, setShowConfetti] = useState(false); // 폭죽 애니메이션
  const [showDiaryModal, setShowDiaryModal] = useState(false); // 다이어리 저장 모달

  // ── 초기 데이터 로드 ────────────────────────────────────────────────────────
  useEffect(() => {
    const ref = captureReferral();
    setIncomingRef(ref);
    if (ref) {
      track(EVENTS.REFERRAL_LANDED, { ref });
      void trackServer(EVENTS.REFERRAL_LANDED, { ref });
    }
    setMyRefId(getOrCreateMyRef());
    try {
      const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
      if (raw) setAnswers(JSON.parse(raw) as Answers);
    } catch { /* 파싱 실패 */ }
    setLoaded(true);
  }, []);

  // ── AI 분석 로딩 타이머 (5~8초 랜덤) ──────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const delay = 5000 + Math.random() * 3000;
    const t = setTimeout(() => setIsAnalyzing(false), delay);
    return () => clearTimeout(t);
  }, [loaded]);

  // ── 잠금 해제 공통 처리 ────────────────────────────────────────────────────
  const unlock = useCallback(() => {
    setIsUnlocked(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
  }, []);

  // ── 카카오 공유 (paywall 잠금 해제용) ──────────────────────────────────────
  async function handleKakaoShare() {
    track(EVENTS.SHARE_CLICK, { method: "kakao_unlock", ref: myRefId });
    const shareUrl = buildReferralUrl(myRefId);

    try {
      await loadKakaoSDK();
      const K = window.Kakao;
      if (K) {
        if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
        if (K.isInitialized()) {
          K.Share.sendDefault({
            objectType: "feed",
            content: {
              title:       "어뷰티(A-Beauty) | 나의 AI 헤어 진단 결과",
              description: "AI가 분석한 나의 맞춤 헤어 처방전을 확인해 보세요!",
              imageUrl:    `${SITE_URL}/hair-mbti-og.png`,
              link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
            },
            buttons: [
              { title: "나도 무료 진단 받기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
            ],
          });
          unlock();
          return;
        }
      }
    } catch { /* SDK 실패 → fallback */ }

    unlock();
  }

  // ── [Mock] 포트원 결제 ──────────────────────────────────────────────────────
  function handlePayment() {
    track(EVENTS.PRODUCT_CLICK, { product_id: "monthly_2000", product_name: "한달 무제한" });
    // TODO: 실제 포트원(PortOne) SDK 연동
    // IMP.request_pay({ pg: "...", pay_method: "card", amount: 2000 })
    // 현재는 Mock — 바로 잠금 해제
    unlock();
  }

  // ── 네비게이션 ──────────────────────────────────────────────────────────────
  function handleEditPrevious() {
    try { sessionStorage.removeItem(PHOTO_KEY); } catch { /* ignore */ }
    router.push("/diagnosis/quick");
  }

  function handleHardReset() {
    try {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      sessionStorage.removeItem(PHOTO_KEY);
    } catch { /* ignore */ }
    router.push("/");
  }

  const result = useMemo<DiagnosisResult | null>(
    () => (answers ? recommend(answers) : null),
    [answers],
  );

  const facePrescription = useMemo<FacePrescriptionResult | null>(
    () => (answers ? generateFacePrescription(answers) : null),
    [answers],
  );

  useEffect(() => {
    if (!result) return;
    track(EVENTS.RESULT_VIEW, { style: result.style.name });
  }, [result]);

  // ── 렌더 분기 ───────────────────────────────────────────────────────────────
  if (loaded && !result) return <EmptyState />;
  if (!result || !facePrescription) return <LoadingState />;

  return (
    <>
      {/* ── 폭죽 파티클 레이어 ── */}
      <AnimatePresence>{showConfetti && <ConfettiLayer />}</AnimatePresence>

      {/* ── AI 분석 로딩 전면 오버레이 ── */}
      <AnimatePresence>
        {isAnalyzing && <AnalyzingOverlay />}
      </AnimatePresence>

      {/* ── Paywall 모달 ── */}
      <AnimatePresence>
        {!isAnalyzing && !isUnlocked && (
          <PaywallModal
            onKakaoShare={handleKakaoShare}
            onPayment={handlePayment}
          />
        )}
      </AnimatePresence>

      {/* ── 다이어리 저장 모달 ── */}
      <AnimatePresence>
        {showDiaryModal && (
          <DiaryModal onClose={() => setShowDiaryModal(false)} />
        )}
      </AnimatePresence>

      {/* ── 결과지 본문 (블러 처리 포함) ── */}
      <main
        className="min-h-screen bg-charcoal pb-32 text-cream"
        style={
          !isUnlocked && !isAnalyzing
            ? { overflow: "hidden", maxHeight: "100vh" }
            : undefined
        }
      >
        {/* 블러 오버레이 — 잠금 상태 */}
        {!isUnlocked && !isAnalyzing && (
          <div className="pointer-events-none fixed inset-0 z-10 backdrop-blur-xl" />
        )}

        {incomingRef && (
          <div className="bg-gold/15 px-6 py-3 text-center text-sm font-medium text-gold-light">
            ✦ 친구의 초대 링크로 오셨군요! 무료 진단을 받아보세요.
          </div>
        )}

        <Stepper />

        {/* 3탭 네비게이션 */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-charcoal/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-gold text-gold-light"
                    : "border-b-2 border-transparent text-cream/50 hover:text-cream/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="mx-auto w-full max-w-2xl px-6 pt-8">
          {activeTab === 0 && (
            <Tab1FacePrescription facePrescription={facePrescription} />
          )}
          {activeTab === 1 && <Tab2AiStyling result={result} />}
          {activeTab === 2 && (
            <Tab3HairCare result={result} myRefId={myRefId} />
          )}
        </div>

        {/* 하단 고정 액션 */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-charcoal/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 py-4">
            {/* 다이어리 저장 버튼 — 잠금 해제 후에만 표시 */}
            {isUnlocked && (
              <button
                onClick={() => setShowDiaryModal(true)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 text-base font-medium text-cream/80 transition-colors hover:border-gold/40 hover:text-gold-light active:scale-[0.98]"
              >
                🤍 내 다이어리에 저장하고 평생 소장하기
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleEditPrevious}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-base font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
              >
                답변 수정
              </button>
              <button
                onClick={handleHardReset}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]"
              >
                처음부터 새로 시작
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ============================================================================
// AI 분석 로딩 전면 오버레이
// ============================================================================
const ANALYZING_STEPS = [
  "얼굴형 윤곽을 정밀 측정하고 있어요...",
  "모발 타입과 두상 데이터를 분석하고 있어요...",
  "AI가 최적의 스타일 조합을 탐색하고 있어요...",
  "맞춤 헤어 처방전을 작성하고 있어요...",
  "AI가 고객님에게 가장 완벽한 스타일을 렌더링하고 있습니다...",
];

function AnalyzingOverlay() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx((i) => (i + 1) % ANALYZING_STEPS.length);
    }, 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      key="analyzing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-charcoal px-6 py-12"
    >
      {/* 상단 로고 영역 */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white/5 px-5 py-2 text-sm font-medium tracking-wide text-gold-light">
          ✦ 어뷰티 AI 분석 중
        </span>
      </div>

      {/* 중앙 애니메이션 */}
      <div className="flex flex-col items-center gap-8 text-center">
        {/* 펄스 링 */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-gold/40"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-gold/25"
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/15">
            <motion.span
              className="text-4xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              ✦
            </motion.span>
          </div>
        </div>

        {/* 분석 단계 텍스트 */}
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="max-w-xs text-center text-lg font-medium leading-relaxed text-cream"
          >
            {ANALYZING_STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>

        {/* 진행 바 */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* 하단 광고 배너 (구글 애드센스 플레이스홀더) */}
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center text-xs text-cream/30">광고</p>
        <div className="flex h-[100px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {/* TODO: 실제 구글 애드센스 스크립트 삽입 위치 */}
          {/* <ins className="adsbygoogle" data-ad-client="ca-pub-XXXXXXXX" data-ad-slot="XXXXXXXX" /> */}
          <span className="text-sm text-cream/25">[ Google AdSense 320×100 ]</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Paywall 모달
// ============================================================================
function PaywallModal({
  onKakaoShare,
  onPayment,
}: {
  onKakaoShare: () => void;
  onPayment: () => void;
}) {
  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-5"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/30 bg-charcoal shadow-[0_0_60px_rgba(200,168,107,0.25)]"
      >
        {/* 상단 그라데이션 장식 */}
        <div className="h-1 w-full bg-gradient-to-r from-gold via-gold-dark to-gold" />

        <div className="px-6 pb-8 pt-7">
          {/* 아이콘 + 헤드라인 */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-3xl">
              🔒
            </div>
            <h2 className="font-serif text-2xl font-bold text-cream">
              AI 분석이 완료됐어요!
            </h2>
            <p className="mt-2 text-base leading-relaxed text-cream/60">
              맞춤 진단 결과를 확인하려면<br />아래 방법 중 하나를 선택해 주세요.
            </p>
          </div>

          {/* 혜택 체크리스트 */}
          <ul className="mb-6 space-y-2 rounded-2xl bg-white/5 px-5 py-4">
            {[
              "얼굴형 정밀 분석 + 맞춤 처방전",
              "AI 헤어 스타일 추천 + 프롬프트 공개",
              "모발 케어 루틴 + 추천 제품 3종",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-cream/80">
                <span className="text-gold-light">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {/* 버튼 1: 카카오 공유 */}
          <button
            onClick={onKakaoShare}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
          >
            <span className="text-xl">💬</span>
            카카오톡 3명에게 공유하고 결과 보기
          </button>

          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-cream/35">또는</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* 버튼 2: 결제 */}
          <button
            onClick={onPayment}
            className="flex h-14 w-full flex-col items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-br from-white/10 to-white/5 transition-all hover:border-gold/70 hover:from-white/15 active:scale-[0.98]"
          >
            <span className="text-base font-bold text-cream">
              2,000원 결제하고 한 달 무제한 이용
            </span>
            <span className="text-xs text-cream/45">
              구독 없음 · 언제든 취소 가능
            </span>
          </button>

          <p className="mt-4 text-center text-xs text-cream/30">
            결제는 안전한 포트원 PG사를 통해 처리돼요.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// 폭죽 파티클 레이어
// ============================================================================
function ConfettiLayer() {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 1.5,
        rotate: Math.random() * 720 - 360,
      })),
    [],
  );

  return (
    <motion.div
      key="confetti"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: "-5vh", rotate: 0, opacity: 1 }}
          animate={{ y: "110vh", rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: p.id % 3 === 0 ? "50%" : "2px",
            backgroundColor: p.color,
          }}
        />
      ))}
    </motion.div>
  );
}

// ============================================================================
// 다이어리 저장 모달 (카카오 로그인 유도)
// ============================================================================
function DiaryModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      key="diary-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      {/* 딤 배경 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-white/10 bg-charcoal px-6 pb-10 pt-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 바 */}
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-3xl">
            🤍
          </div>
          <h2 className="font-serif text-2xl font-bold text-cream">
            내 다이어리에 저장하기
          </h2>
          <p className="mt-3 text-base leading-relaxed text-cream/65">
            진단 결과를 영구 보관하고<br />
            언제든 다시 확인할 수 있어요.
          </p>
        </div>

        {/* 혜택 목록 */}
        <ul className="my-6 space-y-2.5 rounded-2xl bg-white/5 px-5 py-4">
          {[
            "결과지 평생 무제한 열람",
            "스타일 변천사 히스토리 관리",
            "다음 방문 시 재진단 없이 바로 확인",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-cream/80">
              <span className="text-gold-light">✦</span>
              {item}
            </li>
          ))}
        </ul>

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={() => {
            // TODO: 실제 카카오 OAuth 연동
            onClose();
          }}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
        >
          <span className="text-xl">💬</span>
          카카오로 1초 만에 로그인 / 가입하기
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm text-cream/40 hover:text-cream/70"
        >
          다음에 하기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Tab 1: 얼굴형 처방전
// ============================================================================
function Tab1FacePrescription({ facePrescription }: { facePrescription: FacePrescriptionResult }) {
  return (
    <motion.div initial="hidden" animate="show" variants={RISE} className="space-y-8">
      {/* 1. 진단된 얼굴형 이미지 영역 */}
      <section>
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white/5 px-5 py-2 text-sm font-medium tracking-wide text-gold-light">
            ✦ 어뷰티 AI 얼굴형 분석 결과
          </span>
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-white/5 to-transparent">
          <div className="relative flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold/50 bg-gold/10 text-4xl">
              ✦
            </div>
            <p className="text-base text-cream/60">AI 분석 결과, 고객님의 얼굴형은</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-cream">
              {facePrescription.title}
            </h1>
            <p className="mt-2 text-sm text-cream/40">입니다.</p>
          </div>
          <div className="border-t border-white/10 px-5 py-3 text-center">
            <p className="text-xs text-cream/35">
              * 사진 기반 Vision AI 분석 결과예요. 정확도는 지속 개선 중입니다.
            </p>
          </div>
        </div>
      </section>

      {/* 2. 기본 얼굴형 분석 블록 */}
      <section className="space-y-4">
        <div className="mb-2">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Face Analysis
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">얼굴형 정밀 분석</h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold/80">
            <span>●</span> 기본 정의
          </h3>
          <p className="text-base leading-relaxed text-cream/80">{facePrescription.baseDefinition}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
            <span>✓</span> 장점
          </h3>
          <p className="text-base leading-relaxed text-cream/80">{facePrescription.advantage}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
            <span>△</span> 보완점
          </h3>
          <p className="text-base leading-relaxed text-cream/80">{facePrescription.weakness}</p>
        </div>
      </section>

      {/* 3. 구분선 */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-white/15" />
        <span className="text-xs font-medium tracking-widest text-gold/60">맞춤 처방</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>

      {/* 4. 현재 스타일 맞춤 처방 블록 */}
      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Expert Prescription
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">현재 스타일 맞춤 처방</h2>
          <p className="mt-1 text-sm text-cream/50">고객님의 답변 + 얼굴형을 분석한 전문 디자이너 솔루션이에요.</p>
        </div>
        <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-6 shadow-gold">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-none text-2xl text-gold-light">✦</span>
            <p className="text-lg leading-relaxed text-cream">{facePrescription.expertPrescription}</p>
          </div>
        </div>
      </section>

      {/* 5. 볼륨 처방 블록 (강조) */}
      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Volume Solution
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">볼륨 처방</h2>
        </div>
        <div className="rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/15 to-transparent p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-none rounded-full bg-gold/20 px-2.5 py-1 text-xs font-bold text-gold-light">
              VOLUME
            </span>
            <p className="text-lg font-medium leading-relaxed text-cream">{facePrescription.volumeSolution}</p>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

// ============================================================================
// Tab 2: AI 헤어 스타일링
// ============================================================================
function Tab2AiStyling({ result }: { result: DiagnosisResult }) {
  return (
    <motion.div initial="hidden" animate="show" variants={RISE} className="space-y-8">
      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            AI Hair Styling
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">AI 합성 헤어 스타일</h2>
        </div>
        <AiPreview result={result} />
      </section>

      <div className="text-center">
        <h3 className="font-serif text-2xl font-semibold text-cream">{result.style.name}</h3>
        <p className="mt-3 text-base leading-relaxed text-cream/70">{result.headline}</p>
      </div>

      {result.hashtags.length > 0 && (
        <section>
          <div className="mb-3">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Style Tags
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.hashtags.map((h) => (
              <span
                key={h}
                className="rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold-light"
              >
                {h}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Recommended Style
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">추천 헤어스타일</h2>
        </div>
        <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-6 shadow-gold">
          <p className="text-base leading-relaxed text-cream/80">{result.style.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <Spec label="기장" value={result.style.length} />
            <Spec label="디자인" value={result.style.design} />
            <Spec label="레이어" value={result.style.layer} />
            <Spec label="무드" value={result.style.mood} />
          </dl>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            AI Engine
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">AI 합성 프롬프트</h2>
          <p className="mt-1 text-sm text-cream/50">설문 데이터를 변수로 조합해 생성된 실제 AI 합성 프롬프트예요.</p>
        </div>
        <PromptCard result={result} />
      </section>
    </motion.div>
  );
}

// ============================================================================
// Tab 3: 맞춤 헤어 케어
// ============================================================================
function Tab3HairCare({ result, myRefId }: { result: DiagnosisResult; myRefId: string }) {
  return (
    <motion.div initial="hidden" animate="show" variants={RISE} className="space-y-8">
      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Hair Condition
          </span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">모발 컨디션 요약</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <PriorityCard title="핵심 고민 우선순위" items={result.priority.concerns} />
          <PriorityCard title="볼륨 강조 우선순위" items={result.priority.volume} />
        </div>
      </section>

      {result.concerns.length > 0 && (
        <section>
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Concern Solutions
            </span>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">핵심 고민 맞춤 해법</h2>
          </div>
          <ol className="space-y-3">
            {result.concerns.map((c) => (
              <li key={c.rank}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-gold-light">{CIRCLED[c.rank - 1] ?? c.rank}</span>
                    <h3 className="text-xl font-semibold text-cream">{c.concern}</h3>
                  </div>
                  <p className="mt-3 pl-9 text-base leading-relaxed text-cream/70">{c.solution}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {result.treatments.length > 0 && (
        <section>
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Treatment Plan
            </span>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">추천 관리법</h2>
          </div>
          <div className="space-y-3">
            {result.treatments.map((t) => (
              <Tip key={t.title} title={t.title} body={t.body} accent />
            ))}
          </div>
        </section>
      )}

      {result.homecare.length > 0 && (
        <section>
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Home Care
            </span>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">홈케어 루틴</h2>
          </div>
          <div className="space-y-3">
            {result.homecare.map((h) => (
              <Tip key={h.title} title={h.title} body={h.body} />
            ))}
          </div>
        </section>
      )}

      {result.products.length > 0 && (
        <section>
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Prescription
            </span>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">어뷰티 맞춤 처방전</h2>
            <p className="mt-1 text-sm text-cream/55">진단 결과에 맞춰 디자이너가 추천하는 홈케어 제품이에요.</p>
          </div>
          <div className="space-y-3">
            {result.products.map((p, i) => (
              <ProductCard key={p.id} product={p} no={i + 1} />
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-cream/40">
            ※ 본 처방은 진단 결과 기반 추천이며, 구매는 자유 선택이에요.
          </p>
        </section>
      )}

      <section>
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Share</span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-cream">결과 공유하기</h2>
        </div>
        <ShareRow styleName={result.style.name} myRefId={myRefId} />
      </section>
    </motion.div>
  );
}

// ============================================================================
// 스텝 인디케이터
// ============================================================================
function Stepper() {
  const steps = ["사진 추가", "AI 합성", "결과 확인"];
  const active = 2;
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
                  i <= active ? "bg-gold-dark text-charcoal" : "bg-white/10 text-cream/50"
                }`}
              >
                {i + 1}
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

// ============================================================================
// AI 합성 미리보기 영역
// ============================================================================
function AiPreview({ result }: { result: DiagnosisResult }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-white/5 to-transparent">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(200,168,107,0.18),transparent_60%)]">
        <div className="h-44 w-44 text-gold-light/80">
          <Illustration name={result.reference.illustration} />
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-charcoal/70 px-3 py-1 text-xs font-medium text-cream/70">
          AI 합성 미리보기
        </span>
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light">
            매칭 레퍼런스
          </span>
          <span className="font-serif text-lg font-semibold text-cream">
            {result.reference.name}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-cream/60">{result.reference.summary}</p>
      </div>
    </div>
  );
}

// ============================================================================
// 우선순위 요약 카드
// ============================================================================
function PriorityCard({ title, items }: { title: string; items: RankedItem[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 text-sm font-medium tracking-wide text-gold-light">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-cream/40">선택 항목 없음</p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2.5">
              <span className="text-xl text-gold-light">{CIRCLED[it.rank - 1] ?? it.rank}</span>
              <span className="text-base font-medium text-cream">{it.label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ============================================================================
// 자사 제품 처방 카드
// ============================================================================
function ProductCard({ product, no }: { product: BeautyProduct; no: number }) {
  function handleBuyClick() {
    track(EVENTS.PRODUCT_CLICK, {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
    });
    void trackServer(EVENTS.PRODUCT_CLICK, {
      product_id: product.id,
      product_name: product.name,
    });
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-gold/25 bg-gradient-to-br from-white/[0.07] to-transparent p-5">
      <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gold/10 text-3xl">
        {product.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold-light">
            처방 {no}
          </span>
          <span className="text-xs text-cream/40">{product.category}</span>
        </div>
        <h3 className="mt-1.5 text-lg font-semibold text-cream">{product.name}</h3>
        <p className="mt-0.5 text-sm font-medium text-gold-light/90">{product.tagline}</p>
        <p className="mt-2 text-sm leading-relaxed text-cream/65">{product.detail}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold text-cream">{product.price}</span>
          <a
            href={product.coupangUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleBuyClick}
            className="rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/25 active:scale-[0.98]"
          >
            제품 보기
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI 프롬프트 카드
// ============================================================================
function PromptCard({ result }: { result: DiagnosisResult }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    try {
      navigator.clipboard?.writeText(result.aiPrompt.positive);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 클립보드 미지원 */ }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex flex-wrap gap-1.5">
        {result.aiPrompt.parts.map((p) => (
          <span
            key={p.label + p.token}
            className="rounded-md bg-white/5 px-2 py-1 text-xs text-cream/60"
            title={p.token}
          >
            <span className="text-gold-light">{p.label}</span> → {p.token}
          </span>
        ))}
      </div>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs leading-relaxed text-cream/80">
        <code>
          <span className="text-gold-light">positive:</span> {result.aiPrompt.positive}
          {"\n\n"}
          <span className="text-gold-light">negative:</span> {result.aiPrompt.negative}
        </code>
      </pre>
      <button
        onClick={copy}
        className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-cream/80 transition-colors hover:border-white/30 hover:text-cream active:scale-[0.98]"
      >
        {copied ? "복사됨 ✓" : "프롬프트 복사"}
      </button>
    </div>
  );
}

// ============================================================================
// 공유 버튼
// ============================================================================
function ShareRow({ styleName, myRefId }: { styleName: string; myRefId: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = buildReferralUrl(myRefId);
  const shareText = `나의 맞춤 헤어 스타일은 "${styleName}"이에요. 무료로 AI 진단 받아보세요!`;

  async function handleShare(method: "kakao" | "copy") {
    track(EVENTS.SHARE_CLICK, { method, ref: myRefId, style: styleName });
    void trackServer(EVENTS.SHARE_CLICK, { method, ref: myRefId });
    if (method === "kakao") {
      try {
        await loadKakaoSDK();
        const K = window.Kakao;
        if (K) {
          if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
          if (K.isInitialized()) {
            K.Share.sendDefault({
              objectType: "feed",
              content: {
                title:       `어뷰티(A-Beauty) | ${styleName}`,
                description: shareText,
                imageUrl:    `${SITE_URL}/hair-mbti-og.png`,
                link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
              },
              buttons: [
                { title: "나도 무료 진단 받기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
              ],
            });
            return;
          }
        }
      } catch { /* SDK 실패 → fallback */ }
      if (typeof navigator !== "undefined" && navigator.share) {
        navigator.share({ title: "어뷰티(A-Beauty) AI 헤어 진단", text: shareText, url: shareUrl }).catch(() => {});
      } else {
        void navigator.clipboard?.writeText(shareUrl);
      }
    } else {
      void navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleShare("kakao")}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
        >
          <span>💬</span> 카카오톡 공유
        </button>
        <button
          onClick={() => handleShare("copy")}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 text-base font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
        >
          <span>{copied ? "✓" : "🔗"}</span>
          {copied ? "복사됨!" : "링크 복사"}
        </button>
      </div>
      <p className="text-center text-xs text-cream/35">
        내 초대 코드: <span className="font-mono text-gold/60">{myRefId}</span>
      </p>
    </div>
  );
}

// ============================================================================
// 공통 조각
// ============================================================================
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-4 py-3">
      <dt className="text-sm text-cream/45">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-cream">{value}</dd>
    </div>
  );
}

function Tip({ title, body, accent }: { title: string; body: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-gold/30 bg-gradient-to-br from-gold/[0.08] to-transparent"
          : "border-white/10 bg-white/5"
      }`}
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold text-cream">
        <span className="text-gold-light">✦</span>
        {title}
      </h3>
      <p className="mt-2 text-base leading-relaxed text-cream/70">{body}</p>
    </div>
  );
}

// ============================================================================
// 로딩 / 빈 상태
// ============================================================================
function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-charcoal px-6">
      <p className="text-lg text-cream/60">결과지를 불러오는 중이에요…</p>
    </main>
  );
}

function EmptyState() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-charcoal px-6 py-16 text-center">
      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-2xl text-gold-light">
        ✦
      </div>
      <h1 className="font-serif text-2xl font-semibold text-cream">진단 정보가 없어요</h1>
      <p className="mt-3 text-lg leading-relaxed text-cream/65">
        결과지를 보려면 먼저 문진을 완료해 주세요.
      </p>
      <Link
        href="/diagnosis/quick"
        className="mt-9 inline-flex w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark px-10 py-5 text-xl font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]"
      >
        진단 시작하기
      </Link>
    </main>
  );
}
