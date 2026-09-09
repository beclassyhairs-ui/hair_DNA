"use client";

// ============================================================================
// app/style/useHairTransformJob.ts — faceswap 합성 job 폴링·폴백·에러 훅 (단일 poller)
//
// 책임(로딩 페이지에서 "위치만" 이관 — 값·동작 불변):
//   · 주어진 job(id/token/startedAt/fallback플래그)을 status 폴링
//   · 4:50(FALLBACK_TRIGGER_MS) 도달 시 cancel(fire-and-forget) → ⑤ 루카타코 폴백 1회
//   · 에러 5종 분류 · 성공 시 STYLE_GENERATED_KEY 기록 · 일일한도 안내
//   · terminal(done/failed)에서만 STYLE_JOB_KEY 제거 (Codex #7)
//
// 책임 아님(페이지가 담당): 로그인/동의 게이트 · 1차 kickoff(job 생성) · 화면 렌더 · 네비게이션.
//   훅은 네비게이션을 하지 않는다 — 401/403·terminal 은 콜백(onReloginRedirect·onTerminal)으로 알린다.
//   덕분에 loading(접수)·result(선공개) 어느 쪽에서도 같은 훅을 쓴다.
//
// ★ 단일 poller 원칙: 이 훅을 실행하는 페이지가 유일한 poller다. 접수 페이지는 폴링하지 않는다
//   (이중 4:50 폴백 = lucataco 비용 중복 🔴 방지 — 2026-09-08 라운드 판정).
// ★ 상수는 hairJobConstants(단일 출처)에서 import — 복사 금지(하네스가 같은 값을 본다).
// ============================================================================

import { useEffect, useRef, useState } from "react";
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

export interface JobRef {
  id: string;
  token: string;
  startedAt: number;
  fallback?: boolean;             // 실제 폴백(lucataco) 사용 여부 — 예산(2분)·안내 표시 결정
  fallbackAttempted?: boolean;    // 세션당 폴백 1회 가드 — 킬스위치 상태와 무관하게 재착수 시 true
  primaryAttestation?: string;    // ② "진짜 원본(primary)" 서버 발급 증표. 폴백 job 은 절대 못 받음.
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
  errorKind: string | null;   // 실패 사유 코드(5종 분류용). limit 은 limitActive 로 별도.
  limitActive: boolean;       // 일일 한도 초과(친절 안내)
  imageUrl: string | null;    // 완성된 합성 이미지(data URI)
  elapsedMs: number;          // job.startedAt 기준 경과(진행감 표시용)
}

