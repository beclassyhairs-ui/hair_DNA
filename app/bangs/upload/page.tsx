"use client";

// ============================================================================
// 어뷰티 인생뱅 — 사진 업로드 + MediaPipe 얼굴형 분석 + Fake Loading
// 사진 확정 즉시 MediaPipe 분석 시작 (비동기, 10s 로딩과 병렬)
// MediaPipe 실패 시 모의 얼굴형 선택기로 fallback
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { BANGS_PHOTO_KEY, BANGS_FACESHAPE_KEY, BANGS_LANDMARKS_KEY, BANGS_DEBUG_RATIOS_KEY } from "../constants";
import { analyzeFaceShape, type FaceShapeKey, type FaceLandmarkData, type FaceRatios } from "../../../lib/faceAnalysis";

const FACE_SHAPE_OPTIONS: { value: FaceShapeKey; label: string }[] = [
  { value: "oval",    label: "계란형" },
  { value: "round",   label: "둥근형" },
  { value: "oblong",  label: "긴형" },
  { value: "square",  label: "각진형" },
  { value: "heart",   label: "하트형" },
  { value: "diamond", label: "다이아몬드형" },
  { value: "hexagon", label: "육각형" },
  { value: "peanut",  label: "땅콩형" },
];

const LOADING_STEPS = [
  "AI가 얼굴 윤곽과 비율을 스캐닝 중입니다...",
  "골격 구조 데이터를 정밀 측정하고 있습니다...",
  "468개 랜드마크를 분석 및 매칭 중입니다...",
  "최적의 앞머리 유형을 도출하고 있습니다...",
  "전문가 처방전을 생성하고 있습니다...",
];

const LOADING_MS = 10_000;

// ─── Fake Loading 오버레이 ────────────────────────────────────────────────────

function FakeLoadingOverlay() {
  const [stepIdx, setStepIdx]   = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 120;
      setProgress(Math.min(100, Math.round((elapsed / LOADING_MS) * 100)));
      setStepIdx(Math.min(LOADING_STEPS.length - 1, Math.floor((elapsed / LOADING_MS) * LOADING_STEPS.length)));
    }, 120);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-charcoal px-6 py-14"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/5 px-5 py-2 text-sm font-semibold tracking-wide text-gold">
        ✦ 어뷰티 AI 분석 중
      </span>

      <div className="flex flex-col items-center gap-8 text-center">
        {/* 골드 스피너 */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid transparent", borderTopColor: "rgba(200,168,107,0.9)", borderRightColor: "rgba(200,168,107,0.3)" }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full"
            style={{ border: "1.5px solid transparent", borderTopColor: "rgba(200,168,107,0.5)", borderLeftColor: "rgba(200,168,107,0.2)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-3 w-3 rounded-full bg-gold"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="max-w-xs text-center text-lg font-medium leading-relaxed text-cream/85"
          >
            {LOADING_STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>

        <div className="w-56">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: "linear" }}
            />
          </div>
          <p className="mt-2 text-center text-base font-semibold tabular-nums text-gold/70">{progress}%</p>
        </div>
      </div>

      <p className="text-center text-base text-cream/30">잠시만 기다려 주세요 · 곧 결과가 나와요</p>
    </motion.div>
  );
}

// ─── 얼굴 가이드라인 SVG ──────────────────────────────────────────────────────

