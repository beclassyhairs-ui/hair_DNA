"use client";

// ============================================================================
// 어뷰티 스타일 — 사진 업로드
// [1] PhotoGuide 동의 체크박스 (법적 리스크 방어)
// [2] 셔터 플래시 애니메이션 (alert/confirm 완전 제거)
// [3] h-[100dvh] flex-col 구조 — 카메라/버튼 물리적 겹침 차단
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import guideImg from "@/public/images/guide/guide-full.png";
import { STYLE_ANSWERS_KEY, STYLE_GENERATED_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";

const OUTPUT_MAX   = 512;
const JPEG_QUALITY = 0.9;
const MIN_SCALE    = 1;
const MAX_SCALE    = 4;
const LOADING_MS   = 13_000;

type Transform = { scale: number; x: number; y: number };

// ─── 로딩 오버레이 ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  "AI가 고객님의 두상과 8가지 모질 데이터를 정밀 결합 중입니다...",
  "두상 구조와 희망 스타일 데이터를 정밀 매칭하고 있습니다...",
  "전문가 헤어 데이터베이스에서 최적 스타일을 도출하고 있습니다...",
  "맞춤 케어 처방전과 스타일을 최종 생성하고 있습니다...",
  "마지막 세부 조정 중입니다. 결과지가 곧 완성됩니다...",
];

function LoadingOverlay({ onDone }: { onDone: () => void }) {
  const [stepIdx,  setStepIdx]  = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 120;
      const p = Math.min(100, Math.round((elapsed / LOADING_MS) * 100));
      setProgress(p);
      setStepIdx(Math.min(LOADING_STEPS.length - 1,
        Math.floor((elapsed / LOADING_MS) * LOADING_STEPS.length)));
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/5 px-5 py-2 text-sm font-bold tracking-wide text-gold">
        ✦ 어뷰티 AI 스타일 합성 중
      </span>

      <div className="flex flex-col items-center gap-8 text-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2.5px solid transparent", borderTopColor: "rgba(200,168,107,0.95)", borderRightColor: "rgba(200,168,107,0.25)" }} />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-5 rounded-full"
            style={{ border: "1.8px solid transparent", borderTopColor: "rgba(200,168,107,0.55)", borderLeftColor: "rgba(200,168,107,0.18)" }} />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-2.5 w-2.5 rounded-full bg-gold" />
        </div>

        <AnimatePresence mode="wait">
          <motion.p key={stepIdx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}
            className="max-w-xs text-center text-base font-medium leading-relaxed text-cream sm:text-lg">
            {LOADING_STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>

        <div className="w-56">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.15, ease: "linear" }} />
          </div>
          <p className="mt-2 text-center text-sm font-semibold tabular-nums text-gold/60">{progress}%</p>
        </div>
      </div>

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
        stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 7" />
    </svg>
  );
}

// ─── 가이드 프리스크린 + 동의 체크박스 ────────────────────────────────────────
// [요구사항 1] 체크 미완료 시 버튼 비활성화 → 법적 동의 취득

