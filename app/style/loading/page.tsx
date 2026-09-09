"use client";

// ============================================================================
// /style/loading — 비동기 AI 헤어 합성 로딩 페이지 (폴링 구조)
// - 마운트 즉시 POST /api/hair-transform 로 예측 "착수"(id/token 수신)
// - 이후 POST /api/hair-transform/status 를 2.5초 간격으로 최대 5분(POLL_BUDGET_MS) 폴링
// - 새로고침해도 sessionStorage(STYLE_JOB_KEY)의 {id,token,startedAt}로 폴링 재개
// - 4:50 트리거(상한 5분) 도달 시 /api/hair-transform/cancel 로 예측 취소(비용 중단) 후 ⑤ 폴백 시도
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
// ★ Phase1: 폴링·폴백·에러 로직은 useHairTransformJob 훅으로 이관(위치만). 이 페이지는
//   게이트·1차 kickoff·네비게이션만 담당하고, 훅이 유일한 poller다. 상수는 hairJobConstants
//   단일 출처에서 import(복사 금지 — 하네스가 같은 값을 본다).
import { POLL_BUDGET_MS, PER_POLL_TIMEOUT } from "../hairJobConstants";
import { useHairTransformJob, normFailReason, type JobRef } from "../useHairTransformJob";

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
const MIN_LOADING_MS  = 2_800; // 너무 빨리 끝났을 때 로딩이 깜빡이며 지나가지 않게 하는 하한
// "최대 N분" 로딩 문구용(분). POLL_BUDGET_MS(단일 출처)에서 파생 → 표기 상한과 폴링 상한이 안 갈라짐.
const POLL_BUDGET_MIN = Math.round(POLL_BUDGET_MS / 60_000);
// ⑤ 폴백 트리거·폴링 간격·예산 등 job 타이밍 상수는 hairJobConstants(단일 출처)로 이관.
//   폴링·폴백 로직 자체는 useHairTransformJob 훅으로 이관(값·동작 불변, 위치만).

