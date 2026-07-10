"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { BANGS_FACESHAPE_KEY, BANGS_SURVEY_KEY } from "../constants";
import {
  FACE_SHAPE_INFO,
  recommendBang,
  type FaceShapeKey,
  type BangType,
} from "../bangRecommend";
import type { BangsSurveyAnswers } from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";

const LANDING_ID = "bang_test";

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

// ─── 앞머리 솔루션 화보 카드 ──────────────────────────────────────────────────

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
  const [survey,   setSurvey]   = useState<BangsSurveyAnswers | null>(null);
  const [faceKey,  setFaceKey]  = useState<FaceShapeKey>("round");
  const router = useRouter();
  const [copied,    setCopied]    = useState(false);
  const [kakaoSent, setKakaoSent] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(BANGS_SURVEY_KEY);
      if (s) setSurvey(JSON.parse(s) as BangsSurveyAnswers);
      const f = sessionStorage.getItem(BANGS_FACESHAPE_KEY) as FaceShapeKey | null;
      if (f && f in FACE_SHAPE_INFO) setFaceKey(f);

      // 결과지 뷰 = 진단 완료 트래킹 (페이지 마운트 시 1회, 세션에 저장된 최종 얼굴형 사용)
      trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, {
        landing_id: LANDING_ID,
        diagnosis_type: LANDING_ID,
        result_type: f && f in FACE_SHAPE_INFO ? f : undefined,
      });
    } catch { /**/ }
  }, []);

  const faceInfo    = FACE_SHAPE_INFO[faceKey];
  const safeAnswers = survey ?? { qFaceShape: "", q1: "", q2: "", q3: "", q4: "", q5: "" } as BangsSurveyAnswers;
  const bangRec     = recommendBang(faceKey, safeAnswers);

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
    <main className="mx-auto min-h-screen max-w-[430px] bg-[#F9FAFB] pb-40 text-[#2F2F2F]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-[#F9FAFB]/92 px-5 py-3.5 backdrop-blur-md">
        <Link href="/bangs/survey" className="text-sm font-medium text-[#6B7280] hover:text-[#2F2F2F] transition-colors">
          ← 다시 하기
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">진단 결과지</span>
        <button onClick={handleKakaoShare} className="text-sm font-medium text-[#6B7280] hover:text-[#2F2F2F] transition-colors">
          {kakaoSent ? "전송됨 ✓" : "공유"}
        </button>
      </header>

      {/* ── 얼굴형 진단 + 앞머리 솔루션 화보 ── */}
      <div className="px-5 pt-7 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">AI DIAGNOSIS</p>
        <p className="mt-1 font-serif text-2xl font-bold text-gold-light">{faceInfo.title}</p>
      </div>
      <div className="mx-auto mt-5 w-full max-w-[220px] px-4">
        <BangReferenceCard
          bangType={bangRec.primary}
          bangLabel={bangRec.primaryLabel}
        />
      </div>

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
              <p className="mt-4 text-base leading-[1.85] text-[#374151]">
                <BoldText text={bangRec.reasonText} />
              </p>
              <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3">
                <p className="text-sm font-medium text-red-300/80">
                  ❌ 피해주세요 — {bangRec.ngStyle}
                </p>
              </div>
            </div>
          </motion.div>


          {/* BLOCK F: 공유 */}
          <motion.div variants={FADE_UP}
            className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
            <p className="text-center text-base font-semibold text-[#2F2F2F]">친구도 인생 앞머리 찾아줄까요?</p>
            <p className="mt-1 text-center text-sm text-[#6B7280]">결과를 공유하고 서로 비교해 보세요</p>
            <button
              onClick={handleKakaoShare}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-[#FEE500] py-3.5 text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98]"
            >
              <span className="text-lg">💬</span>
              {kakaoSent ? "카카오톡 전송 완료 ✓" : "카카오톡으로 공유하기"}
            </button>
            <button
              onClick={handleCopyLink}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-[#6B7280] transition-all hover:border-gray-300 hover:text-[#2F2F2F] active:scale-[0.98]"
            >
              {copied ? "✓ 복사됨" : "🔗 링크 복사"}
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-md">
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
            className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#2F2F2F]">
            ← 처음부터 다시 하기
          </Link>
        </div>
      </div>

    </main>
  );
}
