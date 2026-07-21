"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RESULT_STORAGE_KEY, TREATMENT_COUNTS_KEY, PHOTO_KEY } from "../result/recommend";
import type { SubmitDiagnosisBody } from "../api/submit-diagnosis/route";
import guideImg from "@/public/images/guide/guide-full.png";

// 크롭 프레임 비율(세로 얼굴) 및 출력 압축 스펙
const FRAME_RATIO = 3 / 4; // width / height (세로형)
const OUTPUT_MAX = 512; // 긴 변 기준 최대 픽셀
const JPEG_QUALITY = 0.9;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

type Transform = { scale: number; x: number; y: number };

const FACE_SHAPE_OPTIONS: { value: string; label: string }[] = [
  { value: "oval", label: "계란형 (Oval)" },
  { value: "round", label: "둥근형 (Round)" },
  { value: "oblong", label: "긴형 (Oblong)" },
  { value: "square", label: "각진형 (Square)" },
  { value: "heart", label: "하트형 (Heart)" },
  { value: "diamond", label: "다이아몬드형 (Diamond)" },
  { value: "hexagon", label: "육각형 (Hexagon)" },
  { value: "peanut", label: "땅콩형 (Peanut)" },
];

export default function UploadPage() {
  const router = useRouter();

  // 가이드 프리스크린 — 첫 방문 시 true, 캐시된 사진 있으면 false
  const [showGuide, setShowGuide] = useState(true);

  // [Mock] 임시 얼굴형 선택기 상태
  const [mockFaceShape, setMockFaceShape] = useState<string>(() => {
    try { return sessionStorage.getItem("faceShape_mock") ?? ""; } catch { return ""; }
  });

  // 편집 중인 원본 이미지 (object URL)
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  // 확정 완료된(이미 저장된) 압축 사진 미리보기
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null);

  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // 카메라 상태
  const [camera, setCamera] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 제스처 추적용 ref
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<{
    mode: "drag" | "pinch" | null;
    startDist: number;
    startScale: number;
    lastX: number;
    lastY: number;
  }>({ mode: null, startDist: 0, startScale: 1, lastX: 0, lastY: 0 });

  // 마운트 시: 캐시된 사진 있으면 가이드 건너뜀
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(PHOTO_KEY);
      if (cached) {
        setSavedPhoto(cached);
        setShowGuide(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // object URL 정리
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  // --- 카메라 스트림 제어 ----------------------------------------------------
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
  }, []);

  // 언마운트 시 스트림 해제
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // camera 상태가 켜지면 video에 스트림 연결
  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camera]);

  async function startCamera() {
    setCamError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCamError("이 브라우저에서는 카메라를 사용할 수 없어요. 갤러리에서 선택해 주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (src) {
        URL.revokeObjectURL(src);
        setSrc(null);
        setNatural(null);
      }
      streamRef.current = stream;
      setSavedPhoto(null);
      setCamera(true);
    } catch {
      setCamError("카메라 접근이 거부됐어요. 권한을 허용하거나 갤러리에서 선택해 주세요.");
    }
  }

  // 현재 비디오 프레임을 캡처해 크롭 편집으로 전달
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const videoRatio = vw / vh;
    let cropW: number;
    let cropH: number;
    if (videoRatio > FRAME_RATIO) {
      cropH = vh;
      cropW = Math.round(vh * FRAME_RATIO);
    } else {
      cropW = vw;
      cropH = Math.round(vw / FRAME_RATIO);
    }
    const sx = Math.round((vw - cropW) / 2);
    const sy = Math.round((vh - cropH) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(cropW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob(
      (blob) => {
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
      },
      "image/jpeg",
      0.95,
    );
  }

  // --- 프레임/이미지 측정 헬퍼 ----------------------------------------------
  const getFrame = useCallback(() => {
    const el = frameRef.current;
    if (!el) return { w: 0, h: 0 };
    return { w: el.clientWidth, h: el.clientHeight };
  }, []);

  // 프레임을 꽉 채우는(cover) 기본 배율
  const coverScale = useCallback(() => {
    if (!natural) return 1;
    const f = getFrame();
    if (!f.w || !f.h) return 1;
    return Math.max(f.w / natural.w, f.h / natural.h);
  }, [natural, getFrame]);

  // 이미지가 프레임을 항상 덮도록 offset 제한
  const clamp = useCallback(
    (t: Transform): Transform => {
      if (!natural) return t;
      const f = getFrame();
      const s = coverScale() * t.scale;
      const rw = natural.w * s;
      const rh = natural.h * s;
      const maxX = Math.max(0, (rw - f.w) / 2);
      const maxY = Math.max(0, (rh - f.h) / 2);
      return {
        scale: t.scale,
        x: Math.min(maxX, Math.max(-maxX, t.x)),
        y: Math.min(maxY, Math.max(-maxY, t.y)),
      };
    },
    [natural, getFrame, coverScale],
  );

  // --- 파일 선택 -------------------------------------------------------------
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (src) URL.revokeObjectURL(src);
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setTransform({ scale: 1, x: 0, y: 0 });
      setSrc(url);
      setSavedPhoto(null);
    };
    img.src = url;
    e.target.value = "";
  }

  // --- 포인터 제스처 (드래그 / 핀치) ----------------------------------------
  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!src) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      gesture.current.mode = "drag";
      gesture.current.lastX = e.clientX;
      gesture.current.lastY = e.clientY;
    } else if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      gesture.current.mode = "pinch";
      gesture.current.startDist = dist(p1, p2);
      gesture.current.startScale = transform.scale;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!src || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture.current.mode === "drag" && pointers.current.size === 1) {
      const dx = e.clientX - gesture.current.lastX;
      const dy = e.clientY - gesture.current.lastY;
      gesture.current.lastX = e.clientX;
      gesture.current.lastY = e.clientY;
      setTransform((t) => clamp({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (gesture.current.mode === "pinch" && pointers.current.size >= 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      const d = dist(p1, p2);
      if (gesture.current.startDist > 0) {
        const ratio = d / gesture.current.startDist;
        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, gesture.current.startScale * ratio),
        );
        setTransform((t) => clamp({ ...t, scale: next }));
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = Array.from(pointers.current.values());
      gesture.current.mode = "drag";
      gesture.current.lastX = p.x;
      gesture.current.lastY = p.y;
    } else if (pointers.current.size === 0) {
      gesture.current.mode = null;
    }
  }

  // 데스크톱 휠 줌
  function onWheel(e: React.WheelEvent) {
    if (!src) return;
    const next = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, transform.scale * (1 - e.deltaY * 0.0015)),
    );
    setTransform((t) => clamp({ ...t, scale: next }));
  }

  // 슬라이더 줌
  function onSlide(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setTransform((t) => clamp({ ...t, scale: next }));
  }

  // --- 크롭 + 압축 후 저장 ---------------------------------------------------
  function confirmPhoto() {
    if (!src || !natural) return;
    setBusy(true);
    try {
      const f = getFrame();
      const s = coverScale() * transform.scale;
      const rw = natural.w * s;
      const rh = natural.h * s;

      const imgLeft = f.w / 2 + transform.x - rw / 2;
      const imgTop = f.h / 2 + transform.y - rh / 2;
      let sx = (0 - imgLeft) / s;
      let sy = (0 - imgTop) / s;
      let sw = f.w / s;
      let sh = f.h / s;

      sx = Math.max(0, Math.min(sx, natural.w));
      sy = Math.max(0, Math.min(sy, natural.h));
      sw = Math.min(sw, natural.w - sx);
      sh = Math.min(sh, natural.h - sy);

      const ratio = f.w / f.h;
      let outW: number, outH: number;
      if (ratio >= 1) {
        outW = OUTPUT_MAX;
        outH = Math.round(OUTPUT_MAX / ratio);
      } else {
        outH = OUTPUT_MAX;
        outW = Math.round(OUTPUT_MAX * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx || !imgElRef.current) {
        setBusy(false);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(imgElRef.current, sx, sy, sw, sh, 0, 0, outW, outH);

      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

      try {
        sessionStorage.setItem(PHOTO_KEY, dataUrl);
      } catch {
        /* 용량 초과 등 무시 */
      }

      void submitDiagnosis(dataUrl);
      router.push("/ai-loading");
    } finally {
      setBusy(false);
    }
  }

  // 진단 데이터 백그라운드 제출 (Blob + Sheets) — 사용자 플로우 비차단
  async function submitDiagnosis(photoDataUrl: string) {
    try {
      const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
      const answers = raw ? (JSON.parse(raw) as Record<string, string | string[]>) : {};
      const rawCounts = sessionStorage.getItem(TREATMENT_COUNTS_KEY);
      const treatmentCounts = rawCounts ? (JSON.parse(rawCounts) as Record<string, number>) : {};
      // 원본 셀카(photoDataUrl)는 보내지 않는다 — 서버가 더 이상 저장하지 않으므로
      // 얼굴 데이터를 불필요하게 전송하지 않는다(데이터 최소화).
      const body: SubmitDiagnosisBody = { answers, treatmentCounts };
      await fetch("/api/submit-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* 제출 실패는 결과 페이지 이동을 막지 않음 */
    }
  }

  function resetSrc() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setNatural(null);
    setTransform({ scale: 1, x: 0, y: 0 });
    pointers.current.clear();
    gesture.current.mode = null;
  }

  // ── 네비게이션 핸들러 ──────────────────────────────────────────────────────

  function handleEditPrevious() {
    resetSrc();
    setSavedPhoto(null);
    try { sessionStorage.removeItem(PHOTO_KEY); } catch { /* ignore */ }
    router.push("/diagnosis/quick");
  }

  function handleHardReset() {
    resetSrc();
    setSavedPhoto(null);
    try {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      sessionStorage.removeItem(PHOTO_KEY);
    } catch { /* ignore */ }
    router.push("/");
  }

  // 화면에 그릴 이미지 크기/위치
  const s = natural ? coverScale() * transform.scale : 1;
  const rw = natural ? natural.w * s : 0;
  const rh = natural ? natural.h * s : 0;

  const showChooser = !src && !camera && !savedPhoto;

  // 가이드 화면
  if (showGuide) {
    return <PhotoGuide onConfirm={() => setShowGuide(false)} />;
  }

  return (
    <main className="min-h-screen bg-charcoal pb-32 text-cream">
      {/* 스텝 인디케이터 */}
      <Stepper />

      <div className="mx-auto w-full max-w-2xl px-6">
        {/* 헤더 */}
        <div className="pt-8 text-center">
          <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-gold">
            Step 1 · Photo
          </span>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-snug text-cream">
            정면 얼굴 사진을 올려주세요
          </h1>
          <p className="mt-3 text-lg text-cream/65">
            원본 사진은 안전하게 보존되고, 헤어스타일만 AI로 변환돼요.
          </p>
        </div>

        {/* 저장된 사진이 있고 새 편집/촬영 중이 아니면: 캐시 미리보기 */}
        {savedPhoto && !src && !camera ? (
          <CachedPreview
            photo={savedPhoto}
            onRetake={() => { setSavedPhoto(null); }}
            onContinue={() => router.push("/result")}
          />
        ) : (
          <>
            {/* 크롭 / 카메라 프레임 */}
            <div className="mt-8 flex justify-center">
              <div
                ref={frameRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
                style={{ aspectRatio: String(FRAME_RATIO) }}
                className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-3xl border border-white/15 bg-black/40"
              >
                {/* 1) 카메라 라이브 프리뷰 */}
                {camera && (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                  />
                )}

                {/* 2) 업로드/촬영된 이미지 (크롭 편집) */}
                {!camera && src && natural && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={imgElRef}
                    src={src}
                    alt="업로드한 사진"
                    draggable={false}
                    style={{
                      position: "absolute",
                      display: "block",
                      left: "50%",
                      top: "50%",
                      width: `${rw}px`,
                      aspectRatio: natural ? `${natural.w} / ${natural.h}` : undefined,
                      maxWidth: "none",
                      minWidth: 0,
                      minHeight: 0,
                      transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`,
                    }}
                  />
                )}

                {/* 3) 빈 상태: 촬영/업로드 선택 */}
                {showChooser && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6">
                    <button
                      onClick={startCamera}
                      className="flex w-full max-w-[14rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark py-3.5 text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]"
                    >
                      📷 카메라로 촬영
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full max-w-[14rem] items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 py-3.5 text-base font-medium text-cream/85 transition-colors hover:border-white/45 hover:text-cream active:scale-[0.98]"
                    >
                      🖼 갤러리에서 선택
                    </button>
                  </div>
                )}

                {/* 얼굴 가이드라인 점선 오버레이 (항상 표시) */}
                <FaceGuide />
              </div>
            </div>

            {/* 카메라 권한/에러 안내 */}
            {camError && (
              <p className="mx-auto mt-4 max-w-sm text-center text-[15px] text-red-300/90">
                {camError}
              </p>
            )}

            {/* 줌 슬라이더 (편집 중일 때만) */}
            {src && !camera && (
              <div className="mx-auto mt-5 flex w-full max-w-sm items-center gap-3">
                <span className="text-[15px] text-cream/50">－</span>
                <input
                  type="range"
                  min={MIN_SCALE}
                  max={MAX_SCALE}
                  step={0.01}
                  value={transform.scale}
                  onChange={onSlide}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-gold"
                  aria-label="확대 / 축소"
                />
                <span className="text-[15px] text-cream/50">＋</span>
              </div>
            )}

            {/* 촬영 팁 — 사전 가이드에서 이미 안내하므로 제거 */}
          </>
        )}

        {/* [Mock] 임시 얼굴형 선택기 — Vision API 연동 전 테스트용 */}
        {!camera && (
          <div className="mx-auto mt-8 w-full max-w-sm">
            <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4">
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-gold">
                [테스트] 임시 얼굴형 선택
              </p>
              <p className="mb-3 text-[13px] text-cream/50">
                Vision API 연동 전 결과지 테스트용이에요. 실제 서비스에서는 AI가 자동 분석합니다.
              </p>
              <select
                value={mockFaceShape}
                onChange={(e) => {
                  const val = e.target.value;
                  setMockFaceShape(val);
                  try { sessionStorage.setItem("faceShape_mock", val); } catch { /* ignore */ }
                }}
                className="w-full rounded-xl border border-white/20 bg-charcoal px-4 py-3 text-base text-cream focus:border-gold/60 focus:outline-none"
              >
                <option value="">얼굴형을 선택하세요</option>
                {FACE_SHAPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {mockFaceShape && (
                <p className="mt-2 text-[13px] text-gold-light/80">
                  선택됨: <span className="font-semibold">{FACE_SHAPE_OPTIONS.find(o => o.value === mockFaceShape)?.label}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* 숨김 파일 입력 (갤러리 / 모바일 카메라) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
      </div>

      {/* 하단 고정 액션 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-6 py-4">
          {camera ? (
            <>
              <button
                onClick={stopCamera}
                className="flex h-16 items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 text-lg font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
              >
                닫기
              </button>
              <button
                onClick={capturePhoto}
                className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-xl font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <span className="text-2xl leading-none">●</span> 촬영하기
              </button>
            </>
          ) : src ? (
            <>
              <button
                onClick={resetSrc}
                className="flex h-16 items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 text-lg font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
              >
                다시 선택
              </button>
              <motion.button
                key={src ?? "idle"}
                onClick={confirmPhoto}
                disabled={busy}
                initial={{ scale: 0.88, opacity: 0 }}
                animate={
                  busy
                    ? { scale: 1, opacity: 0.6 }
                    : {
                        scale: [1, 1.04, 1],
                        opacity: 1,
                        boxShadow: [
                          "0 0 0 0 rgba(200,168,107,0)",
                          "0 0 0 10px rgba(200,168,107,0.35)",
                          "0 0 0 0 rgba(200,168,107,0)",
                        ],
                      }
                }
                transition={
                  busy
                    ? { duration: 0.2 }
                    : {
                        scale: {
                          duration: 1.6,
                          repeat: Infinity,
                          repeatDelay: 0.6,
                          ease: "easeInOut",
                          delay: 0.3,
                        },
                        boxShadow: {
                          duration: 1.6,
                          repeat: Infinity,
                          repeatDelay: 0.6,
                          ease: "easeInOut",
                          delay: 0.3,
                        },
                        opacity: { duration: 0.25, type: "spring", stiffness: 280, damping: 20 },
                      }
                }
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-xl font-bold text-charcoal disabled:opacity-60"
              >
                {busy ? "처리 중…" : "이 사진으로 분석하기"}
              </motion.button>
            </>
          ) : (
            <>
              <button
                onClick={handleEditPrevious}
                className="flex h-16 flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-lg font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
              >
                답변 수정하기
              </button>
              <button
                onClick={handleHardReset}
                className="flex h-16 flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-lg font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
              >
                처음부터 새로
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// 스텝 인디케이터
// ============================================================================
function Stepper() {
  const steps = ["사진 추가", "AI 합성", "결과 확인"];
  const active = 0;
  return (
    <div className="border-b border-white/10 bg-charcoal/80 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[15px] font-medium ${
                i <= active ? "bg-gold/15 text-gold-light" : "text-cream/40"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold ${
                  i <= active ? "bg-gold-dark text-charcoal" : "bg-white/10 text-cream/50"
                }`}
              >
                {i + 1}
              </span>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-white/15 sm:w-6" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 얼굴 가이드라인 점선 오버레이
// ============================================================================
function FaceGuide() {
  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
    >
      <defs>
        <mask id="faceMask">
          <rect width="300" height="400" fill="white" />
          <ellipse cx="150" cy="185" rx="92" ry="120" fill="black" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgba(0,0,0,0.35)" mask="url(#faceMask)" />
      <ellipse
        cx="150"
        cy="185"
        rx="92"
        ry="120"
        fill="none"
        stroke="rgba(200,168,107,0.9)"
        strokeWidth="2"
        strokeDasharray="7 8"
      />
      <path
        d="M40 400 C70 330 110 312 150 312 C190 312 230 330 260 400"
        fill="none"
        stroke="rgba(200,168,107,0.5)"
        strokeWidth="2"
        strokeDasharray="7 8"
      />
      <line
        x1="150"
        y1="78"
        x2="150"
        y2="292"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeDasharray="3 7"
      />
    </svg>
  );
}

// ============================================================================
// 캐시된 사진 미리보기 (새로고침/뒤로가기 시 재업로드 방지)
// ============================================================================
function CachedPreview({
  photo,
  onRetake,
  onContinue,
}: {
  photo: string;
  onRetake: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col items-center">
      <div
        style={{ aspectRatio: String(FRAME_RATIO) }}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-gold/30"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="업로드한 사진" className="h-full w-full object-cover" />
      </div>
      <p className="mt-4 text-center text-base text-cream/60">
        이전에 올린 사진이 있어요. 이대로 진행하거나 다시 등록할 수 있어요.
      </p>
      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        <button
          onClick={onRetake}
          className="flex h-14 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-base font-medium text-cream/80 transition-colors hover:border-white/40 hover:text-cream active:scale-[0.98]"
        >
          다시 등록
        </button>
        <button
          onClick={onContinue}
          className="flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]"
        >
          이 사진으로 계속
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 사진 촬영 가이드 프리스크린 (통이미지 버전)
// ============================================================================
function PhotoGuide({ onConfirm }: { onConfirm: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-charcoal pb-32">
      <div className="mx-auto w-full max-w-sm px-4 pt-8 overflow-y-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={guideImg.src}
          alt="촬영 가이드"
          className="w-full h-auto"
        />
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          <button
            onClick={onConfirm}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-xl font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]"
          >
            가이드 확인했어요 · 사진 찍으러 가기 →
          </button>
        </div>
      </div>
    </main>
  );
}
