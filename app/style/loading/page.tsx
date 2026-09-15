"use client";

// ============================================================================
// /style/loading — "접수(kickoff)" 페이지 (Phase2 결과지 선공개)
// - 셀카·설문 확인 → 로그인/동의 게이트 → POST /api/hair-transform 접수 → job 저장 성공 확인
//   → 즉시 /style/result 로 이동. ★ 이 페이지는 폴링하지 않는다(단일 poller = 결과지 훅).
// - 접수 자체 실패: 401 → 로그인 / 403 → 동의 / 429·network·kickoff실패 → 이 화면에서 에러 5종
//   (결과지로 가지 않는다). 뒤로가기로 재진입 시 진행 중 job 있으면 결과지로 넘긴다(중복 kickoff 금지).
// - 폴링·4:50 폴백·에러분류·성공저장은 결과지가 useHairTransformJob 훅으로 담당(값·동작 불변).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STYLE_ANSWERS_KEY, STYLE_DEBUG_ERROR_KEY, STYLE_FAIL_REASON_KEY,
  STYLE_GENERATED_KEY, STYLE_JOB_KEY, STYLE_LIMIT_KEY, STYLE_PHOTO_KEY,
} from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";
import { POLL_BUDGET_MS, PER_POLL_TIMEOUT } from "../hairJobConstants";
import { normFailReason, type JobRef } from "../useHairTransformJob";
import { failMessage } from "../failMessage";
import { incrementUsage } from "@/lib/dailyLimit";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { ensureLoggedInOrRedirect } from "@/lib/authGate";
import { clearAccountId, trackEvent } from "@/lib/eventTracking";
import * as Sentry from "@sentry/nextjs";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";

type IntakePhase = "submitting" | "error";

