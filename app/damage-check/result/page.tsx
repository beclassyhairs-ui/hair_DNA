"use client";

// ============================================================================
// 어뷰티 셀프 손상도 자가진단 — 결과지
// 저장 시 abeauty_user_profile(홈 화면 호환) + abeauty:diaryEntries(다이어리,
// kind:"damage" 판별자로 구분)에 동시에 기록해 /home과 /my-diary 양쪽에서
// 이 진단 기록을 읽어올 수 있게 한다.
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { DAMAGE_SURVEY_KEY } from "../constants";
import { diagnoseDamage, type DamageResult } from "../damageRecommend";
import type { DamageSurveyAnswers } from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { trackEvent as trackHomeEvent } from "../../../lib/trackEvent";

const LANDING_ID = "damage_check";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (config: Record<string, unknown>) => void };
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
      const poll = setInterval(() => { if (window.Kakao) { clearInterval(poll); resolve(); } }, 80);
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_CDN;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const DEFAULT_ANSWERS: DamageSurveyAnswers = {
  q1_pull: "", q2_friction: "", q3_dry: "", q4_habits: [],
};

export default function DamageCheckResultPage() {
  const router = useRouter();
  const [answers,   setAnswers]   = useState<DamageSurveyAnswers>(DEFAULT_ANSWERS);
  const [ready,     setReady]     = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DAMAGE_SURVEY_KEY);
      if (raw) setAnswers(JSON.parse(raw) as DamageSurveyAnswers);
    } catch { /**/ }
    setReady(true);
  }, []);

  const result: DamageResult = diagnoseDamage(answers);

  useEffect(() => {
    if (!ready) return;
    trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      result_type: result.resultCode,
      concern_tags: result.concernTags,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function handleSaveAndGoHome() {
    try {
      localStorage.setItem(
        "abeauty_user_profile",
        JSON.stringify({
          name: "고객",
          hairTags: result.concernTags,
          lastDiagnosis: "손상도 자가진단",
          lastDiagnosisDate: "오늘",
          mainConcern: result.headline,
        }),
      );
    } catch { /**/ }

    try {
      const entry = {
        id: uid(),
        kind: "damage" as const,
        savedAt: Date.now(),
        resultCode: result.resultCode,
        levelLabel: result.level.label,
        typeLabel: result.typeInfo.label,
        headline: result.headline,
        concernTags: result.concernTags,
        product: result.typeInfo.products[0],
      };
      let arr: unknown[] = [];
      try {
        const raw = localStorage.getItem("abeauty:diaryEntries");
        if (raw) arr = JSON.parse(raw);
      } catch { /**/ }
      arr.unshift(entry);
      localStorage.setItem("abeauty:diaryEntries", JSON.stringify(arr));
    } catch { /**/ }

    setSaved(true);
    trackHomeEvent("save_result_go_home", { source: "damage_check_result_page", result_code: result.resultCode });
    router.push("/home");
  }

  async function handleKakaoShare() {
    const shareUrl = `${SITE_URL}/damage-check?utm_source=kakao_share`;
    try {
      await loadKakaoSDK();
      const K = window.Kakao;
      if (K) {
        if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
        if (K.isInitialized()) {
          K.Share.sendDefault({
            objectType: "feed",
            content: {
              title: "어뷰티 | 내 모발 손상도 자가진단 결과",
              description: `AI 진단 결과, 나는 [${result.level.label} · ${result.typeInfo.label}]입니다.`,
              imageUrl: `${SITE_URL}/images/bangs-og.png`,
              link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
            },
            buttons: [{ title: "나도 손상도 확인하기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
          });
          setKakaoSent(true);
          setTimeout(() => setKakaoSent(false), 2500);
          return;
        }
      }
    } catch { /**/ }
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "어뷰티 | 손상도 자가진단", text: `나는 ${result.level.label} · ${result.typeInfo.label}!`, url: shareUrl }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!ready) return <main className="min-h-screen bg-[#F9FAFB]" />;

  return (
    <main className="mx-auto min-h-screen max-w-[430px] bg-[#F9FAFB] pb-40 text-[#2F2F2F]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-[#F9FAFB]/92 px-5 py-3.5 backdrop-blur-md">
        <Link href="/damage-check/survey" className="text-sm font-medium text-[#6B7280] hover:text-[#2F2F2F] transition-colors">
          ← 다시 하기
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">진단 결과지</span>
        <button onClick={handleKakaoShare} className="text-sm font-medium text-[#6B7280] hover:text-[#2F2F2F] transition-colors">
          {kakaoSent ? "전송됨 ✓" : "공유"}
        </button>
      </header>

      {/* ── Level 배지 + 헤드라인 ── */}
      <div className="px-5 pt-7 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">SELF DIAGNOSIS</p>
        <div className="mt-3 flex justify-center">
          <span className="rounded-xl bg-gold px-6 py-2 font-serif text-xl font-black text-charcoal shadow-gold">
            Level {result.level.level} · {result.level.label}
          </span>
        </div>
        <p className="mt-4 text-base leading-[1.7] text-[#374151]">{result.headline}</p>
      </div>

      {/* ── 콘텐츠 블록 ── */}
      <div className="mx-auto w-full max-w-lg px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-6 space-y-4">

          {/* 진단 요약 카드 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">진단 요약</p>
            <p className="text-sm leading-relaxed text-[#374151]">{result.level.summary}</p>
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
              <p className="text-xs font-semibold text-[#6B7280]">권장 관리 강도: <span className="text-[#2F2F2F]">{result.level.careIntensity}</span></p>
            </div>
          </div>

          {/* 원인 분석 카드 */}
          <div className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">✦ 주된 손상 원인 — {result.typeInfo.label}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#374151]">{result.typeInfo.causeExplain} 상태예요.</p>
              <div className="mt-3 rounded-xl border border-red-400/15 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-500">❌ 피해주세요 — {result.typeInfo.avoid}</p>
              </div>
            </div>
          </div>

          {/* 추천 제품 (커머스 전환) */}
          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">맞춤 추천 제품</p>
            <div className="space-y-2.5">
              {result.typeInfo.products.map((p, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#2F2F2F]">{p.name}</p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">{p.description}</p>
                    </div>
                  </div>
                  <a href={p.link} target="_blank" rel="noopener noreferrer sponsored"
                    className="flex h-10 w-full items-center justify-center gap-1.5 text-xs font-bold text-charcoal transition-all hover:brightness-105 active:scale-[0.98]"
                    style={{ background: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}>
                    제품 보러가기 →
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[#9CA3AF]">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받을 수 있습니다.
            </p>
          </div>

          {/* 저장 + 홈 이동 */}
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
            <p className="text-center text-base font-semibold text-[#2F2F2F]">이 결과, 계속 보관하고 싶다면?</p>
            <p className="mt-1 text-center text-sm text-[#6B7280]">내 홈 화면과 다이어리에 저장해서 관리를 이어가 보세요</p>
            <button
              onClick={handleSaveAndGoHome}
              disabled={saved}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
              style={{ background: "linear-gradient(105deg, #E4D2A8 0%, #C8A86B 50%, #A8884A 100%)" }}
            >
              {saved ? "저장 완료 ✓ 이동 중..." : "✨ 내 홈에 저장하고 관리 시작하기"}
            </button>
          </div>

          {/* 공유 */}
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
            <p className="text-center text-base font-semibold text-[#2F2F2F]">친구도 손상도 확인해볼까요?</p>
            <p className="mt-1 text-center text-sm text-[#6B7280]">결과를 공유하고 서로 비교해 보세요</p>
            <button
              onClick={handleKakaoShare}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3.5 text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
            >
              <span className="text-lg">💬</span>
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "카카오톡으로 공유하기"}
            </button>
            {copied && <p className="mt-2 text-center text-xs text-[#9CA3AF]">✓ 링크가 복사됐어요</p>}
          </div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg space-y-2">
          <button
            onClick={() => router.push("/style")}
            className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <motion.span
              className="pointer-events-none absolute inset-0"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 70%)" }}
            />
            <span className="relative">✨ AI 헤어 분석으로 내 스타일도 찾기!</span>
          </button>
          <Link href="/damage-check"
            className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#2F2F2F]">
            ← 처음부터 다시 하기
          </Link>
        </div>
      </div>

    </main>
  );
}
