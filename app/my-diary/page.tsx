"use client";

// ============================================================================
// /my-diary — 내 헤어 다이어리 (UUID 배열 저장 + 리스트 + 모달 + 제품카드)
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LENGTH_LABEL_MAP } from "../style/surveyData";

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

// ─── 맞춤 제품 (간략 버전) ────────────────────────────────────────────────────

interface MiniProduct { emoji: string; category: string; name: string; url: string; }

function getProduct(answers: Record<string, string>): MiniProduct {
  if (answers.q10_history_count === "count_7plus")
    return { emoji: "🧴", category: "새치 케어", name: "약산성 새치 케어 샴푸", url: "https://link.coupang.com/a/eEoal2SxC8" };
  if (answers.q7_thickness === "fine" || answers.q8_density === "thin_density")
    return { emoji: "💊", category: "볼륨 케어", name: "뿌리 볼륨 에센스", url: "https://link.coupang.com/a/eEnDYZ4YEe" };
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "wavy_hair")
    return { emoji: "🌀", category: "컬 케어", name: "컬 유지 크림", url: "https://link.coupang.com/a/eEn6wxl4Oy" };
  return { emoji: "✨", category: "광택 케어", name: "글로시 헤어 세럼", url: "https://link.coupang.com/a/eEnlw9bAnQ" };
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
  resultCode:  string;
  levelLabel:  string;
  typeLabel:   string;
  headline:    string;
  concernTags: string[];
  product:     { emoji: string; name: string; description: string; link: string };
}

// /bangs 결과지가 저장하는 판별자 붙은 엔트리 — 얼굴형/bangStyle 진단 전용 스키마.
interface BangsDiaryEntry {
  id:                 string;
  kind:               "bangs";
  savedAt:            number;
  resultId:           string;
  finalFaceShape:     string;
  faceMatchStatus:    "matched" | "partial" | "adjusted";
  primaryBangLabel:   string;
  secondaryBangLabel: string;
  concernTags:        string[];
  hairTextureTag:     string;
  diagnosisSummary:   string;
  resultImages?:      { label: string; url: string }[]; // 사진첩용 — 파일 없으면 카드가 폴백 처리
}

type AnyEntry = DiaryEntry | DamageDiaryEntry | BangsDiaryEntry;

function isDamageEntry(entry: AnyEntry): entry is DamageDiaryEntry {
  return (entry as DamageDiaryEntry).kind === "damage";
}

function isBangsEntry(entry: AnyEntry): entry is BangsDiaryEntry {
  return (entry as BangsDiaryEntry).kind === "bangs";
}

// ─── 이미지 모달 ─────────────────────────────────────────────────────────────

function ImageModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="relative max-h-[85dvh] max-w-sm overflow-hidden rounded-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="AI 변신 스타일" className="h-full w-full object-contain" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── 다이어리 카드 ────────────────────────────────────────────────────────────

