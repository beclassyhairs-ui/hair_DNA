"use client";

// ============================================================================
// /style/loading — 비동기 AI 헤어 합성 로딩 페이지 (폴링 구조)
// - 마운트 즉시 POST /api/hair-transform 로 예측 "착수"(id/token 수신)
// - 이후 POST /api/hair-transform/status 를 2.5초 간격으로 최대 8분 폴링(확정125: 5→8분)
// - 새로고침해도 sessionStorage(STYLE_JOB_KEY)의 {id,token,startedAt}로 폴링 재개
// - 8분 예산 소진 시 /api/hair-transform/cancel 로 예측 취소(비용 중단 목적, 환불 없음) 후 실패 안내
// - GPU 콜드스타트(첫 요청 수 분)를 견디는 것이 목적. 동기대기(62s abort) 구조는 폐기.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY, STYLE_DEBUG_ERROR_KEY, STYLE_FAIL_REASON_KEY, STYLE_GENERATED_KEY, STYLE_JOB_KEY, STYLE_LIMIT_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";
import { incrementUsage } from "@/lib/dailyLimit";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { ensureLoggedInOrRedirect } from "@/lib/authGate";
import { clearAccountId, trackEvent } from "@/lib/eventTracking";
import * as Sentry from "@sentry/nextjs";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";

const STEPS = [
  "사진을 확인하고 있어요",
  "원하시는 스타일을 입히는 중이에요",
  "자연스럽게 다듬어 마무리하는 중이에요",
];

// faceswap 합성 자체는 빠르지만(웜업 후 수 초), GPU 콜드스타트 시 수 분 걸린다.
const MIN_LOADING_MS   = 2_800;   // 너무 빨리 끝났을 때 로딩이 깜빡이며 지나가지 않게 하는 하한
const POLL_INTERVAL_MS = 2_500;   // status 폴링 간격
// 전체 대기 상한(확정125: 5→8분). 부팅이 5분을 넘긴 실측 사례(대시보드 최악 15분)가 있어 상향.
// ★ 아래 로딩 문구의 "최대 N분"도 이 상수에서 파생(POLL_BUDGET_MIN) → 표기 상한과 폴링 상한이
//   절대 갈라지지 않는다(문구만 8분인데 폴링이 5분에 포기하면 안내와 달리 에러를 보게 됨).
const POLL_BUDGET_MS   = 480_000; // 8분
const POLL_BUDGET_MIN  = Math.round(POLL_BUDGET_MS / 60_000); // 로딩 문구용(분)
const PER_POLL_TIMEOUT = 15_000;  // 폴 1회 타임아웃
const LONG_WAIT_MS     = 20_000;  // 이 시간 넘게 걸리면 "처음 한 번은 오래 걸려요" 안내로 전환

const HAIR_TIPS = [
  "드라이 마지막 10초는 찬바람으로 마무리하세요. 큐티클이 닫히며 윤기가 살고, 아침에 잡은 스타일이 저녁까지 유지됩니다.",
  "샴푸 전 건식 브러싱 2분이면 두피 노폐물이 떠오르고 모발 엉킴이 풀려, 같은 샴푸로도 세정력이 훨씬 높아집니다.",
  "트리트먼트가 두피에 닿으면 모공을 막아 탈모를 유발합니다. 반드시 귀 아래 모발에만 얇게 도포하세요.",
  "열 스타일링 전 열 보호제는 선택이 아닌 필수입니다. 180°C 고온 한 번이 모발 단백질 구조를 영구 손상시킵니다.",
  "샴푸 시 손끝으로 두피를 30초 마사지하면 혈액순환이 활성화되어 모발 성장 주기 자체가 달라집니다.",
  "펌·컬러 후 48시간은 황금 시간입니다. 이 시간 안에 모발이 젖으면 웨이브가 풀리거나 색이 빠질 수 있어요.",
];

const KNOWN_FAIL_REASONS = new Set([
  "daily_limit", "no_token", "bad_request", "missing_photo", "invalid_photo_format",
  "reference_fetch_failed", "poll_timeout", "api_error", "no_output", "exception",
  "content_flagged", "consent_required", "login_required", "network",
]);
function normFailReason(r: string | undefined): string {
  return r && KNOWN_FAIL_REASONS.has(r) ? r : "unknown";
}

