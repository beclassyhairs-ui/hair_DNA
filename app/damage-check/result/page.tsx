"use client";

// ============================================================================
// 어뷰티 셀프 손상도 자가진단 — 결과지 (2026-08 개편 · 확정 68·81·104·116)
//   판정 스탬프(Lv+유형) → 예언(C2, 겹칠 때만) → 유형 설명 → 흰머리 원고(새치만)
//   → 제품(맨 아래). 흐르는 문단, % 금지, "25년 원장 판단 기준" 푸터(확정49).
//   저장 시 abeauty_user_profile(홈 호환) + abeauty:diaryEntries(kind:"damage").
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
import CoupangCardList from "@/components/CoupangCardList";
import { pickDamageCards } from "@/lib/coupangCards";

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
  q1_pull: "", q2_friction: "", q3_dry: "",
  h_recent: "none", h_prev: "none", h_more: "none", h_bleach_2plus: false, h_root_gray: false,
  h_self_dye: false, h_root_interval: "", h_root_over6m: false,
};

// FIX3: 미사용 서비스 링크 숨김(삭제 아님 · 플래그). 나중에 켤 때 true 한 줄.
const SHOW_HAIRQUIZ = false; // hair-quiz(평소 손질 습관 진단) 미출시 → 숨김

// 평소 관리 꿀팁 = 주인공 블록 (확정94, 그대로)
const MANAGEMENT_TIP =
  "트리트먼트는 바른 다음 빗으로 골고루 빗질해서 결 정돈까지 돼야 효과가 난다. 손 빗질만으론 부족하다.";

