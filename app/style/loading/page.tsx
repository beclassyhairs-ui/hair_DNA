"use client";

// ============================================================================
// /style/loading — 비동기 AI 헤어 합성 로딩 페이지
// - 마운트 즉시 /api/hair-transform 호출 (가짜 타이머 없음)
// - API 응답 완료 즉시 /style/result 로 라우팅
// - 대기 중 구글 AdSense 플레이스홀더 노출
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY, STYLE_DEBUG_ERROR_KEY, STYLE_GENERATED_KEY, STYLE_LIMIT_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";
import { incrementUsage } from "@/lib/dailyLimit";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import AdBanner from "@/app/components/AdBanner";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";

const STEPS = [
  "AI가 고객님의 두상과 8가지 모질 데이터를 정밀 결합 중입니다...",
  "두상 구조와 희망 스타일 데이터를 정밀 매칭하고 있습니다...",
  "전문가 헤어 데이터베이스에서 최적 스타일을 도출하고 있습니다...",
  "맞춤 케어 처방전과 스타일을 최종 생성하고 있습니다...",
  "마지막 세부 조정 중입니다. 결과지가 곧 완성됩니다...",
];

const HAIR_TIPS = [
  "드라이 마지막 10초는 찬바람으로 마무리하세요. 큐티클이 닫히며 윤기가 살고, 아침에 잡은 스타일이 저녁까지 유지됩니다.",
  "샴푸 전 건식 브러싱 2분이면 두피 노폐물이 떠오르고 모발 엉킴이 풀려, 같은 샴푸로도 세정력이 훨씬 높아집니다.",
  "트리트먼트가 두피에 닿으면 모공을 막아 탈모를 유발합니다. 반드시 귀 아래 모발에만 얇게 도포하세요.",
  "열 스타일링 전 열 보호제는 선택이 아닌 필수입니다. 180°C 고온 한 번이 모발 단백질 구조를 영구 손상시킵니다.",
  "샴푸 시 손끝으로 두피를 30초 마사지하면 혈액순환이 활성화되어 모발 성장 주기 자체가 달라집니다.",
  "펌·컬러 후 48시간은 황금 시간입니다. 이 시간 안에 모발이 젖으면 웨이브가 풀리거나 색이 빠질 수 있어요.",
];

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [tipIdx,  setTipIdx]  = useState(0);
  const calledRef  = useRef(false); // 중복 호출 방지

  // 텍스트 스텝 로테이션 (시각 연출 — API 와 독립)
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => (i + 1) % STEPS.length), 3_000);
    return () => clearInterval(t);
  }, []);

  // 꿀팁 롤링 (2.5초 간격 — STEPS 와 독립)
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % HAIR_TIPS.length), 2_500);
    return () => clearInterval(t);
  }, []);

  // ── 마운트 즉시 API 호출 ────────────────────────────────────────────────────
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function run() {
      // 입력·게이트 검증은 try/finally 밖에서 한다 — 여기서 다른 곳으로 라우팅하면
      // 아래 합성 finally의 "/style/result" 이동과 경쟁하지 않도록 즉시 return한다.
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      const raw   = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      // 셀카 없으면 업로드로(결과지로 진행하지 않음)
      if (!photo) { router.replace("/style/upload"); return; }

      // ── Phase B 로그인 게이트 ──────────────────────────────────────────────
      // AI 합성(유료·결과 공개) 직전에 실제 카카오 로그인을 요구한다. 미로그인 시
      // 카카오로 보냈다가 /style/loading으로 복귀 → sessionStorage의 셀카·답변이
      // 그대로 남아 있어(같은 탭) 이어서 합성한다. 합성/횟수 차감은 로그인 이후에만.
      // ★ 결과지로 진행하지 않고 return — 로그인 화면으로만 이동한다.
      if (isLoginRequiredBeforeSynthesis()) {
        let loggedIn = false;
        try {
          const me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json());
          loggedIn = Boolean(me?.loggedIn);
        } catch { loggedIn = false; }
        if (!loggedIn) {
          window.location.href =
            `/api/auth/kakao/start?return_to=${encodeURIComponent("/style/loading")}`;
          return;
        }
      }

      // ── 합성 ──
      // 이전 상태 초기화(직전 생성 이미지 + 디버그 에러 + 한도 안내).
      // ★ STYLE_GENERATED_KEY도 반드시 지운다 — 안 지우면 이번 실패/429가 나도 결과지가
      //   과거 생성 이미지를 먼저 읽어(한도 카드보다 우선) 낡은 결과를 보여준다.
      try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_LIMIT_KEY); } catch { /**/ }

      // 설문 답변만 Sheets에 기록 — fire-and-forget.
      // 원본 셀카(photo)는 이 엔드포인트로 보내지 않는다(더 이상 저장하지 않으므로
      // 얼굴 데이터를 불필요하게 전송하지 않는다). 셀카는 아래 hair-transform에만 전달.
      void fetch("/api/submit-diagnosis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          answers:      toSheetAnswers(answers),
          treatmentCounts: {},
        }),
      });

      // ★ Replicate AI 합성 (62초 타임아웃).
      try {
        incrementUsage(); // 클라 표시용 횟수(서버 제한이 실제 강제)
        console.log("[AI] /api/hair-transform 호출 시작...");
        const res  = await fetch("/api/hair-transform", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userPhoto: photo, answers }),
          signal:  AbortSignal.timeout(62_000),
        });

        // 서버 게이트 응답 우선 처리
        // 401(세션 만료 등) → 재로그인. 결과지로 가지 않는다(즉시 return).
        if (res.status === 401) {
          window.location.href =
            `/api/auth/kakao/start?return_to=${encodeURIComponent("/style/loading")}`;
          return;
        }

        const data = await res.json() as {
          ok: boolean; imageUrl?: string; reason?: string; message?: string; debugError?: string;
        };
        console.log("[AI] 응답 전체:", data);

        if (res.status === 429 || data.reason === "daily_limit") {
          // 일일 한도 초과 → 결과지에 친절한 안내 카드로(빨간 에러 아님)
          const msg = data.message ?? "오늘 무료 횟수를 모두 사용했어요. 내일 다시 만나요.";
          try { sessionStorage.setItem(STYLE_LIMIT_KEY, msg); } catch { /**/ }
        } else if (data.ok && data.imageUrl) {
          console.log("[AI] ✅ 최종 AI 이미지 URL:", data.imageUrl);
          try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
          try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
        } else {
          const errMsg = data.debugError ?? `reason: ${data.reason ?? "unknown"} (debugError 없음)`;
          console.warn("[AI] ⚠️ 이미지 생성 실패 —", errMsg);
          try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
        }
      } catch (e) {
        console.error("[AI] ❌ API 호출 예외:", e);
      }

      // 합성 시도 완료(성공/실패/타임아웃/한도 무관) → 결과지 이동.
      // replace 사용: loading을 히스토리에서 제거해 결과지에서 뒤로가기 시
      // 분석중 화면(및 API 재호출)으로 돌아가지 않고 upload로 이동하게 한다.
      router.replace("/style/result");
    }

    run();
  }, [router]);

  return (
    <SilkBackground>
      <main className="flex h-[100dvh] flex-col overflow-hidden text-[#2F2A22]">

        {/* ── 상단 40% — 브랜드 배지 + 스피너 + 텍스트 ── */}
        <div className="flex flex-none flex-col items-center justify-center gap-5 px-6 pb-4 pt-10"
          style={{ flex: "0 0 40%" }}>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EDE7DA] bg-white/60 px-4 py-1.5 text-[13px] font-bold tracking-wide text-[#A8884A]">
            AI 스타일 합성 중
          </span>

          {/* 소형 골드 링 스피너 */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "rgba(200,168,107,0.95)", borderRightColor: "rgba(200,168,107,0.2)" }} />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full"
              style={{ border: "1.5px solid transparent", borderTopColor: "rgba(200,168,107,0.5)", borderLeftColor: "rgba(200,168,107,0.15)" }} />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-2 w-2 rounded-full bg-[#C8A86B]" />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={stepIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="max-w-[260px] text-center text-[15px] font-medium leading-relaxed text-[#4A453B]"
            >
              {STEPS[stepIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── 하단 60% — 헤어 꿀팁 콘텐츠 + AdSense 광고 ── */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 pb-6">

          {/* 헤어 꿀팁 — 롤링 애니메이션 (구글 게시자 콘텐츠 영역) */}
          <div className="flex-none">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#A8884A]">
              기다리는 동안 읽는 헤어 꿀팁
            </p>

            {/* 단일 팁 카드 — fade 롤링 */}
            <GlassCard className="relative flex min-h-[72px] items-center px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 flex-none h-1 w-1 rounded-full bg-[#A8884A]" />
                  <p className="text-[12px] leading-relaxed text-[#4A453B]">{HAIR_TIPS[tipIdx]}</p>
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            {/* 진행 도트 */}
            <div className="mt-2.5 flex justify-center gap-1.5">
              {HAIR_TIPS.map((_, i) => (
                <span key={i}
                  className={`inline-block h-1 rounded-full transition-all duration-300 ${i === tipIdx ? "w-4 bg-[#C8A86B]/70" : "w-1 bg-[#EDE7DA]"}`}
                />
              ))}
            </div>
          </div>

          {/* 구글 AdSense — 슬롯 ID는 AdSense 대시보드에서 발급 후 입력 */}
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm" style={{ minHeight: "250px" }}>
              <AdBanner slot="4013466421" />
            </div>
          </div>

        </div>

      </main>
    </SilkBackground>
  );
}
