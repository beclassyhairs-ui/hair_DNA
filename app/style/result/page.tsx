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
  STYLE_FAIL_REASON_KEY,
  STYLE_GENERATED_KEY,
  STYLE_LIMIT_KEY,
  STYLE_PHOTO_KEY,
} from "../constants";
import {
  getStyleEntry,
  getHairTypeReport,
  type HairTypeEntry,
} from "../recommend";
import { evaluateStyleGate } from "../styleGate";
import { LENGTH_LABEL_MAP, type StyleAnswers } from "../surveyData";

// 손상 "차단" 판정 — 신규 게이트(block) 또는 레거시 q10(count_7plus). A-1② 이후 소비처 공용.
function isDamageBlock(a: StyleAnswers): boolean {
  return a.q10_history_count === "count_7plus" || evaluateStyleGate(a).level === "block";
}
import { toast } from "../../../lib/toast";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import { refreshBeautyUserProfileFromDiary } from "../../../lib/beautyProfile";
import CompletionGauge from "@/components/CompletionGauge";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import BottomStickyCTA from "@/components/beauty-ui/BottomStickyCTA";
import { resolveCrossBranch } from "../crossBranch";
import { getBranchCopy, resolveDoor, SCALP_ROUTINE, SCALP_ROUTINE_BRANCHES, CAUTION_NOTICE } from "../branchCopy";
import CoupangCardList from "@/components/CoupangCardList";
import { pickStyleCards } from "@/lib/coupangCards";

function buildHairTags(answers: StyleAnswers): string[] {
  const tags: string[] = [];
  if (isDamageBlock(answers)) tags.push("#손상모");
  if (answers.q8_density === "thin_density") tags.push("#볼륨처짐");
  if (answers.q7_thickness === "fine") tags.push("#가는모");
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "curly_hair_mid") tags.push("#곱슬모");
  return tags.length > 0 ? tags : ["#건강모"];
}