export function useHairTransformJob(opts: {
  job: JobRef | null;
  returnTo: string;                              // 401/403 → /login/consent?return_to=...
  onTerminal?: (state: "done" | "failed") => void; // 종단 알림(페이지가 네비게이션 결정)
  onReloginRedirect?: () => void;                // 401 직전 정리(clearAccountId 등)
}): HairTransformJobResult {
  const { job, returnTo, onTerminal, onReloginRedirect } = opts;

  const [state, setState] = useState<JobState>("idle");
  const [fallbackActive, setFallbackActive] = useState(false);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [limitActive, setLimitActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startedRef = useRef<string | null>(null); // 폴링을 시작한 job.id — 같은 job 이중시작 방지(StrictMode),
                                                  //   새 job.id 는 폴링 허용(재사용 계약, Codex #3)
  const aliveRef   = useRef(true);  // 언마운트 후 setState 억제(관측 동작 불변, 경고만 제거)

  const jobId = job?.id ?? null;
  const jobStartedAt = job?.startedAt ?? null;

  // 경과 타이머 — 표시 전용(폴링과 독립). job.startedAt 기준.
  useEffect(() => {
    if (jobStartedAt == null) return;
    setElapsedMs(Date.now() - jobStartedAt);
    const t = setInterval(() => setElapsedMs(Date.now() - jobStartedAt), 1_000);
    return () => clearInterval(t);
  }, [jobStartedAt]);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (!job) return;
    if (startedRef.current === job.id) return; // 같은 job 재시작 금지 / 새 job.id 는 허용
    startedRef.current = job.id;

    // ⑤ 폴백 1회 가드 — 재개(새로고침)로 넘어온 job 의 fallbackAttempted 를 복원(Codex #4).
    let fellBack = !!job.fallbackAttempted;

    const set = <T,>(fn: (v: T) => void, v: T) => { if (aliveRef.current) fn(v); };

    function goRelogin() {
      onReloginRedirect?.();
      window.location.href = `/login/consent?return_to=${encodeURIComponent(returnTo)}`;
    }

    function markDone(url: string) {
      try { sessionStorage.setItem(STYLE_GENERATED_KEY, url); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ } // terminal 에서만 제거(Codex #7)
      void trackEvent("hair_transform_done", { source: "style" });
      set(setImageUrl, url);
      set(setState, "done" as JobState);
      onTerminal?.("done");
    }

    function markLimit(message: string) {
      try { sessionStorage.setItem(STYLE_LIMIT_KEY, message); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ }
      set(setLimitActive, true);
      set(setState, "failed" as JobState);
      onTerminal?.("failed");
    }

    function recordFail(rawReason: string | undefined, rawDebug: string | undefined) {
      const reason = normFailReason(rawReason);
      const errMsg = rawDebug ?? `reason: ${reason} (debugError 없음)`;
      console.warn("[AI] ⚠️ 합성 실패 —", errMsg);
      try { sessionStorage.setItem(STYLE_FAIL_REASON_KEY, reason); } catch { /**/ }
      try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ } // terminal 에서만 제거(Codex #7)
      void trackEvent("hair_transform_fail", { reason, source: "style" });
      Sentry.captureMessage(`[hair-transform] 합성 실패: ${reason}`, {
        level: "error", extra: { debugError: errMsg },
      });
      set(setErrorKind, reason);
      set(setState, "failed" as JobState);
      onTerminal?.("failed");
    }

    // ── 폴링 루프 ────────────────────────────────────────────────────────────
    async function pollUntilDone(j: JobRef, budgetMs: number = POLL_BUDGET_MS): Promise<void> {
      const deadline = j.startedAt + budgetMs;
      while (Date.now() < deadline) {
        if (!fellBack && Date.now() - j.startedAt >= FALLBACK_TRIGGER_MS) break;
        const pollTimeout = fellBack
          ? PER_POLL_TIMEOUT
          : Math.max(1_000, Math.min(PER_POLL_TIMEOUT, j.startedAt + FALLBACK_TRIGGER_MS - Date.now()));
        let data: { ok?: boolean; imageUrl?: string; status?: string; reason?: string; debugError?: string } | null = null;
        try {
          const res = await fetch("/api/hair-transform/status", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ id: j.id, token: j.token }),
            signal:  AbortSignal.timeout(pollTimeout),
          });
          if (res.status === 401) { goRelogin(); return; }
          data = await res.json();
        } catch {
          if (!fellBack && Date.now() - j.startedAt >= FALLBACK_TRIGGER_MS) break;
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (data?.ok && data.imageUrl) { markDone(data.imageUrl); return; }
        if (data?.status === "processing") { await sleep(POLL_INTERVAL_MS); continue; }

        recordFail(data?.reason, data?.debugError);
        return;
      }

      // 4:50 조기 폴백 or 예산 소진 → 예측 취소(비용 중단, best-effort) → ⑤ 폴백
      console.warn("[AI] ⏱ 4:50 도달/예산 소진 → 예측 취소 요청 → 폴백 시도");
      void fetch("/api/hair-transform/cancel", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: j.id, token: j.token }),
        signal:  AbortSignal.timeout(10_000),
      }).catch(() => { /* best-effort */ });

      if (!fellBack) {
        fellBack = true;
        const handled = await runFallback(j);
        if (handled) return;
      }

      recordFail("poll_timeout", "폴링 예산 소진(폴백 포함) — 예측 취소 요청");
    }

    // ── ⑤ 폴백 착수: lucataco 로 새 kickoff 후 짧은 예산으로 폴링 ────────────────
    async function runFallback(originalJob: JobRef): Promise<boolean> {
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (!photo) return false;
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      set(setFallbackActive, true);
      set(setState, "fallback" as JobState);
      try {
        incrementUsage(); // 클라 표시용(서버 예약이 실제 강제)
        console.log("[AI] ⑤ 폴백 착수(lucataco)...");
        const res = await fetch("/api/hair-transform", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            userPhoto: photo, answers, fallback: true,
            originalId: originalJob.id, originalAttestation: originalJob.primaryAttestation,
          }),
          signal:  AbortSignal.timeout(PER_POLL_TIMEOUT + 15_000),
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

        // ★ Codex #6: 폴백이 자격거절(fallback_not_eligible)이면 — 4:50 직전 원본이 성공했는데
        //   status timeout 으로 못 받은 경우일 수 있다. 원본 final-status 를 1회 재확인해 성공이면
        //   그 결과를 채택(성공 유실 방지). 아니면 기존 폴백 실패 경로로.
        if (data.reason === "fallback_not_eligible") {
          const recovered = await recheckOriginalOnce(originalJob);
          if (recovered) return true;
          console.warn("[AI] ⑤ 폴백 자격거절 + 원본 재확인도 미완 → poll_timeout 마무리");
          return false;
        }

        if (data.ok && data.id && data.token) {
          const usedFallback = data.fallbackUsed === true;
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

    // ★ Codex #6: 원본 status 를 1회 재확인 — 성공이면 이미지 채택(true), 아니면 false.
    //   서버 무수정(같은 status 라우트). cancel 이 이미 나갔어도 succeeded 는 그대로 조회된다.
    async function recheckOriginalOnce(originalJob: JobRef): Promise<boolean> {
      try {
        const res = await fetch("/api/hair-transform/status", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ id: originalJob.id, token: originalJob.token }),
          signal:  AbortSignal.timeout(PER_POLL_TIMEOUT),
        });
        if (res.status === 401) { goRelogin(); return true; }
        const data = await res.json() as { ok?: boolean; imageUrl?: string };
        if (data?.ok && data.imageUrl) {
          console.log("[AI] ⑤ 원본 재확인 — 4:50 직전 성공 회수(폴백 불필요)");
          markDone(data.imageUrl);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    // 진입: 재개 job 의 fallback 여부로 예산·표시를 정한다(로딩 페이지 재개 경로와 동일).
    set(setState, job.fallback ? ("fallback" as JobState) : ("generating" as JobState));
    if (job.fallback) set(setFallbackActive, true);
    void pollUntilDone(job, job.fallback ? FALLBACK_POLL_BUDGET_MS : POLL_BUDGET_MS);
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, fallbackActive, errorKind, limitActive, imageUrl, elapsedMs };
}