export default function StyleIntakePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<IntakePhase>("submitting");
  const [failReason, setFailReason] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    function goRelogin() {
      clearAccountId();
      window.location.href = `/login/consent?return_to=${encodeURIComponent("/style/loading")}`;
    }
    function clearPrevResultKeys() {
      try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_FAIL_REASON_KEY); } catch { /**/ }
      try { sessionStorage.removeItem(STYLE_LIMIT_KEY); } catch { /**/ }
    }
    function recordKickoffFail(rawReason: string | undefined, rawDebug: string | undefined) {
      const reason = normFailReason(rawReason);
      const errMsg = rawDebug ?? `reason: ${reason} (debugError 없음)`;
      console.warn("[AI] ⚠️ 접수 실패 —", errMsg);
      void trackEvent("hair_transform_fail", { reason, source: "style" });
      Sentry.captureMessage(`[hair-transform] 접수 실패: ${reason}`, { level: "error", extra: { debugError: errMsg } });
      setFailReason(reason);
      setPhase("error");
    }

    async function run() {
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      const raw   = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      // 셀카 없으면 업로드로.
      if (!photo) { router.replace("/style/upload"); return; }

      // ── 로그인 게이트(합성 직전, 동작 불변) ──
      if (isLoginRequiredBeforeSynthesis()) {
        const ok = await ensureLoggedInOrRedirect("/style/loading", { onRedirect: clearAccountId });
        if (!ok) return;
      }

      // ── 뒤로가기 등 재진입: 진행 중 job 있으면 새 kickoff 하지 않고 결과지로(Codex #1·#8) ──
      try {
        const rawJob = sessionStorage.getItem(STYLE_JOB_KEY);
        if (rawJob) {
          const parsed = JSON.parse(rawJob) as JobRef;
          const now = Date.now();
          if (parsed?.id && parsed?.token && typeof parsed.startedAt === "number"
              && parsed.startedAt <= now && now - parsed.startedAt < POLL_BUDGET_MS) {
            router.replace("/style/result");
            return;
          }
        }
      } catch { /**/ }

      // ── 신규 접수 ──
      clearPrevResultKeys();

      // 설문 답변만 Sheets에 기록 — fire-and-forget(셀카 미전송).
      void fetch("/api/submit-diagnosis", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ answers: toSheetAnswers(answers), treatmentCounts: {} }),
      });

      try {
        incrementUsage(); // 클라 표시용 횟수(서버 예약이 실제 강제)
        console.log("[AI] 예측 접수(POST /api/hair-transform)...");
        const res = await fetch("/api/hair-transform", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userPhoto: photo, answers }),
          signal:  AbortSignal.timeout(PER_POLL_TIMEOUT + 15_000),
        });

        if (res.status === 401) { goRelogin(); return; }

        const data = await res.json() as {
          ok: boolean; id?: string; token?: string; primaryAttestation?: string;
          reason?: string; message?: string; debugError?: string;
        };

        if (res.status === 403 && data.reason === "consent_required") {
          window.location.href = `/login/consent?return_to=${encodeURIComponent("/style/loading")}`;
          return;
        }

        if (res.status === 429 || data.reason === "daily_limit") {
          // ★ 429(일일한도)는 결과지로 보낸다(사업주 판정 2026-09-10) — 진단 본체는 정상 노출하고
          //   사진 칸만 "오늘은 여기까지" 안내. STYLE_LIMIT_KEY 로 결과지에 전달(폴링 안 함).
          const msg = data.message ?? "오늘 무료 횟수를 모두 사용했어요. 내일 다시 만나요.";
          try { sessionStorage.setItem(STYLE_LIMIT_KEY, msg); } catch { /**/ }
          void trackEvent("hair_transform_fail", { reason: "daily_limit", source: "style" });
          router.replace("/style/result");
          return;
        }

        if (data.ok && data.id && data.token) {
          const started: JobRef = {
            id: data.id, token: data.token, startedAt: Date.now(),
            primaryAttestation: data.primaryAttestation,
          };
          // ★ Codex #2: job 저장 성공 후에만 결과지로 이동한다(저장 실패면 결과지가 이어받을 job이
          //   없으므로 이동하지 않고 에러 표기).
          let saved = false;
          try { sessionStorage.setItem(STYLE_JOB_KEY, JSON.stringify(started)); saved = true; } catch { /**/ }
          if (!saved) { recordKickoffFail("exception", "STYLE_JOB_KEY 저장 실패(세션 저장소)"); return; }
          console.log("[AI] 접수 성공 → 결과지 선공개:", data.id);
          router.replace("/style/result");
          return;
        }

        // 접수 자체 실패(레퍼런스·토큰 등) → 결과지로 가지 않고 이 화면에서 5종 안내.
        recordKickoffFail(data.reason, data.debugError);
      } catch (e) {
        console.error("[AI] ❌ 접수 예외:", e);
        Sentry.captureException(e);
        recordKickoffFail("network", e instanceof Error ? e.message : String(e));
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <SilkBackground>
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-ink">
        {phase === "submitting" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink/20 border-t-ink/80" />
            <p className="text-[17px] font-bold leading-snug text-ink">결과지를 준비하고 있어요</p>
            <p className="text-[15px] text-ink-2">잠시만요…</p>
          </div>
        )}

        {phase === "error" && (() => {
          const f = failMessage(failReason);
          return (
            <GlassCard className="flex max-w-[340px] flex-col items-center gap-3 px-6 py-8 text-center">
              <p className="text-[18px] font-extrabold leading-snug text-ink">{f.title}</p>
              <p className="text-[15px] leading-relaxed text-ink-2">{f.hint}</p>
              <button onClick={() => router.replace("/style/upload")}
                className="mt-2 inline-flex min-h-14 items-center justify-center rounded-full border border-btn-border bg-btn-bg px-6 text-emphasis font-bold text-btn-text transition-all hover:brightness-95 active:scale-[0.98]">
                {f.button}
              </button>
            </GlassCard>
          );
        })()}
      </main>
    </SilkBackground>
  );
}
