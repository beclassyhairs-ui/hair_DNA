"use client";

// ============================================================================
// 어뷰티 스타일 — 사진 업로드 (카메라 미러뷰 + 드래그/휠 줌 크롭 + 10초 로딩)
// 기존 /app/upload/page.tsx의 카메라·크롭 UI를 그대로 상속
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import guideImg from "@/public/images/guide/guide-full.png";
import { STYLE_ANSWERS_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";

const FRAME_RATIO  = 3 / 4;
const OUTPUT_MAX   = 512;
const JPEG_QUALITY = 0.9;
const MIN_SCALE    = 1;
const MAX_SCALE    = 4;
const LOADING_MS   = 10_000;

type Transform = { scale: number; x: number; y: number };

// ─── Fake 로딩 오버레이 ───────────────────────────────────────────────────────

const LOADING_STEPS = [
  "AI 뷰티 디렉터가 고객님의 모질 텍스처와 모량을 분석 중입니다...",
  "두상 구조와 희망 스타일 데이터를 정밀 매칭하고 있습니다...",
  "전문가 데이터베이스에서 최적 헤어를 도출하고 있습니다...",
  "케어 처방전 및 맞춤 스타일을 생성하고 있습니다...",
  "마지막 세부 조정 중입니다. 잠시만 기다려주세요...",
];

function FakeLoadingOverlay({ onDone }: { onDone: () => void }) {
  const [stepIdx, setStepIdx]   = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 120;
      const p = Math.min(100, Math.round((elapsed / LOADING_MS) * 100));
      setProgress(p);
      setStepIdx(Math.min(LOADING_STEPS.length - 1, Math.floor((elapsed / LOADING_MS) * LOADING_STEPS.length)));
      if (elapsed >= LOADING_MS) { clearInterval(t); onDone(); }
    }, 120);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0C0B0A] px-6 py-14"
    >
      {/* 상단 브랜드 */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/5 px-5 py-2 text-sm font-bold tracking-wide text-gold">
        ✦ 어뷰티 AI 스타일 합성 중
      </span>

      {/* 애니메이션 영역 */}
      <div className="flex flex-col items-center gap-8 text-center">
        {/* 골드 링 스피너 */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          {/* 외곽 회전 링 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2.5px solid transparent", borderTopColor: "rgba(200,168,107,0.95)", borderRightColor: "rgba(200,168,107,0.25)" }}
          />
          {/* 내부 역방향 링 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-5 rounded-full"
            style={{ border: "1.8px solid transparent", borderTopColor: "rgba(200,168,107,0.55)", borderLeftColor: "rgba(200,168,107,0.18)" }}
          />
          {/* 중앙 펄스 점 */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-2.5 w-2.5 rounded-full bg-gold"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="max-w-xs text-center text-xl font-medium leading-relaxed text-cream"
          >
            {LOADING_STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>

        {/* 프로그레스 바 */}
        <div className="w-56">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: "linear" }}
            />
          </div>
          <p className="mt-2 text-center text-sm font-semibold tabular-nums text-gold/60">{progress}%</p>
        </div>
      </div>

      {/* 광고 자리 (애드센스 placeholder) */}
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-cream/20">Advertisement</p>
        <div className="mt-2 h-16 w-full rounded-xl bg-white/[0.03]" />
      </div>
    </motion.div>
  );
}

// ─── 얼굴 가이드 SVG ─────────────────────────────────────────────────────────

function FaceGuide() {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full">
      <defs>
        <mask id="styleFaceMask">
          <rect width="300" height="400" fill="white" />
          <ellipse cx="150" cy="185" rx="92" ry="120" fill="black" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgba(0,0,0,0.35)" mask="url(#styleFaceMask)" />
      <ellipse cx="150" cy="185" rx="92" ry="120" fill="none"
        stroke="rgba(200,168,107,0.9)" strokeWidth="2" strokeDasharray="7 8" />
      <path d="M40 400 C70 330 110 312 150 312 C190 312 230 330 260 400"
        fill="none" stroke="rgba(200,168,107,0.5)" strokeWidth="2" strokeDasharray="7 8" />
      <line x1="150" y1="78" x2="150" y2="292"
        stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 7" />
    </svg>
  );
}

// ─── 가이드 프리스크린 ────────────────────────────────────────────────────────

