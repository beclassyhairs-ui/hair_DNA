"use client";

// ============================================================================
// 어뷰티 셀프 손상도 자가진단 — 4문항 (Q1~Q3 단일선택 자동진행 / Q4 시술이력 전용 렌더러)
// 2026-08 개편(확정 68·72·77·115): Q4 습관 다중선택 폐기 → 시술이력 다단계 문항.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { DAMAGE_SURVEY_KEY } from "../constants";
import {
  SURVEY_QUESTIONS,
  TREATMENT_OPTIONS,
  MORE_OPTIONS,
  ROOT_DYE_INTERVAL_OPTIONS,
  type DamageSurveyAnswers,
  type RootDyeInterval,
} from "../surveyData";
import { EVENT_NAMES, trackEvent } from "../../../lib/eventTracking";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";

const LANDING_ID = "damage_check";
const TOTAL = SURVEY_QUESTIONS.length; // 4

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 64 : -64 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64 }),
};

// ─── Q4 시술이력 전용 다단계 렌더러 (확정 72·77·95) ──────────────────────────
// 최근 → (선택 시) 그 전 → (선택 시) 더 하신 거 + 하위체크 → "진단 결과 보기".
// 최근="없음"이면 나머지 스킵하고 바로 제출 활성.
function TreatmentHistoryStep({
  disabled, onComplete,
}: {
  disabled: boolean;
  onComplete: (partial: Partial<DamageSurveyAnswers>) => void;
}) {
  const [recent, setRecent] = useState<string | null>(null);
  const [prev, setPrev]     = useState<string | null>(null);
  const [more, setMore]     = useState<string>("none");
  const [bleach2, setBleach2]   = useState(false);
  const [rootGray, setRootGray] = useState(false);
  const [selfDye, setSelfDye]   = useState(false); // 염색/뿌리염색 → 집에서 직접(셀프염색)
  const [rootInterval, setRootInterval] = useState<RootDyeInterval>("");
  const [rootOver6m, setRootOver6m]     = useState(false);

  const recentIsNone = recent === "none";
  const hasBleach  = !recentIsNone && (recent === "bleach" || prev === "bleach");
  const hasRootDye = !recentIsNone && (recent === "root_dye" || prev === "root_dye");
  // 셀프 체크 노출 대상: 염색 또는 뿌리염색을 어느 슬롯에서든 골랐을 때(한 번만).
  const hasAnyDye  = !recentIsNone && (recent === "dye" || recent === "root_dye" || prev === "dye" || prev === "root_dye");
  // 뿌리염색 손님은 주기 선택까지 해야 진행(정확 점수 확보). 그 외엔 기존과 동일.
  const canProceed = !disabled && (recentIsNone || (recent !== null && prev !== null && (!hasRootDye || rootInterval !== "")));

  function submit() {
    if (!canProceed) return;
    if (recentIsNone) {
      onComplete({ h_recent: "none", h_prev: "none", h_more: "none", h_bleach_2plus: false, h_root_gray: false, h_self_dye: false, h_root_interval: "", h_root_over6m: false });
      return;
    }
    onComplete({
      h_recent: recent as DamageSurveyAnswers["h_recent"],
      h_prev:   prev as DamageSurveyAnswers["h_prev"],
      h_more:   more as DamageSurveyAnswers["h_more"],
      h_bleach_2plus: hasBleach && bleach2,
      h_root_gray:    hasRootDye && rootGray,
      h_self_dye:     hasAnyDye && selfDye,
      h_root_interval: hasRootDye ? rootInterval : "",
      h_root_over6m:   hasRootDye ? rootOver6m : false,
    });
  }

  const Chk = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors disabled:opacity-40 ${
        on ? "border-ink bg-ink/[0.04] font-semibold text-ink" : "border-line text-ink-2"
      }`}>
      <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border ${on ? "border-ink bg-ink text-white" : "border-line"}`}>
        {on ? "✓" : ""}
      </span>
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[14px] font-bold text-ink">가장 최근에 한 시술은?</p>
        <div className="grid grid-cols-2 gap-2">
          {TREATMENT_OPTIONS.map((o) => (
            <RoundedOptionButton key={o.id} label={o.label} selected={recent === o.id}
              disabled={disabled} onSelect={() => setRecent(o.id)} />
          ))}
        </div>
      </div>

      {recent !== null && !recentIsNone && (
        <div>
          <p className="mb-2 text-[14px] font-bold text-ink">그 전에 한 시술은?</p>
          <div className="grid grid-cols-2 gap-2">
            {TREATMENT_OPTIONS.map((o) => (
              <RoundedOptionButton key={o.id} label={o.label} selected={prev === o.id}
                disabled={disabled} onSelect={() => setPrev(o.id)} />
            ))}
          </div>
        </div>
      )}

      {!recentIsNone && (hasBleach || hasRootDye || hasAnyDye) && recent !== null && prev !== null && (
        <div className="space-y-2">
          {hasBleach  && <Chk on={bleach2}  onToggle={() => setBleach2((v) => !v)}  label="탈색은 2번 이상 했어요" />}
          {hasRootDye && <Chk on={rootGray} onToggle={() => setRootGray((v) => !v)} label="뿌리염색은 새치 염색이에요" />}
          {hasAnyDye  && <Chk on={selfDye}  onToggle={() => setSelfDye((v) => !v)}  label="집에서 직접 하신 적 있어요" />}
        </div>
      )}

      {/* 뿌리염색 주기 — 뿌리염색 선택 손님에게만(새치 주고객 2~3주 반영). 선택해야 진행. */}
      {hasRootDye && recent !== null && prev !== null && (
        <div>
          <p className="mb-2 text-[14px] font-bold text-ink">뿌리 염색은 보통 얼마마다 하세요?</p>
          <div className="grid grid-cols-3 gap-2">
            {ROOT_DYE_INTERVAL_OPTIONS.map((o) => (
              <RoundedOptionButton key={o.id} label={o.label} selected={rootInterval === o.id}
                disabled={disabled} onSelect={() => setRootInterval(o.id)} />
            ))}
          </div>
          <div className="mt-2">
            <Chk on={rootOver6m} onToggle={() => setRootOver6m((v) => !v)} label="6개월 넘게 계속 해왔어요" />
          </div>
        </div>
      )}

      {!recentIsNone && recent !== null && prev !== null && (
        <div>
          <p className="mb-1 text-[14px] font-bold text-ink">이거 말고 작년에 더 하신 게 있으세요?</p>
          <p className="mb-2 text-[13px] text-ink-2">한 번만 눌러주시면 결과가 훨씬 정확해집니다</p>
          <div className="grid grid-cols-3 gap-2">
            {MORE_OPTIONS.map((o) => (
              <RoundedOptionButton key={o.id} label={o.label} selected={more === o.id}
                disabled={disabled} onSelect={() => setMore(o.id)} />
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={submit} disabled={!canProceed}
        className="btn-primary h-11 w-full disabled:opacity-50">
        진단 결과 보기 →
      </button>
    </div>
  );
}

export default function DamageCheckSurveyPage() {
  const router = useRouter();
  const [qIdx, setQIdx]       = useState(0);
  const [dir, setDir]         = useState(1);
  const [pending, setPending] = useState(false);
  const [answers, setAnswers] = useState<DamageSurveyAnswers>({
    q1_pull: "", q2_friction: "", q3_dry: "",
    h_recent: "none", h_prev: "none", h_more: "none", h_bleach_2plus: false, h_root_gray: false,
    h_root_interval: "", h_root_over6m: false,
  });

  const q = SURVEY_QUESTIONS[qIdx]!;
  const isLast = qIdx === TOTAL - 1;

  function finishAndGoToResult(finalAnswers: DamageSurveyAnswers) {
    try { sessionStorage.setItem(DAMAGE_SURVEY_KEY, JSON.stringify(finalAnswers)); } catch { /**/ }
    trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID });
    router.push("/damage-check/result");
  }

  function handleSelectSingle(optId: string) {
    if (pending || q.kind !== "single") return;
    const newAnswers = { ...answers, [q.qKey]: optId } as DamageSurveyAnswers;
    setAnswers(newAnswers);
    setPending(true);
    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: LANDING_ID, diagnosis_type: LANDING_ID,
      answers: { questionKey: q.qKey, optionId: optId },
    });
    setTimeout(() => {
      setPending(false);
      if (isLast) finishAndGoToResult(newAnswers);
      else { setDir(1); setQIdx((i) => i + 1); }
    }, 350);
  }

  function handleTreatmentComplete(partial: Partial<DamageSurveyAnswers>) {
    if (pending) return;
    const merged = { ...answers, ...partial } as DamageSurveyAnswers;
    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: LANDING_ID, diagnosis_type: LANDING_ID,
      answers: { questionKey: "h_history", optionId: `${partial.h_recent}>${partial.h_prev}` },
    });
    setAnswers(merged);
    finishAndGoToResult(merged);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  return (
    <div className="relative min-h-screen">
      <main className="mx-auto flex h-[100dvh] max-w-[430px] flex-col overflow-hidden text-ink">

        <TestHeader stepLabel={`손상도 진단 · ${q.stepTag}`} current={qIdx + 1} total={TOTAL}>
          <ProgressBar value={((qIdx + 1) / TOTAL) * 100} />
        </TestHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-5">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={q.qKey}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-center py-6"
            >
              <div className="mb-6">
                <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-ink-2">{q.no}</p>
                <h2 className="font-serif text-xl font-bold leading-snug text-ink whitespace-pre-line">{q.title}</h2>
                {q.hint && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{q.hint}</p>}
              </div>

              {q.kind === "treatment_history" ? (
                <TreatmentHistoryStep disabled={pending} onComplete={handleTreatmentComplete} />
              ) : (
                <div className="space-y-2.5">
                  {q.options.map((opt) => (
                    <RoundedOptionButton
                      key={opt.id}
                      icon={opt.icon}
                      label={opt.label}
                      desc={opt.desc}
                      selected={answers[q.qKey] === opt.id}
                      disabled={pending}
                      onSelect={() => handleSelectSingle(opt.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex-none px-5 py-4">
          {qIdx > 0 ? (
            <button onClick={goBack} disabled={pending}
              className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-40">
              ← 이전
            </button>
          ) : (
            <a href="/damage-check" className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink">나가기</a>
          )}
          {q.kind === "single" && (
            <p className="mt-2 text-center text-[13px] text-ink-2">선택하면 자동으로 넘어가요</p>
          )}
        </div>
      </main>
    </div>
  );
}
