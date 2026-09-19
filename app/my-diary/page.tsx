"use client";

// ============================================================================
// /my-diary — 나의 헤어 (진단 기록: UUID 배열 저장 + 리스트 + 모달 + 제품카드)
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AppShell from "../components/layout/AppShell";
import AccountSection from "../components/AccountSection";
import PhotoLightbox from "../components/PhotoLightbox";
import { LENGTH_LABEL_MAP } from "../style/surveyData";
import TreatmentHistoryField from "@/components/TreatmentHistoryField";
import { downloadImage } from "../../lib/downloadImage";
import {
  STYLE_ANSWERS_KEY, STYLE_GENERATED_KEY, STYLE_JOB_KEY,
  STYLE_LIMIT_KEY, STYLE_FAIL_REASON_KEY, STYLE_PHOTO_KEY, STYLE_REVISIT_KEY,
} from "../style/constants";
import { DAMAGE_SURVEY_KEY, DAMAGE_REVISIT_KEY } from "../damage-check/constants";

// ─── 레이블 매핑 ─────────────────────────────────────────────────────────────

const Q_LABELS: Record<string, string> = {
  q1_age:            "연령대",     q11_length:        "희망 기장",
  q14_layer:         "레이어드",   q13_design:        "웨이브",
  q8_density:        "모발 숱",    q7_thickness:      "모발 굵기",
  q3_curl:           "곱슬 유무",  q10_history_count: "연간 시술",
};
// q11_length는 app/style/surveyData.ts의 LENGTH_LABEL_MAP(SSOT)을 그대로 사용 —
// 예전엔 여기 따로 하드코딩돼 있어서 실제 규격과 어긋나 있었다(bob→"숏단발" 등 오표기).
const A_LABELS: Record<string, Record<string, string>> = {
  q1_age:            { age_20: "20대", age_30: "30대", age_40: "40대", age_50: "50대", age_60plus: "60대 이상" },
  q11_length:        LENGTH_LABEL_MAP,
  q14_layer:         { heavy: "무거움", medium: "소프트", light: "허쉬" },
  q13_design:        { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" },
  q8_density:        { thick_density: "많음", medium_density: "보통", thin_density: "적음" },
  q7_thickness:      { coarse: "두꺼움", medium_thickness: "보통", fine: "얇음" },
  q3_curl:           { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair: "악성곱슬" },
  q10_history_count: { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회 이상" },
};
const Q_ORDER = ["q1_age","q11_length","q14_layer","q13_design","q8_density","q7_thickness","q3_curl","q10_history_count"];

// ─── 맞춤 제품 카테고리 힌트 ──────────────────────────────────────────────────
// 본진에는 외부 제휴(쿠팡 파트너스) 링크를 넣지 않는다 — 제품 노출은 자체 커머스(/items)로만
// 보낸다. 여기서는 진단 답변 기반 카테고리 힌트만 만들고, 실제 제품은 발견템에서 매칭한다.

interface ProductHint { emoji: string; category: string; }

function getProductHint(answers: Record<string, string>): ProductHint {
  if (answers.q10_history_count === "count_7plus")
    return { emoji: "🧴", category: "손상 케어" };
  if (answers.q7_thickness === "fine" || answers.q8_density === "thin_density")
    return { emoji: "💊", category: "볼륨 케어" };
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "wavy_hair")
    return { emoji: "🌀", category: "컬 케어" };
  return { emoji: "✨", category: "광택 케어" };
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface DiaryEntry {
  id:                string;
  answers:           Record<string, string>;
  styleName:         string;
  savedAt:           number;
  generatedImageUrl: string | null;
  isSevereDamage:    boolean;
  isLowDensity:      boolean;
  isFineHair:        boolean;
  isCurly:           boolean;
}

// /damage-check 결과지가 저장하는 판별자 붙은 엔트리 — DiaryEntry와는 완전히
// 다른 스키마(생성 이미지·설문 답변 키가 없음)라 별도 타입 + 별도 카드로 렌더링한다.
interface DamageDiaryEntry {
  id:          string;
  kind:        "damage";
  savedAt:     number;
  answers?:    Record<string, string>; // 결과지 다시보기 재조립용(2026-09 이후 저장분). 옛 기록엔 없음.
  resultCode:  string;
  levelLabel:  string;
  typeLabel:   string;
  headline:    string;
  concernTags: string[];
  product?:    { emoji: string; name: string; description: string; link: string }; // FIX-A: 카드 없으면 미저장 가능
}

// /bangs 결과지가 저장하는 판별자 붙은 엔트리 — 얼굴형/bangStyle 진단 전용 스키마(v3).
// 선택 얼굴형 기준 축과 답변 신호 기반 축을 분리해서 그대로 저장한다.
interface BangsDiaryEntry {
  id:                    string;
  kind:                  "bangs";
  savedAt:               number;
  resultId:              string;

  selectedFaceShape:     string;
  selectedFaceBangLabel: string;

  signalBasedFaceShape:  string;
  signalBasedBangLabel:  string;

  primaryBangLabel:      string;
  secondaryBangLabel:    string;

  debugReasonSummary:    string;

  concernTags:           string[];
  hairTextureTag:        string;
  diagnosisSummary:      string;
  resultImages?:         { label: string; url: string }[]; // 사진첩용 — 파일 없으면 카드가 폴백 처리
}

// /hair-quiz 결과지가 저장하는 판별자 붙은 엔트리 — 생성 이미지·styleName이 없어서
// DiaryEntry(style) 카드로 렌더하면 "Style N" 라벨에 제목이 비어 보인다. 별도 카드로 렌더링한다.
interface HairQuizDiaryEntry {
  id:                string;
  kind:              "hairquiz";
  savedAt:           number;
  resultKey:         string;
  badge:             string;
  title:             string;
  diagnosisSummary:  string;
  hairTags:          string[];
  concernTags:       string[];
  answers:           Record<string, string>;
}

type AnyEntry = DiaryEntry | DamageDiaryEntry | BangsDiaryEntry | HairQuizDiaryEntry;

function isDamageEntry(entry: AnyEntry): entry is DamageDiaryEntry {
  return (entry as DamageDiaryEntry).kind === "damage";
}

function isBangsEntry(entry: AnyEntry): entry is BangsDiaryEntry {
  return (entry as BangsDiaryEntry).kind === "bangs";
}

function isHairQuizEntry(entry: AnyEntry): entry is HairQuizDiaryEntry {
  return (entry as HairQuizDiaryEntry).kind === "hairquiz";
}

// 이미지 확대는 공용 PhotoLightbox(핀치 줌·저장·공유)로 대체 — 로컬 ImageModal 제거.

// ─── 기록 카드 ────────────────────────────────────────────────────────────

// 이미지 저장(downloadImage)은 lib/downloadImage 공용 유틸을 쓴다(결과지·확대뷰어와 동일 경로).

function DiaryCard({ entry, index, onOpenModal, onRevisit }: { entry: DiaryEntry; index: number; onOpenModal: (url: string, title: string) => void; onRevisit: (entry: DiaryEntry) => void; }) {
  const [expanded,     setExpanded]     = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const hint = getProductHint(entry.answers);
  const date    = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl shadow-soft"
      style={{ border: "1px solid var(--line)" }}
    >
      {/* 골드 라인 */}
      <div className="h-px w-full" style={{ background: "var(--line)" }} />

      <div style={{ background: "var(--card)" }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-aux font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>
              Style {index + 1}
            </p>
            <p className="mt-0.5 font-serif text-h2" style={{ color: "var(--ink)" }}>
              {entry.styleName}
            </p>
          </div>
          <p className="shrink-0 text-aux" style={{ color: "var(--ink-2)" }}>{date}</p>
        </div>

        {/* 결과지 다시 보기 — 저장된 답변으로 결과지 전문 재조립(합성·quota 없음). 답변 있는 기록만. */}
        {entry.answers && Object.keys(entry.answers).length > 0 && (
          <button
            onClick={() => onRevisit(entry)}
            className="mx-4 mb-2 flex min-h-11 w-[calc(100%-2rem)] items-center justify-center rounded-xl text-aux font-semibold active:opacity-70"
            style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
          >
            결과지 다시 보기 →
          </button>
        )}

        {/* After 이미지 썸네일 */}
        {entry.generatedImageUrl && (
          <>
            <button
              onClick={() => onOpenModal(entry.generatedImageUrl!, entry.styleName)}
              className="mx-4 mb-2 block w-[calc(100%-2rem)] overflow-hidden rounded-xl active:scale-[0.98] transition-transform"
              style={{ border: "1px solid var(--line)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.generatedImageUrl} alt="AI 변신 결과"
                className="h-48 w-full object-cover" />
              <div className="px-3 py-1.5 text-center" style={{ background: "var(--surface)" }}>
                <p className="text-aux" style={{ color: "var(--ink-2)" }}>탭하면 크게 볼 수 있어요</p>
              </div>
            </button>
            <button
              onClick={async () => {
                setDownloading(true);
                await downloadImage(entry.generatedImageUrl!, entry.styleName);
                setDownloading(false);
              }}
              disabled={downloading}
              className="mx-4 mb-3 flex min-h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl text-aux font-bold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: "var(--ink)", color: "var(--bg)", border: "none" }}
            >
              {downloading ? "저장 중..." : "사진 갤러리에 저장하기"}
            </button>
          </>
        )}

        {/* 접기/펼치기 */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex min-h-12 w-full items-center justify-between px-4 pb-3 text-aux transition-colors"
          style={{ color: "var(--ink-2)" }}
        >
          <span>진단 데이터 {expanded ? "접기" : "보기"}</span>
          <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} stroke="currentColor" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded && (
          <div className="mx-4 mb-3 grid grid-cols-2 gap-1.5">
            {Q_ORDER.map(qId => {
              const val = entry.answers[qId] ?? "";
              return (
                <div key={qId} className="rounded-lg px-3 py-2" style={{ background: "var(--surface)" }}>
                  <p className="text-aux" style={{ color: "var(--ink-2)" }}>{Q_LABELS[qId]}</p>
                  <p className="text-aux font-semibold" style={{ color: "var(--ink)" }}>
                    {A_LABELS[qId]?.[val] ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 카테고리 힌트 → 자체 커머스(발견템) 유도 — 외부 제휴 링크 없음 */}
        <div className="mx-4 mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-aux font-bold uppercase tracking-wider" style={{ color: "var(--ink-2)" }}>
                {hint.category}
              </p>
              <p className="truncate text-body font-semibold" style={{ color: "var(--ink)" }}>
                이 진단에 맞는 제품 보기
              </p>
            </div>
          </div>
          <Link href="/items"
            className="flex min-h-12 w-full items-center justify-center text-aux font-bold transition-all"
            style={{ background: "var(--ink)", color: "var(--bg)", border: "none" }}>
            발견템에서 보기 →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 손상도 진단 기록 카드 ────────────────────────────────────────────────

function DamageDiaryCard({ entry, index, onRevisit }: { entry: DamageDiaryEntry; index: number; onRevisit: (entry: DamageDiaryEntry) => void }) {
  const date = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl shadow-soft"
      style={{ border: "1px solid var(--line)" }}
    >
      <div className="h-px w-full" style={{ background: "var(--line)" }} />
      <div style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-aux font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>
              손상도 진단 · {entry.resultCode}
            </p>
            <p className="mt-0.5 font-serif text-h2" style={{ color: "var(--ink)" }}>
              {entry.levelLabel} · {entry.typeLabel}
            </p>
          </div>
          <p className="shrink-0 text-aux" style={{ color: "var(--ink-2)" }}>{date}</p>
        </div>

        <p className="px-4 pb-3 text-body leading-relaxed" style={{ color: "var(--ink)" }}>
          {entry.headline}
        </p>

        {entry.concernTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {entry.concernTags.map((tag) => (
              <span key={tag} className="rounded-full px-2.5 py-1 text-aux font-semibold"
                style={{ background: "var(--surface)", color: "var(--ink-2)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 결과지 다시 보기 — 답변 있는 기록만(옛 저장분엔 answers 없어 숨김). */}
        {entry.answers && Object.keys(entry.answers).length > 0 && (
          <div className="px-4 pb-3">
            <button
              onClick={() => onRevisit(entry)}
              className="flex min-h-11 w-full items-center justify-center rounded-xl text-aux font-semibold active:opacity-70"
              style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              결과지 다시 보기 →
            </button>
          </div>
        )}

        {entry.product && (
          <div className="mx-4 mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
            <div className="flex items-center gap-3 px-3 py-3">
              <span className="text-2xl">{entry.product.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold" style={{ color: "var(--ink)" }}>
                  {entry.product.name}
                </p>
                <p className="truncate text-aux" style={{ color: "var(--ink-2)" }}>
                  {entry.product.description}
                </p>
              </div>
            </div>
            {/* 외부 제휴 링크 대신 자체 커머스(발견템)로 — 본진 파트너스 링크 금지 정책 */}
            <Link href="/items"
              className="flex min-h-12 w-full items-center justify-center text-aux font-bold transition-all"
              style={{ background: "var(--ink)", color: "var(--bg)", border: "none" }}>
              발견템에서 보기 →
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── 손질 습관 진단(hair-quiz) 기록 카드 ──────────────────────────────────

function HairQuizDiaryCard({ entry, index }: { entry: HairQuizDiaryEntry; index: number }) {
  const date = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  const tags = entry.concernTags?.length ? entry.concernTags : entry.hairTags ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl shadow-soft"
      style={{ border: "1px solid var(--line)" }}
    >
      <div className="h-px w-full" style={{ background: "var(--line)" }} />
      <div style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-aux font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>
              손질 습관 진단{entry.badge ? ` · ${entry.badge}` : ""}
            </p>
            <p className="mt-0.5 font-serif text-h2" style={{ color: "var(--ink)" }}>
              {entry.title}
            </p>
          </div>
          <p className="shrink-0 text-aux" style={{ color: "var(--ink-2)" }}>{date}</p>
        </div>

        {entry.diagnosisSummary && (
          <p className="px-4 pb-3 text-body leading-relaxed" style={{ color: "var(--ink)" }}>
            {entry.diagnosisSummary}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full px-2.5 py-1 text-aux font-semibold"
                style={{ background: "var(--surface)", color: "var(--ink-2)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── 인생앞머리 진단 기록 카드 ────────────────────────────────────────────

// 사진첩 썸네일 — 파일이 없을 수 있으므로 로드 실패 시 깨진 이미지 대신 이모지로 폴백
function DiaryImageThumb({ label, url }: { label: string; url: string }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" onError={() => setImgOk(false)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1" style={{ background: "var(--surface)" }}>
          <span className="text-xl">💇</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-1.5 py-1" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
        <p className="truncate text-aux font-semibold text-white/90">{label}</p>
      </div>
    </div>
  );
}

function BangsDiaryCard({ entry, index }: { entry: BangsDiaryEntry; index: number }) {
  const date = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  const shapesAgree = entry.selectedFaceShape === entry.signalBasedFaceShape;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl shadow-soft"
      style={{ border: "1px solid var(--line)" }}
    >
      <div className="h-px w-full" style={{ background: "var(--line)" }} />
      <div style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-aux font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>
              인생앞머리 · {shapesAgree ? "얼굴형 신호 일치" : "답변 신호 보정 반영"}
            </p>
            <p className="mt-0.5 font-serif text-h2" style={{ color: "var(--ink)" }}>
              {entry.primaryBangLabel}
            </p>
          </div>
          <p className="shrink-0 text-aux" style={{ color: "var(--ink-2)" }}>{date}</p>
        </div>

        <p className="px-4 pb-2 text-body leading-relaxed" style={{ color: "var(--ink)" }}>
          {entry.diagnosisSummary}
        </p>
        <p className="px-4 pb-1 text-aux" style={{ color: "var(--ink-2)" }}>
          선택 얼굴형 기준: {entry.selectedFaceBangLabel} · 답변 신호 기준: {entry.signalBasedBangLabel}
        </p>
        <p className="px-4 pb-3 text-aux" style={{ color: "var(--ink-2)" }}>
          함께 고려한 스타일: {entry.secondaryBangLabel}
        </p>

        {entry.resultImages && entry.resultImages.length > 0 && (
          <div className="flex gap-2 px-4 pb-3">
            {entry.resultImages.map((img) => (
              <DiaryImageThumb key={img.url} label={img.label} url={img.url} />
            ))}
          </div>
        )}

        {(entry.concernTags.length > 0 || entry.hairTextureTag) && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {[...entry.concernTags, entry.hairTextureTag].map((tag) => (
              <span key={tag} className="rounded-full px-2.5 py-1 text-aux font-semibold"
                style={{ background: "var(--surface)", color: "var(--ink-2)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function MyDiaryPage() {
  const router = useRouter();
  const [entries,    setEntries]    = useState<AnyEntry[]>([]);
  const [ready,      setReady]      = useState(false);
  const [lightbox,   setLightbox]   = useState<{ url: string; title: string } | null>(null);

  // 결과지 다시 보기 — 저장된 답변(+스타일은 이미지)을 sessionStorage에 실어 결과지로 보낸다.
  //   합성 job 키는 비워서 폴링·합성·quota가 일어나지 않게 한다(저장분으로만 재조립).
  function revisitStyle(entry: DiaryEntry) {
    try {
      // ① 합성/폴링 유발 키를 먼저 제거 + revisit 플래그 설정(작은 쓰기 — 실패 위험 최소).
      //    결과지는 revisit 이면 job 을 아예 안 읽지만, 여기서도 stale job 을 확실히 지운다.
      [STYLE_JOB_KEY, STYLE_LIMIT_KEY, STYLE_FAIL_REASON_KEY, STYLE_PHOTO_KEY, STYLE_GENERATED_KEY].forEach((k) => sessionStorage.removeItem(k));
      sessionStorage.setItem(STYLE_REVISIT_KEY, "1");
      sessionStorage.setItem(STYLE_ANSWERS_KEY, JSON.stringify(entry.answers ?? {}));
    } catch { /**/ }
    // ② 이미지(큰 data URI)는 마지막에 따로 — quota 초과로 실패해도 위의 키 제거·revisit·answers 는 이미 적용됨.
    try {
      if (entry.generatedImageUrl) sessionStorage.setItem(STYLE_GENERATED_KEY, entry.generatedImageUrl);
    } catch { /* 이미지 저장 실패 시 사진만 비고 본문은 정상 재조립 */ }
    router.push("/style/result");
  }
  function revisitDamage(entry: DamageDiaryEntry) {
    try {
      sessionStorage.setItem(DAMAGE_SURVEY_KEY, JSON.stringify(entry.answers ?? {}));
      sessionStorage.setItem(DAMAGE_REVISIT_KEY, "1");
    } catch { /**/ }
    router.push("/damage-check/result");
  }

  useEffect(() => {
    try {
      // 배열 저장에서 로드
      const raw = localStorage.getItem("abeauty:diaryEntries");
      if (raw) {
        setEntries(JSON.parse(raw) as AnyEntry[]);
      } else {
        // 하위 호환: 단일 저장 키에서 마이그레이션
        const single = localStorage.getItem("abeauty:savedDiagnosis");
        if (single) {
          const data = JSON.parse(single) as DiaryEntry;
          if (!data.id) data.id = `legacy-${Date.now()}`;
          setEntries([data]);
        }
      }
    } catch { /**/ }
    setReady(true);
  }, []);

  if (!ready) return <AppShell><div className="min-h-[40vh]" /></AppShell>;

  return (
    <AppShell>
      {/* 이미지 확대(핀치 줌·저장·공유) — 셸 위 전체화면 */}
      {lightbox && (
        <PhotoLightbox url={lightbox.url} title={lightbox.title} source="my_diary" onClose={() => setLightbox(null)} />
      )}

      {/* 명조 페이지 제목 (5-B 톤). 하단탭 "나의 헤어" 목적지 = 이 실체 페이지 */}
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-h1 text-ink">나의 헤어</h1>
          {entries.length > 0 && (
            <p className="mt-1 text-aux text-sub">진단 이력 {entries.length}건</p>
          )}
        </div>
        <Link
          href="/style/survey"
          className="shrink-0 pb-1 text-aux font-medium text-sub transition-colors active:text-ink"
        >
          새 진단 →
        </Link>
      </header>

      {/* A-3 시술 이력 — 저장·회수만(알림·경고·재구매 트리거 없음) */}
      <TreatmentHistoryField />

      {entries.length === 0 ? (
        /* 빈 상태 */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ border: "1px solid var(--line)", background: "var(--soft)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="var(--sub)" strokeWidth={1.2}>
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mb-6 text-body text-sub">
            저장된 진단 결과가 없어요.
          </p>
          <Link href="/style" className="btn-primary">
            AI 헤어 분석 시작하기 →
          </Link>
        </div>
      ) : (
        /* 진단 카드 리스트 (기능 본체 불변 — AI이미지·모달·다운로드·상품CTA·시술이력 유지) */
        <div className="space-y-4">
          {entries.map((entry, i) =>
            isDamageEntry(entry) ? (
              <DamageDiaryCard key={entry.id} entry={entry} index={i} onRevisit={revisitDamage} />
            ) : isBangsEntry(entry) ? (
              <BangsDiaryCard key={entry.id} entry={entry} index={i} />
            ) : isHairQuizEntry(entry) ? (
              <HairQuizDiaryCard key={entry.id} entry={entry} index={i} />
            ) : (
              <DiaryCard
                key={entry.id}
                entry={entry}
                index={i}
                onOpenModal={(url, title) => setLightbox({ url, title })}
                onRevisit={revisitStyle}
              />
            ),
          )}
        </div>
      )}

      {/* 계정 메뉴(로그인 상태별: 로그아웃+삭제 / 카카오 로그인). 화면 최하단. */}
      <AccountSection />
    </AppShell>
  );
}