// 결과지 훅/배지용 — 모질을 짧은 한글 라벨로(최대 2개, · 로 연결). 스타일 결과지엔 손상 '단계' 숫자가
// 없으므로(그건 데미지 결과지 소관) 모질 특성 위주로 요약한다. 손상 차단이면 맨 앞에 '손상 모발'.
function readableHairLabel(answers: StyleAnswers): string {
  const parts: string[] = [];
  if (answers.q3_curl === "curly_hair") parts.push("심한 곱슬");
  else if (answers.q3_curl === "curly_hair_mid") parts.push("곱슬");
  else if (answers.q3_curl === "wavy_hair") parts.push("반곱슬");
  if (answers.q7_thickness === "fine") parts.push("가는 모발");
  else if (answers.q7_thickness === "coarse") parts.push("굵은 모발");
  if (answers.q8_density === "thin_density") parts.push("볼륨 처짐");
  if (isDamageBlock(answers)) parts.unshift("손상 모발");
  if (parts.length === 0) return "건강한 모발";
  return parts.slice(0, 2).join(" · ");
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
        isSevereDamage:    isDamageBlock(answers),
        isLowDensity:      answers.q8_density === "thin_density",
        isFineHair:        answers.q7_thickness === "fine",
        isCurly:           answers.q3_curl === "curly_hair" || answers.q3_curl === "curly_hair_mid",
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
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">MY HAIR</p>
        <h3 className="mt-2 text-h2 text-ink">나의 헤어에 저장하고 평생 소장하기</h3>
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
          className="mt-6 flex h-14 min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-btn-bg border border-btn-border text-base font-bold text-btn-text transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50">
          {loading
            ? <motion.span
                className="inline-block h-4 w-4 rounded-full"
                style={{ border: "2px solid transparent", borderTopColor: "currentColor", borderRightColor: "rgba(255,255,255,0.25)" }}
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            : "나의 헤어에 저장"}
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

// 실패 사유 코드 → 손님 안내(한국어 평서문·에러코드/영어 없음·50·60이 읽는 문장).
// 🟡-11: "지금 잠시 붐볐어요"로 뭉뚱그리던 것을 "손님이 다음에 뭘 하면 되는지"가 다른
//   사유끼리 분리한다. 각 사유마다 title·hint·button(다음 행동)이 실제로 달라야 한다.
function failMessage(reason: string | null): { title: string; hint: string; button: string } {
  // ① 얼굴/사진 내용 문제 — 사진을 바꿔야 풀린다(재시도만으론 안 됨).
  //   서버는 얼굴 미검출·안전필터를 content_flagged 로 내려준다(status classifyReplicateError).
  if (reason === "content_flagged" || reason === "face_not_detected") {
    return {
      title:  "얼굴이 잘 안 보여요",
      hint:   "밝은 곳에서 얼굴이 정면으로 크게 나오게, 앞머리로 눈·이마를 가리지 않고 다시 찍어주세요.",
      button: "사진 다시 찍기",
    };
  }
  // ② 사진 파일 자체 문제(누락·형식·용량) — 다른 사진을 고르면 된다.
  if (reason === "missing_photo" || reason === "invalid_photo_format") {
    return {
      title:  "사진을 다시 선택해 주세요",
      hint:   "사진이 제대로 안 올라갔어요. 다른 사진으로 다시 골라주세요.",
      button: "사진 다시 선택",
    };
  }
  // ③ 네트워크 끊김 — 손님 쪽 연결 문제. 연결을 확인하는 게 다음 행동.
  if (reason === "network") {
    return {
      title:  "연결이 잠깐 끊겼어요",
      hint:   "와이파이나 데이터 연결을 확인하신 뒤 다시 시도해 주세요.",
      button: "다시 시도",
    };
  }
  // ④ 시간 초과(콜드스타트) — 첫 요청이 GPU를 깨우느라 오래 걸린 경우. 두 번째는 금방.
  if (reason === "poll_timeout") {
    return {
      title:  "준비에 시간이 너무 오래 걸렸어요",
      hint:   "다시 눌러주시면 이번엔 금방 나와요. 잠깐만 기다려 주세요.",
      button: "다시 시도",
    };
  }
  // ⑤ 그 외 일시/서버 문제(api_error·no_output·reference_fetch_failed·exception 등) — 잠시 후 재시도.
  return {
    title:  "지금 잠시 붐볐어요",
    hint:   "잠시 후 다시 시도하면 정상적으로 완성돼요.",
    button: "다시 시도",
  };
}

function BeforeAfterSection({
  photo, generatedUrl, failReason, limitMessage, onRetry, hairLabel,
}: {
  photo:        string | null;
  generatedUrl: string | null;
  failReason:   string | null;
  limitMessage: string | null;
  onRetry:      () => void;
  hairLabel?:   string | null;
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
            <p className="text-[9px] uppercase tracking-widest text-white/40">Your Photo</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/70">Before</span>
        </div>
      </div>

      {/* AFTER */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black/40 transition-all duration-700"
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
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-white/60" stroke="currentColor" strokeWidth={1.3}>
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[13px] font-semibold leading-snug text-white/90">오늘 무료 합성을<br />모두 사용했어요</p>
            <p className="text-[11px] leading-relaxed text-white/70">{limitMessage}</p>
          </div>
        ) : (() => {
          const f = failMessage(failReason);
          return (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center overflow-y-auto py-4">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-white/60" stroke="currentColor" strokeWidth={1.3}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
              </svg>
              <p className="text-[13px] font-semibold leading-snug text-white/90">{f.title}</p>
              <p className="text-[11px] leading-relaxed text-white/70">{f.hint}</p>
              <button onClick={onRetry}
                className="mt-1 rounded-btn border border-white/35 bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/20">
                {f.button}
              </button>
            </div>
          );
        })()}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white">After</span>
        </div>
        {/* 진단 배지 — 사진만 보고 스크롤 안 하는 손님에게도 모질 진단이 눈에 박히게(파트2 ⑤).
            🟡-05: "손상 모발 · 볼륨 처짐"처럼 긴 라벨이 320px에서 pill을 깨거나 줄바꿈 되던 문제 →
            한 줄 고정(whitespace-nowrap) + 사진폭 넘으면 …(truncate) + max-width 로 카드 안에 가둠. */}
        {generatedUrl && hairLabel && (
          <div className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate whitespace-nowrap rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {hairLabel}
          </div>
        )}
        {generatedUrl && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.25)" }} />
        )}
      </div>
    </div>
  );
}