function PhotoGuide({ onConfirm }: { onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="flex h-[100dvh] flex-col bg-[#0C0B0A] text-cream">

      {/* 스크롤 가능한 가이드 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm px-4 pt-6">
          <div className="overflow-hidden rounded-2xl border border-gold/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={guideImg.src} alt="촬영 가이드" className="h-auto w-full" />
          </div>
          <p className="mt-4 px-2 text-center text-sm text-cream/40">
            정확한 AI 분석을 위해 위 가이드대로 촬영해 주세요
          </p>
        </div>
      </div>

      {/* ── Sticky Bottom: 체크박스 + 버튼 ── */}
      <div
        className="flex-none border-t border-white/[0.07] bg-[#0C0B0A]/95 px-5 pt-5 backdrop-blur-md"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {/* 동의 체크박스 */}
        <button
          type="button"
          onClick={() => setAgreed(v => !v)}
          className="mb-4 flex w-full items-start gap-3 text-left"
        >
          {/* 커스텀 체크박스 */}
          <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border-2 transition-all duration-200 ${
            agreed ? "border-gold bg-gold" : "border-white/35 bg-transparent"
          }`}>
            {agreed && (
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                <path d="M5 12.5l4.5 4.5L19 7" stroke="#0C0B0A" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span>
            <span className="block text-sm font-medium leading-snug text-cream/80">
              AI 헤어 분석을 위한 사진 촬영 및 임시 처리에 동의합니다.{" "}
              <span className="text-gold">(필수)</span>
            </span>
            <span className="mt-1 block text-xs text-cream/35">
              *업로드된 사진은 AI 분석 즉시 안전하게 파기됩니다.
            </span>
          </span>
        </button>

        {/* CTA 버튼 — 체크 전 disabled */}
        <button
          onClick={onConfirm}
          disabled={!agreed}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          style={{
            background: agreed
              ? "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)"
              : "rgba(255,255,255,0.07)",
            color: agreed ? "#0C0B0A" : "rgba(255,255,255,0.4)",
          }}
        >
          {agreed
            ? "가이드 확인했어요 · 사진 찍으러 가기 →"
            : "위 항목에 동의 후 진행할 수 있어요"}
        </button>
      </div>
    </main>
  );
}

// ============================================================================
// 메인 업로드 페이지
// ============================================================================

export default function StyleUploadPage() {
  const router = useRouter();

  const [showGuide,  setShowGuide]  = useState(true);
  const [src,        setSrc]        = useState<string | null>(null);
  const [natural,    setNatural]    = useState<{ w: number; h: number } | null>(null);
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null);
  const [transform,  setTransform]  = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [busy,       setBusy]       = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [camera,     setCamera]     = useState(false);
  const [camError,   setCamError]   = useState<string | null>(null);
  // [요구사항 2] 셔터 플래시 상태
  const [flash,      setFlash]      = useState(false);

  const frameRef     = useRef<HTMLDivElement>(null);
  const imgElRef     = useRef<HTMLImageElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointers     = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture      = useRef<{
    mode: "drag" | "pinch" | null;
    startDist: number; startScale: number;
    lastX: number; lastY: number;
  }>({ mode: null, startDist: 0, startScale: 1, lastX: 0, lastY: 0 });

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (cached) { setSavedPhoto(cached); setShowGuide(false); }
    } catch { /**/ }
  }, []);

  useEffect(() => { return () => { if (src) URL.revokeObjectURL(src); }; }, [src]);
  useEffect(() => { return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
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

    // [요구사항 2] 셔터 플래시 — alert/confirm 완전 대체
    setFlash(true);

    const vw = video.videoWidth, vh = video.videoHeight;
    const frame = frameRef.current;
    const frameW = frame?.clientWidth  ?? vw;
    const frameH = frame?.clientHeight ?? vh;
    const frameRatio = frameW / frameH;
    const videoRatio = vw / vh;
    let cropW: number, cropH: number;
    if (videoRatio > frameRatio) { cropH = vh; cropW = Math.round(vh * frameRatio); }
    else { cropW = vw; cropH = Math.round(vw / frameRatio); }
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
      img.onload = () => {
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setTransform({ scale: 1, x: 0, y: 0 });
        setSrc(url);
        stopCamera();
      };
      img.src = url;
    }, "image/jpeg", 0.95);
  }

  const getFrame = useCallback(() => {
    const el = frameRef.current;
    if (!el) return { w: 0, h: 0 };
    return { w: el.clientWidth, h: el.clientHeight };
  }, []);

  const coverScale = useCallback(() => {
    if (!natural) return 1;
    const f = getFrame();
    if (!f.w || !f.h) return 1;
    return Math.max(f.w / natural.w, f.h / natural.h);
  }, [natural, getFrame]);

  const clamp = useCallback((t: Transform): Transform => {
    if (!natural) return t;
    const f = getFrame(); const s = coverScale() * t.scale;
    const rw = natural.w * s, rh = natural.h * s;
    const maxX = Math.max(0, (rw - f.w) / 2), maxY = Math.max(0, (rh - f.h) / 2);
    return {
      scale: t.scale,
      x: Math.min(maxX, Math.max(-maxX, t.x)),
      y: Math.min(maxY, Math.max(-maxY, t.y)),
    };
  }, [natural, getFrame, coverScale]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (src) URL.revokeObjectURL(src);
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setTransform({ scale: 1, x: 0, y: 0 });
      setSrc(url); setSavedPhoto(null);
    };
    img.src = url; e.target.value = "";
  }

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!src) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current.mode = "drag";
      gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY;
    } else if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      gesture.current.mode = "pinch";
      gesture.current.startDist  = dist(p1, p2);
      gesture.current.startScale = transform.scale;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!src || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.current.mode === "drag" && pointers.current.size === 1) {
      const dx = e.clientX - gesture.current.lastX, dy = e.clientY - gesture.current.lastY;
      gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY;
      setTransform(t => clamp({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (gesture.current.mode === "pinch" && pointers.current.size >= 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      const d = dist(p1, p2);
      if (gesture.current.startDist > 0) {
        const ratio = d / gesture.current.startDist;
        const next  = Math.min(MAX_SCALE, Math.max(MIN_SCALE, gesture.current.startScale * ratio));
        setTransform(t => clamp({ ...t, scale: next }));
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = Array.from(pointers.current.values());
      gesture.current.mode = "drag";
      gesture.current.lastX = p.x; gesture.current.lastY = p.y;
    } else if (pointers.current.size === 0) {
      gesture.current.mode = null;
    }
  }

  function onWheel(e: React.WheelEvent) {
    if (!src) return;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale * (1 - e.deltaY * 0.0015)));
    setTransform(t => clamp({ ...t, scale: next }));
  }

  function onSlide(e: React.ChangeEvent<HTMLInputElement>) {
    setTransform(t => clamp({ ...t, scale: Number(e.target.value) }));
  }

  async function callAIGenerate(photoDataUrl: string) {
    try {
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      const answers: StyleAnswers = raw ? JSON.parse(raw) : {};
      const res = await fetch("/api/style/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl, answers }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json() as { ok: boolean; imageUrl?: string };
      if (data.ok && data.imageUrl) {
        try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
      }
    } catch { /**/ }
  }

  async function submitDiagnosis(photoDataUrl: string) {
    try {
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      const answers: StyleAnswers = raw ? JSON.parse(raw) : {};
      await fetch("/api/submit-diagnosis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl, answers: toSheetAnswers(answers), treatmentCounts: {} }),
      });
    } catch { /**/ }
  }

  function confirmPhoto() {
    if (!src || !natural) return;
    setBusy(true);
    try {
      const f = getFrame(); const s = coverScale() * transform.scale;
      const rw = natural.w * s, rh = natural.h * s;
      const imgLeft = f.w / 2 + transform.x - rw / 2;
      const imgTop  = f.h / 2 + transform.y - rh / 2;
      let sx = (0 - imgLeft) / s, sy = (0 - imgTop) / s;
      let sw = f.w / s,           sh = f.h / s;
      sx = Math.max(0, Math.min(sx, natural.w));
      sy = Math.max(0, Math.min(sy, natural.h));
      sw = Math.min(sw, natural.w - sx);
      sh = Math.min(sh, natural.h - sy);
      const ratio = f.w / f.h;
      const outW  = ratio >= 1 ? OUTPUT_MAX : Math.round(OUTPUT_MAX * ratio);
      const outH  = ratio >= 1 ? Math.round(OUTPUT_MAX / ratio) : OUTPUT_MAX;
      const canvas = document.createElement("canvas");
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx || !imgElRef.current) { setBusy(false); return; }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgElRef.current, sx, sy, sw, sh, 0, 0, outW, outH);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      try { sessionStorage.setItem(STYLE_PHOTO_KEY, dataUrl); } catch { /**/ }
      void submitDiagnosis(dataUrl);
      void callAIGenerate(dataUrl);
      setIsLoading(true);
    } finally {
      setBusy(false);
    }
  }

  function resetSrc() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null); setNatural(null); setTransform({ scale: 1, x: 0, y: 0 });
    pointers.current.clear(); gesture.current.mode = null;
  }

  const s = natural ? coverScale() * transform.scale : 1;
  const rw = natural ? natural.w * s : 0;

  // 현재 상태 플래그
  const showSavedPreview = Boolean(savedPhoto && !src && !camera);
  const showImageCrop    = Boolean(src && !camera);
  const showChooser      = !src && !camera && !savedPhoto;

  if (showGuide) return <PhotoGuide onConfirm={() => setShowGuide(false)} />;

  return (
    // [요구사항 3] h-[100dvh] flex-col — 모바일 브라우저 하단 바 포함 전체 높이
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0C0B0A] text-cream">

      {/* 로딩 오버레이 (fixed) */}
      <AnimatePresence>
        {isLoading && <LoadingOverlay onDone={() => router.push("/style/result")} />}
      </AnimatePresence>

      {/* [요구사항 2] 셔터 플래시 — 흰 화면 번쩍임 (0.15초) */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="shutter-flash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "linear" }}
            onAnimationComplete={() => setFlash(false)}
            className="pointer-events-none fixed inset-0 z-40 bg-white"
          />
        )}
      </AnimatePresence>

      {/* ── 헤더 (flex-none) ── */}
      <header className="flex flex-none items-center justify-between border-b border-white/[0.07] bg-[#0C0B0A]/90 px-5 py-3.5 backdrop-blur-md">
        <button onClick={() => router.push("/style/survey")}
          className="text-sm font-medium text-cream/40 transition-colors hover:text-cream">
          ← 질문으로
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">사진 등록</span>
        <div className="w-16" />
      </header>

      {/* ── [요구사항 3] 카메라/이미지 뷰 (flex-1 relative overflow-hidden) ──
           비디오·이미지·가이드 SVG 모두 이 안에서 absolute로 존재
           버튼 영역과 물리적으로 분리되어 절대 겹치지 않음                    */}
      <div
        ref={frameRef}
        className="relative flex-1 overflow-hidden bg-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* 카메라 피드 — object-cover로 영역 꽉 채움 */}
        {camera && (
          <video ref={videoRef} playsInline muted autoPlay
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
        )}

        {/* 촬영/업로드 이미지 (드래그+줌 크롭 모드) */}
        {showImageCrop && natural && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgElRef}
            src={src!}
            alt="업로드한 사진"
            draggable={false}
            style={{
              position: "absolute", display: "block",
              left: "50%", top: "50%",
              width: `${rw}px`,
              aspectRatio: `${natural.w} / ${natural.h}`,
              maxWidth: "none", minWidth: 0, minHeight: 0,
              transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`,
            }}
          />
        )}

        {/* 저장된 이전 사진 미리보기 */}
        {showSavedPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={savedPhoto!}
            alt="이전 사진"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* 촬영/갤러리 선택 화면 (사진 없을 때) */}
        {showChooser && (
          <>
            <FaceGuide />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8">
              <button onClick={startCamera}
                className="flex w-56 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark py-3.5 text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
                카메라로 촬영
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex w-56 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-black/60 py-3.5 text-base font-medium text-cream/85 backdrop-blur-sm transition-colors hover:border-white/45 active:scale-[0.98]">
                갤러리에서 선택
              </button>
            </div>
          </>
        )}

        {/* 카메라 활성 시 얼굴 가이드 오버레이 */}
        {camera && <FaceGuide />}

        {/* 카메라 오류 토스트 */}
        {camError && (
          <div className="absolute inset-x-4 top-4 z-30 flex justify-center">
            <p className="rounded-xl bg-black/75 px-4 py-2.5 text-center text-sm text-red-300/90 backdrop-blur-sm">
              {camError}
            </p>
          </div>
        )}

        {/* 줌 슬라이더 — 크롭 모드일 때 카메라 영역 하단 오버레이 */}
        {showImageCrop && (
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-6">
            <div className="flex items-center gap-3 rounded-2xl bg-black/65 px-5 py-2.5 backdrop-blur-sm">
              <span className="text-sm text-white/45">－</span>
              <input
                type="range" min={MIN_SCALE} max={MAX_SCALE} step={0.01}
                value={transform.scale} onChange={onSlide}
                className="w-36 cursor-pointer accent-gold sm:w-48"
                aria-label="확대/축소"
              />
              <span className="text-sm text-white/45">＋</span>
            </div>
          </div>
        )}

        {/* 저장된 사진 안내 텍스트 */}
        {showSavedPreview && (
          <div className="absolute inset-x-4 top-4 z-10 flex justify-center">
            <p className="rounded-xl bg-black/65 px-4 py-2 text-center text-sm text-cream/70 backdrop-blur-sm">
              이전에 올린 사진이에요. 계속 진행하거나 다시 등록할 수 있어요.
            </p>
          </div>
        )}
      </div>

      {/* ── [요구사항 3] 액션 버튼 영역 (shrink-0 — 카메라 뷰와 물리적 분리) ──
           bg-black/90으로 반투명 처리, safe-area padding 적용                  */}
      <div
        className="shrink-0 z-50 bg-black/90 px-6 pt-5 backdrop-blur-md"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {camera ? (
          /* 카메라 촬영 모드 */
          <div className="flex gap-3">
            <button onClick={stopCamera}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 text-base font-medium text-cream/70 hover:text-cream active:scale-[0.98]">
              닫기
            </button>
            <button onClick={capturePhoto}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal shadow-gold hover:brightness-105 active:scale-[0.98]">
              <span className="text-lg leading-none">●</span> 촬영하기
            </button>
          </div>

        ) : showSavedPreview ? (
          /* 저장된 사진 확인 모드 */
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSavedPhoto(null);
                try { sessionStorage.removeItem(STYLE_PHOTO_KEY); } catch { /**/ }
              }}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 text-base font-medium text-cream/70 hover:text-cream active:scale-[0.98]">
              다시 등록
            </button>
            <button
              onClick={() => { void callAIGenerate(savedPhoto!); setIsLoading(true); }}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal shadow-gold hover:brightness-105 active:scale-[0.98]">
              이 사진으로 계속
            </button>
          </div>

        ) : showImageCrop ? (
          /* 이미지 크롭/확인 모드 */
          <div className="flex gap-3">
            <button onClick={resetSrc}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 text-base font-medium text-cream/70 hover:text-cream active:scale-[0.98]">
              다시 선택
            </button>
            <motion.button
              key={src ?? ""}
              onClick={confirmPhoto}
              disabled={busy}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={busy ? { scale: 1, opacity: 0.6 } : {
                scale: [1, 1.03, 1], opacity: 1,
                boxShadow: ["0 0 0 0 rgba(200,168,107,0)", "0 0 0 8px rgba(200,168,107,0.35)", "0 0 0 0 rgba(200,168,107,0)"],
              }}
              transition={busy ? { duration: 0.2 } : {
                scale:     { duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut", delay: 0.3 },
                boxShadow: { duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut", delay: 0.3 },
                opacity:   { duration: 0.25 },
              }}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal disabled:opacity-60"
            >
              {busy ? "처리 중…" : "이 사진으로 분석하기"}
            </motion.button>
          </div>

        ) : (
          /* 초기 선택 화면 — 뒤로가기 */
          <button onClick={() => router.push("/style/survey")}
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-base font-medium text-cream/60 hover:text-cream">
            ← 설문으로 돌아가기
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </main>
  );
}
