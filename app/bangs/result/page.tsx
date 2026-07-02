"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { BANGS_PHOTO_KEY, BANGS_FACESHAPE_KEY, BANGS_SURVEY_KEY, BANGS_LANDMARKS_KEY, BANGS_DEBUG_RATIOS_KEY } from "../constants";
import {
  FACE_SHAPE_INFO,
  recommendBang,
  getProductRecommendation,
  type FaceShapeKey,
  type FaceShapeInfo,
  type BangType,
} from "../bangRecommend";
import type { BangsSurveyAnswers } from "../surveyData";
import type { FaceLandmarkData, FaceRatios } from "../../../lib/faceAnalysis";

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

// ─── 앞머리 화보 이미지 경로 매핑 ───────────────────────────────────────────────
// /public/images/bangs/[type].jpg 에 화보 이미지 준비 필요

const BANG_IMAGE_PATH: Record<BangType, string> = {
  see_through: "/images/bangs/see_through.jpg",
  curtain:     "/images/bangs/curtain.jpg",
  side_swept:  "/images/bangs/side_swept.jpg",
  long_side:   "/images/bangs/long_side.jpg",
  wisp:        "/images/bangs/wisp.jpg",
  soft_full:   "/images/bangs/soft_full.jpg",
  inner:       "/images/bangs/inner.jpg",
  hippy:       "/images/bangs/hippy.jpg",
  block:       "/images/bangs/block.jpg",
};

// ─── 왼쪽 카드: AI 스캔 (사진 + 랜드마크 Canvas) ─────────────────────────────

function ScanCard({
  photo,
  landmarkData,
  faceInfo,
  onExpand,
}: {
  photo:        string;
  landmarkData: FaceLandmarkData | null;
  faceInfo:     FaceShapeInfo;
  onExpand:     () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded || !canvasRef.current || !imgRef.current || !landmarkData) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const { oval, shape } = landmarkData;

    // 윤곽 연결선 — 청록
    if (oval.length > 1) {
      ctx.beginPath();
      ctx.moveTo(oval[0].x * W, oval[0].y * H);
      for (let i = 1; i < oval.length; i++) ctx.lineTo(oval[i].x * W, oval[i].y * H);
      ctx.closePath();
      ctx.strokeStyle = "rgba(0, 220, 180, 0.75)";
      ctx.lineWidth   = Math.max(1, W * 0.002);
      ctx.shadowColor = "rgba(0, 220, 180, 0.4)";
      ctx.shadowBlur  = 6;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }
    // 윤곽 점 36개 — 소형 청록
    const Ro = Math.max(1.5, W * 0.0033);
    oval.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, Ro, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 220, 180, 0.80)";
      ctx.fill();
    });
    // 핵심 랜드마크 8개 — 골드 글로우
    const Rk = Math.max(2.5, W * 0.006);
    [shape.top, shape.chin, shape.leftCheek, shape.rightCheek,
     shape.leftJaw, shape.rightJaw, shape.leftTemple, shape.rightTemple].forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, Rk, 0, Math.PI * 2);
      ctx.fillStyle   = "rgba(200, 168, 107, 0.95)";
      ctx.shadowColor = "rgba(200, 168, 107, 0.5)";
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });
  }, [loaded, landmarkData]);

  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-2xl border border-teal-400/20 active:scale-[0.97]"
      style={{ aspectRatio: "3/4" }}
      onClick={onExpand}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={photo}
        alt="AI 스캔"
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{ objectPosition: "50% 20%", pointerEvents: "none" }}
        onLoad={() => setLoaded(true)}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />

      {/* AI SCAN 뱃지 */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full border border-teal-400/50 bg-black/65 px-2 py-1 backdrop-blur-sm">
        <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          className="h-1 w-1 rounded-full bg-teal-400" />
        <span className="text-[8px] font-bold uppercase tracking-wider text-teal-300">AI SCAN</span>
      </div>

      {/* 탭 힌트 */}
      <div className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 backdrop-blur-sm">
        <svg className="h-3 w-3 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </div>

      {/* 하단 라벨 */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-8"
        style={{ background: "linear-gradient(to top, rgba(28,26,24,0.90) 0%, transparent 100%)" }}
      >
        <p className="text-[8px] font-bold uppercase tracking-wider text-gold/55">Face Shape</p>
        <p className="mt-0.5 font-serif text-[11px] font-bold leading-tight text-gold-light">{faceInfo.title}</p>
      </div>
    </div>
  );
}

