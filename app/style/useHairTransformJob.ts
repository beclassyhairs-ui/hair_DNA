"use client";

// ============================================================================
// app/style/useHairTransformJob.ts — faceswap 합성 job 폴링·폴백·에러 훅 (단일 poller)
//
// 책임: 주어진 job 을 status 폴링 → 4:50(FALLBACK_TRIGGER_MS) 도달 시 cancel(fire-and-forget)
//   → ⑤ 루카타코 폴백 1회 → 성공 시 STYLE_GENERATED_KEY 기록·에러 5종 분류·일일한도 안내.
//   terminal(done/failed)에서만 STYLE_JOB_KEY 제거. 네비게이션·게이트·1차 kickoff 는 페이지 담당.
//
// ★ Phase2 단일 poller: 이 훅을 실행하는 화면(결과지)이 유일한 poller다. 접수 페이지는 폴링하지
//   않는다(이중 4:50 폴백 = lucataco 비용 중복 🔴 방지). 언마운트 시 in-flight status 폴을 abort
//   하고 루프를 멈춘다(좀비 폴링 없음 — Codex 반영). cancel/폴백 kickoff 는 비용중단·재개 위해
//   완료시킨다(abort 대상 아님).
// ★ 폴백 1회 가드는 폴백 kickoff "전"에 원본 job 에 fallbackAttempted 를 영속화한다(Codex #4) —
//   폴백 POST 도중 새로고침해도 재개 시 2차 폴백을 막는다.
// ★ 상수는 hairJobConstants(단일 출처)에서 import. 하네스가 같은 값을 본다.
// ============================================================================

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  STYLE_ANSWERS_KEY, STYLE_PHOTO_KEY, STYLE_JOB_KEY, STYLE_GENERATED_KEY,
  STYLE_DEBUG_ERROR_KEY, STYLE_FAIL_REASON_KEY, STYLE_LIMIT_KEY,
} from "./constants";
import {
  POLL_BUDGET_MS, POLL_INTERVAL_MS, PER_POLL_TIMEOUT,
  FALLBACK_POLL_BUDGET_MS, FALLBACK_TRIGGER_MS,
} from "./hairJobConstants";
import { incrementUsage } from "@/lib/dailyLimit";
import { trackEvent } from "@/lib/eventTracking";
import type { StyleAnswers } from "./surveyData";

export type JobState = "idle" | "generating" | "fallback" | "done" | "failed";
export type ModelUsed = "primary" | "fallback";

export interface JobRef {
  id: string;
  token: string;
  startedAt: number;
  fallback?: boolean;
  fallbackAttempted?: boolean;
  primaryAttestation?: string;
}