interface JobRef { id: string; token: string; startedAt: number; }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [tipIdx,  setTipIdx]  = useState(0);
  const [longWait, setLongWait] = useState(false);
  const calledRef  = useRef(false); // 중복 호출 방지

  // 텍스트 스텝 로테이션 (시각 연출 — API 와 독립).
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), 1_100);
    return () => clearInterval(t);
  }, []);

  // 꿀팁 롤링 (2.5초 간격)
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % HAIR_TIPS.length), 2_500);
    return () => clearInterval(t);
  }, []);

  // 20초 넘게 걸리면 콜드스타트 안내로 문구 전환.
  useEffect(() => {
    const t = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  // ── 마운트 즉시 착수 + 폴링 ─────────────────────────────────────────────────
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const runStart = Date.now();

    // 최소 표시 시간 채운 뒤 결과지로 이동(정상/실패/타임아웃 공통 종착).
    async function finishAndRoute() {
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ }
      const elapsed = Date.now() - runStart;
      if (elapsed < MIN_LOADING_MS) await sleep(MIN_LOADING_MS - elapsed);
      router.replace("/style/result");
    }

    function goRelogin() {
      clearAccountId();
      window.location.href = `/login/consent?return_to=${encodeURIComponent("/style/loading")}`;
    }

    async function run() {
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      const raw   = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      // 셀카 없으면 업로드로(결과지로 진행하지 않음)
      if (!photo) { router.replace("/style/upload"); return; }

      // ── Phase B 로그인 게이트 (공용 authGate 헬퍼로 치환 — 동작 100% 불변) ──
      //   게이트 조건(isLoginRequiredBeforeSynthesis)·return_to(/style/loading)·clearAccountId·
      //   fail-closed 전부 기존과 동일. 서버 401 강제와 upload 동의 게이트는 별개로 그대로 유지.
      if (isLoginRequiredBeforeSynthesis()) {
        const ok = await ensureLoggedInOrRedirect("/style/loading", { onRedirect: clearAccountId });
        if (!ok) return;
      }

      // ── 새로고침 재개: 진행 중 작업이 있으면 그걸 이어서 폴링한다(중복 착수·중복 차감 방지) ──
      let job: JobRef | null = null;
      try {
        const rawJob = sessionStorage.getItem(STYLE_JOB_KEY);
        if (rawJob) {
          const parsed = JSON.parse(rawJob) as JobRef;
          if (parsed?.id && parsed?.token && typeof parsed.startedAt === "number"
              && Date.now() - parsed.startedAt < POLL_BUDGET_MS) {
            job = parsed;
          }
        }
      } catch { job = null; }

      if (job) {
        // 재개 경로: 이전 상태(결과/에러/한도)만 정리하고 바로 폴링. incrementUsage 재호출 안 함.
        clearPrevResultKeys();
        await pollUntilDone(job);
        return;
      }

      // ── 신규 착수 ──
      clearPrevResultKeys();

      // 설문 답변만 Sheets에 기록 — fire-and-forget(셀카 미전송).
      void fetch("/api/submit-diagnosis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ answers: toSheetAnswers(answers), treatmentCounts: {} }),
      });

      try {
        incrementUsage(); // 클라 표시용 횟수(서버 예약이 실제 강제)
        console.log("[AI] 예측 착수(POST /api/hair-transform)...");
        const res = await fetch("/api/hair-transform", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userPhoto: photo, answers }),
          signal:  AbortSignal.timeout(PER_POLL_TIMEOUT + 15_000), // 착수(레퍼런스 fetch+생성) 여유
        });

        if (res.status === 401) { goRelogin(); return; }

        const data = await res.json() as {
          ok: boolean; id?: string; token?: string; reason?: string; message?: string; debugError?: string;
        };

        if (res.status === 403 && data.reason === "consent_required") {
          window.location.href = `/login/consent?return_to=${encodeURIComponent("/style/loading")}`;
          return;
        }

        if (res.status === 429 || data.reason === "daily_limit") {
          const msg = data.message ?? "오늘 무료 횟수를 모두 사용했어요. 내일 다시 만나요.";
          try { sessionStorage.setItem(STYLE_LIMIT_KEY, msg); } catch { /**/ }
          void trackEvent("hair_transform_fail", { reason: "daily_limit", source: "style" });
          await finishAndRoute();
          return;
        }

        if (data.ok && data.id && data.token) {
          const started: JobRef = { id: data.id, token: data.token, startedAt: Date.now() };
          try { sessionStorage.setItem(STYLE_JOB_KEY, JSON.stringify(started)); } catch { /**/ }
          console.log("[AI] 착수 성공, 폴링 시작:", data.id);
          await pollUntilDone(started);
          return;
        }

        // 착수 자체 실패(레퍼런스 실패·토큰 오류 등)
        recordFail(data.reason, data.debugError);
        await finishAndRoute();
      } catch (e) {
        console.error("[AI] ❌ 착수 예외:", e);
        try { sessionStorage.setItem(STYLE_FAIL_REASON_KEY, "network"); } catch { /**/ }
        void trackEvent("hair_transform_fail", { reason: "network", source: "style" });
        Sentry.captureException(e);
        await finishAndRoute();
      }
    }

    // ── 폴링 루프: 성공/실패/타임아웃까지 ─────────────────────────────────────
    async function pollUntilDone(job: JobRef) {
      const deadline = job.startedAt + POLL_BUDGET_MS;
      while (Date.now() < deadline) {
        let data: { ok?: boolean; imageUrl?: string; status?: string; reason?: string; debugError?: string } | null = null;
        try {
          const res = await fetch("/api/hair-transform/status", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id: job.id, token: job.token }),
            signal:  AbortSignal.timeout(PER_POLL_TIMEOUT),
          });
          if (res.status === 401) { goRelogin(); return; }
          data = await res.json();
        } catch {
          // 일시적 네트워크/타임아웃 → 예산 내에서 계속 재시도
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (data?.ok && data.imageUrl) {
          try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
          try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
          void trackEvent("hair_transform_done", { source: "style" });
          await finishAndRoute();
          return;
        }

        if (data?.status === "processing") {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        // 그 외 = 터미널 실패(reason 있음)
        recordFail(data?.reason, data?.debugError);
        await finishAndRoute();
        return;
      }

      // 8분 예산 소진 → 예측 취소 요청(비용 중단, best-effort) 후 실패 안내
      console.warn("[AI] ⏱ 폴링 예산 소진 → 예측 취소 요청(비용 중단)");
      try {
        await fetch("/api/hair-transform/cancel", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ id: job.id, token: job.token }),
          signal:  AbortSignal.timeout(10_000),
        });
      } catch { /* best-effort */ }
      recordFail("poll_timeout", "폴링 8분 예산 소진 — 예측 취소 요청");
      await finishAndRoute();
    }

    function clearPrevResultKeys() {
      try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_FAIL_REASON_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_LIMIT_KEY); } catch { /**/ }
    }

    function recordFail(rawReason: string | undefined, rawDebug: string | undefined) {
      const reason = normFailReason(rawReason);
      const errMsg = rawDebug ?? `reason: ${reason} (debugError 없음)`;
      console.warn("[AI] ⚠️ 합성 실패 —", errMsg);
      try { sessionStorage.setItem(STYLE_FAIL_REASON_KEY, reason); } catch { /**/ }
      try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
      void trackEvent("hair_transform_fail", { reason, source: "style" });
      Sentry.captureMessage(`[hair-transform] 합성 실패: ${reason}`, {
        level: "error",
        extra: { debugError: errMsg },
      });
    }

    run();
  }, [router]);

  return (
    <SilkBackground>
      <main className="flex h-[100dvh] flex-col overflow-hidden text-ink">

        {/* ── 상단 40% — 브랜드 배지 + 스피너 + 텍스트 ── */}
        <div className="flex flex-none flex-col items-center justify-center gap-5 px-6 pb-4 pt-10"
          style={{ flex: "0 0 40%" }}>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/60 px-4 py-1.5 text-[13px] font-bold tracking-wide text-ink-2">
            AI 스타일 합성 중
          </span>

          {/* 소형 링 스피너 */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid transparent", borderTopColor: "rgba(51,48,44,0.85)", borderRightColor: "rgba(51,48,44,0.18)" }} />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full"
              style={{ border: "1.5px solid transparent", borderTopColor: "rgba(51,48,44,0.45)", borderLeftColor: "rgba(51,48,44,0.12)" }} />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-2 w-2 rounded-full bg-ink" />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={stepIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="max-w-[260px] text-center text-[15px] font-medium leading-relaxed text-ink"
            >
              {STEPS[stepIdx]}
            </motion.p>
          </AnimatePresence>

          {/* 소요시간 안내(확정125) — 평소값 앞·최악값 뒤. "최대 N분"은 POLL_BUDGET_MIN 파생(폴링 상한과 결속).
              20초 넘어가면(콜드스타트) 문구를 전환하되 최대 시간 표기는 유지. */}
          <p className="max-w-[280px] text-center text-[12px] leading-relaxed text-ink-2">
            {longWait
              ? `지금 준비 중이에요 · 이용자가 많을 때는 최대 ${POLL_BUDGET_MIN}분까지 걸릴 수 있어요 · 창을 닫지 말고 잠시만 더 기다려 주세요`
              : `보통 몇 초 안에 완성돼요 · 이용자가 많을 때는 최대 ${POLL_BUDGET_MIN}분까지 걸릴 수 있어요 · 창을 닫지 말고 기다려 주세요`}
          </p>
        </div>

        {/* ── 하단 60% — 헤어 꿀팁 콘텐츠 ── */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 pb-6">
          <div className="flex-none">
            <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-ink-2">
              기다리는 동안 읽는 헤어 꿀팁
            </p>

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
                  <span className="mt-1 flex-none h-1 w-1 rounded-full bg-ink-2" />
                  <p className="text-[12px] leading-relaxed text-ink-2">{HAIR_TIPS[tipIdx]}</p>
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            <div className="mt-2.5 flex justify-center gap-1.5">
              {HAIR_TIPS.map((_, i) => (
                <span key={i}
                  className={`inline-block h-1 rounded-full transition-all duration-300 ${i === tipIdx ? "w-4 bg-ink/70" : "w-1 bg-line"}`}
                />
              ))}
            </div>
          </div>
        </div>

      </main>
    </SilkBackground>
  );
}
