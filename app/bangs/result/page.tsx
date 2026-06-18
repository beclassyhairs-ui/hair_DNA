"use client";

// ============================================================================
// 어뷰티 인생뱅 — 레고 블록 결과지 + Canvas AI 시각화 오버레이
// Block 1: Canvas AI 분석 오버레이 (얼굴 메쉬 + 기하학 도형 드로잉 애니메이션)
// Block 2: 기본 정의  Block 3: Q1 팩트체크  Block 4: 고민 분석
// Block 5: 인생뱅 처방  Block 6: 맞춤 제품
// ============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { BANGS_PHOTO_KEY, BANGS_FACESHAPE_KEY, BANGS_SURVEY_KEY, BANGS_LANDMARKS_KEY } from "../constants";
import {
  FACE_SHAPE_INFO,
  recommendBang,
  getQ1FactBlock,
  buildConcernBlocks,
  getProductRecommendation,
  type FaceShapeKey,
} from "../bangRecommend";
import type { BangsSurveyAnswers } from "../surveyData";
import type { FaceLandmarkData, ShapeKeyPoints } from "../../../lib/faceAnalysis";

// ─── 애니메이션 상수 ──────────────────────────────────────────────────────────
const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Bold 마크다운(**text**) 렌더러 ──────────────────────────────────────────
function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="font-bold text-gold-light">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ─── 고민 분석 카드 ───────────────────────────────────────────────────────────
function ConcernCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-5 py-4">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-amber-400">◉ {label}</p>
      <p className="text-lg leading-[1.75] text-cream/80">{text}</p>
    </div>
  );
}

// ============================================================================
// Canvas AI 시각화 컴포넌트
// Phase 1 (0→65%): 골드 점선으로 얼굴 메쉬 외곽선 그리기
// Phase 2 (60→100%): 흰색 굵은 선으로 얼굴형 기하학 도형 그리기
// ============================================================================

// 랜드마크 없을 때 사용하는 근사 위치 (3:4 프레임 기준, 0-1 normalized)
const APPROX_SHAPE: ShapeKeyPoints = {
  top:          { x: 0.50, y: 0.05 },
  chin:         { x: 0.50, y: 0.90 },
  leftCheek:    { x: 0.13, y: 0.47 },
  rightCheek:   { x: 0.87, y: 0.47 },
  leftJaw:      { x: 0.24, y: 0.76 },
  rightJaw:     { x: 0.76, y: 0.76 },
  leftTemple:   { x: 0.27, y: 0.12 },
  rightTemple:  { x: 0.73, y: 0.12 },
};

function getApproxOval(): { x: number; y: number }[] {
  return Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * 2 * Math.PI - Math.PI / 2;
    return { x: 0.5 + 0.365 * Math.cos(a), y: 0.475 + 0.425 * Math.sin(a) };
  });
}

type Pt = { x: number; y: number };

function getGeometricPolygon(faceKey: FaceShapeKey, s: ShapeKeyPoints): Pt[] {
  const midTop: Pt = { x: (s.leftTemple.x + s.rightTemple.x) / 2, y: Math.min(s.top.y, s.leftTemple.y) };

  switch (faceKey) {
    case "oval":
      // 부드러운 타원 — 6각형으로 근사
      return [midTop, s.rightTemple, s.rightCheek, s.chin, s.leftCheek, s.leftTemple];

    case "round":
      // 원형에 가까운 사각형 (4점)
      return [
        { x: (s.leftTemple.x + s.rightTemple.x) / 2, y: s.top.y },
        { x: s.rightCheek.x, y: (s.top.y + s.chin.y) / 2 },
        { x: (s.leftJaw.x + s.rightJaw.x) / 2, y: s.chin.y },
        { x: s.leftCheek.x, y: (s.top.y + s.chin.y) / 2 },
      ];

    case "oblong":
      // 긴 직사각형
      return [s.leftTemple, s.rightTemple, s.rightJaw, s.chin, s.leftJaw];

    case "square":
      // 직각 사각형 (4코너 명확)
      return [
        { x: s.leftTemple.x,  y: s.top.y },
        { x: s.rightTemple.x, y: s.top.y },
        { x: s.rightJaw.x,    y: s.chin.y },
        { x: s.leftJaw.x,     y: s.chin.y },
      ];

    case "heart":
      // 역삼각형: 이마 양끝 → 턱끝
      return [s.leftTemple, s.rightTemple, s.chin];

    case "diamond":
      // 다이아몬드: 상단 중심 → 광대 양옆 → 턱끝
      return [midTop, s.rightCheek, s.chin, s.leftCheek];

    case "hexagon":
      // 육각형: 관자놀이 2 + 광대 2 + 하관 2
      return [s.leftTemple, s.rightTemple, s.rightCheek, s.rightJaw, s.leftJaw, s.leftCheek];

    case "peanut": {
      // 모래시계형: 광대 돌출 + 관자·하볼 패임 (8점)
      const inX = 0.04; // 패임 정도
      const lDipT: Pt = { x: s.leftCheek.x + inX,  y: (s.leftTemple.y + s.leftCheek.y)  / 2 };
      const rDipT: Pt = { x: s.rightCheek.x - inX, y: (s.rightTemple.y + s.rightCheek.y) / 2 };
      const lDipB: Pt = { x: s.leftCheek.x + inX,  y: (s.leftCheek.y  + s.leftJaw.y)    / 2 };
      const rDipB: Pt = { x: s.rightCheek.x - inX, y: (s.rightCheek.y + s.rightJaw.y)   / 2 };
      return [s.leftTemple, s.rightTemple, rDipT, s.rightCheek, rDipB, s.rightJaw, s.chin, s.leftJaw, lDipB, s.leftCheek, lDipT];
    }
  }
}

