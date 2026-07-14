"use client";

// ============================================================================
// 어뷰티 스타일 — 사진 업로드
// [1] PhotoGuide 동의 체크박스 (법적 리스크 방어)
// [2] 셔터 플래시 애니메이션 (alert/confirm 완전 제거)
// [3] h-[100dvh] flex-col 구조 — 카메라/버튼 물리적 겹침 차단
//
// ★ 카메라 뷰파인더(frameRef 영역, bg-black)와 그 위 오버레이는 UI 리디자인
//   대상이 아니다 — 임의의 사진/영상 위에서 대비를 보장해야 하는 기능적
//   요소라 의도적으로 다크 스타일을 유지한다.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import guideImg from "@/public/images/guide/guide-full.png";
import { STYLE_PHOTO_KEY } from "../constants";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";
// API 호출은 /style/loading 페이지에서 전담

const OUTPUT_MAX   = 512;
const JPEG_QUALITY = 0.9;
const MIN_SCALE    = 1;
const MAX_SCALE    = 4;

type Transform = { scale: number; x: number; y: number };

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
    <SilkBackground>
      <main className="flex h-[100dvh] flex-col text-[#2F2A22]">

        {/* 가이드 이미지 — 중앙 정렬 */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6">
          <div className="w-full max-w-sm">
            <GlassCard className="overflow-hidden" accent>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={guideImg.src} alt="촬영 가이드" className="h-auto w-full" />
            </GlassCard>
            <p className="mt-3 px-2 text-center text-sm text-[#6B6355]">
              정확한 AI 분석을 위해 위 가이드대로 촬영해 주세요
            </p>
            <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-50/80 px-4 py-3">
              <p className="text-center text-xs leading-relaxed text-amber-700/90">
                ⚠️ <span className="font-semibold">손·팔이 머리에 닿은 포즈는 피해 주세요</span><br />
                손가락이 머리카락과 겹치면 AI가 손 모양을 변형할 수 있어요.<br />
                손은 아래로 자연스럽게 내린 자세로 촬영해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* ── Sticky Bottom: 체크박스 + 버튼 ── */}
        <div
          className="flex-none border-t border-white/50 bg-[#FBF9F4]/92 px-5 pt-5 backdrop-blur-xl"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
          {/* 동의 체크박스 */}
          <button
            type="button"
            onClick={() => setAgreed(v => !v)}
            className="mb-4 flex w-full items-start gap-3 text-left"
          >
            {/* 커스텀 체크박스 */}
            <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-all duration-200 ${
              agreed ? "border-[#2F2A22] bg-[#2F2A22]" : "border-[#D8CDB8] bg-transparent"
            }`}>
              {agreed && (
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path d="M5 12.5l4.5 4.5L19 7" stroke="white" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>
              <span className="block text-sm font-medium leading-snug text-[#4A453B]">
                AI 헤어 분석을 위한 사진 촬영 및 임시 처리에 동의합니다.{" "}
                <span className="text-[#A8884A]">(필수)</span>
              </span>
              <span className="mt-1 block text-xs text-[#9C9482]">
                *업로드된 사진은 AI 분석 즉시 안전하게 파기됩니다.
              </span>
            </span>
          </button>

          {/* CTA 버튼 — 체크 전 disabled */}
          <BlackCTAButton onClick={onConfirm} disabled={!agreed}>
            {agreed ? "가이드 확인했어요 · 사진 찍으러 가기" : "위 항목에 동의 후 진행할 수 있어요"}
          </BlackCTAButton>
        </div>
      </main>
    </SilkBackground>
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
  const [busy,        setBusy]        = useState(false);
  const [camera,      setCamera]      = useState(false);
  const [camError,    setCamError]    = useState<string | null>(null);
  const [flash,       setFlash]       = useState(false);
  const [facingMode,  setFacingMode]  = useState<"user" | "environment">("user");

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

  async function startCamera(mode: "user" | "environment" = facingMode) {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("이 브라우저에서는 카메라를 사용할 수 없어요. 갤러리에서 선택해 주세요.");
      return;
    }
    try {
      // 기존 스트림 정리
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (src) { URL.revokeObjectURL(src); setSrc(null); setNatural(null); }
      streamRef.current = stream;
      setSavedPhoto(null);
      setFacingMode(mode);
      setCamera(true);
    } catch {
      setCamError("카메라 접근이 거부됐어요. 권한을 허용하거나 갤러리에서 선택해 주세요.");
    }
  }

  async function toggleFacing() {
    const next = facingMode === "user" ? "environment" : "user";
    await startCamera(next);
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

  // ★ 팬(이동) 비활성화 — 핀치 줌만 허용, 이미지 항상 중앙 고정
  function onPointerDown(e: React.PointerEvent) {
    if (!src) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      gesture.current.mode       = "pinch";
      gesture.current.startDist  = dist(p1, p2);
      gesture.current.startScale = transform.scale;
    }
    // 단일 터치 드래그(팬) 비활성화
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!src || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // 줌(핀치)만 처리 — 팬(드래그) 무시
    if (gesture.current.mode === "pinch" && pointers.current.size >= 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      const d = dist(p1, p2);
      if (gesture.current.startDist > 0) {
        const ratio = d / gesture.current.startDist;
        const next  = Math.min(MAX_SCALE, Math.max(MIN_SCALE, gesture.current.startScale * ratio));
        setTransform({ scale: next, x: 0, y: 0 }); // 항상 중앙 고정
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.mode = null;
  }

  function onWheel(e: React.WheelEvent) {
    if (!src) return;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale * (1 - e.deltaY * 0.0015)));
    setTransform(t => clamp({ ...t, scale: next }));
  }

  function onSlide(e: React.ChangeEvent<HTMLInputElement>) {
    setTransform(t => clamp({ ...t, scale: Number(e.target.value) }));
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
      // API 호출은 /style/loading 페이지에서 처리
      router.push("/style/loading");
    } finally {
      setBusy(false);
    }
  }

  function resetSrc() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null); setNatural(null); setTransform({ scale: 1, x: 0, y: 0 });
    // 저장 사진도 초기화 → 선택 화면(showChooser)으로 복귀 → 가이드라인 자동 표시
    setSavedPhoto(null);
    try { sessionStorage.removeItem(STYLE_PHOTO_KEY); } catch { /**/ }
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
    <SilkBackground>
      <main className="flex h-[100dvh] w-full flex-col overflow-hidden text-[#2F2A22]">

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
        <header className="flex flex-none items-center justify-between border-b border-white/50 bg-[#FBF9F4]/92 px-5 py-3.5 backdrop-blur-xl">
          <button onClick={() => router.push("/style/survey")}
            className="text-sm font-medium text-[#9C9482] transition-colors hover:text-[#2F2A22]">
            ← 질문으로
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#A8884A]">사진 등록</span>
          <div className="w-16" />
        </header>

        {/* ── [요구사항 3] 카메라/이미지 뷰 (flex-1 relative overflow-hidden) ──
             비디오·이미지·가이드 SVG 모두 이 안에서 absolute로 존재.
             버튼 영역과 물리적으로 분리되어 절대 겹치지 않음.
             ★ 이 블록(bg-black) 내부는 카메라 뷰파인더 — 리디자인 대상 아님. */}
        <div
          ref={frameRef}
          className="relative flex-1 overflow-hidden bg-black"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {/* 카메라 피드 — 전면 미러, 후면 정방향 */}
          {camera && (
            <video ref={videoRef} playsInline muted autoPlay
              className={`absolute inset-0 h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`} />
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
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8">
                {/* 카메라 권한 안내 문구 */}
                <p className="mb-1 max-w-xs text-center text-xs leading-relaxed text-white/50">
                  💡 정확한 AI 분석을 위해 다음 창에서 카메라 접근을 [허용]해 주세요.
                </p>
                <button onClick={() => startCamera("user")}
                  className="flex w-56 items-center justify-center gap-2 rounded-full bg-white py-3.5 text-base font-bold text-[#1C1A17] shadow-lg transition-all hover:brightness-95 active:scale-[0.98]">
                  카메라로 촬영
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex w-56 items-center justify-center gap-2 rounded-full border border-white/25 bg-black/60 py-3.5 text-base font-medium text-white/85 backdrop-blur-sm transition-colors hover:border-white/45 active:scale-[0.98]">
                  갤러리에서 선택
                </button>
              </div>
            </>
          )}

          {/* ★ FaceGuide — 저장사진 미리보기 외 모든 상태에서 항상 표시
               다시하기 클릭 시에도 showChooser=true로 복귀하므로 자동 유지됨 */}
          {(camera || showChooser || showImageCrop) && <FaceGuide />}

          {/* 전/후면 전환 버튼 (카메라 활성 시만) */}
          {camera && (
            <button
              onClick={toggleFacing}
              className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 active:scale-95"
              aria-label="카메라 전환"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

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
              <p className="rounded-xl bg-black/65 px-4 py-2 text-center text-sm text-white/70 backdrop-blur-sm">
                이전에 올린 사진이에요. 계속 진행하거나 다시 등록할 수 있어요.
              </p>
            </div>
          )}
        </div>

        {/* ── [요구사항 3] 액션 버튼 영역 (shrink-0 — 카메라 뷰와 물리적 분리) ── */}
        <div
          className="shrink-0 border-t border-white/50 bg-[#FBF9F4]/92 px-6 pt-5 backdrop-blur-xl"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {camera ? (
            /* 카메라 촬영 모드 */
            <div className="flex gap-3">
              <button onClick={stopCamera}
                className="flex h-14 items-center justify-center rounded-full border border-[#EDE7DA] bg-white px-6 text-base font-medium text-[#6B6355] hover:text-[#2F2A22] active:scale-[0.98]">
                닫기
              </button>
              <div className="flex-1">
                <BlackCTAButton onClick={capturePhoto}>
                  <span className="text-lg leading-none">●</span> 촬영하기
                </BlackCTAButton>
              </div>
            </div>

          ) : showSavedPreview ? (
            /* 저장된 사진 확인 모드 */
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSavedPhoto(null);
                  try { sessionStorage.removeItem(STYLE_PHOTO_KEY); } catch { /**/ }
                }}
                className="flex h-14 items-center justify-center rounded-full border border-[#EDE7DA] bg-white px-6 text-base font-medium text-[#6B6355] hover:text-[#2F2A22] active:scale-[0.98]">
                다시 등록
              </button>
              <div className="flex-1">
                <BlackCTAButton onClick={() => router.push("/style/loading")}>
                  이 사진으로 계속
                </BlackCTAButton>
              </div>
            </div>

          ) : showImageCrop ? (
            /* 이미지 크롭/확인 모드 */
            <div className="flex gap-3">
              <button onClick={resetSrc}
                className="flex h-14 items-center justify-center rounded-full border border-[#EDE7DA] bg-white px-6 text-base font-medium text-[#6B6355] hover:text-[#2F2A22] active:scale-[0.98]">
                다시 선택
              </button>
              <div className="flex-1">
                <BlackCTAButton onClick={confirmPhoto} disabled={busy}>
                  {busy ? "처리 중…" : "이 사진으로 분석하기"}
                </BlackCTAButton>
              </div>
            </div>

          ) : (
            /* 초기 선택 화면 — 뒤로가기 */
            <button onClick={() => router.push("/style/survey")}
              className="flex h-14 w-full items-center justify-center rounded-full border border-[#EDE7DA] bg-white text-base font-medium text-[#6B6355] hover:text-[#2F2A22]">
              ← 설문으로 돌아가기
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      </main>
    </SilkBackground>
  );
}