// 🟡-02 경과 초 → "N분 N초째" (50·60 가독: 콜론 mm:ss 대신 한글 분/초).
function formatElapsedKo(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초째` : `${s}초째`;
}

// 🟡-02 경과 구간별 안심 문구 — 20초~5분 사이 최소 4번 새 문구로 바뀌어 "멈춘 화면" 인지를 없앤다.
//   폴링/5분 예산과 무관한 '표시 전용'(경과 초만 보고 문구를 고른다).
function waitReassurance(elapsedSec: number, budgetMin: number): string {
  if (elapsedSec < 20)  return `보통 몇 초 안에 완성돼요 · 이용자가 많을 때는 최대 ${budgetMin}분까지 걸릴 수 있어요`;
  if (elapsedSec < 60)  return "정성껏 만들고 있어요 · 이 화면을 잠깐 벗어났다 다시 돌아오셔도 이어서 진행돼요";
  if (elapsedSec < 180) return "지금 열심히 그리는 중이에요 · 조금만 더 기다려 주세요";
  if (elapsedSec < 300) return `이용자가 많아 시간이 걸리고 있어요 · 최대 ${budgetMin}분까지 기다리면 완성돼요`;
  return "거의 마무리 단계예요 · 조금만 더 기다려 주세요";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [revealLines, setRevealLines] = useState<string[]>([]);
  const [revealIdx,   setRevealIdx]   = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0); // 🟡-02 진행감: 화면에서 매초 바뀌는 유일한 숫자
  // Phase1: 폴링 대상 job. 게이트+kickoff(또는 새로고침 재개)로 정해지면 훅이 이어받아 폴링한다.
  const [job, setJob] = useState<JobRef | null>(null);
  // Phase3: 진행 중 작업(STYLE_JOB_KEY)이 실제로 설정된 뒤에만 스킵링크를 연다. kickoff POST가
  //   늦어 아직 job이 없을 때 스킵하면 결과지가 이어받을 job이 없어 pending 대신 fail로 빠지기 때문.
  const [jobStarted, setJobStarted] = useState(false);
  const calledRef  = useRef(false); // 중복 호출 방지
  const runStartRef = useRef(0);    // 최소표시시간(MIN_LOADING_MS) 기준 시각

  // ★ 최소 표시 시간 채운 뒤 결과지로 이동(정상/실패/타임아웃 공통 종착). 훅의 terminal 콜백과
  //   pre-poll 실패(429·kickoff실패·network)가 공용으로 쓴다.
  async function finishAndRoute() {
    try { sessionStorage.removeItem(STYLE_JOB_KEY); } catch { /**/ }
    const elapsed = Date.now() - runStartRef.current;
    if (elapsed < MIN_LOADING_MS) await sleep(MIN_LOADING_MS - elapsed);
    router.replace("/style/result");
  }

  // ★ Phase1 단일 poller — 폴링·4:50 폴백·에러·성공 저장은 훅이 담당(값·동작 불변). 이 페이지는
  //   game/fallback 표시를 훅 상태에서 읽고, 종단 시 finishAndRoute 로 결과지 이동만 한다.
  const jobResult = useHairTransformJob({
    job,
    returnTo: "/style/loading",
    onReloginRedirect: clearAccountId,
    onTerminal: () => { void finishAndRoute(); },
  });
  const fallbackActive = jobResult.fallbackActive;

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

  // 🟡-02 경과 초 카운터 — 매초 1씩 증가(표시 전용, 폴링/5분 예산과 완전 독립).
  //   20초~5분 구간에서 화면이 "멈춘 듯" 보이던 문제를, 매초 바뀌는 숫자 + 경과별 점진 문구로 해소.
  useEffect(() => {
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  // ── 마운트 즉시: 게이트 + 1차 kickoff(또는 새로고침 재개) → job 확정. 폴링은 훅이 이어받는다. ──
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    runStartRef.current = Date.now();

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
    // 착수(kickoff) 자체 실패 기록 — 폴링 단계 실패는 훅이 담당(같은 5종 코드).
    function recordFail(rawReason: string | undefined, rawDebug: string | undefined) {
      const reason = normFailReason(rawReason);
      const errMsg = rawDebug ?? `reason: ${reason} (debugError 없음)`;
      console.warn("[AI] ⚠️ 착수 실패 —", errMsg);
      try { sessionStorage.setItem(STYLE_FAIL_REASON_KEY, reason); } catch { /**/ }
      try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
      void trackEvent("hair_transform_fail", { reason, source: "style" });
      Sentry.captureMessage(`[hair-transform] 착수 실패: ${reason}`, { level: "error", extra: { debugError: errMsg } });
    }

    async function run() {
      const photo = sessionStorage.getItem(STYLE_PHOTO_KEY);
      const raw   = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      let answers: StyleAnswers = {};
      try { answers = raw ? (JSON.parse(raw) as StyleAnswers) : {}; } catch { answers = {}; }

      // 셀카 없으면 업로드로(결과지로 진행하지 않음)
      if (!photo) { router.replace("/style/upload"); return; }

      // ── Phase B 로그인 게이트(동작 불변) ── 조건·return_to·clearAccountId·fail-closed 그대로.
      if (isLoginRequiredBeforeSynthesis()) {
        const ok = await ensureLoggedInOrRedirect("/style/loading", { onRedirect: clearAccountId });
        if (!ok) return;
      }

      // ── 새로고침 재개: 진행 중 작업이 있으면 훅에 넘겨 이어 폴링(중복 착수·차감 방지) ──
      let existing: JobRef | null = null;
      try {
        const rawJob = sessionStorage.getItem(STYLE_JOB_KEY);
        if (rawJob) {
          const parsed = JSON.parse(rawJob) as JobRef;
          if (parsed?.id && parsed?.token && typeof parsed.startedAt === "number"
              && Date.now() - parsed.startedAt < POLL_BUDGET_MS) {
            existing = parsed;
          }
        }
      } catch { existing = null; }

      if (existing) {
        // 재개: 이전 결과/에러/한도만 정리하고 훅에 넘긴다(incrementUsage 재호출 안 함).
        //   훅이 job.fallback/fallbackAttempted 를 보고 예산·1회가드를 복원한다.
        clearPrevResultKeys();
        setJobStarted(true); // 진행 중 job 존재 → 스킵 허용
        setJob(existing);
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
          ok: boolean; id?: string; token?: string; primaryAttestation?: string;
          reason?: string; message?: string; debugError?: string;
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
          const started: JobRef = {
            id: data.id, token: data.token, startedAt: Date.now(),
            primaryAttestation: data.primaryAttestation, // ② 이 job(원본)을 나중에 폴백 자격증표로 쓴다.
          };
          // ★ Codex #2: JOB_KEY 저장 성공 후에 폴링을 넘긴다(저장 성공 시에만 스킵링크도 연다).
          try { sessionStorage.setItem(STYLE_JOB_KEY, JSON.stringify(started)); setJobStarted(true); } catch { /**/ }
          console.log("[AI] 착수 성공, 폴링 시작(훅):", data.id);
          setJob(started); // 훅이 이어받아 폴링·4:50 폴백·에러·성공 저장
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

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          {/* 주문구(Phase1) — 손님에게 정직하게 제시하는 약속. 아래 4단계·경과표시는 보조.
              "최대 N분"은 POLL_BUDGET_MIN 파생(보조 문구와 동일 출처 → 상한 바뀌어도 안 갈라짐). */}
          <p className="max-w-[320px] text-center text-[19px] font-extrabold leading-snug text-ink">
            평균 2~3분, 최대 {POLL_BUDGET_MIN}분 걸려요
          </p>

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
              : waitReassurance(elapsedSec, POLL_BUDGET_MIN)}
          </p>

          {/* 🟡-02 매초 바뀌는 경과 표시 — 20초 지나서야 등장(그 전엔 곧 끝나므로 불필요·조바심 방지).
              화면에서 유일하게 매초 변하는 숫자라 "멈춘 듯" 느낌을 없앤다. 폴링과 무관한 표시 전용. */}
          {!fallbackActive && elapsedSec >= 20 && (
            <p className="text-center text-[12px] font-medium tabular-nums text-ink-2/80">
              {formatElapsedKo(elapsedSec)} 준비 중
            </p>
          )}

          {/* Phase3: 10초 후 스킵 — 밑줄 텍스트 링크(큰 버튼 금지: '기다리지 마세요' 역신호 방지).
              결과지로 보내되 STYLE_JOB_KEY를 유지한 채(finishAndRoute 안 거침) 넘긴다. 백그라운드
              폴링이 계속 돌아 사진을 만들고, 결과지가 그 사진을 이어받아 채운다(Phase3 자동채움).
              ⚠️ 탭을 닫으면 폴링이 끊기므로 '나갔다 와도 완성' 같은 과약속 문구는 쓰지 않는다. */}
          {elapsedSec >= 10 && jobStarted && (
            <button
              type="button"
              onClick={() => { void trackEvent("style_loading_skip", { source: "style", elapsed: elapsedSec }); router.push("/style/result"); }}
              className="mt-1 text-[13px] leading-relaxed text-ink-2 underline underline-offset-4 decoration-ink-2/40 transition-colors hover:text-ink"
            >
              기다리기 지루하면, 이미지 없이 결과 먼저 보기
            </button>
          )}
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