async function downloadImage(url: string, styleName: string) {
  try {
    const res       = await fetch(url);
    const blob      = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a         = document.createElement("a");
    a.href          = objectUrl;
    a.download      = `abeauty-${styleName}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    alert("다운로드에 실패했어요. 이미지를 길게 눌러 저장해 주세요.");
  }
}

function DiaryCard({ entry, index, onOpenModal }: { entry: DiaryEntry; index: number; onOpenModal: (url: string) => void; }) {
  const [expanded,     setExpanded]     = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const product = getProduct(entry.answers);
  const date    = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* 골드 라인 */}
      <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(200,168,107,0.35), transparent)" }} />

      <div style={{ background: "rgba(255,255,255,0.02)" }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(200,168,107,0.55)" }}>
              Style {index + 1}
            </p>
            <p className="mt-0.5 font-serif text-base font-bold" style={{ color: "#FDFBFA" }}>
              {entry.styleName}
            </p>
          </div>
          <p className="text-xs" style={{ color: "rgba(253,251,250,0.35)" }}>{date}</p>
        </div>

        {/* After 이미지 썸네일 */}
        {entry.generatedImageUrl && (
          <>
            <button
              onClick={() => onOpenModal(entry.generatedImageUrl!)}
              className="mx-4 mb-2 block w-[calc(100%-2rem)] overflow-hidden rounded-xl active:scale-[0.98] transition-transform"
              style={{ border: "1px solid rgba(200,168,107,0.2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.generatedImageUrl} alt="AI 변신 결과"
                className="h-48 w-full object-cover" />
              <div className="px-3 py-1.5 text-center" style={{ background: "rgba(200,168,107,0.06)" }}>
                <p className="text-[10px]" style={{ color: "rgba(200,168,107,0.7)" }}>탭하면 크게 볼 수 있어요</p>
              </div>
            </button>
            <button
              onClick={async () => {
                setDownloading(true);
                await downloadImage(entry.generatedImageUrl!, entry.styleName);
                setDownloading(false);
              }}
              disabled={downloading}
              className="mx-4 mb-3 flex h-10 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)", color: "#0C0B0A" }}
            >
              {downloading ? "저장 중..." : "📥 사진 갤러리에 저장하기"}
            </button>
          </>
        )}

        {/* 접기/펼치기 */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between px-4 pb-3 text-xs transition-colors"
          style={{ color: "rgba(253,251,250,0.4)" }}
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
                <div key={qId} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[9px]" style={{ color: "rgba(253,251,250,0.35)" }}>{Q_LABELS[qId]}</p>
                  <p className="text-xs font-semibold" style={{ color: "rgba(253,251,250,0.75)" }}>
                    {A_LABELS[qId]?.[val] ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 추천 제품 카드 */}
        <div className="mx-4 mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="text-2xl">{product.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(200,168,107,0.6)" }}>
                {product.category}
              </p>
              <p className="truncate text-xs font-semibold" style={{ color: "rgba(253,251,250,0.8)" }}>
                {product.name}
              </p>
            </div>
          </div>
          <a href={product.url} target="_blank" rel="noopener noreferrer sponsored"
            className="flex h-9 w-full items-center justify-center text-xs font-bold transition-all"
            style={{ background: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)", color: "#0C0B0A" }}>
            재구매하러 가기 →
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 손상도 진단 다이어리 카드 ────────────────────────────────────────────────

function DamageDiaryCard({ entry, index }: { entry: DamageDiaryEntry; index: number }) {
  const date = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(200,168,107,0.35), transparent)" }} />
      <div style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(200,168,107,0.55)" }}>
              손상도 진단 · {entry.resultCode}
            </p>
            <p className="mt-0.5 font-serif text-base font-bold" style={{ color: "#FDFBFA" }}>
              {entry.levelLabel} · {entry.typeLabel}
            </p>
          </div>
          <p className="text-xs" style={{ color: "rgba(253,251,250,0.35)" }}>{date}</p>
        </div>

        <p className="px-4 pb-3 text-xs leading-relaxed" style={{ color: "rgba(253,251,250,0.6)" }}>
          {entry.headline}
        </p>

        {entry.concernTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {entry.concernTags.map((tag) => (
              <span key={tag} className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ background: "rgba(200,168,107,0.1)", color: "rgba(200,168,107,0.85)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mx-4 mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="text-2xl">{entry.product.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold" style={{ color: "rgba(253,251,250,0.8)" }}>
                {entry.product.name}
              </p>
              <p className="truncate text-[10px]" style={{ color: "rgba(253,251,250,0.4)" }}>
                {entry.product.description}
              </p>
            </div>
          </div>
          <a href={entry.product.link} target="_blank" rel="noopener noreferrer sponsored"
            className="flex h-9 w-full items-center justify-center text-xs font-bold transition-all"
            style={{ background: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)", color: "#0C0B0A" }}>
            제품 보러가기 →
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 인생앞머리 진단 다이어리 카드 ────────────────────────────────────────────

// 사진첩 썸네일 — 파일이 없을 수 있으므로 로드 실패 시 깨진 이미지 대신 이모지로 폴백
function DiaryImageThumb({ label, url }: { label: string; url: string }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="relative aspect-[3/4] flex-1 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(200,168,107,0.15)" }}>
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" onError={() => setImgOk(false)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1" style={{ background: "rgba(200,168,107,0.05)" }}>
          <span className="text-xl">💇</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-1.5 py-1" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
        <p className="truncate text-[9px] font-semibold text-white/90">{label}</p>
      </div>
    </div>
  );
}

function BangsDiaryCard({ entry, index }: { entry: BangsDiaryEntry; index: number }) {
  const date = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  const matchLabel = { matched: "얼굴형 신호 일치", partial: "얼굴형 신호 일부 반영", adjusted: "얼굴형 보정 적용" }[entry.faceMatchStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(200,168,107,0.35), transparent)" }} />
      <div style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(200,168,107,0.55)" }}>
              인생앞머리 · {matchLabel}
            </p>
            <p className="mt-0.5 font-serif text-base font-bold" style={{ color: "#FDFBFA" }}>
              {entry.primaryBangLabel}
            </p>
          </div>
          <p className="text-xs" style={{ color: "rgba(253,251,250,0.35)" }}>{date}</p>
        </div>

        <p className="px-4 pb-2 text-xs leading-relaxed" style={{ color: "rgba(253,251,250,0.6)" }}>
          {entry.diagnosisSummary}
        </p>
        <p className="px-4 pb-3 text-[11px]" style={{ color: "rgba(253,251,250,0.4)" }}>
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
              <span key={tag} className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ background: "rgba(200,168,107,0.1)", color: "rgba(200,168,107,0.85)" }}>
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
  const [entries,    setEntries]    = useState<AnyEntry[]>([]);
  const [ready,      setReady]      = useState(false);
  const [modalUrl,   setModalUrl]   = useState<string | null>(null);

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

  if (!ready) return <main className="min-h-screen bg-[#0C0B0A]" />;

  return (
    <main className="min-h-screen bg-[#0C0B0A]" style={{ color: "#FDFBFA" }}>

      {/* 이미지 확대 모달 */}
      {modalUrl && <ImageModal url={modalUrl} onClose={() => setModalUrl(null)} />}

      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0C0B0A]/90 px-5 py-4 backdrop-blur-md">
        <Link href="/" className="text-sm font-medium transition-colors" style={{ color: "rgba(253,251,250,0.4)" }}>
          ← 홈
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "#C8A86B" }}>
          내 다이어리
        </span>
        <Link href="/style/survey" className="text-xs font-medium transition-colors" style={{ color: "rgba(200,168,107,0.55)" }}>
          새 진단
        </Link>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-20 pt-6">

        {entries.length === 0 ? (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ border: "1px solid rgba(200,168,107,0.2)", background: "rgba(200,168,107,0.05)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="rgba(200,168,107,0.5)" strokeWidth={1.2}>
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mb-6 text-sm" style={{ color: "rgba(253,251,250,0.4)" }}>
              저장된 진단 결과가 없어요.
            </p>
            <Link
              href="/style"
              className="inline-flex h-14 items-center justify-center rounded-2xl px-8 text-base font-bold"
              style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)", color: "#0C0B0A" }}
            >
              AI 헤어 분석 시작하기 →
            </Link>
          </div>
        ) : (
          <>
            {/* 진단 이력 헤더 */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "rgba(200,168,107,0.55)" }}>
                  A-Beauty Hair Diary
                </p>
                <p className="mt-0.5 text-sm" style={{ color: "rgba(253,251,250,0.5)" }}>
                  진단 이력 {entries.length}건
                </p>
              </div>
            </div>

            {/* 진단 카드 리스트 */}
            <div className="space-y-4">
              {entries.map((entry, i) =>
                isDamageEntry(entry) ? (
                  <DamageDiaryCard key={entry.id} entry={entry} index={i} />
                ) : isBangsEntry(entry) ? (
                  <BangsDiaryCard key={entry.id} entry={entry} index={i} />
                ) : (
                  <DiaryCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onOpenModal={setModalUrl}
                  />
                ),
              )}
            </div>

            <p className="mt-6 text-center text-[10px]" style={{ color: "rgba(253,251,250,0.2)" }}>
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
