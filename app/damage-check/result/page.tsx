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
import { appendDiaryEntry, refreshBeautyUserProfileFromDiary } from "../../../lib/beautyProfile";
import CompletionGauge from "@/components/CompletionGauge";
import LockedPreviewCard from "@/components/LockedPreviewCard";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import ResultHeroCard from "@/components/beauty-ui/ResultHeroCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";
import BottomStickyCTA from "@/components/beauty-ui/BottomStickyCTA";

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
    trackEvent(EVENT_NAMES.REPORT_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      result_type: result.resultCode,
      concern_tags: result.concernTags,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function handleSaveAndGoHome() {
    try {
      appendDiaryEntry({
        id: uid(),
        kind: "damage",
        savedAt: Date.now(),
        resultCode: result.resultCode,
        levelLabel: result.level.label,
        typeLabel: result.typeInfo.label,
        headline: result.headline,
        concernTags: result.concernTags,
        hairTags: result.concernTags,
        diagnosisSummary: result.headline,
        product: result.typeInfo.products[0],
      });
      // diaryEntries 전체를 다시 읽어 우선순위(style>damage>bangs>hairquiz) 기반으로
      // profile을 재생성 — /style 태그가 있으면 그 앞자리를 유지한 채 damage 태그가
      // 뒤에 추가된다.
      refreshBeautyUserProfileFromDiary();
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

  if (!ready) return <main className="min-h-screen bg-surface" />;

  return (
    <SilkBackground>
      <main className="mx-auto min-h-screen max-w-[430px] pb-40 text-ink" style={{ touchAction: "pan-y" }}>

        {/* ── 헤더 ── */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-surface/92 px-5 py-3.5 backdrop-blur-md">
          <Link href="/damage-check/survey" className="text-[15px] font-medium text-ink-2 hover:text-ink transition-colors">
            ← 다시 하기
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">진단 결과지</span>
          <button onClick={handleKakaoShare} className="text-[15px] font-medium text-ink-2 hover:text-ink transition-colors">
            {kakaoSent ? "전송됨 ✓" : "공유"}
          </button>
        </header>

        <div className="mx-auto w-full max-w-lg px-5 pt-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">

            {/* A-1 완성도 게이지 — 결과지 상단 */}
            <CompletionGauge />

            {/* ── 결과 히어로 — 큰 타이틀 + 짧은 설명 (이미지 없는 버전) ── */}
            <ResultHeroCard
              eyebrow="SELF DIAGNOSIS"
              badge={`Level ${result.level.level} · ${result.level.label}`}
              title={result.headline}
            />

            {/* 진단 요약 */}
            <GlassCard className="px-5 py-5">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">진단 요약</p>
              <p className="text-[15px] leading-relaxed text-ink">{result.level.summary}</p>
              <div className="mt-3 rounded-xl border border-line bg-white/60 px-4 py-2.5">
                <p className="text-[13px] font-semibold text-ink-2">
                  권장 관리 강도: <span className="text-ink">{result.level.careIntensity}</span>
                </p>
              </div>
            </GlassCard>

            {/* Lv4(극손상모) 전용 정직 처방 — 담담한 전문가 톤, 공포 조장 없음 */}
            {result.level.cutAdvice && (
              <GlassCard tone="soft" className="px-5 py-5">
                <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">전문가 처방</p>
                <p className="text-[15px] leading-relaxed text-ink">{result.level.cutAdvice}</p>
                {result.level.keratinCaution && (
                  <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <p className="text-[15px] font-medium text-ink-2">{result.level.keratinCaution}</p>
                  </div>
                )}
              </GlassCard>
            )}

            {/* 원인 분석 — 차분한 톤(경고색 제거) */}
            <GlassCard accent className="px-5 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">
                주된 원인 — {result.typeInfo.label}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">{result.typeInfo.causeExplain} 상태예요.</p>
              <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-[15px] font-medium text-ink-2">이런 습관은 피해보세요 — {result.typeInfo.avoid}</p>
              </div>
            </GlassCard>

            {/* 홈케어 제품은 결과지에 직접 노출하지 않고 발견템으로 안내만 */}
            <GlassCard className="space-y-3 px-5 py-4">
              <Link
                href="/items"
                className="flex items-center justify-between gap-3 text-[15px] font-medium text-ink hover:text-ink"
              >
                발견템에서 손상도 단계에 맞는 홈케어 제품을 볼 수 있어요
                <span className="flex-none text-ink-2">→</span>
              </Link>
              <div className="h-px bg-surface" />
              <Link
                href="/hair-quiz"
                className="flex items-center justify-between gap-3 text-[15px] font-medium text-ink hover:text-ink"
              >
                평소 손질 습관 진단
                <span className="flex-none text-ink-2">→</span>
              </Link>
              <div className="h-px bg-surface" />
              <Link
                href="/style"
                className="flex items-center justify-between gap-3 text-[15px] font-medium text-ink hover:text-ink"
              >
                AI 헤어 분석으로 내 스타일도 찾기
                <span className="flex-none text-ink-2">→</span>
              </Link>
            </GlassCard>

            {/* 저장 + 홈 이동 */}
            <GlassCard className="px-5 py-5">
              <p className="text-center text-base font-semibold text-ink">이 결과, 계속 보관하고 싶다면?</p>
              <p className="mt-1 text-center text-[15px] text-ink-2">내 홈 화면과 다이어리에 저장해서 관리를 이어가 보세요</p>
              <div className="mt-4">
                <BlackCTAButton onClick={handleSaveAndGoHome} disabled={saved}>
                  {saved ? "저장 완료 ✓ 이동 중..." : "내 홈에 저장하고 관리 시작하기"}
                </BlackCTAButton>
              </div>
            </GlassCard>

            {/* 공유 */}
            <GlassCard className="px-5 py-5">
              <p className="text-center text-base font-semibold text-ink">친구도 손상도 확인해볼까요?</p>
              <p className="mt-1 text-center text-[15px] text-ink-2">결과를 공유하고 서로 비교해 보세요</p>
              <button
                onClick={handleKakaoShare}
                className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-base font-semibold text-ink transition-all hover:bg-surface active:scale-[0.98]"
              >
                {kakaoSent ? "카카오톡 전송 완료 ✓" : "카카오톡으로 공유하기"}
              </button>
              {copied && <p className="mt-2 text-center text-[13px] text-ink-2">✓ 링크가 복사됐어요</p>}
            </GlassCard>

            {/* A-2 잠금 미리보기 — /style(AI 합성)로 넘기는 카드 */}
            <LockedPreviewCard
              onCtaClick={() => trackEvent("locked_preview_cta_click", { landing_id: "damage_check" })}
            />

            {/* 재진단 — 우선순위 최하위라 본문 끝 텍스트 링크로만 둔다 */}
            <div className="flex justify-center pb-2">
              <Link href="/damage-check"
                className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink">
                ↺ 처음부터 다시 하기
              </Link>
            </div>

          </motion.div>
        </div>

        {/* ── 하단 고정 CTA — 최우선 행동은 '저장·프로필 누적' ── */}
        <BottomStickyCTA>
          <BlackCTAButton onClick={handleSaveAndGoHome} disabled={saved}>
            {saved ? "저장 완료 ✓ 이동 중..." : "결과 저장하고 내 홈에서 관리 시작"}
          </BlackCTAButton>
        </BottomStickyCTA>

      </main>
    </SilkBackground>
  );
}
