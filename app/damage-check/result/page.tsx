"use client";

// ============================================================================
// 미알팁 셀프 손상도 자가진단 — 결과지 (2026-08 개편 · 확정 68·81·104·116)
//   판정 스탬프(Lv+유형) → 예언(C2, 겹칠 때만) → 유형 설명 → 흰머리 원고(새치만)
//   → 제품(맨 아래). 흐르는 문단, % 금지, "20년차 디자이너 판단 기준" 푸터(확정49 · 🟡-03 통일).
//   저장 시 abeauty_user_profile(홈 호환) + abeauty:diaryEntries(kind:"damage").
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { DAMAGE_SURVEY_KEY } from "../constants";
import { diagnoseDamage, type DamageResult } from "../damageRecommend";
import type { DamageSurveyAnswers } from "../surveyData";
import { TREATMENT_OPTIONS } from "../surveyData";
// 결과지 V2: 카피는 copy-drafts 레지스트리가 단일 출처. 이 페이지는 resolver가 고른
//   블록을 순서대로 그리기만 한다(판정 로직은 여전히 damageRecommend 소관).
import { resolveDamage } from "@/copy-drafts/resolver";
import type { ResolvedBlock } from "@/copy-drafts/resolver";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { trackEvent as trackHomeEvent } from "../../../lib/trackEvent";
import {
  appendDiaryEntry,
  refreshBeautyUserProfileFromDiary,
  readDiaryEntries,
} from "../../../lib/beautyProfile";
import { deriveCoreKeyFromEntries } from "../../../lib/itemsMatch";
import { KAKAO_LOGIN_ENABLED } from "@/lib/loginGate";
import { ensureLoggedInOrRedirect } from "@/lib/authGate";
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

// ⚠️ 옛 MANAGEMENT_TIP·procedureRef 상수는 제거됐다(2026-08-20 결과지 V2 배선).
//   카피는 전부 copy-drafts 레지스트리가 단일 출처이고, 이 페이지는 resolver가 고른
//   블록을 순서대로 그리기만 한다. MANAGEMENT_TIP은 damage.friction.brush_tip으로
//   이관돼 전원 고정이 아니라 Q2 신호가 있는 손님에게만 나간다.

/** 스탬프용 시술 라벨 — 설문 옵션 라벨을 그대로 쓰고 괄호 보충만 떼어낸다(신규 카피 아님). */
function lastTreatmentLabel(a: DamageSurveyAnswers): string {
  const last = a.h_recent !== "none" ? a.h_recent : a.h_prev;
  if (last === "none") return "";
  return TREATMENT_OPTIONS.find((o) => o.id === last)?.label.replace(/\s*\(.*\)/, "") ?? "";
}

