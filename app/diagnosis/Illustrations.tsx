// ============================================================================
// 문진 일러스트 — 인라인 SVG 라인아트 (파일 의존 없음)
// ============================================================================

import type { IllustrationKey } from "./surveyData";

// 각 키에 대응하는 SVG path 데이터
const ICONS: Record<IllustrationKey, JSX.Element> = {
  // ── 헤어 디자인 (Q13) ──────────────────────────────────────────────────
  "design-straight": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      {/* 얼굴 */}
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 생머리 — 일직선으로 떨어지는 선 */}
      <path d="M26 22 Q22 50 24 68" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 22 Q58 50 56 68" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 11 Q32 68 30 72" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M48 11 Q48 68 50 72" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      {/* 어깨 */}
      <path d="M18 72 Q26 60 40 58 Q54 60 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "design-curl": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* C컬 — 끝이 안으로 말리는 곡선 */}
      <path d="M26 22 Q20 46 22 60 Q23 68 30 68" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 22 Q60 46 58 60 Q57 68 50 68" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M32 11 Q30 40 28 56 Q27 64 34 66" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M48 11 Q50 40 52 56 Q53 64 46 66" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M18 72 Q26 62 40 60 Q54 62 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "design-wave": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 웨이브 — S자 물결 */}
      <path d="M26 24 Q20 34 26 44 Q32 54 26 64 Q23 68 22 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 24 Q60 34 54 44 Q48 54 54 64 Q57 68 58 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M33 12 Q27 22 33 32 Q39 42 33 52 Q29 60 30 68" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M47 12 Q53 22 47 32 Q41 42 47 52 Q51 60 50 68" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M18 74 Q26 64 40 62 Q54 64 62 74" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  // ── 레이어 (Q14) ────────────────────────────────────────────────────────
  "layer-none": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 층 없음 — 수평 단면 라인 없이 두꺼운 블런트 */}
      <path d="M26 24 L24 66" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M54 24 L56 66" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* 블런트 끝단 */}
      <path d="M24 66 Q40 70 56 66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 72 Q26 64 40 62 Q54 64 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "layer-soft": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      <path d="M26 24 Q22 46 24 66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 24 Q58 46 56 66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 부드러운 층 — 약한 각도 */}
      <path d="M26 44 Q33 48 40 46 Q47 44 54 46" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 3" />
      <path d="M18 72 Q26 62 40 60 Q54 62 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "layer-rich": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      <path d="M26 24 Q18 42 20 68" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 24 Q62 42 60 68" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 풍성한 층 — 여러 단계 */}
      <path d="M24 38 Q32 34 40 36 Q48 38 56 34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M22 50 Q31 46 40 48 Q49 50 58 46" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M20 62 Q30 58 40 60 Q50 62 60 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M16 74 Q26 66 40 64 Q54 66 64 74" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "layer-face": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 얼굴 프레이밍 — 앞쪽만 층이 깊음 */}
      <path d="M26 24 Q20 36 24 46 Q28 54 26 66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 24 Q60 36 56 46 Q52 54 54 66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* 얼굴 쪽 층 강조 */}
      <path d="M26 36 Q33 30 40 32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M54 36 Q47 30 40 32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 72 Q26 62 40 60 Q54 62 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  // ── 볼륨 위치 (Q15) ─────────────────────────────────────────────────────
  "volume-top": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 정수리 볼륨 강조 — 위쪽이 볼록 */}
      <path d="M26 20 Q26 4 40 4 Q54 4 54 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* 볼륨 표시 점 */}
      <circle cx="40" cy="8" r="2.5" fill="currentColor" />
      <path d="M26 24 Q22 46 24 66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M54 24 Q58 46 56 66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 72 Q26 62 40 60 Q54 62 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "volume-all": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 전체 볼륨 — 사방으로 부풀어 있는 실루엣 */}
      <path d="M26 22 Q14 28 14 40 Q14 52 20 64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 22 Q66 28 66 40 Q66 52 60 64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 14 Q28 4 40 4 Q52 4 54 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 72 Q26 62 40 60 Q54 62 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "volume-front": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 앞머리 볼륨 — 이마 쪽 부풀음 */}
      <path d="M28 14 Q28 4 40 5 Q52 6 52 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 10 Q36 6 40 6 Q44 6 48 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M26 24 Q22 46 24 66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M54 24 Q58 46 56 66" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 72 Q26 62 40 60 Q54 62 62 72" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "volume-back": (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <ellipse cx="40" cy="28" rx="14" ry="17" stroke="currentColor" strokeWidth="1.8" />
      {/* 뒤통수 볼륨 — 뒤쪽 실루엣이 더 도드라짐 */}
      <path d="M26 22 Q20 36 20 50 Q20 62 26 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 22 Q62 34 62 50 Q62 62 54 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* 뒤 볼륨 표시 */}
      <path d="M38 56 Q40 62 42 56" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="40" cy="60" r="2" fill="currentColor" />
      <path d="M18 74 Q26 64 40 62 Q54 64 62 74" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function Illustration({
  name,
  className,
}: {
  name: IllustrationKey;
  className?: string;
}) {
  const icon = ICONS[name];
  if (!icon) return null;

  return (
    <span className={`block h-full w-full ${className ?? ""}`}>
      {icon}
    </span>
  );
}
