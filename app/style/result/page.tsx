"use client";

// ============================================================================
// 결과지 — 이중 로딩 없음, 세션에서 즉시 렌더링
// 캡처 방지 + 저장하고 홈에서 오늘 케어 보기 CTA + 배열 다이어리 저장
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_DEBUG_ERROR_KEY,
  STYLE_GENERATED_KEY,
  STYLE_LIMIT_KEY,
  STYLE_PHOTO_KEY,
} from "../constants";
import {
  getStyleEntry,
  getHairTypeReport,
  type HairTypeEntry,
} from "../recommend";
import { getHairTypeCopy, type HairTypeCopy } from "../hairTypeCopy";
import { LENGTH_LABEL_MAP, type StyleAnswers } from "../surveyData";
import { toast } from "../../../lib/toast";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { refreshBeautyUserProfileFromDiary } from "../../../lib/beautyProfile";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import ResultHeroCard from "@/components/beauty-ui/ResultHeroCard";
import BottomStickyCTA from "@/components/beauty-ui/BottomStickyCTA";

function buildHairTags(answers: StyleAnswers): string[] {
  const tags: string[] = [];
  if (answers.q10_history_count === "count_7plus") tags.push("#손상모");
  if (answers.q8_density === "thin_density") tags.push("#볼륨처짐");
  if (answers.q7_thickness === "fine") tags.push("#가는모");
  if (answers.q3_curl === "curly_hair") tags.push("#곱슬모");
  return tags.length > 0 ? tags : ["#건강모"];
}

// UUID 생성 (저장 시 고유 ID)
function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ─── 다이어리 저장 → 홈 라우팅 모달 ─────────────────────────────────────────
// Phase B: 결과지 진입 전(=/style/loading 합성 직전)에 이미 실제 카카오 로그인을 마쳤으므로
// 여기서 별도 로그인 절차는 없다. 저장은 곧바로 실행한다.