function FaceGuide() {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full">
      <defs>
        <mask id="bangFaceM">
          <rect width="300" height="400" fill="white" />
          <ellipse cx="150" cy="185" rx="90" ry="118" fill="black" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgba(0,0,0,0.40)" mask="url(#bangFaceM)" />
      <ellipse cx="150" cy="185" rx="90" ry="118" fill="none"
        stroke="rgba(200,168,107,0.92)" strokeWidth="2.5" strokeDasharray="8 7" />
      <path d="M35 400 C68 322 108 308 150 308 C192 308 232 322 265 400"
        fill="none" stroke="rgba(200,168,107,0.45)" strokeWidth="2" strokeDasharray="7 8" />
      <line x1="150" y1="72" x2="150" y2="288"
        stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 8" />
      <text x="150" y="58" textAnchor="middle"
        fill="rgba(200,168,107,0.75)" fontSize="11" fontFamily="system-ui" letterSpacing="1">
        얼굴을 여기 맞춰주세요
      </text>
    </svg>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function BangsUploadPage() {
  const router = useRouter();

  const [src, setSrc]           = useState<string | null>(null);
  const [camera, setCamera]     = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mpStatus, setMpStatus] = useState<"idle" | "analyzing" | "done" | "failed">("idle");
  // mockShape 제거 — sessionStorage에서 이전 결과를 읽어 fallback으로 쓰면
  // 한 번 "square"가 기록되면 이후 모든 분석이 square로 고착되는 독약 루프 발생

  const videoRef        = useRef<HTMLVideoElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const imgRef          = useRef<HTMLImageElement | null>(null);
  // MediaPipe 분석 결과를 10s 로딩과 병렬로 수신해 저장
  const gptShapeRef     = useRef<FaceShapeKey | null>(null); // GPT 얼굴형 판정
  const mpResultRef     = useRef<FaceShapeKey | null>(null); // MediaPipe (랜드마크 추출용 부산물)
  const mpLandmarksRef  = useRef<FaceLandmarkData | null>(null);
  const mpRatiosRef     = useRef<FaceRatios | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  useEffect(() => {
    if (camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camera]);

  async function startCamera() {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError("이 브라우저에서는 카메라를 사용할 수 없어요. 갤러리에서 선택해 주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setSrc(null);
      setCamera(true);
    } catch {
      setCamError("카메라 접근이 거부됐어요. 갤러리에서 선택해 주세요.");
    }
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setSrc(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (typeof ev.target?.result === "string") setSrc(ev.target.result); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ─── GPT-4o-mini 얼굴형 판정 (핵심 판정 담당) ───────────────────────────────
  async function runGptFaceAnalysis(dataUrl: string) {
    try {
      const res = await fetch("/api/analyze-face", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: dataUrl }),
        signal:  AbortSignal.timeout(25_000),
      });
      const data = await res.json() as { ok: boolean; shape?: string };
      if (data.ok && data.shape) {
        gptShapeRef.current = data.shape as FaceShapeKey;
        console.log("[GPT] ✅ 얼굴형 판정:", data.shape);
      }
    } catch (e) {
      console.warn("[GPT] 얼굴형 판정 실패 — oval fallback:", e);
    }
  }

  // ─── MediaPipe 랜드마크 추출 (Canvas 시각화 전용 — 판정에는 미사용) ──────────
  async function runFaceAnalysis(dataUrl: string) {
    setMpStatus("analyzing");
    try {
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
      });
      imgRef.current = img;
      const result = await analyzeFaceShape(img); // FaceAnalysisResult | null
      if (result) {
        mpResultRef.current    = result.shape;
        mpLandmarksRef.current = result.landmarks;
        mpRatiosRef.current    = result.ratios;
        setMpStatus("done");
      } else {
        setMpStatus("failed");
      }
    } catch {
      setMpStatus("failed");
    }
  }

  async function confirmPhoto() {
    if (!src) return;

    // ① 이전 분석 오염 데이터 초기화 — 독약 루프 원천 차단
    try {
      sessionStorage.removeItem(BANGS_FACESHAPE_KEY);
      sessionStorage.removeItem(BANGS_LANDMARKS_KEY);
      sessionStorage.removeItem(BANGS_DEBUG_RATIOS_KEY);
    } catch { /**/ }

    try { sessionStorage.setItem(BANGS_PHOTO_KEY, src); } catch { /**/ }
    setIsLoading(true);

    // ② 로딩 최소 10초 + GPT 판정 + MediaPipe 랜드마크 — 모두 병렬 실행
    await Promise.allSettled([
      new Promise<void>(resolve => setTimeout(resolve, LOADING_MS)),
      runGptFaceAnalysis(src),   // 핵심: GPT-4o-mini 얼굴형 판정
      runFaceAnalysis(src),      // 보조: MediaPipe 랜드마크 추출 (Canvas 시각화용)
    ]);

    // ③ GPT 결과 우선 → MediaPipe 결과 → "oval" 안전 fallback
    const finalShape: FaceShapeKey = gptShapeRef.current ?? mpResultRef.current ?? "oval";
    try { sessionStorage.setItem(BANGS_FACESHAPE_KEY, finalShape); } catch { /**/ }
    if (mpLandmarksRef.current) {
      try { sessionStorage.setItem(BANGS_LANDMARKS_KEY, JSON.stringify(mpLandmarksRef.current)); } catch { /**/ }
    }
    if (mpRatiosRef.current) {
      try { sessionStorage.setItem(BANGS_DEBUG_RATIOS_KEY, JSON.stringify(mpRatiosRef.current)); } catch { /**/ }
    }

    setIsLoading(false);
    router.push("/bangs/result");
  }

  const showChooser = !src && !camera;

  return (
    <main className="flex min-h-screen flex-col bg-charcoal text-cream">
      <AnimatePresence>{isLoading && <FakeLoadingOverlay />}</AnimatePresence>

      {/* 헤더 */}
      <header className="border-b border-white/[0.07] px-5 py-4">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between">
          <a href="/bangs/survey" className="text-base font-medium text-cream/40 hover:text-cream">← 이전</a>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">인생뱅 · 사진</span>
          <div className="w-12" />
        </div>
      </header>

      {/* 사진 프레임 영역 — 높이 제한으로 버튼 겹침 방지 */}
      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-5 pb-6">
        <div className="pt-6 text-center">
          <h1 className="font-serif text-2xl font-bold leading-snug text-cream">
            정면 얼굴 사진을 올려주세요
          </h1>
          <p className="mt-1.5 text-sm text-cream/40">귀가 보이게 찍으면 분석 정확도가 높아져요</p>
        </div>

        {/* 사진 프레임 — max-h 제한으로 화면 초과 방지 */}
        <div className="mt-5 flex justify-center">
          <div
            className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-white/15 bg-black/40"
            style={{ aspectRatio: "3/4", maxHeight: "56vh" }}
          >
            {camera && (
              <video ref={videoRef} playsInline muted autoPlay
                className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            )}
            {!camera && src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="업로드한 사진" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {showChooser && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6">
                <button onClick={startCamera}
                  className="flex w-full max-w-[14rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark py-3.5 text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
                  카메라로 촬영
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex w-full max-w-[14rem] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 text-base font-medium text-cream/80 transition-colors hover:border-white/40 active:scale-[0.98]">
                  갤러리에서 선택
                </button>
              </div>
            )}
            <FaceGuide />
          </div>
        </div>

        {camError && <p className="mt-4 text-center text-sm text-red-300/90">{camError}</p>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 pb-8 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          {camera ? (
            <>
              <button onClick={stopCamera}
                className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-8 text-lg font-medium text-cream/60 hover:text-cream">
                닫기
              </button>
              <button onClick={captureFromCamera}
                className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-xl font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
                <span className="text-2xl leading-none">●</span> 촬영하기
              </button>
            </>
          ) : src ? (
            <>
              <button onClick={() => setSrc(null)}
                className="flex h-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-8 text-lg font-medium text-cream/60 hover:text-cream">
                다시 선택
              </button>
              <button onClick={confirmPhoto}
                className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-gold-dark text-xl font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98]">
                ✦ 이 사진으로 분석하기
              </button>
            </>
          ) : (
            <div className="flex h-16 flex-1 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-lg text-cream/30">
              위에서 사진을 선택해 주세요
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
