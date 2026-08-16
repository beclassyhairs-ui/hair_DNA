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
import { LENGTH_LABEL_MAP } from "../surveyData";
import { resolveCrossBranch } from "../crossBranch";
import { getBranchCopy } from "../branchCopy";
import { incrementUsage } from "@/lib/dailyLimit";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { ensureLoggedInOrRedirect } from "@/lib/authGate";
import { clearAccountId, trackEvent } from "@/lib/eventTracking";
import * as Sentry from "@sentry/nextjs";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import GlassCard from "@/components/beauty-ui/GlassCard";

// 진행단계 라벨(로딩바 위) — 파트1. 사진 분석 → 얼굴형 → 스타일 → 마무리(마지막에서 정지).
const STEPS = [
  "사진 분석 중…",
  "얼굴형 확인 중…",
  "스타일 입히는 중…",
  "마무리 중…",
];

// ── 파트1: 로딩 중 손님 본인 진단 순차 공개 ──────────────────────────────────
// 목적: 대기시간을 손님 진단으로 채우고, 아래 결과지를 볼 가치를 예고(미열독 방지).
// 규칙: 실제 설문 8문항만 사용. 없는 항목(두피·유수분 등) 생성 금지. 값 결측 시 그 줄만
//   일반 문구로 대체(빈칸·에러 노출 금지). 손상톤은 결과지 판정 스탬프를 그대로 재사용
//   ("N단계" 임의 생성 금지). 카카오 닉네임은 서버가 PII로 미반환 → 이름 없는 문구 고정.
const LAYER_LABEL:     Record<string, string> = { heavy: "무거운", medium: "소프트", light: "허쉬" };
const DESIGN_LABEL:    Record<string, string> = { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" };
const THICKNESS_LABEL: Record<string, string> = { coarse: "두꺼운", medium_thickness: "보통", fine: "얇은" };
const DENSITY_LABEL:   Record<string, string> = { thick_density: "많은", medium_density: "보통", thin_density: "적은" };
const CURL_LABEL:      Record<string, string> = { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair_mid: "곱슬", curly_hair: "악성곱슬" };
const HISTORY_COUNT_LABEL: Record<string, string> = { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회 이상" };

function buildDiagnosisReveal(a: StyleAnswers): string[] {
  const lines: string[] = [];

  // 1) 진단 헤드 — 기장/레이어/웨이브(설문 라벨 그대로)
  const len   = a.q11_length ? LENGTH_LABEL_MAP[a.q11_length] : undefined;
  const layer = a.q14_layer  ? LAYER_LABEL[a.q14_layer]       : undefined;
  const wave  = a.q13_design ? DESIGN_LABEL[a.q13_design]     : undefined;
  lines.push(len && layer && wave
    ? `고르신 스타일 — ${len} 길이에 ${layer} 레이어, ${wave}네요`
    : "고르신 스타일을 살펴보고 있어요");

  // 2) 굵기
  const th = a.q7_thickness ? THICKNESS_LABEL[a.q7_thickness] : undefined;
  lines.push(th ? `사진 속 모발을 보니 — ${th} 편이에요` : "사진 속 모발을 살펴보고 있어요");

  // 3) 숱
  const den = a.q8_density ? DENSITY_LABEL[a.q8_density] : undefined;
  lines.push(den ? `숱은 ${den} 쪽이시고요` : "모발 밀도를 확인하고 있어요");

  // 4) 곱슬
  const curl = a.q3_curl ? CURL_LABEL[a.q3_curl] : undefined;
  lines.push(curl ? `곱슬기는 ${curl}에 가까우시네요` : "곱슬기를 확인하고 있어요");

  // 5) 시술 이력 → 손상톤(결과지 판정 스탬프 그대로 재사용). 시술횟수(q10)는 현재 설문에
  //    없어 대개 폴백되고, 손상톤은 시술이력(q8a_recent 등)으로 계산된 결과 판정에서 온다.
  let tone = "";
  try { tone = getBranchCopy(resolveCrossBranch(a).primary).stamp; } catch { tone = ""; }
  const cnt = a.q10_history_count ? HISTORY_COUNT_LABEL[a.q10_history_count] : undefined;
  lines.push(tone
    ? (cnt ? `1년에 시술 ${cnt} · ${tone}` : `시술 이력을 살펴보니 · ${tone}`)
    : "시술 이력을 살펴보고 있어요");

  // 6~8) 처방 예고 — 아래 결과지로 끌어당기기
  lines.push("이 스타일, 이 모발에 '되는 이유'가 따로 있어요");
  lines.push("20년차 디자이너가 딱 맞는 처방을 정리하는 중…");
  lines.push("미용실에서 이 말만 하면 실패 안 하는 팁도 담을게요");

  return lines;
}

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
// ⑤ 폴백(lucataco) 폴링 예산 — 폴백은 상시 warm(초 단위)이라 짧게. 그래도 소소한 큐 여유 2분.
const FALLBACK_POLL_BUDGET_MS = 120_000;

const KNOWN_FAIL_REASONS = new Set([
  "daily_limit", "no_token", "bad_request", "missing_photo", "invalid_photo_format",
  "reference_fetch_failed", "poll_timeout", "api_error", "no_output", "exception",
  "content_flagged", "consent_required", "login_required", "network",
]);
function normFailReason(r: string | undefined): string {
  return r && KNOWN_FAIL_REASONS.has(r) ? r : "unknown";
}

interface JobRef {
  id: string;
  token: string;
  startedAt: number;
  fallback?: boolean;          // 실제 폴백(lucataco) 사용 여부 — 예산(2분)·안내 표시 결정
  fallbackAttempted?: boolean; // 세션당 폴백 1회 가드 — 킬스위치 상태와 무관하게 재착수 시 true
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [revealLines, setRevealLines] = useState<string[]>([]);
  const [revealIdx,   setRevealIdx]   = useState(0);
  const [longWait, setLongWait] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false); // ⑤ 폴백 진행 중 안내용
  const calledRef  = useRef(false); // 중복 호출 방지

  // 진행단계 라벨 로테이션 (시각 연출 — API 와 독립, 마지막 단계에서 정지).
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), 2_000);
    return () => clearInterval(t);
  }, []);

  // 파트1: 세션 답변으로 진단 순차 공개 줄을 구성(마운트 1회). 답변 없으면 일반 안내 1줄.
  useEffect(() => {
    let a: StyleAnswers = {};
    try {
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (raw) a = JSON.parse(raw) as StyleAnswers;
    } catch { a = {}; }
    setRevealLines(Object.keys(a).length > 0 ? buildDiagnosisReveal(a) : ["진단 결과를 준비하고 있어요"]);
  }, []);

  // 진단 공개 줄 롤링 (3초 간격, 마지막 줄 뒤 루프).
  useEffect(() => {
    if (revealLines.length === 0) return;
    const t = setInterval(() => setRevealIdx(i => (i + 1) % revealLines.length), 3_000);
    return () => clearInterval(t);
  }, [revealLines.length]);

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
    let fellBack = false; // ⑤ 루카타코 폴백은 세션당 최대 1회(무한 재시도 방지)

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
        // ⑤ Fix: 재개(새로고침) 시 폴백 1회 가드·예산을 job 에서 복원한다.
        //   · fallbackAttempted → fellBack 복원(킬스위치 OFF로 ddvinh1 재착수된 job 이어도 2차 폴백 차단).
        //   · fallback(실제 lucataco) → 폴백 예산(2분)·안내. 아니면 정상 8분.
        if (job.fallbackAttempted) fellBack = true;
        if (job.fallback) {
          setFallbackActive(true);
          await pollUntilDone(job, FALLBACK_POLL_BUDGET_MS);
        } else {
          await pollUntilDone(job);
        }
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
    //   budgetMs: 기본 8분(신규/재개). ⑤ 폴백은 짧은 예산(FALLBACK_POLL_BUDGET_MS)으로 호출.
    async function pollUntilDone(job: JobRef, budgetMs: number = POLL_BUDGET_MS) {
      const deadline = job.startedAt + budgetMs;
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

      // 예산 소진 → 예측 취소 요청(비용 중단, best-effort)
      console.warn("[AI] ⏱ 폴링 예산 소진 → 예측 취소 요청(비용 중단)");
      try {
        await fetch("/api/hair-transform/cancel", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ id: job.id, token: job.token }),
          signal:  AbortSignal.timeout(10_000),
        });
      } catch { /* best-effort */ }

      // ⑤ 루카타코 폴백 — ddvinh1 이 예산(8분)을 넘긴 드문 콜드 미스에서 1회만 상시-warm 모델로
      //   재착수해 "에러 대신 결과"를 노린다(사업주 결정). 폴백 자신의 예산 소진 시엔 fellBack 가드로
      //   더 이상 재시도하지 않고 아래 실패 안내로 종착한다.
      if (!fellBack) {
        fellBack = true;
        const handled = await runFallback(job);
        if (handled) return;
      }

      recordFail("poll_timeout", "폴링 예산 소진(폴백 포함) — 예측 취소 요청");
      await finishAndRoute();
    }

    // ── ⑤ 폴백 착수: lucataco 로 새 kickoff 후 짧은 예산으로 폴링 ──────────────
    //   반환 true = 이 함수가 종착 처리를 마쳤다(결과 라우팅/한도안내/리다이렉트/폴백폴링).
    //          false = 폴백 착수 자체가 실패 → 호출측이 poll_timeout 으로 마무리한다.
    //   과금: 폴백도 일반 kickoff 와 동일하게 서버가 1회 예약(환불 없음). 콜드 미스는 드물고
    //         일일한도(7)로 완충된다 — 기존 "재시도 시 1회 더 차감" 정책과 정합.
    async function runFallback(originalJob: JobRef): Promise<boolean> {
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (!photo) return false;
      const raw = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      setFallbackActive(true);
      try {
        incrementUsage(); // 클라 표시용(서버 예약이 실제 강제)
        console.log("[AI] ⑤ 폴백 착수(lucataco)...");
        const res = await fetch("/api/hair-transform", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          // 원본(ddvinh1) job 증표를 함께 보낸다 — 서버가 "같은 유저의 정상 kickoff" 를 검증해야
          //   폴백을 허용한다(임의 lucataco 직접호출 차단·Codex 반영).
          body:    JSON.stringify({ userPhoto: photo, answers, fallback: true, originalId: originalJob.id, originalToken: originalJob.token }),
          signal:  AbortSignal.timeout(PER_POLL_TIMEOUT + 15_000),
        });

        if (res.status === 401) { goRelogin(); return true; }

        const data = await res.json() as {
          ok: boolean; id?: string; token?: string; fallbackUsed?: boolean; reason?: string; message?: string; debugError?: string;
        };

        if (res.status === 403 && data.reason === "consent_required") {
          window.location.href = `/login/consent?return_to=${encodeURIComponent("/style/loading")}`;
          return true;
        }

        if (res.status === 429 || data.reason === "daily_limit") {
          const msg = data.message ?? "오늘 무료 횟수를 모두 사용했어요. 내일 다시 만나요.";
          try { sessionStorage.setItem(STYLE_LIMIT_KEY, msg); } catch { /**/ }
          void trackEvent("hair_transform_fail", { reason: "daily_limit", source: "style_fallback" });
          await finishAndRoute();
          return true;
        }

        if (data.ok && data.id && data.token) {
          // ★ 서버가 실제로 폴백(lucataco)으로 착수했는지(fallbackUsed)를 기준으로 예산·상태를 정한다.
          //   킬스위치 OFF 로 ddvinh1 로 처리됐으면(false) 폴백 예산(2분)이 아니라 정상 8분으로 폴링하고
          //   "다른 방식" 안내·job 폴백표시도 끈다(콜드 ddvinh1 을 2분에 조기취소하는 회귀 방지·Codex 반영).
          const usedFallback = data.fallbackUsed === true;
          // fallbackAttempted 는 킬스위치 상태와 무관하게 항상 true(1회 가드) — fallback(실제 모델)과 분리해
          //   영속화하여, 새로고침으로 재개돼도 2차 폴백을 막는다(Codex 반영).
          const fbJob: JobRef = { id: data.id, token: data.token, startedAt: Date.now(), fallback: usedFallback, fallbackAttempted: true };
          try { sessionStorage.setItem(STYLE_JOB_KEY, JSON.stringify(fbJob)); } catch { /**/ }
          setFallbackActive(usedFallback);
          void trackEvent("hair_transform_fallback", { source: "style", used: usedFallback });
          console.log(`[AI] ⑤ 재착수 성공(fallbackUsed=${usedFallback}), 폴링 시작:`, data.id);
          await pollUntilDone(fbJob, usedFallback ? FALLBACK_POLL_BUDGET_MS : POLL_BUDGET_MS);
          return true;
        }

        // 폴백 착수 자체 실패 → 호출측이 poll_timeout 으로 마무리
        console.warn("[AI] ⑤ 폴백 착수 실패:", data.reason ?? "(reason 없음)");
        return false;
      } catch (e) {
        console.error("[AI] ⑤ 폴백 예외:", e);
        Sentry.captureException(e);
        return false;
      }
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

          {/* 소요시간 안내(확정125·파트1④) — 평소값 앞·최악값 뒤. "최대 N분"은 POLL_BUDGET_MIN 파생.
              ★ 문구 정합(사업주 결정: 문구만): 같은 탭에서 이 화면을 잠깐 벗어났다 돌아오면
                sessionStorage(STYLE_JOB_KEY) 로 폴링이 재개된다(실제 동작). 탭을 완전히 닫으면
                끊기므로 "나갔다 와도"가 아니라 "다시 돌아오셔도 이어서" 로만 약속한다(과약속 금지).
                진짜 백그라운드 완성(탭 종료 후 복귀)은 서버 원장 필요 → 오픈 후 과제. */}
          <p className="max-w-[300px] text-center text-[13px] leading-relaxed text-ink-2">
            {fallbackActive
              ? "완성이 조금 늦어져 다른 방식으로 마무리하고 있어요 · 곧 나와요"
              : longWait
              ? `시간이 조금 걸리고 있어요 · 이 화면을 잠깐 벗어났다 다시 돌아오셔도 이어서 진행돼요 · 최대 ${POLL_BUDGET_MIN}분까지 걸릴 수 있어요`
              : `보통 몇 초 안에 완성돼요 · 이용자가 많을 때는 최대 ${POLL_BUDGET_MIN}분까지 걸릴 수 있어요`}
          </p>
        </div>

        {/* ── 하단 60% — 파트1: 손님 본인 진단 순차 공개(대기시간을 진단으로 채우고 결과지 예고) ── */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5 pb-6">
          <div className="flex-none">
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-ink-2">
              AI가 읽고 있는 내 모발
            </p>

            <GlassCard className="relative flex min-h-[92px] items-center justify-center px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.p
                  key={revealIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45 }}
                  className="text-center text-[16px] font-semibold leading-relaxed text-ink"
                >
                  {revealLines[revealIdx] ?? "진단 결과를 준비하고 있어요"}
                </motion.p>
              </AnimatePresence>
            </GlassCard>

            {revealLines.length > 1 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {revealLines.map((_, i) => (
                  <span key={i}
                    className={`inline-block h-1 rounded-full transition-all duration-300 ${i === revealIdx ? "w-4 bg-ink/70" : "w-1 bg-line"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </SilkBackground>
  );
}