export default function DamageCheckResultPage() {
  const router = useRouter();
  const [answers,   setAnswers]   = useState<DamageSurveyAnswers>(DEFAULT_ANSWERS);
  const [coreKey,   setCoreKey]   = useState<string | null>(null);
  const [ready,     setReady]     = useState(false);
  const [authOk,    setAuthOk]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);
  // ★ 직접 URL 진입(설문 미완료) 가드 — 2026-08-16 D-2 감사 🔴-02. 세션에 실제 설문 데이터가
  //   있었는지를 별도로 추적한다(answers 자체는 항상 DEFAULT_ANSWERS로 초기화돼 있어 구분 못 함).
  const [hasSurveyData, setHasSurveyData] = useState(false);

  // ── 로그인 게이트(결과 보기 직전) — 스타일과 공용 authGate 공유. 미로그인이면 /login/consent로,
  //   로그인 후 이 결과 페이지로 복귀(return_to=/damage-check/result). 로그인 꺼진 상태면 게이트 없음.
  //   확인 전에는 아래 렌더 가드가 결과를 감춰 플래시·우회를 막는다. ──
  useEffect(() => {
    if (!KAKAO_LOGIN_ENABLED) { setAuthOk(true); return; }
    let alive = true;
    (async () => {
      const ok = await ensureLoggedInOrRedirect("/damage-check/result");
      if (alive && ok) setAuthOk(true);
      // ok=false면 헬퍼가 이미 /login/consent로 리다이렉트(이 컴포넌트 언마운트)
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DAMAGE_SURVEY_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // 세션 조작(JSON "null"/빈 객체/배열) 방어 — 값이 있는 순수 객체일 때만 유효로 인정.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          setAnswers(parsed as DamageSurveyAnswers);
          setHasSurveyData(true);
        }
      }
    } catch { /**/ }
    try { setCoreKey(deriveCoreKeyFromEntries(readDiaryEntries())); } catch { /**/ }
    setReady(true);
  }, []);

  // 진단 데이터 없이 결과지에 직접 진입한 경우 — 기본값(DEFAULT_ANSWERS)으로 "진단받은 척"하는
  //   결과를 보여주지 않고 랜딩으로 돌려보낸다(로그인 확인이 끝난 뒤에만 — 로그인 리다이렉트와 경합 방지).
  useEffect(() => {
    if (ready && authOk && !hasSurveyData) router.replace("/damage-check");
  }, [ready, authOk, hasSurveyData, router]);

  const result: DamageResult = diagnoseDamage(answers);
  // ★ V2 스탬프: 옛 "건조형/경직형" 유형 딱지를 뗀다(2026-08-20 확정).
  //   손님이 읽는 건 유형 분류가 아니라 "몇 단계 · 무엇 때문에"라서, 레벨 + 마지막 시술로 바꿨다.
  //   ⚠️ stampTitle은 화면 말고도 다이어리 headline·카카오 공유·navigator.share가 함께 쓴다.
  //     문자열 내용만 바뀌고 그 4개 소비처는 그대로 유지된다.
  const treatLabel = lastTreatmentLabel(answers);
  const stampTitle = treatLabel ? `${result.level.label} · ${treatLabel}` : result.level.label;

  // 블록 조립 — 순서(cause → risk → gray → 당김 → 엉킴 → 건조)는 resolver가 정한다.
  const resolution = resolveDamage(answers);
  const block = (name: string): ResolvedBlock | undefined =>
    resolution.blocks.find((b) => b.block === name && b.entries.length > 0);
  const causeBlock = block("cause");
  const riskBlock  = block("risk");
  const grayBlock  = block("gray");
  const physical   = ["elasticity", "friction", "drying"]
    .map(block)
    .filter((b): b is ResolvedBlock => b !== undefined);

  // FIX-A: 결과지에 실제로 뜨는 쿠팡카드 = 저장/다이어리에 남길 제품의 단일 출처.
  //   (과거엔 화면과 무관한 damageRecommend.products[0]을 저장 → 손님이 본 적 없는 제품이 다이어리에 남던 버그.)
  //   화면과 저장을 같은 배열에서 뽑아 항상 일치시킨다. LIVE=false 등으로 카드가 없으면 제품 없이 저장.
  const damageCards = pickDamageCards(result.typeInfo.type, answers);
  const savedProduct = damageCards[0]
    ? { emoji: damageCards[0].emoji, name: damageCards[0].name, description: damageCards[0].reason, link: damageCards[0].link }
    : undefined;

  useEffect(() => {
    if (!ready || !authOk || !hasSurveyData) return; // 로그인 통과 + 실제 설문 데이터 있을 때만 report_view 기록
    trackEvent(EVENT_NAMES.REPORT_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
      result_type: result.resultCode,
      concern_tags: result.concernTags,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authOk, hasSurveyData]);

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
              title: "미알팁 | 내 모발 손상도 자가진단 결과",
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
      navigator.share({ title: "미알팁 | 손상도 자가진단", text: `나는 ${stampTitle}!\n미알팁 — 미용실에서 알 수 없는 꿀팁`, url: shareUrl }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // 데이터 준비 + 로그인 확인 + 실제 설문 데이터 확인 전에는 결과를 렌더하지 않는다
  //   (플래시·익명 우회·직접 URL 진입 가짜 진단 전부 차단).
  if (!ready || !authOk || !hasSurveyData) return <main className="min-h-screen" />;

  return (
    <main className="mx-auto min-h-screen max-w-[430px] pb-40 text-ink" style={{ touchAction: "pan-y" }}>

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/85 px-5 py-3.5 backdrop-blur-md">
        <Link href="/damage-check/survey" className="text-[15px] font-medium text-sub transition-colors hover:text-ink">
          ← 다시 하기
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-sub">진단 결과지</span>
        {/* 🟡-01 어포던스: 텍스트만이던 헤더 공유를 옅은 테두리 pill로 — 누를 수 있음을 명확히. */}
        <button onClick={handleKakaoShare} className="rounded-full border border-line px-3 py-1 text-[14px] font-medium text-sub transition-colors hover:bg-surface hover:text-ink active:scale-[0.98]">
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

          {/* ── ① 주된 원인 — 마지막 시술 기준(h_recent 6종 + 시술없음) ──
                 시술이력이 손상을 정하므로 물리테스트보다 앞에 온다(2026-08-20 원칙). */}
          {causeBlock && (
            <section className="card-soft space-y-2 p-5">
              <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">
                {treatLabel ? `주된 원인 — ${treatLabel}` : "지금 상태"}
              </p>
              {causeBlock.entries.map((e) => (
                <p key={e.id} className="mt-1 whitespace-pre-line text-body leading-relaxed text-ink">{e.text}</p>
              ))}
            </section>
          )}

          {/* ── ② 예언(門) — 시술이력 14종 중 첫 매칭. door → aha → tip 3덩어리 ── */}
          {riskBlock && (
            <section className="rounded-2xl border border-line border-l-4 border-l-ink bg-card p-5">
              {riskBlock.entries.map((e, i) => (
                <p
                  key={e.id}
                  className={
                    i === 0 ? "text-[16px] font-extrabold leading-relaxed text-ink"
                    : i === 1 ? "mt-2 text-body leading-relaxed text-sub"
                    : "mt-3 border-t border-line pt-3 text-body leading-relaxed text-ink"
                  }
                >
                  {e.text}
                </p>
              ))}
            </section>
          )}

          {/* ── ③ 흰머리 원고 (확정104) — 새치 체크 손님만 (접힘) ── */}
          {grayBlock && (
            <details className="overflow-hidden rounded-2xl border border-line bg-card">
              <summary className="cursor-pointer p-5 text-body font-bold text-ink">새치 염색을 오래 하셨다면 — 꼭 읽어보세요</summary>
              <div className="border-t border-line px-5 pb-5 pt-3 space-y-3">
                {grayBlock.entries.map((e) => (
                  <p key={e.id} className="text-body leading-relaxed text-ink">{e.text}</p>
                ))}
              </div>
            </details>
          )}

          {/* ── ④ 직접 확인해보신 것 — 물리테스트 3종.
                 손상을 "정의"하는 게 아니라 참고 신호라서 원인·예언 뒤에 놓고,
                 헤더 문구로도 참고 성격을 드러낸다(2026-08-20 원칙). ── */}
          {physical.length > 0 && (
            <section className="card-soft space-y-3 p-5">
              <div>
                <p className="text-aux font-bold uppercase tracking-[0.2em] text-sub">직접 확인해보신 것</p>
                <p className="mt-1 text-[13px] leading-relaxed text-sub">
                  아래는 참고로 함께 보는 신호예요. 단계는 시술 이력을 기준으로 판단했습니다.
                </p>
              </div>
              <div className="space-y-3 border-t border-line pt-3">
                {physical.flatMap((b) =>
                  b.entries.map((e) => (
                    <p key={e.id} className="text-body leading-relaxed text-ink">{e.text}</p>
                  )),
                )}
              </div>
            </section>
          )}

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

          {/* 푸터 — 20년차 디자이너 판단 기준(확정49 · 🟡-03 연차·직함 통일: 25년 원장→20년차 디자이너,
              스타일 결과지/로딩과 동일 페르소나). % 미노출. */}
          <p className="pt-2 text-center text-[12px] leading-relaxed text-sub">
            이 진단은 20년차 디자이너의 판단 기준을 바탕으로 안내드리는 참고 결과예요.
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