const KNOWN_FAIL_REASONS = new Set([
  "daily_limit", "no_token", "bad_request", "missing_photo", "invalid_photo_format",
  "reference_fetch_failed", "poll_timeout", "api_error", "no_output", "exception",
  "content_flagged", "consent_required", "login_required", "network",
  "fallback_not_eligible",
]);
export function normFailReason(r: string | undefined): string {
  return r && KNOWN_FAIL_REASONS.has(r) ? r : "unknown";
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface HairTransformJobResult {
  state: JobState;
  fallbackActive: boolean;
  errorKind: string | null;
  limitActive: boolean;
  imageUrl: string | null;
  elapsedMs: number;
  modelUsed: ModelUsed | null; // done 시 어떤 모델로 완성됐는지(원본 primary / 폴백 fallback)
}

export function useHairTransformJob(opts: {
  job: JobRef | null;
  returnTo: string;
  onReloginRedirect?: () => void;
}): HairTransformJobResult {
  const { job, returnTo, onReloginRedirect } = opts;

  const [state, setState] = useState<JobState>("idle");
  const [fallbackActive, setFallbackActive] = useState(false);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [limitActive, setLimitActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [modelUsed, setModelUsed] = useState<ModelUsed | null>(null);

  // ★ 취소·abort 는 effect 실행마다의 지역 클로저(cancelled/currentAbort)로 관리한다 — StrictMode
  //   setup→cleanup→setup 에서 실행 간 상태가 섞이지 않아야 하기 때문(공유 ref 로 하면 2차 setup 이
  //   1차의 취소를 물려받아 폴링이 죽는다 — Codex 2026-09-09 반영). deps [job?.id] 라 같은 job 재시작
  //   없음(id 바뀔 때만 재실행).
  const jobStartedAt = job?.startedAt ?? null;

  // 경과 타이머(표시 전용).
  useEffect(() => {
    if (jobStartedAt == null) return;
    setElapsedMs(Date.now() - jobStartedAt);
    const t = setInterval(() => setElapsedMs(Date.now() - jobStartedAt), 1_000);
    return () => clearInterval(t);
  }, [jobStartedAt]);

  useEffect(() => {
    if (!job) return;

    // 이 effect 실행의 지역 상태(다른 실행과 안 섞임).
    let cancelled = false;
    let currentAbort: AbortController | null = null;

    // ⑤ 폴백 1회 가드 — 재개 job 의 fallbackAttempted 복원(Codex #4).
    let fellBack = !!job.fallbackAttempted;
    // 완성 모델 추적: 재개된 job 이 실제 폴백이면 fallback, 아니면 primary.
    let currentModel: ModelUsed = job.fallback ? "fallback" : "primary";

    const set = <T,>(fn: (v: T) => void, v: T) => { if (!cancelled) fn(v); };

    function goRelogin() {
      onReloginRedirect?.();
      window.location.href = `/login/consent?return_to=${encodeURIComponent(returnTo)}`;
    }

    // status 폴 전용 fetch — abort 가능(언마운트/재실행 시 즉시 중단). timeout 도 abort 로 구현.
    async function pollFetch(body: object, timeoutMs: number): Promise<Response> {
      const ac = new AbortController();
      currentAbort = ac;
      const to = setTimeout(() => ac.abort(), timeoutMs);
      try {
        return await fetch("/api/hair-transform/status", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: ac.signal,
        });
      } finally { clearTimeout(to); }
    }

    function markDone(url: string) {
      if (cancelled) return;
      try { sessionStorage.setItem(STYLE_GENERATED_KEY, url); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ } // terminal 에서만 제거
      void trackEvent("hair_transform_done", { source: "style", model: currentModel });
      set(setModelUsed, currentModel);
      set(setImageUrl, url);
      set(setState, "done" as JobState);
    }

    function markLimit(message: string) {
      if (cancelled) return;
      try { sessionStorage.setItem(STYLE_LIMIT_KEY, message); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ }
      set(setLimitActive, true);
      set(setState, "failed" as JobState);
    }

    function recordFail(rawReason: string | undefined, rawDebug: string | undefined) {
      if (cancelled) return;
      const reason = normFailReason(rawReason);
      const errMsg = rawDebug ?? `reason: ${reason} (debugError 없음)`;
      console.warn("[AI] ⚠️ 합성 실패 —", errMsg);
      try { sessionStorage.setItem(STYLE_FAIL_REASON_KEY, reason); } catch { /**/ }
      try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ }
      void trackEvent("hair_transform_fail", { reason, source: "style" });
      Sentry.captureMessage(`[hair-transform] 합성 실패: ${reason}`, { level: "error", extra: { debugError: errMsg } });
      set(setErrorKind, reason);
      set(setState, "failed" as JobState);
    }

    async function pollUntilDone(j: JobRef, budgetMs: number = POLL_BUDGET_MS): Promise<void> {
      const deadline = j.startedAt + budgetMs;
      while (Date.now() < deadline) {
        if (cancelled) return;
        if (!fellBack && Date.now() - j.startedAt >= FALLBACK_TRIGGER_MS) break;
        const pollTimeout = fellBack
          ? PER_POLL_TIMEOUT
          : Math.max(1_000, Math.min(PER_POLL_TIMEOUT, j.startedAt + FALLBACK_TRIGGER_MS - Date.now()));
        let data: { ok?: boolean; imageUrl?: string; status?: string; reason?: string; debugError?: string } | null = null;
        try {
          const res = await pollFetch({ id: j.id, token: j.token }, pollTimeout);
          if (res.status === 401) { goRelogin(); return; }
          data = await res.json();
        } catch {
          if (cancelled) return;
          if (!fellBack && Date.now() - j.startedAt >= FALLBACK_TRIGGER_MS) break;
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (data?.ok && data.imageUrl) { markDone(data.imageUrl); return; }
        if (data?.status === "processing") { await sleep(POLL_INTERVAL_MS); continue; }

        recordFail(data?.reason, data?.debugError);
        return;
      }

      if (cancelled) return;

      // 4:50 조기 폴백 or 예산 소진 → 예측 취소(비용 중단, best-effort) → ⑤ 폴백
      console.warn("[AI] ⏱ 4:50 도달/예산 소진 → 예측 취소 요청 → 폴백 시도");
      void fetch("/api/hair-transform/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: j.id, token: j.token }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => { /* best-effort */ });

      if (!fellBack) {
        fellBack = true;
        const handled = await runFallback(j);
        if (handled) return;
      }

      recordFail("poll_timeout", "폴링 예산 소진(폴백 포함) — 예측 취소 요청");
    }

    async function runFallback(originalJob: JobRef): Promise<boolean> {
      if (cancelled) return true; // 언마운트 → 아무 것도 안 함(재개가 이어받음)
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (!photo) return false;
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      // ★ Codex #4: 폴백 POST "전"에 원본 job 에 fallbackAttempted 를 영속화 — POST 도중 새로고침해도
      //   재개 시 fellBack 복원돼 2차 폴백을 막는다(세션 1회 가드를 인스턴스 밖으로).
      try {
        sessionStorage.setItem(STYLE_JOB_KEY, JSON.stringify({ ...originalJob, fallbackAttempted: true }));
      } catch { /**/ }

      set(setFallbackActive, true);
      set(setState, "fallback" as JobState);
      try {
        incrementUsage();
        console.log("[AI] ⑤ 폴백 착수(lucataco)...");
        const res = await fetch("/api/hair-transform", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userPhoto: photo, answers, fallback: true,
            originalId: originalJob.id, originalAttestation: originalJob.primaryAttestation,
          }),
          signal: AbortSignal.timeout(PER_POLL_TIMEOUT + 15_000),
        });

        if (res.status === 401) { goRelogin(); return true; }

        const data = await res.json() as {
          ok: boolean; id?: string; token?: string; primaryAttestation?: string; fallbackUsed?: boolean;
          reason?: string; message?: string; debugError?: string;
        };

        if (res.status === 403 && data.reason === "consent_required") {
          window.location.href = `/login/consent?return_to=${encodeURIComponent(returnTo)}`;
          return true;
        }

        if (res.status === 429 || data.reason === "daily_limit") {
          const msg = data.message ?? "오늘 무료 횟수를 모두 사용했어요. 내일 다시 만나요.";
          void trackEvent("hair_transform_fail", { reason: "daily_limit", source: "style_fallback" });
          markLimit(msg);
          return true;
        }

        // ★ Codex #6: fallback_not_eligible → 4:50 직전 원본 성공을 status timeout 으로 못 받았을 수
        //   있다. 원본 final-status 1회 재확인해 성공이면 채택(성공 유실 방지).
        if (data.reason === "fallback_not_eligible") {
          const recovered = await recheckOriginalOnce(originalJob);
          if (recovered) return true;
          console.warn("[AI] ⑤ 폴백 자격거절 + 원본 재확인도 미완 → poll_timeout 마무리");
          return false;
        }

        if (data.ok && data.id && data.token) {
          const usedFallback = data.fallbackUsed === true;
          currentModel = usedFallback ? "fallback" : "primary";
          const fbJob: JobRef = {
            id: data.id, token: data.token, startedAt: Date.now(),
            fallback: usedFallback, fallbackAttempted: true,
            primaryAttestation: data.primaryAttestation,
          };
          try { sessionStorage.setItem(STYLE_JOB_KEY, JSON.stringify(fbJob)); } catch { /**/ }
          set(setFallbackActive, usedFallback);
          set(setState, usedFallback ? ("fallback" as JobState) : ("generating" as JobState));
          void trackEvent("hair_transform_fallback", { source: "style", used: usedFallback });
          console.log(`[AI] ⑤ 재착수 성공(fallbackUsed=${usedFallback}), 폴링 시작:`, data.id);
          await pollUntilDone(fbJob, usedFallback ? FALLBACK_POLL_BUDGET_MS : POLL_BUDGET_MS);
          return true;
        }

        console.warn("[AI] ⑤ 폴백 착수 실패:", data.reason ?? "(reason 없음)");
        return false;
      } catch (e) {
        console.error("[AI] ⑤ 폴백 예외:", e);
        Sentry.captureException(e);
        return false;
      }
    }

    async function recheckOriginalOnce(originalJob: JobRef): Promise<boolean> {
      if (cancelled) return true;
      try {
        const res = await pollFetch({ id: originalJob.id, token: originalJob.token }, PER_POLL_TIMEOUT);
        if (res.status === 401) { goRelogin(); return true; }
        const data = await res.json() as { ok?: boolean; imageUrl?: string };
        if (data?.ok && data.imageUrl) {
          console.log("[AI] ⑤ 원본 재확인 — 4:50 직전 성공 회수(폴백 불필요)");
          currentModel = "primary";
          markDone(data.imageUrl);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    set(setState, job.fallback ? ("fallback" as JobState) : ("generating" as JobState));
    if (job.fallback) set(setFallbackActive, true);
    void pollUntilDone(job, job.fallback ? FALLBACK_POLL_BUDGET_MS : POLL_BUDGET_MS);

    // 언마운트 → 루프 중단·in-flight status 폴 abort(좀비 폴링 없음).
    return () => {
      cancelled = true;
      currentAbort?.abort();
    };
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, fallbackActive, errorKind, limitActive, imageUrl, elapsedMs, modelUsed };
}