// ─── 오른쪽 카드: 앞머리 솔루션 화보 ─────────────────────────────────────────

function BangReferenceCard({
  bangType,
  bangLabel,
}: {
  bangType:  BangType;
  bangLabel: string;
}) {
  const src = BANG_IMAGE_PATH[bangType];
  const [imgOk, setImgOk] = useState(true);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gold/20"
      style={{ aspectRatio: "3/4" }}
    >
      {/* 화보 이미지 */}
      {imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={bangLabel}
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 20%" }}
          onError={() => setImgOk(false)}
        />
      )}

      {/* 이미지 없을 때 플레이스홀더 */}
      {!imgOk && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gold/[0.08] to-transparent">
          <span className="text-2xl">💇</span>
          <p className="px-2 text-center text-[10px] font-bold text-gold-light">{bangLabel}</p>
        </div>
      )}

      {/* 처방 뱃지 */}
      <div className="absolute left-2 top-2 z-10 rounded-full border border-gold/50 bg-black/65 px-2 py-1 backdrop-blur-sm">
        <span className="text-[8px] font-bold uppercase tracking-wider text-gold">처방</span>
      </div>

      {/* 하단 라벨 */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-8"
        style={{ background: "linear-gradient(to top, rgba(28,26,24,0.90) 0%, transparent 100%)" }}
      >
        <p className="text-[8px] font-bold uppercase tracking-wider text-gold/55">인생 앞머리</p>
        <p className="mt-0.5 font-serif text-[11px] font-bold leading-tight text-gold-light">{bangLabel}</p>
      </div>
    </div>
  );
}

// ─── AI 스캔 모달 ─────────────────────────────────────────────────────────────