function drawFrame(
  ctx:       CanvasRenderingContext2D,
  W:         number,
  H:         number,
  progress:  number,
  ovalPts:   Pt[],
  geoPts:    Pt[],
) {
  ctx.clearRect(0, 0, W, H);

  // ── Phase 1: 메쉬 외곽선 (골드 점선) — 진행도 0→1 → progress 0→0.65 ──────
  const meshP = Math.min(1, progress / 0.65);
  if (meshP > 0 && ovalPts.length >= 2) {
    const count = Math.max(2, Math.floor(ovalPts.length * meshP));
    ctx.beginPath();
    ctx.moveTo(ovalPts[0].x * W, ovalPts[0].y * H);
    for (let i = 1; i < count; i++) {
      ctx.lineTo(ovalPts[i].x * W, ovalPts[i].y * H);
    }
    if (meshP >= 1) ctx.closePath();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "rgba(200,168,107,0.82)";
    ctx.lineWidth   = Math.max(1.2, W * 0.0025);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Phase 2: 기하학 도형 (흰색 굵은 선) — progress 0.55→1.0 ───────────────
  if (progress >= 0.55 && geoPts.length >= 3) {
    const geoP  = Math.min(1, (progress - 0.55) / 0.45);
    const count = Math.max(2, Math.floor(geoPts.length * geoP));
    ctx.beginPath();
    ctx.moveTo(geoPts[0].x * W, geoPts[0].y * H);
    for (let i = 1; i < count; i++) {
      ctx.lineTo(geoPts[i].x * W, geoPts[i].y * H);
    }
    if (geoP >= 1) ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth   = Math.max(2.5, W * 0.007);
    ctx.shadowColor = "rgba(255,255,255,0.55)";
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  }

  // ── 측정 기준선 (얼굴형 도형 완성 후 표시) ──────────────────────────────────
  if (progress >= 0.9) {
    const alpha = (progress - 0.9) / 0.1;
    ctx.strokeStyle = `rgba(200,168,107,${(alpha * 0.45).toFixed(2)})`;
    ctx.lineWidth   = Math.max(0.8, W * 0.0015);
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.02);
    ctx.lineTo(W * 0.5, H * 0.95);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function FaceAnalysisCanvas({
  photo,
  faceKey,
  landmarkData,
}: {
  photo:        string;
  faceKey:      FaceShapeKey;
  landmarkData: FaceLandmarkData | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const faceInfo = FACE_SHAPE_INFO[faceKey];
  const shapePoints = landmarkData?.shape ?? APPROX_SHAPE;
  const ovalPoints  = landmarkData?.oval  ?? getApproxOval();
  const geoPts      = getGeometricPolygon(faceKey, shapePoints);

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const img    = imgRef.current;

    // 캔버스를 이미지의 자연 크기로 설정 (landmark 좌표 정밀 일치)
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const W   = canvas.width;
    const H   = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = performance.now();
    const DURATION  = 1300; // ms

    let rafId: number;
    function frame(ts: number) {
      const progress = Math.min(1, (ts - startTime) / DURATION);
      drawFrame(ctx!, W, H, progress, ovalPoints, geoPts);
      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      }
    }
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded, faceKey]);

  return (
    <div ref={containerRef} className="overflow-hidden rounded-3xl">
      {/* 사진 + 캔버스 오버레이 */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={photo}
          alt="AI 분석 사진"
          className="block w-full"
          onLoad={() => setImgLoaded(true)}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ mixBlendMode: "screen" }}
        />
        {/* AI 분석 뱃지 */}
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-gold/50 bg-black/55 px-3 py-1.5 backdrop-blur-sm">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-gold"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-gold">AI SCANNING</span>
        </div>
      </div>

      {/* AI 진단 텍스트 */}
      <div
        className="px-6 py-5"
        style={{ background: "linear-gradient(to bottom, rgba(28,26,24,0.95), rgba(28,26,24,1))" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
          AI DIAGNOSIS
        </p>
        <h1 className="mt-1.5 font-serif text-2xl font-bold leading-snug text-cream">
          고객님은{" "}
          <span className="text-gold-light">{faceInfo.title}</span>
          입니다.
        </h1>
        <p className="mt-1.5 text-base text-cream/55">
          어떤 앞머리가 가장 잘 어울릴지 전문가 처방을 확인하세요!
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// 결과 페이지 메인
// ============================================================================

export default function BangsResultPage() {
  const [photo,    setPhoto]   = useState<string | null>(null);
  const [survey,   setSurvey]  = useState<BangsSurveyAnswers | null>(null);
  const [faceKey,  setFaceKey] = useState<FaceShapeKey>("round");
  const [landmarkData, setLandmarkData] = useState<FaceLandmarkData | null>(null);
  const [copied,   setCopied]  = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem(BANGS_PHOTO_KEY);
      if (p) setPhoto(p);

      const s = sessionStorage.getItem(BANGS_SURVEY_KEY);
      if (s) setSurvey(JSON.parse(s) as BangsSurveyAnswers);

      const f = sessionStorage.getItem(BANGS_FACESHAPE_KEY) as FaceShapeKey | null;
      if (f && f in FACE_SHAPE_INFO) setFaceKey(f);

      const l = sessionStorage.getItem(BANGS_LANDMARKS_KEY);
      if (l) setLandmarkData(JSON.parse(l) as FaceLandmarkData);
    } catch { /**/ }
  }, []);

  const faceInfo    = FACE_SHAPE_INFO[faceKey];
  const safeAnswers: BangsSurveyAnswers = survey ?? { q1: "", q2: "", q3: "", q4: "", q5: "" };

  const q1Block       = getQ1FactBlock(safeAnswers.q1, faceKey);
  const concernBlocks = buildConcernBlocks(safeAnswers.q2, safeAnswers.q3, safeAnswers.q4);
  const bangRec       = recommendBang(faceKey, safeAnswers);
  const product       = getProductRecommendation(safeAnswers.q5);

  function handleShare() {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/bangs?utm_source=result_share`
      : "/bangs";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "내 인생 앞머리 찾기",
        text: `나는 ${faceInfo.title}! 인생 앞머리는 ${bangRec.primaryLabel}이에요 💇`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert("링크가 복사되었습니다! 카톡 채팅방에 붙여넣기 해주세요 🚀");
      });
    }
  }

  return (
    <main className="min-h-screen bg-charcoal pb-40 text-cream">

      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-charcoal/90 px-5 py-4 backdrop-blur-md">
        <Link href="/bangs/upload" className="text-base font-medium text-cream/40 hover:text-cream">
          ← 다시 찍기
        </Link>
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">인생뱅 결과지</span>
        <button onClick={handleShare} className="text-base font-medium text-cream/40 hover:text-cream">
          {copied ? "복사됨 ✓" : "공유"}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg px-5">
        <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-5 pt-6">

          {/* ══ BLOCK 1: AI 얼굴형 Canvas 시각화 ══ */}
          <motion.div variants={FADE_UP}>
            {photo ? (
              <FaceAnalysisCanvas
                photo={photo}
                faceKey={faceKey}
                landmarkData={landmarkData}
              />
            ) : (
              /* 사진 없을 때 간략 카드 */
              <div className="flex flex-col items-center justify-center rounded-3xl border border-gold/25 bg-white/[0.04] py-12">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 text-4xl">✦</div>
                <p className="text-sm font-bold uppercase tracking-widest text-gold">AI 분석 결과</p>
                <p className="mt-2 font-serif text-2xl font-bold text-gold-light">{faceInfo.title}</p>
              </div>
            )}
          </motion.div>

          {/* ══ BLOCK 2: 기본 정의 카드 ══ */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">얼굴형 정의</p>
            <p className="text-xl leading-[1.8] text-cream/85">{faceInfo.summary}</p>
          </motion.div>

          {/* ══ BLOCK 3: Q1 팩트체크 ══ */}
          {safeAnswers.q1 && (
            <motion.div variants={FADE_UP}
              className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
                현재 스타일 팩트체크 · {q1Block.label}
              </p>
              <p className="text-xl leading-[1.8] text-cream/85">{q1Block.text}</p>
            </motion.div>
          )}

          {/* ══ BLOCK 4: 고민 정밀 분석 (Q2+Q3+Q4 Additive) ══ */}
          {concernBlocks.length > 0 && (
            <motion.div variants={FADE_UP}
              className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                콤플렉스 정밀 분석 ({concernBlocks.length}개 고민 감지)
              </p>
              <div className="space-y-3">
                {concernBlocks.map((b) => (
                  <ConcernCard key={b.key} label={b.label} text={b.text} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ══ BLOCK 5: ✨ AI 추천 인생뱅 처방 (강조) ══ */}
          <motion.div variants={FADE_UP} className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/12 to-transparent">
            <div className="h-1 w-full bg-gradient-to-r from-gold-light via-gold to-gold-dark" />
            <div className="p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold">✨ AI 추천 인생 앞머리</p>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-gold-dark px-6 py-2.5 font-serif text-2xl font-black text-charcoal">
                  {bangRec.primaryLabel}
                </span>
                <span className="text-cream/40">+</span>
                <span className="rounded-xl border border-gold/45 px-5 py-2 font-serif text-xl font-bold text-gold-light">
                  {bangRec.secondaryLabel}
                </span>
              </div>
              <p className="text-xl leading-[1.8] text-cream/85">
                <BoldText text={bangRec.reasonText} />
              </p>
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-5 py-3.5">
                <p className="text-base font-semibold text-red-300/85">
                  ❌ 주의: 무거운 일자 앞머리·강한 볼드 뱅은 피해주세요.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ══ BLOCK 6: 맞춤 제품 추천 (Q5 커머스) ══ */}
          <motion.div variants={FADE_UP}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">전문가 맞춤 처방 · 제품</p>
            <a href={product.link} target="_blank" rel="noopener noreferrer sponsored"
              className="group flex w-full items-start justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 text-left font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #FF7C98, #C084FC)" }}>
              <div className="flex-1 leading-snug">
                <span className="mb-1 block text-3xl">{product.emoji}</span>
                <span className="block text-base font-semibold uppercase tracking-wider opacity-85">{product.headline}</span>
                <span className="mt-1 block text-xl font-black">어뷰티 {product.productName}</span>
                <span className="mt-1.5 block text-base font-normal opacity-80">{product.description}</span>
              </div>
              <span className="flex-none pt-1 text-2xl opacity-80">→</span>
            </a>
            <p className="mt-2 text-center text-xs text-cream/20">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </motion.div>

          {/* 공유 */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-5 text-center">
            <p className="text-lg font-semibold text-cream/85">친구도 인생 앞머리 찾아줄까요? 🤔</p>
            <p className="mt-1 text-base text-cream/40">공유하고 서로 결과를 비교해 보세요</p>
            <button onClick={handleShare}
              className="mt-4 w-full rounded-xl border border-white/15 py-4 text-lg font-semibold text-cream/70 transition-all hover:border-white/30 hover:text-cream active:scale-[0.98]">
              🔗 결과 링크 공유하기
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          <Link href="/bangs"
            className="flex h-16 flex-none items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-6 text-base font-medium text-cream/60 transition-colors hover:text-cream">
            처음부터
          </Link>
          <a href={product.link} target="_blank" rel="noopener noreferrer sponsored"
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-lg font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98]">
            🎁 맞춤 제품 확인하기
          </a>
        </div>
      </div>
    </main>
  );
}