// ─── 결과지 갈래 리포트 컴포넌트 (지시서 A-5 · 목업 v4 구조) ──────────────────
// crossBranch가 정한 갈래로 branchCopy에서 카피를 꺼내 슬롯에 채운다.
// 카피 최종본(§1 갈래 1~10)이 branchCopy에 전부 주입됨 — 여기선 필드만 배치.

// 내부 신뢰 카피(<b> 강조 유지) 렌더 — 사용자 입력 아님.
function Rich({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// 섹션 라벨(작은 제목)
function TT({ children }: { children: string }) {
  return <p className="mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.24em] text-ink-2">{children}</p>;
}

// 판정 스탬프 3단 — 전문은 갈래 카피(bcopy.stamp), 색만 게이트 레벨로(block=amber / 그 외 green).
function VerdictStamp({ level, stamp }: { level: "pass" | "caution" | "block"; stamp: string }) {
  const isBlock = level === "block";
  return (
    <div className="mt-2.5 flex justify-center">
      <span className={`rounded-full border px-4 py-1.5 text-center text-[14px] font-extrabold ${
        isBlock ? "border-amber-500 bg-amber-50 text-amber-700" : "border-emerald-600 bg-emerald-50 text-emerald-700"
      }`}>
        {stamp}
      </span>
    </div>
  );
}

// 게이트 주의 — 노란 안내줄 + 데미지 송객 CTA(링크만, 문구 기존 유지)
function CautionNotice() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-[14px] font-semibold text-amber-800">{CAUTION_NOTICE}</p>
      <Link href="/damage-check"
        className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-amber-700 underline underline-offset-2">
        정밀 손상 진단 받아보기 →
      </Link>
    </div>
  );
}

// (구 AvoidCard / SalonTipCard / HomeCareCard 제거 — A-5 갈래 구조로 대체.
//  살롱 상담 스크립트 카드는 확정 119에 따라 삭제. 제품은 갈래별 3종 슬롯 + /items 링크로.)

// ─── 기획자용 진단 로직 디버그 패널 ──────────────────────────────────────────
// (테스트/기획 검증용 — 의도적으로 눈에 띄는 디버그 톤을 유지, 리디자인 대상 아님)

