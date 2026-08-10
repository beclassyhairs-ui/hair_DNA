"use client";

// ============================================================================
// 어뷰티 스타일 서비스 — 8문항 설문 (항상 Q1부터 시작, 텍스트 최적화)
// STEP 1(1~4) 스타일 결정 → STEP 2(5~8) 모질 파악 → /style/upload
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ALL_STYLE_QUESTIONS,
  STYLE_SURVEY,
  isShortLength,
  TREATMENT_OPTIONS,
  MORE_OPTIONS,
  type StyleAnswers,
} from "../surveyData";
import { STYLE_ANSWERS_KEY } from "../constants";
import { hasOverseasConsent, consentGateHref } from "@/lib/consentGate";
import { EVENT_NAMES, trackEvent } from "@/lib/eventTracking";
import TestHeader from "@/components/beauty-ui/TestHeader";
import ProgressBar from "@/components/beauty-ui/ProgressBar";
import RoundedOptionButton from "@/components/beauty-ui/RoundedOptionButton";

// 질문 id → STEP 라벨 (visibleQuestions로 필터링돼도 인덱스와 무관하게 항상 정확함)
const STEP_LABEL_BY_QID: Record<string, string> = Object.fromEntries(
  STYLE_SURVEY.flatMap((step) => step.questions.map((sq) => [sq.id, step.label])),
);

const slideVariants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -56 : 56 }),
};