function ScanModal({
  photo,
  faceInfo,
  landmarkData,
  onClose,
}: {
  photo:        string;
  faceInfo:     FaceShapeInfo;
  landmarkData: FaceLandmarkData | null;
  onClose:      () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // 모달 열리는 동안 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // 랜드마크 Canvas 정적 렌더링 (애니메이션 없음 — 선명하고 전문적)
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current || !landmarkData) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const { oval, shape } = landmarkData;

    // 1. 윤곽 연결선 — 청록, 가느다랗게
    if (oval.length > 1) {
      ctx.beginPath();
      ctx.moveTo(oval[0].x * W, oval[0].y * H);
      for (let i = 1; i < oval.length; i++) ctx.lineTo(oval[i].x * W, oval[i].y * H);
      ctx.closePath();
      ctx.strokeStyle = "rgba(0, 220, 180, 0.70)";
      ctx.lineWidth   = Math.max(1.2, W * 0.002);
      ctx.shadowColor = "rgba(0, 220, 180, 0.45)";
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    // 2. 윤곽 점 36개 — 소형 청록
    const R_OVAL = Math.max(2, W * 0.0035);
    oval.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, R_OVAL, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 220, 180, 0.80)";
      ctx.fill();
    });

    // 3. 핵심 랜드마크 8개 — 대형 골드 글로우
    const R_KEY = Math.max(3.5, W * 0.006);
    const keyPts = [
      shape.top,        shape.chin,
      shape.leftCheek,  shape.rightCheek,
      shape.leftJaw,    shape.rightJaw,
      shape.leftTemple, shape.rightTemple,
    ];
    keyPts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, R_KEY, 0, Math.PI * 2);
      ctx.fillStyle   = "rgba(200, 168, 107, 0.95)";
      ctx.shadowColor = "rgba(200, 168, 107, 0.55)";
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });
  }, [imgLoaded, landmarkData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/92 px-4 backdrop-blur-sm"
    >
      {/* 배경 탭으로 닫기 */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-xs flex-col">
        {/* 모달 헤더 */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="h-2 w-2 rounded-full bg-teal-400"
            />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
              AI Face Scan
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-sm text-cream/70 transition-colors hover:bg-white/15"
          >
            ✕
          </button>
        </div>

        {/* 사진 + Canvas 오버레이 */}
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-teal-400/20"
          style={{ aspectRatio: "3/4", maxHeight: "72vh" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={photo}
            alt="AI 스캔 사진"
            draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ objectPosition: "50% 20%", pointerEvents: "none" }}
            onLoad={() => setImgLoaded(true)}
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ mixBlendMode: "screen" }}
          />

          {/* 수평 스캔 라인 애니메이션 */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/55 to-transparent"
            animate={{ top: ["8%", "92%", "8%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* 분석 결과 요약 */}
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-teal-400/70">
            분석 완료 · Face Shape
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-gold-light">{faceInfo.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-cream/45">{faceInfo.summary}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── BoldText 렌더러 ──────────────────────────────────────────────────────────

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


// ─── 애니메이션 상수 ──────────────────────────────────────────────────────────

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const FADE_UP = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// ─── 메인 결과 페이지 ─────────────────────────────────────────────────────────

export default function BangsResultPage() {
  const [photo,        setPhoto]        = useState<string | null>(null);
  const [survey,       setSurvey]       = useState<BangsSurveyAnswers | null>(null);
  const [faceKey,      setFaceKey]      = useState<FaceShapeKey>("round");
  const [landmarkData, setLandmarkData] = useState<FaceLandmarkData | null>(null);
  const [ratios,       setRatios]       = useState<FaceRatios | null>(null); // 임시 디버그용 — 판정 정확도 튜닝 후 제거
  const router = useRouter();
  const [copied,        setCopied]        = useState(false);
  const [kakaoSent,     setKakaoSent]     = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);

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
      const r = sessionStorage.getItem(BANGS_DEBUG_RATIOS_KEY);
      if (r) setRatios(JSON.parse(r) as FaceRatios);
    } catch { /**/ }
  }, []);

  const faceInfo    = FACE_SHAPE_INFO[faceKey];
  const safeAnswers = survey ?? { q1: "", q2: "", q3: "", q4: "", q5: "" } as BangsSurveyAnswers;
  const bangRec     = recommendBang(faceKey, safeAnswers);
  const product     = getProductRecommendation(safeAnswers.q5);

  async function handleKakaoShare() {
    const shareUrl = `${SITE_URL}/bangs?utm_source=kakao_share`;
    try {
      await loadKakaoSDK();
      const K = window.Kakao;
      if (K) {
        if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
        if (K.isInitialized()) {
          K.Share.sendDefault({
            objectType: "feed",
            content: {
              title: "어뷰티 | 내 인생 앞머리 진단 결과",
              description: `AI가 처방한 나의 인생 앞머리는 [${bangRec.primaryLabel}] 입니다.`,
              imageUrl: `${SITE_URL}/images/bangs-og.png`,
              link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
            },
            buttons: [{ title: "나도 인생 앞머리 찾기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
          });
          setKakaoSent(true);
          setTimeout(() => setKakaoSent(false), 2500);
          return;
        }
      }
    } catch { /**/ }
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "어뷰티 | 내 인생 앞머리 찾기", text: `나는 ${faceInfo.title}! 인생 앞머리는 ${bangRec.primaryLabel}이에요`, url: shareUrl }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      alert("링크가 복사되었습니다! 카톡 채팅방에 붙여넣기 해주세요");
    });
  }

  function handleCopyLink() {
    const url = `${SITE_URL}/bangs?utm_source=copy_share`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-charcoal pb-40 text-cream">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-charcoal/92 px-5 py-3.5 backdrop-blur-md">
        <Link href="/bangs/upload" className="text-sm font-medium text-cream/35 hover:text-cream/70 transition-colors">
          ← 다시 찍기
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">진단 결과지</span>
        <button onClick={handleKakaoShare} className="text-sm font-medium text-cream/35 hover:text-cream/70 transition-colors">
          {kakaoSent ? "전송됨 ✓" : "공유"}
        </button>
      </header>

      {/* ── 두 축 대시보드: AI 스캔 + 앞머리 솔루션 화보 ── */}
      {photo ? (
        <div className="mx-auto max-w-lg px-4 pt-6">
          <div className="grid grid-cols-2 gap-3">
            {/* 왼쪽: AI 스캔 카드 (랜드마크 Canvas) */}
            <ScanCard
              photo={photo}
              landmarkData={landmarkData}
              faceInfo={faceInfo}
              onExpand={() => setScanModalOpen(true)}
            />
            {/* 오른쪽: 앞머리 솔루션 화보 */}
            <BangReferenceCard
              bangType={bangRec.primary}
              bangLabel={bangRec.primaryLabel}
            />
          </div>
          <p className="mt-1.5 text-center text-[9px] text-cream/25">
            왼쪽 카드를 탭하면 정밀 스캔 보기 · 확대 가능
          </p>
          {/* 임시 디버그 — MediaPipe 판정 정확도 튜닝용, 캡처해서 공유해주세요 */}
          {ratios && (
            <p className="mt-1 text-center text-[9px] text-teal-300/70">
              [디버그] jaw {ratios.jawRatio.toFixed(3)} · forehead {ratios.foreheadRatio.toFixed(3)} · length {ratios.lengthRatio.toFixed(3)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-14">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">AI DIAGNOSIS</p>
            <p className="mt-1 font-serif text-2xl font-bold text-gold-light">{faceInfo.title}</p>
          </div>
        </div>
      )}

      {/* ── AI 스캔 모달 ── */}
      <AnimatePresence>
        {scanModalOpen && photo && (
          <ScanModal
            photo={photo}
            faceInfo={faceInfo}
            landmarkData={landmarkData}
            onClose={() => setScanModalOpen(false)}
          />
        )}
      </AnimatePresence>


      {/* ── 콘텐츠 블록 ── */}
      <div className="mx-auto w-full max-w-lg px-5">
        <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-4">


          {/* BLOCK B: AI 인생 앞머리 처방 — 단일 결론 */}
          <motion.div variants={FADE_UP}
            className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">✦ 고객님의 인생 앞머리</p>
              <div className="mt-4 flex justify-center">
                <span className="rounded-xl bg-gold px-8 py-2.5 font-serif text-2xl font-black text-charcoal shadow-gold">
                  {bangRec.primaryLabel}
                </span>
              </div>
              <p className="mt-4 text-base leading-[1.85] text-cream/75">
                <BoldText text={bangRec.reasonText} />
              </p>
              <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3">
                <p className="text-sm font-medium text-red-300/80">
                  ❌ 피해주세요 — {bangRec.ngStyle}
                </p>
              </div>
            </div>
          </motion.div>


          {/* BLOCK E: 맞춤 제품 */}
          <motion.div variants={FADE_UP}>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">전문가 처방 · 제품</p>
            <a
              href={product.link} target="_blank" rel="noopener noreferrer sponsored"
              className="group flex w-full items-start justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 text-left font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #FF7C98, #C084FC)" }}
            >
              <div className="flex-1 leading-snug">
                <span className="mb-1 block text-2xl">{product.emoji}</span>
                <span className="block text-xs font-semibold uppercase tracking-wider opacity-80">{product.headline}</span>
                <span className="mt-1 block text-lg font-black">어뷰티 {product.productName}</span>
                <span className="mt-1 block text-sm font-normal opacity-75">{product.description}</span>
              </div>
              <span className="flex-none pt-1 text-xl opacity-70">→</span>
            </a>
            <p className="mt-2 text-center text-[10px] text-cream/18">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </motion.div>

          {/* BLOCK F: 공유 */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-5">
            <p className="text-center text-base font-semibold text-cream/80">친구도 인생 앞머리 찾아줄까요?</p>
            <p className="mt-1 text-center text-sm text-cream/35">결과를 공유하고 서로 비교해 보세요</p>
            <button
              onClick={handleKakaoShare}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3.5 text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
            >
              <span className="text-lg">💬</span>
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "카카오톡으로 공유하기"}
            </button>
            <button
              onClick={handleCopyLink}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 text-sm font-medium text-cream/50 transition-all hover:border-white/25 hover:text-cream active:scale-[0.98]"
            >
              {copied ? "✓ 복사됨" : "🔗 링크 복사"}
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-charcoal/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg space-y-2">
          <button
            onClick={() => router.push("/style")}
            className="relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <motion.span
              className="pointer-events-none absolute inset-0"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 70%)" }}
            />
            <span className="relative">✨ AI 헤어 분석으로 내 스타일 찾기!</span>
          </button>
          <Link href="/bangs"
            className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-cream/30 transition-colors hover:text-cream/60">
            ← 처음부터 다시 하기
          </Link>
        </div>
      </div>

    </main>
  );
}