const Q_DEBUG_LABELS: Record<string, [string, Record<string, string>]> = {
  q1_age:            ["연령대",    { age_20: "20대", age_30: "30대", age_40: "40대", age_50: "50대", age_60plus: "60대+" }],
  q11_length:        ["기장",      LENGTH_LABEL_MAP],
  q14_layer:         ["레이어",    { heavy: "층 없음", medium: "층 중간", light: "층 많음" }],
  q13_design:        ["웨이브",    { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" }],
  q8_density:        ["숱",        { thick_density: "많음", medium_density: "보통", thin_density: "적음" }],
  q7_thickness:      ["굵기",      { coarse: "굵음", medium_thickness: "보통", fine: "가늘음" }],
  q3_curl:           ["곱슬",      { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair_mid: "곱슬", curly_hair: "악성곱슬" }],
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
  const [failReason, setFailReason] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<StyleAnswers>({});
  const [ready,      setReady]      = useState(false);
  const [showSave,   setShowSave]   = useState(false);
  const [completeTracked, setCompleteTracked] = useState(false);
  // 파트2 버튼 계단식 — 진단·처방(①)과 케어 제품(②)을 버튼으로 단계 공개.
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [showProducts,  setShowProducts]  = useState(false);


  // 세션 데이터 즉시 로드 (폴링 없음)
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (p) setPhoto(p);
      const a = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (a) {
        const parsed: unknown = JSON.parse(a);
        // 세션 조작(JSON "null"·배열 등) 방어 — 순수 객체가 아니면 무시하고 기본값({}) 유지.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setAnswers(parsed as StyleAnswers);
        }
      }
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
          const reason = sessionStorage.getItem(STYLE_FAIL_REASON_KEY);
          console.warn("[Result] ⚠️ AI 이미지 URL 없음. reason:", reason ?? "(없음)", "debugError:", dbgErr ?? "(없음)");
          setFailReason(reason);
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

  // ★ 직접 URL 진입(설문·업로드를 안 거친 상태) 가드 — 2026-08-16 D-2 감사 🔴-02.
  //   진단 데이터(answers)가 전혀 없으면 기본값(bob/medium/straight)으로 "진단받은 척"하는
  //   결과지를 보여주지 않고 랜딩으로 돌려보낸다. answers 하나만 기준으로 삼는다(Codex 라운드1
  //   반영) — getStyleEntry/evaluateStyleGate/resolveCrossBranch 가 전부 answers 파생이라,
  //   photo·failReason 등 다른 플래그만 있고 answers 가 비어있어도 같은 가짜 진단이 나온다.
  //   정상 플로우는 설문 완료 시점부터 answers 가 항상 세션에 남아있다(성공·실패·한도초과 공통).
  const hasResultData = Object.keys(answers).length > 0;

  useEffect(() => {
    if (ready && !hasResultData) router.replace("/style");
  }, [ready, hasResultData, router]);

  if (!ready || !hasResultData) return <main className="min-h-screen bg-surface" />;

  const entry  = getStyleEntry(answers);
  const report = getHairTypeReport(answers);   // 디버그 패널·REPORT_VIEW 추적용(hairTypeKey 등)
  const gate   = evaluateStyleGate(answers);   // 판정 스탬프·주의/차단
  const branch = resolveCrossBranch(answers);  // 대표 갈래 + 흡수 + 부가카드
  const bcopy  = getBranchCopy(branch.primary);

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

          {/* A-1 완성도 게이지 — 결과지 상단 */}
          <CompletionGauge className="mb-4" />

          {/* 1. Before/After — 캡션 확정(농담성 문구 금지, 확정 138). 차단이어도 After는 그대로 노출. */}
          <BeforeAfterSection photo={photo} generatedUrl={generated} failReason={failReason} limitMessage={limitMessage} onRetry={handleRetry} hairLabel={readableHairLabel(answers)} />
          <p className="mt-2 text-center text-[12px] leading-relaxed text-ink-2">실제 시술은 머리 상태에 따라 달라요</p>

          {/* 2. 고른 스타일명(간판명) + 부제 + 판정 스탬프 3단 — 사진 결과의 헤드라인(항상 노출) */}
          <div className="mt-4 text-center">
            <p className="text-[13px] text-ink-2">내가 고른 스타일</p>
            <p className="mt-0.5 text-[26px] font-extrabold tracking-tight text-ink">{entry.name}</p>
            {entry.subtitle && <p className="mt-1 text-[14px] text-ink-2">{entry.subtitle}</p>}
            <VerdictStamp level={gate.level} stamp={bcopy.stamp} />
          </div>

          {/* 게이트 주의 — 안전 안내라 버튼 뒤에 숨기지 않고 항상 노출 */}
          {gate.level === "caution" && <div className="mt-4"><CautionNotice /></div>}

          {/* 파트2 훅 — 스크롤 없이 보이는 위치에서 '왜 어울리는지 / 뭘 주문해야 실패 안 하는지'를
              아래 버튼으로 끌어내린다(50·60은 스크롤을 안 하고 사진만 보고 끝내는 문제 직격). */}
          <div className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3.5 text-center">
            <p className="text-[15.5px] font-semibold leading-relaxed text-ink">
              내 모발은 <b className="font-extrabold">{readableHairLabel(answers)}</b> — 이 스타일이 왜 어울리는지, 미용실에서 뭘 주문해야 실패 안 하는지 아래에 담았어요
            </p>
          </div>

          <div className="mt-4 space-y-5 transition-all duration-700">

            {/* 큰 버튼 ① — 진단·처방 열기(누르면 아래 진단 섹션이 펼쳐진다) */}
            {!showDiagnosis && (
              <button
                onClick={() => { setShowDiagnosis(true); trackEvent("result_diagnosis_open", { source: "style" }); }}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-btn-bg border border-btn-border px-5 py-4 text-[17px] font-extrabold text-btn-text transition-all hover:brightness-95 active:scale-[0.98]">
                <span aria-hidden>📋</span> 20년차 디자이너의 내 진단 결과 보기
              </button>
            )}

            {/* 진단·처방 섹션 — 버튼①을 눌러야 열린다 */}
            {showDiagnosis && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-1">

                {/* 3. 예언 — 조건문 톤(현재 단정 금지) */}
                <TT>혹시, 이런 적 있다면</TT>
                <GlassCard className="border-l-4 border-l-ink px-5 py-4">
                  <Rich html={resolveDoor(branch.primary, answers.q13_design, bcopy)} className="block whitespace-pre-line text-[16px] font-extrabold leading-relaxed text-ink" />
                </GlassCard>

                {/* 4. 아하 — 핵심 1줄 + 자세히 보기 접기 */}
                <TT>왜 그랬던 걸까요</TT>
                <div className="rounded-xl border border-line bg-surface px-4 py-3">
                  <Rich html={bcopy.aha} className="text-[14.5px] font-semibold leading-relaxed text-ink" />
                </div>
                <details className="mt-2 overflow-hidden rounded-xl border border-line">
                  <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-ink-2">자세히 보기</summary>
                  <div className="border-t border-line px-4 py-3"><Rich html={bcopy.detail} className="block whitespace-pre-line text-[14px] leading-relaxed text-ink" /></div>
                </details>

                {/* 5. 평소 관리 꿀팁(주인공, 펼침, 문단 통째) + 정수리 루틴 접기(갈래 3·5·10 공용 or 부가) */}
                <TT>평소엔 이렇게 해보세요</TT>
                <GlassCard tone="soft" className="px-5 py-4">
                  <Rich html={bcopy.tip} className="block whitespace-pre-line text-[14px] leading-relaxed text-ink" />
                </GlassCard>
                {(branch.scalpRoutineCard || SCALP_ROUTINE_BRANCHES.includes(branch.primary)) && (
                  <details className="mt-2 overflow-hidden rounded-xl border border-line">
                    <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-ink-2">{SCALP_ROUTINE.title}</summary>
                    <div className="border-t border-line px-4 py-3">
                      <ol className="list-decimal space-y-1.5 pl-5">
                        {SCALP_ROUTINE.steps.map((s, i) => (
                          <li key={i} className="text-[13.5px] leading-relaxed text-ink"><Rich html={s} /></li>
                        ))}
                      </ol>
                      <p className="mt-2 text-[12.5px] text-ink-2">{SCALP_ROUTINE.note}</p>
                    </div>
                  </details>
                )}

                {/* 6. 시술 참고(접힘) — 대표 + 흡수된 갈래 스텝 */}
                <details className="mt-2 overflow-hidden rounded-xl border border-line">
                  <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-ink-2">시술 생각이 있으시다면</summary>
                  <div className="space-y-2 border-t border-line px-4 py-3">
                    <Rich html={bcopy.procedure} className="block whitespace-pre-line text-[14px] leading-relaxed text-ink" />
                    {branch.absorbed.map((k) => (
                      <Rich key={k} html={getBranchCopy(k).procedure} className="block whitespace-pre-line text-[13px] leading-relaxed text-ink-2" />
                    ))}
                  </div>
                </details>

                {/* 큰 버튼 ② — 케어 제품 열기(진단 읽고 나면 등장). 차단(block)은 제품 대신 데미지 안내. */}
                {gate.level !== "block" ? (
                  !showProducts ? (
                    <button
                      onClick={() => { setShowProducts(true); trackEvent("result_products_open", { source: "style" }); }}
                      className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full bg-btn-bg border border-btn-border px-5 py-4 text-[17px] font-extrabold text-btn-text transition-all hover:brightness-95 active:scale-[0.98]">
                      <span aria-hidden>🛍</span> 내 모발에 딱 맞는 케어 제품 보기
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-5">
                      {/* 7. 쿠팡 제휴 제품 카드 — 매칭 실물(확정48). COUPANG_CARDS_LIVE=false 면 자동 미노출. */}
                      <CoupangCardList cards={pickStyleCards(answers)} landingId="style" heading="이 머리에 맞는 제품" />
                    </motion.div>
                  )
                ) : (
                  /* 데미지 송객 CTA — 차단 시(주의는 위 노란줄에서 이미 노출). 링크만, 문구 기존 유지. */
                  <Link href="/damage-check"
                    className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink">
                    정밀 손상 진단 받아보기 <span className="flex-none">→</span>
                  </Link>
                )}
              </motion.div>
            )}

            {/* 저장 + 공유 — 🟡-01 어포던스: 텍스트처럼 보이던 것을 테두리로 '버튼'임을 명확히.
                저장하기=아웃라인(하단 고정 채움 CTA와 위계 구분), 공유/재진단=옅은 테두리 보조버튼. */}
            <GlassCard className="space-y-2.5 px-5 py-5">
              <button onClick={() => setShowSave(true)}
                className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-btn-border bg-surface text-base font-bold text-ink transition-all hover:brightness-95 active:scale-[0.98]">
                <span aria-hidden>⬇️</span> 사진 다운받기 (나의 헤어 저장 후 가능)
              </button>
              <p className="text-center text-[13px] text-ink-2 -mt-1">
                나의 헤어에 저장하면 AI 변신 사진을 갤러리에 저장할 수 있어요
              </p>
              {/* 공유(③)가 재진단(④)보다 우선 — 좌측 우선 배치 */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    // 공유 문구를 다른 결과지(bangs·damage-check)와 같은 형식으로 맞춘다:
                    // 브랜드 + 타입 별명(스타일명) + 주소. 미검증 숫자는 넣지 않는다.
                    const base = typeof window !== "undefined" ? window.location.origin : "";
                    const url  = `${base}/style?utm_source=kakao_share`;
                    const text = `AI가 처방한 나의 스타일은 [${entry.name}] 입니다.`;
                    if (navigator.share) navigator.share({ title: "어뷰티 | 내 AI 헤어 변신 결과", text, url }).catch(() => {});
                    else navigator.clipboard?.writeText(url).then(() => toast("링크가 복사됐어요!"));
                  }}
                  className="flex h-12 flex-1 items-center justify-center rounded-full border border-line text-[15px] font-semibold text-ink-2 transition-all hover:bg-surface hover:text-ink active:scale-[0.98]">
                  공유하기
                </button>
                <Link href="/style/survey"
                  className="flex h-12 flex-1 items-center justify-center rounded-full border border-line text-[15px] font-medium text-ink-2 transition-all hover:bg-surface hover:text-ink active:scale-[0.98]">
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
            className="flex h-14 min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-btn-bg border border-btn-border text-base font-bold text-btn-text transition-all hover:brightness-95 active:scale-[0.98]">
            저장하고 홈에서 오늘 케어 보기
          </button>
        </BottomStickyCTA>

      </main>
    </SilkBackground>
  );
}