// [접힘] 시술 참고 — 레벨 기준 (AI 초안 · 빨간펜 대상)
function procedureRef(level: number): string {
  return level >= 3
    ? "지금은 새 시술을 얹기보다, 남은 손상 부위를 정리하면서 기르는 쪽이 결과가 더 빠릅니다."
    : "지금은 원하시는 시술 대부분 무리 없는 상태예요. 다만 시술이 쌓일수록 선택지가 줄어드니, 간격을 두시는 걸 권해드립니다.";
}

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
    try { setCoreKey(deriveCoreKeyFromEntries(readDiaryEntries())); } catch { /**/ }
    setReady(true);
  }, []);

  const result: DamageResult = diagnoseDamage(answers);
  const isHealthy = result.typeInfo.type === "HEALTHY";
  // 히어로/스탬프 헤드라인: Lv 라벨 (+ 유형, 건강모는 유형 생략)
  const stampTitle = isHealthy ? result.level.label : `${result.level.label} · ${result.typeInfo.label}`;

  // FIX-A: 결과지에 실제로 뜨는 쿠팡카드 = 저장/다이어리에 남길 제품의 단일 출처.
  //   (과거엔 화면과 무관한 damageRecommend.products[0]을 저장 → 손님이 본 적 없는 제품이 다이어리에 남던 버그.)
  //   화면과 저장을 같은 배열에서 뽑아 항상 일치시킨다. LIVE=false 등으로 카드가 없으면 제품 없이 저장.
  const damageCards = pickDamageCards(result.typeInfo.type, answers);
  const savedProduct = damageCards[0]
    ? { emoji: damageCards[0].emoji, name: damageCards[0].name, description: damageCards[0].reason, link: damageCards[0].link }
    : undefined;

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
        headline: stampTitle,
        concernTags: result.concernTags,
        hairTags: result.concernTags,
        diagnosisSummary: result.level.summary,
        product: savedProduct, // FIX-A: 화면에 뜬 쿠팡카드 기준(없으면 미저장)
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
              description: `AI 진단 결과, 나는 [${stampTitle}]입니다.`,
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
      navigator.share({ title: "어뷰티 | 손상도 자가진단", text: `나는 ${stampTitle}!`, url: shareUrl }).catch(() => {});
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

          {/* ── 히어로 + 판정 스탬프 (Lv + 유형) ── */}
          <HairTypeHero
            coreKey={coreKey}
            eyebrow={`LEVEL ${result.level.level} · ${result.level.label}`}
            title={stampTitle}
          />

          <InlineCompletion />

          {/* ── 판정 요약 (확정81 4단계 문구) ── */}
          <section className="card-soft space-y-2 p-5">
            <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">진단 요약</p>
            <p className="mt-1 text-body leading-relaxed text-ink">{result.level.summary}</p>
            <p className="pt-1 text-[13px] font-semibold text-sub">
              권장 관리 강도: <span className="text-ink">{result.level.careIntensity}</span>
            </p>
          </section>

          {/* ── 예언(門) — 시술이력 14종 중 첫 매칭 (예언 → 아하 → 관리 3덩어리) ── */}
          {result.prophecy && (
            <section className="rounded-2xl border border-line border-l-4 border-l-ink bg-card p-5">
              <p className="text-[16px] font-extrabold leading-relaxed text-ink">{result.prophecy}</p>
              {result.prophecyAha && <p className="mt-2 text-body leading-relaxed text-sub">{result.prophecyAha}</p>}
              {result.prophecyTip && <p className="mt-3 border-t border-line pt-3 text-body leading-relaxed text-ink">{result.prophecyTip}</p>}
            </section>
          )}

          {/* ── 유형 설명 (건강모는 원인 카드 대신 톤만) ── */}
          <section className="card-soft space-y-2 p-5">
            <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">
              {isHealthy ? "지금 상태" : `주된 원인 — ${result.typeInfo.label}`}
            </p>
            <p className="mt-1 whitespace-pre-line text-body leading-relaxed text-ink">{result.typeInfo.causeExplain}</p>
          </section>

          {/* ── 평소 관리 꿀팁 (주인공, 확정94) — 결과지에서 제일 넓은 블록 ── */}
          <section className="card-soft space-y-2 p-5">
            <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">평소 관리 꿀팁</p>
            <p className="mt-1 text-[16px] font-semibold leading-relaxed text-ink">{MANAGEMENT_TIP}</p>
          </section>

          {/* ── 흰머리 원고 (확정104) — 새치 체크 손님만 (관리 영역 접힘) ── */}
          {result.grayHairStory && (
            <details className="overflow-hidden rounded-2xl border border-line bg-card">
              <summary className="cursor-pointer p-5 text-body font-bold text-ink">새치 염색을 오래 하셨다면 — 꼭 읽어보세요</summary>
              <div className="border-t border-line px-5 pb-5 pt-3">
                <p className="text-body leading-relaxed text-ink">{result.grayHairStory}</p>
              </div>
            </details>
          )}

          {/* ── [접힘] 시술 참고 (AI 초안 · 빨간펜 대상) ── */}
          <details className="overflow-hidden rounded-2xl border border-line bg-card">
            <summary className="cursor-pointer p-5 text-body font-bold text-ink">시술 생각이 있으시다면</summary>
            <div className="border-t border-line px-5 pb-5 pt-3">
              <p className="text-body leading-relaxed text-ink">{procedureRef(result.level.level)}</p>
            </div>
          </details>

          {/* ── 제품 (맨 아래) — 쿠팡 제휴 매칭 카드로 교체(확정48). 결과지에서 바로 쿠팡 연결.
                 ★ G13(뿌리 볼륨 파우더)은 DAMAGE_CARDS 목록에 없어 구조적으로 절대 미노출(하드 차단).
                 COUPANG_CARDS_LIVE=false 면 자동 미노출. 저장/다이어리는 기존 result.products 그대로 사용. ── */}
          <CoupangCardList
            cards={damageCards}
            landingId="damage_check"
            heading="이 상태에 맞는 제품"
          />

          {/* ── 다른 진단 안내 (FIX3: hair-quiz 숨김 · 스타일 송객은 아래 카드 1개로 통일) ── */}
          {SHOW_HAIRQUIZ && (
            <nav>
              <Link href="/hair-quiz" className="flex items-center justify-between gap-3 py-3.5 text-body font-medium text-ink active:opacity-70">
                평소 손질 습관 진단 <span className="flex-none text-sub">→</span>
              </Link>
            </nav>
          )}

          {/* ── A-2 잠금 미리보기(→ /style) ── */}
          <LockedPreviewCard
            onCtaClick={() => trackEvent("locked_preview_cta_click", { landing_id: "damage_check" })}
          />

          {/* 공유 + 재진단 */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <button onClick={handleKakaoShare} className="btn-textlink text-[15px]">
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "결과 공유하기"}
            </button>
            {copied && <p className="text-[13px] text-sub">✓ 링크가 복사됐어요</p>}
            <Link href="/damage-check" className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
              ↺ 처음부터 다시 하기
            </Link>
          </div>

          {/* 푸터 — 25년 원장 판단 기준(확정49). % 미노출. */}
          <p className="pt-2 text-center text-[12px] leading-relaxed text-sub">
            이 진단은 25년 경력 원장의 판단 기준을 바탕으로 안내드리는 참고 결과예요.
          </p>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA — 저장·프로필 누적 ── */}
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