function SaveDiaryModal({
  answers, styleName, onClose,
}: { answers: StyleAnswers; styleName: string; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function executeSaveAndRoute() {
    try {
      const generatedImageUrl = sessionStorage.getItem(STYLE_GENERATED_KEY) ?? null;
      const id = uid();
      const hairTags = buildHairTags(answers);
      const entry = {
        id,
        kind: "style" as const,
        answers,
        styleName,
        savedAt:           Date.now(),
        generatedImageUrl,
        hairTags, // 통합 프로필(abeauty_user_profile) 재생성용 — /style은 1순위라 이 태그가 가장 앞에 옴
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
      // diaryEntries 전체를 우선순위(style>damage>bangs>hairquiz) 기반으로 다시 합산해
      // /home 대시보드가 읽는 abeauty_user_profile을 재생성 — /style은 1순위라 항상
      // 태그 맨 앞자리를 유지한다.
      refreshBeautyUserProfileFromDiary();
    } catch { /**/ }
    trackEvent("save_result_go_home", { source: "diagnosis_result_page" });
    router.push("/home");
  }

  function handleSaveAndRoute() {
    if (loading) return;
    // Phase B: 이미 로그인된 상태(합성 직전 게이트 통과) — 곧바로 저장·이동.
    setLoading(true);
    executeSaveAndRoute();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[28px] border-t border-white/60 bg-white/95 shadow-xl px-6 pb-10 pt-5 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-surface" />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">A-Beauty Diary</p>
        <h3 className="mt-2 text-h2 text-ink">내 다이어리에 저장하고 평생 소장하기</h3>
        <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">
          진단 결과를 저장하면 나만의 맞춤 홈케어 제품과 스타일 히스토리가 보관됩니다.
        </p>
        <div className="mt-4 space-y-2">
          {["맞춤 홈케어 제품 상단 노출 (시술 이력 기반)", "내 헤어 스타일 히스토리 보관", "전문가 케어 처방전 저장"].map(b => (
            <div key={b} className="flex items-center gap-2.5 text-[15px] text-ink-2">
              <span className="h-1 w-1 flex-none rounded-full bg-ink" />{b}
            </div>
          ))}
        </div>
        <button onClick={handleSaveAndRoute} disabled={loading}
          className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-btn text-base font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70">
          {loading
            ? <motion.span
                className="inline-block h-4 w-4 rounded-full"
                style={{ border: "2px solid transparent", borderTopColor: "currentColor", borderRightColor: "rgba(255,255,255,0.25)" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            : "다이어리에 저장하기"}
        </button>
        <button onClick={onClose} className="mt-2.5 flex h-11 w-full items-center justify-center rounded-full text-[15px] text-ink-2 hover:text-ink">
          나중에 저장하기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Before / After 이미지 섹션 ───────────────────────────────────────────────
// ★ 폴링 없음 — sessionStorage에서 즉시 읽은 URL만 표시.
// Phase B: 잠금(blur) 오버레이 제거 — 결과지 진입 전 이미 로그인을 마쳤으므로 항상 공개한다.

function BeforeAfterSection({
  photo, generatedUrl, debugError, limitMessage, onRetry,
}: {
  photo:        string | null;
  generatedUrl: string | null;
  debugError:   string | null;
  limitMessage: string | null;
  onRetry:      () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* BEFORE */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-all duration-700"
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
          <span className="text-[11px] font-bold uppercase tracking-widest text-cream/60">Before</span>
        </div>
      </div>

      {/* AFTER */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-black/40 transition-all duration-700"
        style={{ aspectRatio: "3/4" }}>
        {generatedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={generatedUrl} alt="AI 변신 스타일" draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ pointerEvents: "none", WebkitTouchCallout: "none" }}
            onError={(e) => console.error("[Result] ❌ AI 이미지 로드 실패. src:", (e.target as HTMLImageElement).src)} />
        ) : limitMessage ? (
          // 일일 한도 초과 — 친절 안내(빨간 에러 아님)
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center overflow-y-auto py-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-gold/60" stroke="currentColor" strokeWidth={1.3}>
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[13px] font-semibold leading-snug text-cream/90">오늘 무료 합성을<br />모두 사용했어요</p>
            <p className="text-[11px] leading-relaxed text-cream/60">{limitMessage}</p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center overflow-y-auto py-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-cream/25" stroke="currentColor" strokeWidth={1.2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            <p className="text-[13px] leading-snug text-cream/80">AI 합성에<br />실패했어요</p>
            {debugError && (
              <div className="w-full rounded-lg border border-red-500/40 bg-red-950/60 px-2 py-2 text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1">[개발자 디버그] 에러 원인:</p>
                <p className="text-[10px] leading-snug text-red-300 break-all">{debugError}</p>
              </div>
            )}
            <button onClick={onRetry}
              className="rounded-xl border border-gold/35 bg-gold/[0.08] px-3.5 py-1.5 text-[13px] font-bold text-gold transition-colors hover:bg-gold/15">
              다시 시도
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold">After</span>
        </div>
        {generatedUrl && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 1.5px rgba(200,168,107,0.3)" }} />
        )}
      </div>
    </div>
  );
}

// ─── 모발 성질 기반 헤어 방향 리포트 카드 5종 ────────────────────────────────
// care_matrix_v3 원문(report) 대신 사용자 언어로 번역된 copy(hairTypeCopy.ts)를
// 보여준다. 손상 이력(historyCount)은 AvoidCard의 damageCaution 한 줄에서만
// modifier로 등장한다 — painPointHeadline/whyItHappens/stylePrescription은
// copy layer 설계상 손상 이력과 무관하게 항상 동일하다.

function TextureReportCard({ copy }: { copy: HairTypeCopy }) {
  return (
    <GlassCard accent className="space-y-2 px-5 py-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">모발 성질 리포트</p>
      <p className="text-[15px] leading-relaxed text-ink">{copy.whyItHappens}</p>
    </GlassCard>
  );
}

function StyleDirectionCard({ copy }: { copy: HairTypeCopy }) {
  return (
    <GlassCard accent className="space-y-2 px-5 py-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">추천 스타일 방향</p>
      <p className="text-[15px] leading-relaxed text-ink">{copy.stylePrescription}</p>
    </GlassCard>
  );
}

function AvoidCard({ copy, damageCaution }: { copy: HairTypeCopy; damageCaution: string }) {
  return (
    <GlassCard tone="soft" className="space-y-3 px-5 py-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">피해야 할 스타일 · 시술</p>
      <div className="space-y-2">
        {copy.avoidWithReason.map((line) => (
          <div key={line} className="flex items-start gap-2.5">
            <span className="mt-2 h-1 w-1 flex-none rounded-full bg-ink-2/60" />
            <p className="text-[15px] leading-relaxed text-ink">{line}</p>
          </div>
        ))}
      </div>
      {/* 손상 이력 modifier — 제목/방향은 바꾸지 않고 주의 한 줄로만 반영 */}
      <div className="rounded-xl border border-line bg-surface px-4 py-3">
        <p className="text-[15px] font-medium text-ink-2">{damageCaution}</p>
      </div>
    </GlassCard>
  );
}

function SalonTipCard({ copy }: { copy: HairTypeCopy }) {
  return (
    <GlassCard tone="soft" className="space-y-3 px-5 py-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">미용실 상담 팁</p>
      <div className="space-y-2">
        {copy.salonScript.map((line) => (
          <div key={line} className="rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-[15px] italic leading-relaxed text-ink-2">{line}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function HomeCareCard({ copy, showDamageCTA }: { copy: HairTypeCopy; showDamageCTA: boolean }) {
  return (
    <GlassCard tone="soft" className="space-y-3 px-5 py-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-ink-2">홈케어 방향</p>
      <p className="text-[15px] leading-relaxed text-ink">{copy.homeCareDirection}</p>
      {/* 제품 카드 직접 노출 없음 — discoveryItemHint는 카테고리 힌트로만, 실제 제품은 발견템(/items)에서 */}
      <Link
        href="/items"
        onClick={() => trackEvent(EVENT_NAMES.PRODUCT_CLICKED, { landing_id: "style", cta_clicked: "발견템 보러가기", ui: "style_result_homecare", diagnosis_type: "style" })}
        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface hover:text-ink"
      >
        {copy.discoveryItemHint} 같은 제품은 발견템에서 볼 수 있어요
        <span className="flex-none text-ink-2">→</span>
      </Link>
      {/* 시술 이력 7회 이상(count_7plus) 답변자에게만 노출되는 교차 진단 CTA */}
      {showDamageCTA && (
        <Link
          href="/damage-check"
          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface hover:text-ink"
        >
          정밀 손상 진단 받아보기
          <span className="flex-none text-ink-2">→</span>
        </Link>
      )}
    </GlassCard>
  );
}

// ─── 기획자용 진단 로직 디버그 패널 ──────────────────────────────────────────
// (테스트/기획 검증용 — 의도적으로 눈에 띄는 디버그 톤을 유지, 리디자인 대상 아님)

const Q_DEBUG_LABELS: Record<string, [string, Record<string, string>]> = {
  q1_age:            ["연령대",    { age_20: "20대", age_30: "30대", age_40: "40대", age_50: "50대", age_60plus: "60대+" }],
  q11_length:        ["기장",      LENGTH_LABEL_MAP],
  q14_layer:         ["레이어",    { heavy: "층 없음", medium: "층 중간", light: "층 많음" }],
  q13_design:        ["웨이브",    { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" }],
  q8_density:        ["숱",        { thick_density: "많음", medium_density: "보통", thin_density: "적음" }],
  q7_thickness:      ["굵기",      { coarse: "굵음", medium_thickness: "보통", fine: "가늘음" }],
  q3_curl:           ["곱슬",      { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair: "악성곱슬" }],
  q10_history_count: ["시술 횟수", { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회+" }],
};

function DiagnosisDebugPanel({
  answers, styleName, report,
}: { answers: StyleAnswers; styleName: string; report: HairTypeEntry }) {
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-3 z-40 flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2.5 py-1.5 text-[9px] font-mono font-bold text-ink-2 shadow-sm backdrop-blur-sm hover:text-ink"
      >
        진단 로직
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
              className="relative z-10 max-h-[78vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pb-10 pt-5 font-mono text-[11px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <p className="mb-3 font-bold uppercase tracking-widest text-yellow-600">진단 로직 디버그</p>

              {/* 유저 답변 */}
              <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-yellow-600/70">유저 답변 원본</p>
                {Object.entries(Q_DEBUG_LABELS).map(([key, [label, map]]) => (
                  <div key={key} className="flex justify-between border-b border-gray-100 py-1 last:border-0">
                    <span className="text-ink-3">{label}</span>
                    <span className="text-ink">{map[answers[key] ?? ""] ?? answers[key] ?? "—"}</span>
                  </div>
                ))}
              </div>

              {/* 스타일 계산 */}
              <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-yellow-600/70">스타일 계산 결과</p>
                <div className="flex justify-between py-1">
                  <span className="text-ink-3">생성 스타일명</span>
                  <span className="font-bold text-yellow-600">{styleName}</span>
                </div>
              </div>

              {/* 모발 타입 리포트 — 손상 modifier가 타입/방향을 안 바꾸는지 확인용 */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-yellow-600/70">모발 타입 리포트</p>
                <div className="flex justify-between border-b border-gray-100 py-1">
                  <span className="text-ink-3">타입 키</span>
                  <span className="font-bold text-yellow-600">{report.hairTypeKey}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-3">손상 modifier</span>
                  <span className="font-bold text-yellow-600">{report.damageModifier}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<StyleAnswers>({});
  const [ready,      setReady]      = useState(false);
  const [showSave,   setShowSave]   = useState(false);
  const [completeTracked, setCompleteTracked] = useState(false);


  // 세션 데이터 즉시 로드 (폴링 없음)
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (p) setPhoto(p);
      const a = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (a) setAnswers(JSON.parse(a) as StyleAnswers);
      // ★ AI 이미지 — 한 번만 읽기 (loading 페이지가 완성 후 넘겨줌)
      const g = sessionStorage.getItem(STYLE_GENERATED_KEY);
      console.log("[Result] sessionStorage STYLE_GENERATED_KEY 값:", g ?? "(없음)");
      if (g) {
        setGenerated(g);
      } else {
        // 일일 한도 초과 안내가 있으면 우선 표시(빨간 에러 대신 친절 카드)
        const limit = sessionStorage.getItem(STYLE_LIMIT_KEY);
        if (limit) {
          setLimitMessage(limit);
        } else {
          const dbgErr = sessionStorage.getItem(STYLE_DEBUG_ERROR_KEY);
          console.warn("[Result] ⚠️ AI 이미지 URL 없음. debugError:", dbgErr ?? "(없음)");
          if (dbgErr) setDebugError(dbgErr);
        }
      }
    } catch { /**/ }
    setReady(true);
  }, []);

  // 리포트 열람 — 결과지 진입(답변 로드 완료) 시 1회 적재. 퍼널의 "리포트열람" 단계.
  // 진단 완료(diagnosis_complete)는 설문 마지막 제출 시점(/style/survey)에서 발화한다.
  useEffect(() => {
    if (!ready || completeTracked) return;
    if (!answers || Object.keys(answers).length === 0) return;
    const report = getHairTypeReport(answers);
    trackEvent(EVENT_NAMES.REPORT_VIEW, {
      landing_id: "style",
      diagnosis_type: "style",
      result_type: report.hairTypeKey,
      concern_tags: buildHairTags(answers),
    });
    setCompleteTracked(true);
  }, [ready, answers, completeTracked]);

  function handleRetry() {
    try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
    router.push("/style/upload");
  }

  if (!ready) return <main className="min-h-screen bg-surface" />;

  const entry   = getStyleEntry(answers);
  const report  = getHairTypeReport(answers);
  const copy    = getHairTypeCopy(answers);

  const DESIGN_LABEL: Record<string, string> = { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" };
  const LAYER_LABEL:  Record<string, string> = { heavy: "층 없음", medium: "소프트", light: "허쉬컷" };

  return (
    <SilkBackground>
      <main className="mx-auto min-h-screen max-w-[430px] text-ink" style={{ touchAction: "pan-y" }}>

        <AnimatePresence>
          {showSave && <SaveDiaryModal answers={answers} styleName={entry.name} onClose={() => setShowSave(false)} />}
        </AnimatePresence>

        <div className="mx-auto max-w-lg px-4 py-6 pb-32 sm:px-6">

          {/* 헤더 */}
          <div className="flex items-center justify-between pb-4">
            <Link href="/style/upload" className="flex items-center gap-1 text-[15px] font-medium text-ink-2 hover:text-ink transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              다시 찍기
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">스타일 결과지</span>
            <Link href="/style" className="text-[15px] font-medium text-ink-2 hover:text-ink transition-colors">처음부터</Link>
          </div>

          {/* 결과 히어로 — Before/After + 스타일명 + 불편함 헤드라인 + 태그 */}
          <ResultHeroCard
            eyebrow="AI STYLE DIAGNOSIS"
            visual={<BeforeAfterSection photo={photo} generatedUrl={generated} debugError={debugError} limitMessage={limitMessage} onRetry={handleRetry} />}
            badge={entry.name}
            badgeVariant="subtle"
            title={copy.painPointHeadline}
          >
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {[LENGTH_LABEL_MAP[answers.q11_length], DESIGN_LABEL[answers.q13_design], LAYER_LABEL[answers.q14_layer]]
                .filter(Boolean).map(tag => (
                  <span key={tag} className="rounded-full bg-surface px-3 py-0.5 text-[13px] font-semibold text-ink-2">{tag}</span>
                ))}
            </div>
          </ResultHeroCard>

          {/* Phase B: 로그인 후 진입이라 항상 공개(블러 없음) */}
          <div className="mt-4 space-y-5 transition-all duration-700">

            {/* Tier 1 — 핵심 진단: 왜 불편한지 + 어떻게 하면 되는지 */}
            <div className="space-y-3">
              <TextureReportCard copy={copy} />
              <StyleDirectionCard copy={copy} />
            </div>

            {/* Tier 2 — 참고 정보: 시술 주의 / 상담 팁 / 홈케어 */}
            <div className="space-y-2.5">
              <AvoidCard copy={copy} damageCaution={report.damageCaution} />
              <SalonTipCard copy={copy} />
              <HomeCareCard copy={copy} showDamageCTA={answers.q10_history_count === "count_7plus"} />
            </div>

            {/* 저장 + 공유 */}
            <GlassCard className="space-y-2.5 px-5 py-5">
              <button onClick={() => setShowSave(true)}
                className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white text-base font-bold text-ink transition-all hover:bg-surface active:scale-[0.98]">
                사진 다운받기 (다이어리 저장 후 가능)
              </button>
              <p className="text-center text-[13px] text-ink-2 -mt-1">
                다이어리에 저장하면 AI 변신 사진을 갤러리에 저장할 수 있어요
              </p>
              {/* 공유(③)가 재진단(④)보다 우선 — 좌측 우선 배치 */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/style` : "/style";
                    if (navigator.share) navigator.share({ title: "AI 헤어 변신 | 어뷰티", url }).catch(() => {});
                    else navigator.clipboard?.writeText(url).then(() => toast("링크가 복사됐어요!"));
                  }}
                  className="flex h-12 flex-1 items-center justify-center rounded-full border border-line bg-surface text-[15px] font-semibold text-ink-2 transition-all hover:bg-surface">
                  공유하기
                </button>
                <Link href="/style/survey"
                  className="flex h-12 flex-1 items-center justify-center rounded-full border border-line text-[15px] font-medium text-ink-2 transition-all hover:border-btn-line hover:text-ink">
                  다시 진단하기
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* 기획자용 진단 로직 디버그 패널 */}
        <DiagnosisDebugPanel
          answers={answers}
          styleName={entry.name}
          report={report}
        />

        {/* ★ 하단 고정 — 결과지 저장 CTA (로그인은 결과 진입 전 이미 완료) */}
        <BottomStickyCTA>
          <button
            onClick={() => setShowSave(true)}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-btn text-base font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]">
            저장하고 홈에서 오늘 케어 보기
          </button>
        </BottomStickyCTA>

      </main>
    </SilkBackground>
  );
}