function PhotoGuide({ onConfirm }: { onConfirm: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-charcoal pb-32">
      <div className="mx-auto w-full max-w-sm pt-6 overflow-y-auto">
        <div className="mx-4 overflow-hidden rounded-2xl border border-gold/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={guideImg.src} alt="촬영 가이드" className="w-full h-auto" />
        </div>
        <p className="mt-4 px-6 text-center text-sm text-cream/40">
          정확한 AI 분석을 위해 위 가이드대로 촬영해 주세요
        </p>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.07] bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg px-5 py-4 pb-8">
          <button onClick={onConfirm}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
            가이드 확인했어요 · 사진 찍으러 가기 →
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── 캐시 미리보기 ────────────────────────────────────────────────────────────

function CachedPreview({ photo, onRetake, onContinue }: { photo: string; onRetake: () => void; onContinue: () => void; }) {
  return (
    <div className="mt-8 flex flex-col items-center">
      <div style={{ aspectRatio: String(FRAME_RATIO) }}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-gold/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="업로드한 사진" className="h-full w-full object-cover" />
      </div>
      <p className="mt-4 text-center text-base text-cream/55">
        이전에 올린 사진이 있어요. 이대로 진행하거나 다시 등록할 수 있어요.
      </p>
      <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-3">
        <button onClick={onRetake}
          className="flex h-13 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] py-3 text-base font-medium text-cream/70 transition-colors hover:border-white/25 hover:text-cream active:scale-[0.98]">
          다시 등록
        </button>
        <button onClick={onContinue}
          className="flex h-13 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark py-3 text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
          이 사진으로 계속
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 업로드 페이지
// ============================================================================
export default function StyleUploadPage() {
  const router = useRouter();

  const [showGuide,   setShowGuide]   = useState(true);
  const [src,         setSrc]         = useState<string | null>(null);
  const [natural,     setNatural]     = useState<{ w: number; h: number } | null>(null);
  const [savedPhoto,  setSavedPhoto]  = useState<string | null>(null);
  const [transform,   setTransform]   = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [busy,        setBusy]        = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [camera,      setCamera]      = useState(false);
  const [camError,    setCamError]    = useState<string | null>(null);

  const frameRef   = useRef<HTMLDivElement>(null);
  const imgElRef   = useRef<HTMLImageElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointers   = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture    = useRef<{ mode: "drag" | "pinch" | null; startDist: number; startScale: number; lastX: number; lastY: number; }>({
    mode: null, startDist: 0, startScale: 1, lastX: 0, lastY: 0,
  });

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (cached) { setSavedPhoto(cached); setShowGuide(false); }
    } catch { /**/ }
  }, []);

  useEffect(() => { return () => { if (src) URL.revokeObjectURL(src); }; }, [src]);
  useEffect(() => { return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }; }, []);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
  }, []);

  async function startCamera() {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("이 브라우저에서는 카메라를 사용할 수 없어요. 갤러리에서 선택해 주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (src) { URL.revokeObjectURL(src); setSrc(null); setNatural(null); }
      streamRef.current = stream;
      setSavedPhoto(null);
      setCamera(true);
    } catch {
      setCamError("카메라 접근이 거부됐어요. 권한을 허용하거나 갤러리에서 선택해 주세요.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    const videoRatio = vw / vh;
    let cropW: number, cropH: number;
    if (videoRatio > FRAME_RATIO) { cropH = vh; cropW = Math.round(vh * FRAME_RATIO); }
    else { cropW = vw; cropH = Math.round(vw / FRAME_RATIO); }
    const sx = Math.round((vw - cropW) / 2), sy = Math.round((vh - cropH) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = cropW; canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.translate(cropW, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => { setNatural({ w: img.naturalWidth, h: img.naturalHeight }); setTransform({ scale: 1, x: 0, y: 0 }); setSrc(url); stopCamera(); };
      img.src = url;
    }, "image/jpeg", 0.95);
  }

  const getFrame     = useCallback(() => { const el = frameRef.current; if (!el) return { w: 0, h: 0 }; return { w: el.clientWidth, h: el.clientHeight }; }, []);
  const coverScale   = useCallback(() => { if (!natural) return 1; const f = getFrame(); if (!f.w || !f.h) return 1; return Math.max(f.w / natural.w, f.h / natural.h); }, [natural, getFrame]);
  const clamp        = useCallback((t: Transform): Transform => {
    if (!natural) return t;
    const f = getFrame(); const s = coverScale() * t.scale;
    const rw = natural.w * s, rh = natural.h * s;
    const maxX = Math.max(0, (rw - f.w) / 2), maxY = Math.max(0, (rh - f.h) / 2);
    return { scale: t.scale, x: Math.min(maxX, Math.max(-maxX, t.x)), y: Math.min(maxY, Math.max(-maxY, t.y)) };
  }, [natural, getFrame, coverScale]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (src) URL.revokeObjectURL(src);
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => { setNatural({ w: img.naturalWidth, h: img.naturalHeight }); setTransform({ scale: 1, x: 0, y: 0 }); setSrc(url); setSavedPhoto(null); };
    img.src = url; e.target.value = "";
  }

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function onPointerDown(e: React.PointerEvent) {
    if (!src) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) { gesture.current.mode = "drag"; gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY; }
    else if (pointers.current.size === 2) { const [p1, p2] = Array.from(pointers.current.values()); gesture.current.mode = "pinch"; gesture.current.startDist = dist(p1, p2); gesture.current.startScale = transform.scale; }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!src || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.current.mode === "drag" && pointers.current.size === 1) {
      const dx = e.clientX - gesture.current.lastX, dy = e.clientY - gesture.current.lastY;
      gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY;
      setTransform((t) => clamp({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (gesture.current.mode === "pinch" && pointers.current.size >= 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      const d = dist(p1, p2);
      if (gesture.current.startDist > 0) {
        const ratio = d / gesture.current.startDist;
        const next  = Math.min(MAX_SCALE, Math.max(MIN_SCALE, gesture.current.startScale * ratio));
        setTransform((t) => clamp({ ...t, scale: next }));
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) { const [p] = Array.from(pointers.current.values()); gesture.current.mode = "drag"; gesture.current.lastX = p.x; gesture.current.lastY = p.y; }
    else if (pointers.current.size === 0) { gesture.current.mode = null; }
  }

  function onWheel(e: React.WheelEvent) {
    if (!src) return;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale * (1 - e.deltaY * 0.0015)));
    setTransform((t) => clamp({ ...t, scale: next }));
  }

  function onSlide(e: React.ChangeEvent<HTMLInputElement>) {
    setTransform((t) => clamp({ ...t, scale: Number(e.target.value) }));
  }

  function confirmPhoto() {
    if (!src || !natural) return;
    setBusy(true);
    try {
      const f = getFrame(); const s = coverScale() * transform.scale;
      const rw = natural.w * s, rh = natural.h * s;
      const imgLeft = f.w / 2 + transform.x - rw / 2, imgTop = f.h / 2 + transform.y - rh / 2;
      let sx = (0 - imgLeft) / s, sy = (0 - imgTop) / s;
      let sw = f.w / s, sh = f.h / s;
      sx = Math.max(0, Math.min(sx, natural.w)); sy = Math.max(0, Math.min(sy, natural.h));
      sw = Math.min(sw, natural.w - sx); sh = Math.min(sh, natural.h - sy);
      const ratio = f.w / f.h;
      const outW = ratio >= 1 ? OUTPUT_MAX : Math.round(OUTPUT_MAX * ratio);
      const outH = ratio >= 1 ? Math.round(OUTPUT_MAX / ratio) : OUTPUT_MAX;
      const canvas = document.createElement("canvas");
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx || !imgElRef.current) { setBusy(false); return; }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgElRef.current, sx, sy, sw, sh, 0, 0, outW, outH);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      try { sessionStorage.setItem(STYLE_PHOTO_KEY, dataUrl); } catch { /**/ }
      void submitStyle(dataUrl);
      setIsLoading(true); // 10초 로딩 시작
    } finally {
      setBusy(false);
    }
  }

  async function submitStyle(photoDataUrl: string) {
    try {
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      const answers: StyleAnswers = raw ? JSON.parse(raw) : {};
      const sheetAnswers = toSheetAnswers(answers);
      await fetch("/api/submit-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl, answers: sheetAnswers, treatmentCounts: {} }),
      });
    } catch { /**/ }
  }

  function resetSrc() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null); setNatural(null); setTransform({ scale: 1, x: 0, y: 0 });
    pointers.current.clear(); gesture.current.mode = null;
  }

  const s  = natural ? coverScale() * transform.scale : 1;
  const rw = natural ? natural.w * s : 0;
  const showChooser = !src && !camera && !savedPhoto;

  if (showGuide) return <PhotoGuide onConfirm={() => setShowGuide(false)} />;

  return (
    <main className="min-h-screen bg-charcoal pb-32 text-cream">
      {/* 로딩 오버레이 */}
      <AnimatePresence>
        {isLoading && <FakeLoadingOverlay onDone={() => router.push("/style/result")} />}
      </AnimatePresence>

      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-charcoal/90 px-5 py-3.5 backdrop-blur-md">
        <button onClick={() => router.push("/style/survey")} className="text-sm font-medium text-cream/40 hover:text-cream">
          ← 질문으로
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">사진 등록</span>
        <div className="w-16" />
      </header>

      <div className="mx-auto w-full max-w-lg px-5">
        <div className="pt-7 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Step · Photo</p>
          <h1 className="mt-2 font-serif text-2xl font-bold leading-snug text-cream">
            정면 얼굴 사진을 올려주세요
          </h1>
          <p className="mt-2 text-sm text-cream/45">
            원본 사진은 안전하게 보관되며, 헤어스타일만 AI로 시뮬레이션돼요.
          </p>
        </div>

        {savedPhoto && !src && !camera ? (
          <CachedPreview
            photo={savedPhoto}
            onRetake={() => { setSavedPhoto(null); try { sessionStorage.removeItem(STYLE_PHOTO_KEY); } catch { /**/ } }}
            onContinue={() => { setIsLoading(true); }}
          />
        ) : (
          <>
            <div className="mt-7 flex justify-center">
              <div
                ref={frameRef}
                onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}
                style={{ aspectRatio: String(FRAME_RATIO) }}
                className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-3xl border border-white/15 bg-black/40"
              >
                {camera && (
                  <video ref={videoRef} playsInline muted autoPlay
                    className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
                )}
                {!camera && src && natural && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img ref={imgElRef} src={src} alt="업로드한 사진" draggable={false}
                    style={{ position: "absolute", display: "block", left: "50%", top: "50%", width: `${rw}px`,
                      aspectRatio: natural ? `${natural.w} / ${natural.h}` : undefined,
                      maxWidth: "none", minWidth: 0, minHeight: 0,
                      transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))` }} />
                )}
                {showChooser && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6">
                    <button onClick={startCamera}
                      className="flex w-full max-w-[14rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark py-3.5 text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
                      📷 카메라로 촬영
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex w-full max-w-[14rem] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 py-3.5 text-base font-medium text-cream/85 transition-colors hover:border-white/45 active:scale-[0.98]">
                      🖼 갤러리에서 선택
                    </button>
                  </div>
                )}
                <FaceGuide />
              </div>
            </div>

            {camError && <p className="mt-4 text-center text-sm text-red-300/90">{camError}</p>}

            {src && !camera && (
              <div className="mx-auto mt-5 flex w-full max-w-sm items-center gap-3">
                <span className="text-sm text-cream/40">－</span>
                <input type="range" min={MIN_SCALE} max={MAX_SCALE} step={0.01}
                  value={transform.scale} onChange={onSlide}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-gold"
                  aria-label="확대 / 축소" />
                <span className="text-sm text-cream/40">＋</span>
              </div>
            )}
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />

      {/* 하단 고정 액션 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.07] bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 py-4 pb-8">
          {camera ? (
            <>
              <button onClick={stopCamera}
                className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 text-base font-medium text-cream/70 hover:text-cream active:scale-[0.98]">
                닫기
              </button>
              <button onClick={capturePhoto}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal shadow-gold hover:brightness-105 active:scale-[0.98]">
                <span className="text-xl leading-none">●</span> 촬영하기
              </button>
            </>
          ) : src ? (
            <>
              <button onClick={resetSrc}
                className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 text-base font-medium text-cream/70 hover:text-cream active:scale-[0.98]">
                다시 선택
              </button>
              <motion.button
                key={src}
                onClick={confirmPhoto}
                disabled={busy}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={busy ? { scale: 1, opacity: 0.6 } : {
                  scale: [1, 1.03, 1], opacity: 1,
                  boxShadow: ["0 0 0 0 rgba(200,168,107,0)", "0 0 0 8px rgba(200,168,107,0.35)", "0 0 0 0 rgba(200,168,107,0)"],
                }}
                transition={busy ? { duration: 0.2 } : {
                  scale: { duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut", delay: 0.3 },
                  boxShadow: { duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut", delay: 0.3 },
                  opacity: { duration: 0.25 },
                }}
                className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal disabled:opacity-60"
              >
                {busy ? "처리 중…" : "이 사진으로 분석하기"}
              </motion.button>
            </>
          ) : (
            <button onClick={() => router.push("/style")}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-base font-medium text-cream/60 hover:text-cream">
              ← 설문으로 돌아가기
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
