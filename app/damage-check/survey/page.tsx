"use client";

// ============================================================================
// 미알팁 셀프 손상도 자가진단 — 4문항 (Q1~Q3 단일선택 자동진행 / Q4 시술이력 전용 렌더러)
// 2026-08 개편(확정 68·72·77·115): Q4 습관 다중선택 폐기 → 시술이력 다단계 문항.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { DAMAGE_SURVEY_KEY } from "../constants";
import {
  SURVEY_QUESTIONS,
  TREATMENT_OPTIONS,
  ROOT_DYE_INTERVAL_OPTIONS,
  type DamageSurveyAnswers,
  type DamageTreatment,
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

// ─── Q4 시술이력 전용 렌더러 (2026-09 옵션① — 복수선택 + 가장 최근 1개) ──────────
// 받은 시술 전부(복수 체크) → (2개 이상이면) 가장 최근 1개 → 하위체크/뿌리주기 → 제출.
// '없음'이면 나머지 스킵하고 바로 제출. h_all(무손실)과 2슬롯(h_recent/h_prev/h_more)을 함께 기록.
//
// 매핑: h_recent=마지막(유형·cause·스탬프 결정) · h_prev=나머지 중 손상우선순위 대표(점수 2번째 슬롯)
//   · h_more=슬롯 밖 초과 개수(0 none/1 few/2+ many) · h_all=선택 전부(예언 조합 확장·무손실).
//   ※ 서로 다른 시술을 '같은 시술 2회'로 세지 않는다(점수는 2슬롯 유지).
const TREATMENT_PRIORITY: DamageTreatment[] = ["bleach", "heat_perm", "straight_perm", "normal_perm", "dye", "root_dye"];

function TreatmentHistoryStep({
  disabled, onComplete,
}: {
  disabled: boolean;
  onComplete: (partial: Partial<DamageSurveyAnswers>) => void;
}) {
  const [selected, setSelected] = useState<DamageTreatment[]>([]);
  const [none, setNone]         = useState(false);
  const [recent, setRecent]     = useState<DamageTreatment | null>(null); // 가장 최근(2개 이상일 때만)
  const [bleach2, setBleach2]   = useState(false);
  const [rootGray, setRootGray] = useState(false);
  const [selfDye, setSelfDye]   = useState(false);
  const [rootInterval, setRootInterval] = useState<RootDyeInterval>("");
  const [rootOver6m, setRootOver6m]     = useState(false);

  function toggleTreatment(id: DamageTreatment) {
    if (id === "none") { setNone(true); setSelected([]); setRecent(null); return; }
    setNone(false);
    setSelected((prevSel) => {
      const next = prevSel.includes(id) ? prevSel.filter((t) => t !== id) : [...prevSel, id];
      if (recent && !next.includes(recent)) setRecent(null); // 마지막 선택이 빠지면 무효화
      return next;
    });
  }

  const multi      = selected.length >= 2;
  const hasBleach  = selected.includes("bleach");
  const hasRootDye = selected.includes("root_dye");
  const hasAnyDye  = selected.includes("dye") || selected.includes("root_dye");
  const needRecent = multi && recent === null;
  const canProceed = !disabled && (
    none || (selected.length >= 1 && !needRecent && (!hasRootDye || rootInterval !== ""))
  );

  function submit() {
    if (!canProceed) return;
    if (none || selected.length === 0) {
      onComplete({ h_recent: "none", h_prev: "none", h_more: "none", h_all: [], h_bleach_2plus: false, h_root_gray: false, h_self_dye: false, h_root_interval: "", h_root_over6m: false });
      return;
    }
    const last: DamageTreatment = selected.length === 1 ? selected[0]! : (recent ?? selected[0]!);
    const rest = selected.filter((t) => t !== last);
    const prev: DamageTreatment = TREATMENT_PRIORITY.find((t) => rest.includes(t)) ?? "none";
    const extras = rest.filter((t) => t !== prev).length;
    const more: DamageSurveyAnswers["h_more"] = extras >= 2 ? "many" : extras === 1 ? "few" : "none";
    onComplete({
      h_recent: last,
      h_prev:   prev,
      h_more:   more,
      h_all:    [...selected],
      h_bleach_2plus: hasBleach && bleach2,
      h_root_gray:    hasRootDye && rootGray,
      h_self_dye:     hasAnyDye && selfDye,
      h_root_interval: hasRootDye ? rootInterval : "",
      h_root_over6m:   hasRootDye ? rootOver6m : false,
    });
  }

  const Chk = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl border px-4 py-3.5 text-left text-emphasis transition-colors disabled:opacity-40 ${
        on ? "border-ink bg-ink/[0.04] font-semibold text-ink" : "border-line text-ink-2"
      }`}>
      <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border ${on ? "border-ink bg-ink text-white" : "border-line"}`}>
        {on ? "✓" : ""}
      </span>
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* 복수선택 — 받은 시술 전부. '없음'은 배타(누르면 나머지 해제). */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          {TREATMENT_OPTIONS.map((o) => (
            <RoundedOptionButton key={o.id} label={o.label}
              selected={o.id === "none" ? none : selected.includes(o.id)}
              disabled={disabled} onSelect={() => toggleTreatment(o.id)} />
          ))}
        </div>
      </div>

      {/* 가장 최근 1개 — 2개 이상 선택 시에만(1개면 자동). */}
      {multi && (
        <div>
          <p className="mb-2 text-emphasis text-ink">그중 가장 최근에 한 건?</p>
          <div className="grid grid-cols-2 gap-2">
            {selected.map((id) => {
              const o = TREATMENT_OPTIONS.find((t) => t.id === id);
              return (
                <RoundedOptionButton key={id} label={o?.label ?? id} selected={recent === id}
                  disabled={disabled} onSelect={() => setRecent(id)} />
              );
            })}
          </div>
        </div>
      )}

      {!none && (hasBleach || hasRootDye || hasAnyDye) && (
        <div className="space-y-2">
          {hasBleach  && <Chk on={bleach2}  onToggle={() => setBleach2((v) => !v)}  label="탈색은 2번 이상 했어요" />}
          {hasRootDye && <Chk on={rootGray} onToggle={() => setRootGray((v) => !v)} label="뿌리염색은 새치 염색이에요" />}
          {hasAnyDye  && <Chk on={selfDye}  onToggle={() => setSelfDye((v) => !v)}  label="집에서 직접 하신 적 있어요" />}
        </div>
      )}

      {/* 뿌리염색 주기 — 뿌리염색 선택 손님에게만. 선택해야 진행. */}
      {hasRootDye && (
        <div>
          <p className="mb-2 text-emphasis text-ink">뿌리 염색은 보통 얼마마다 하세요?</p>
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

      <button type="button" onClick={submit} disabled={!canProceed}
        className="btn-primary min-h-12 w-full disabled:opacity-50">
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

        <TestHeader
          stepLabel={`손상도 진단 · ${q.stepTag}`}
          current={qIdx + 1}
          total={TOTAL}
          leading={
            qIdx > 0 ? (
              <button onClick={goBack} disabled={pending}
                className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-btn px-2 text-emphasis text-ink-2 transition-colors hover:text-ink disabled:opacity-40">
                <span aria-hidden className="text-xl leading-none">←</span> 이전
              </button>
            ) : (
              <a href="/damage-check"
                className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-btn px-2 text-emphasis text-ink-2 transition-colors hover:text-ink">
                <span aria-hidden className="text-xl leading-none">←</span> 나가기
              </a>
            )
          }
        >
          <ProgressBar value={((qIdx + 1) / TOTAL) * 100} />
        </TestHeader>

        {/* min-h-0: flex 자식이 콘텐츠보다 커지는 걸 막아 내부 스크롤이 실제로 동작(확정124 UI 버그 수정) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={q.qKey}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              // min-h-full: 짧은 문항은 가운데, 긴 문항(Q4)은 위에서부터 흐르며 끝까지 스크롤(제출 버튼 온전히 노출)
              className="flex min-h-full flex-col justify-center pt-6 pb-10"
            >
              <div className="mb-6">
                <p className="mb-1.5 text-label uppercase tracking-[0.1em] text-ink-2">{q.no}</p>
                <h2 className="font-serif text-xl font-bold leading-snug text-ink whitespace-pre-line">{q.title}</h2>
                {q.hint && <p className="mt-2 text-aux leading-relaxed text-ink-2">{q.hint}</p>}
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

        {/* 하단 안내 — 뒤로가기는 좌상단(P7)으로 이동, 자동진행 안내만 유지 */}
        {q.kind === "single" && (
          <div className="flex-none px-5 py-4">
            <p className="text-center text-aux text-ink-2">선택하면 자동으로 넘어가요</p>
          </div>
        )}
      </main>
    </div>
  );
}
