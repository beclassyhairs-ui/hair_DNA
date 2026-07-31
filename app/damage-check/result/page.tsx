"use client";

// ============================================================================
// 어뷰티 셀프 손상도 자가진단 — 결과지  [아이보리 리뱀프 3단계 · 미끼 결과지]
// 디자인 SSOT: docs/ui-spec.html §6/§7 — 히어로 + 본문 흰 카드 ≤2.
//   · 히어로 = 곱슬축 3장 이미지(coreKey 곱슬축, /home과 동일 규칙) + 하단
//     그라데이션 + 타입명(명조·흰색). 파일 없으면 soft 패널 폴백. (텍스처 사선
//     스와치는 판독 불가로 폐기 — 참조만 제거, 코드는 남겨둠.) 나머지는 플랫.
//   · 주 CTA = 차콜 채움(.btn-primary). 저장/공유/이벤트/A-2 잠금카드 로직 불변.
// 저장 시 abeauty_user_profile(홈 호환) + abeauty:diaryEntries(kind:"damage")에 기록.
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
import {
  appendDiaryEntry,
  refreshBeautyUserProfileFromDiary,
  readDiaryEntries,
} from "../../../lib/beautyProfile";
import { deriveCoreKeyFromEntries } from "../../../lib/itemsMatch";
import InlineCompletion from "@/components/InlineCompletion";
import LockedPreviewCard from "@/components/LockedPreviewCard";
import HairTypeHero from "../../components/HairTypeHero";

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
  const [coreKey,   setCoreKey]   = useState<string | null>(null);
  const [ready,     setReady]     = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DAMAGE_SURVEY_KEY);
      if (raw) setAnswers(JSON.parse(raw) as DamageSurveyAnswers);
    } catch { /**/ }
    // 히어로 스와치용 — 유저가 앞서 한 진단(주로 /style)에서 coreKey를 파생(매칭 로직 재사용).
    try { setCoreKey(deriveCoreKeyFromEntries(readDiaryEntries())); } catch { /**/ }
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
              imageUrl: `${SITE_URL}/og-default.png`,
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

  if (!ready) return <main className="min-h-screen" />;

  return (
    <main className="mx-auto min-h-screen max-w-[430px] pb-40 text-ink" style={{ touchAction: "pan-y" }}>

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/85 px-5 py-3.5 backdrop-blur-md">
        <Link href="/damage-check/survey" className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
          ← 다시 하기
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-sub">진단 결과지</span>
        <button onClick={handleKakaoShare} className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
          {kakaoSent ? "전송됨 ✓" : "공유"}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg px-page pt-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

          {/* ── 히어로 (곱슬축 이미지 · 명조 흰색 타입명, 파일 없으면 soft 패널) ── */}
          <HairTypeHero
            coreKey={coreKey}
            eyebrow={`LEVEL ${result.level.level} · ${result.level.label}`}
            title={result.headline}
          />

          {/* 완성도 게이지 — 인라인(카드 아님) */}
          <InlineCompletion />

          {/* ── 흰 카드 1 : 진단 요약 (요약·관리강도·원인·주의) ── */}
          <section className="card-soft space-y-4 p-5">
            <div>
              <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">진단 요약</p>
              <p className="mt-2 text-body leading-relaxed text-ink">{result.level.summary}</p>
              <p className="mt-3 text-[13px] font-semibold text-sub">
                권장 관리 강도: <span className="text-ink">{result.level.careIntensity}</span>
              </p>
            </div>

            {result.level.cutAdvice && (
              <div className="border-t border-line pt-4">
                <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">전문가 처방</p>
                <p className="mt-2 text-body leading-relaxed text-ink">{result.level.cutAdvice}</p>
                {result.level.keratinCaution && (
                  <p className="mt-2 text-[15px] font-medium text-sub">{result.level.keratinCaution}</p>
                )}
              </div>
            )}

            <div className="border-t border-line pt-4">
              <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">주된 원인 — {result.typeInfo.label}</p>
              <p className="mt-2 text-body leading-relaxed text-ink">{result.typeInfo.causeExplain} 상태예요.</p>
              <p className="mt-2 text-[15px] font-medium text-sub">이런 습관은 피해보세요 — {result.typeInfo.avoid}</p>
            </div>
          </section>

          {/* ── 다른 진단 안내 — 플랫 리스트(카드 벗김) ── */}
          <nav>
            <Link href="/items" className="flex items-center justify-between gap-3 border-b border-line py-3.5 text-body font-medium text-ink active:opacity-70">
              발견템에서 손상도 단계에 맞는 홈케어 제품 보기
              <span className="flex-none text-sub">→</span>
            </Link>
            <Link href="/hair-quiz" className="flex items-center justify-between gap-3 border-b border-line py-3.5 text-body font-medium text-ink active:opacity-70">
              평소 손질 습관 진단
              <span className="flex-none text-sub">→</span>
            </Link>
            <Link href="/style" className="flex items-center justify-between gap-3 py-3.5 text-body font-medium text-ink active:opacity-70">
              AI 헤어 분석으로 내 스타일도 찾기
              <span className="flex-none text-sub">→</span>
            </Link>
          </nav>

          {/* ── 흰 카드 2 : A-2 잠금 미리보기(→ /style) ── */}
          <LockedPreviewCard
            onCtaClick={() => trackEvent("locked_preview_cta_click", { landing_id: "damage_check" })}
          />

          {/* 공유 + 재진단 — 플랫 */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <button onClick={handleKakaoShare} className="btn-textlink text-[15px]">
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "결과 공유하기"}
            </button>
            {copied && <p className="text-[13px] text-sub">✓ 링크가 복사됐어요</p>}
            <Link href="/damage-check" className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
              ↺ 처음부터 다시 하기
            </Link>
          </div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA — 최우선 행동 = 저장·프로필 누적 ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg">
          <button onClick={handleSaveAndGoHome} disabled={saved} className="btn-primary w-full disabled:opacity-50">
            {saved ? "저장 완료 ✓ 이동 중..." : "결과 저장하고 내 홈에서 관리 시작"}
          </button>
        </div>
      </div>

    </main>
  );
}