// ─── 시술이력(Q8) 전용 다단계 렌더러 (A-1②) ─────────────────────────────────
// "1문항 UX"로 묶는다: 최근 시술 → (선택 시) 그 전 시술 → (선택 시) 더 하신 거 + 하위체크 →
// "다음" 버튼으로 한 번에 제출. 저장 키: q8a_recent/q8b_prev/q8c_more/q8_bleach_2plus/q8_root_gray.
function TreatmentHistoryStep({
  initial, disabled, onComplete,
}: {
  initial: StyleAnswers;
  disabled: boolean;
  onComplete: (partial: StyleAnswers) => void;
}) {
  const [recent, setRecent] = useState<string | null>(initial.q8a_recent ?? null);
  const [prev,   setPrev]   = useState<string | null>(initial.q8b_prev ?? null);
  const [more,   setMore]   = useState<string>(initial.q8c_more ?? "none");
  const [bleach2, setBleach2] = useState<boolean>(initial.q8_bleach_2plus === "1");
  const [rootGray, setRootGray] = useState<boolean>(initial.q8_root_gray === "1");

  // 최근 시술 = "없음" → 시술 이력 없음(점수 0·통과). 그전·하위체크·"더 하신 거" 전부 스킵하고
  // 바로 "다음" 활성. (그전 = "없음"은 최근만 하고 그전엔 안 한 유효 경우 → "더 하신 거"로 진행.)
  const recentIsNone = recent === "none";
  const hasBleach   = !recentIsNone && (recent === "bleach"   || prev === "bleach");
  const hasRootDye  = !recentIsNone && (recent === "root_dye" || prev === "root_dye");
  const canProceed  = !disabled && (recentIsNone || (recent !== null && prev !== null));

  function submit() {
    if (!canProceed) return;
    if (recentIsNone) {
      onComplete({ q8a_recent: "none", q8b_prev: "none", q8c_more: "none", q8_bleach_2plus: "", q8_root_gray: "" });
      return;
    }
    onComplete({
      q8a_recent:      recent!,
      q8b_prev:        prev!,
      q8c_more:        more,
      q8_bleach_2plus: hasBleach && bleach2 ? "1" : "",
      q8_root_gray:    hasRootDye && rootGray ? "1" : "",
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
      {/* Q8-a 가장 최근 */}
      <div>
        <p className="mb-2 text-[14px] font-bold text-ink">가장 최근에 한 시술은?</p>
        <div className="grid grid-cols-2 gap-2">
          {TREATMENT_OPTIONS.map((o) => (
            <RoundedOptionButton key={o.id} label={o.label} selected={recent === o.id}
              disabled={disabled} onSelect={() => setRecent(o.id)} />
          ))}
        </div>
      </div>

      {/* Q8-b 그 전 (최근 선택 후 노출, 단 최근="없음"이면 스킵) */}
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

      {/* 하위 체크 — 탈색 2회+ / 뿌리=새치 (해당 시술 선택 시에만, 최근="없음"이면 스킵) */}
      {!recentIsNone && (hasBleach || hasRootDye) && recent !== null && prev !== null && (
        <div className="space-y-2">
          {hasBleach  && <Chk on={bleach2}  onToggle={() => setBleach2((v) => !v)}  label="탈색은 2번 이상 했어요" />}
          {hasRootDye && <Chk on={rootGray} onToggle={() => setRootGray((v) => !v)} label="뿌리염색은 새치 염색이에요" />}
        </div>
      )}

      {/* Q8-c 더 하신 거 (그 전 선택 후 노출, 선택 안 해도 됨. 최근="없음"이면 스킵) */}
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

      {/* 다음 */}
      <button type="button" onClick={submit} disabled={!canProceed}
        className="btn-primary mt-2 w-full disabled:opacity-40">
        다음
      </button>
    </div>
  );
}

export default function StyleSurveyPage() {
  const router = useRouter();
  const [qIdx,    setQIdx]    = useState(0);
  const [dir,     setDir]     = useState(1);
  const [answers, setAnswers] = useState<StyleAnswers>({});
  const [pending, setPending] = useState(false);

  // ★ Next.js Router Cache 대응: 네비게이션 복원 상태가 남아있어도 항상 Q1부터 강제 시작
  useEffect(() => {
    setQIdx(0);
    setDir(1);
    setAnswers({});
  }, []);

  // short/short_bob이면 q14_layer 질문 자체를 화면에서 숨긴다(값은 handleSelect에서 자동 저장)
  const visibleQuestions = useMemo(
    () => ALL_STYLE_QUESTIONS.filter(
      (item) => item.id !== "q14_layer" || !isShortLength(answers.q11_length),
    ),
    [answers.q11_length],
  );
  const visibleTotal = visibleQuestions.length;

  const q      = visibleQuestions[qIdx];
  const isLast = qIdx === visibleTotal - 1;

  // q13_design은 질문 자체는 유지하고 short/short_bob일 때 s_curl 옵션만 숨긴다
  const visibleOptions =
    q?.id === "q13_design" && isShortLength(answers.q11_length)
      ? q.options.filter((opt) => opt.id !== "s_curl")
      : q?.options ?? [];

  async function advance(next: StyleAnswers) {
    try { sessionStorage.setItem(STYLE_ANSWERS_KEY, JSON.stringify(next)); } catch { /**/ }
    if (isLast) {
      // 진단 완료 — 마지막 문항 제출 시점. 결과지 열람(report_view)은 upload→loading(AI 합성)을
      // 거친 뒤라 별도 이벤트다. 두 이벤트 사이 격차가 곧 합성 대기 이탈률이다.
      trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETE, { landing_id: "style", diagnosis_type: "style" });
      // 얼굴 사진 수집 前 동의 게이트(§8): 현재버전 국외이전 동의 보유자만 사진 단계로,
      // 아니면 동의화면으로. 조회 실패 시 안전측(동의화면).
      const ok = await hasOverseasConsent();
      router.push(ok ? "/style/upload" : consentGateHref());
    } else {
      setDir(1);
      setQIdx((i) => i + 1);
    }
  }

  function handleSelect(optId: string) {
    if (pending) return;
    const next: StyleAnswers = { ...answers, [q.id]: optId };

    if (q.id === "q11_length") {
      if (isShortLength(optId)) {
        // 레이어드 질문이 숨겨지므로 내부적으로 "가벼움"을 자동 저장
        next.q14_layer = "light";
        // 새 정책상 short/short_bob + s_curl 조합은 없으므로 남아있던 값 정리
        if (next.q13_design === "s_curl") delete next.q13_design;
      } else if (isShortLength(answers.q11_length)) {
        // short/short_bob → 단발 이상으로 전환: 자동 저장값을 지워 재선택을 유도
        delete next.q14_layer;
      }
    }

    // 문항 답변 — 진단 드롭오프 분석용 (qIdx는 0-based → 1-based 문항번호로 기록)
    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: "style",
      diagnosis_type: "style",
      answers: { questionId: q.id, choice: optId, step: qIdx + 1 },
    });

    setAnswers(next);
    setPending(true);
    // advance 완료(마지막 문항은 /api/auth/me 조회 포함)까지 pending 유지 → 중복 클릭·중복 이동 방지(Codex).
    setTimeout(() => { void advance(next).finally(() => setPending(false)); }, 350);
  }

  // 시술이력 전용 렌더러 제출 — 여러 키를 한 번에 병합하고 진행(단일선택 자동넘김과 별개 경로).
  function handleTreatmentComplete(partial: StyleAnswers) {
    if (pending) return;
    const next: StyleAnswers = { ...answers, ...partial };
    trackEvent(EVENT_NAMES.ANSWER_SELECTED, {
      landing_id: "style",
      diagnosis_type: "style",
      answers: { questionId: q.id, choice: `${partial.q8a_recent}>${partial.q8b_prev}`, step: qIdx + 1 },
    });
    setAnswers(next);
    setPending(true);
    setTimeout(() => { void advance(next).finally(() => setPending(false)); }, 250);
  }

  function goBack() {
    if (pending || qIdx === 0) return;
    setDir(-1);
    setQIdx((i) => i - 1);
  }

  if (!q) return null;

  return (
    <div className="relative min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col text-ink">

        <TestHeader stepLabel={STEP_LABEL_BY_QID[q.id] ?? ""} current={qIdx + 1} total={visibleTotal}>
          <ProgressBar value={((qIdx + 1) / visibleTotal) * 100} />
        </TestHeader>

        {/* 질문 본문 */}
        <div className="flex flex-1 flex-col px-5">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={q.id}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col py-7"
            >
              <div className="mb-6">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-ink-2">
                  Q{q.no}
                </p>
                <h2 className="font-serif text-xl font-bold leading-snug text-ink sm:text-2xl">
                  {q.title}
                </h2>
                {q.hint && (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{q.hint}</p>
                )}
              </div>

              {q.kind === "treatment_history" ? (
                <TreatmentHistoryStep
                  initial={answers}
                  disabled={pending}
                  onComplete={handleTreatmentComplete}
                />
              ) : (
                <div className="space-y-2.5">
                  {visibleOptions.map((opt) => (
                    <RoundedOptionButton
                      key={opt.id}
                      label={opt.label}
                      desc={opt.desc}
                      selected={answers[q.id] === opt.id}
                      disabled={pending}
                      onSelect={() => handleSelect(opt.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 하단 네비게이션 */}
        <div className="flex-none px-5 pb-8 pt-4">
          {qIdx > 0 ? (
            <button onClick={goBack} disabled={pending}
              className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-40">
              ← 이전
            </button>
          ) : (
            <Link href="/style" className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink">
              나가기
            </Link>
          )}
          <p className="mt-2 text-center text-[13px] text-ink-2">선택하면 자동으로 넘어가요</p>
        </div>
      </main>
    </div>
  );
}
