"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "./constants";
import { getRemainingUses, canUseToday, DAILY_MAX } from "@/lib/dailyLimit";
import { EVENT_NAMES, trackEvent } from "@/lib/eventTracking";
import CompletionGauge from "@/components/CompletionGauge";
import SilkBackground from "@/components/beauty-ui/SilkBackground";
import BlackCTAButton from "@/components/beauty-ui/BlackCTAButton";
import { Button } from "@/app/components/ui";

export default function StyleLandingPage() {
  const router = useRouter();
  const [remaining,      setRemaining]      = useState(DAILY_MAX);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem(STYLE_ANSWERS_KEY);
      sessionStorage.removeItem(STYLE_PHOTO_KEY);
      sessionStorage.removeItem(STYLE_GENERATED_KEY);
      sessionStorage.removeItem(STYLE_UNLOCKED_KEY);
    } catch { /**/ }
    setRemaining(getRemainingUses());
    // 유입/조회 — 핵심 진단(/style) 랜딩 진입 1회
    trackEvent(EVENT_NAMES.LANDING_VIEW, { landing_id: "style", diagnosis_type: "style" });
  }, []);

  function handleStart() {
    if (!canUseToday()) { setShowLimitModal(true); return; }
    trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: "style", diagnosis_type: "style" });
    router.push("/style/survey");
  }

  return (
    <SilkBackground>
      <main className="relative mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-page text-ink">

        {/* ── 소진 모달 ── */}
        <AnimatePresence>
          {showLimitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm"
              onClick={() => setShowLimitModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 16 }}
                className="w-full max-w-sm rounded-card border border-line bg-card p-7 text-center shadow-soft"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="text-h2 text-ink">오늘의 무료 진단이 끝났어요</h2>
                <p className="mt-3 text-body leading-relaxed text-ink-2">
                  하루 무료 진단 횟수({DAILY_MAX}회)를 모두 사용하셨습니다.<br />
                  내일 다시 찾아와 주세요!
                </p>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-btn bg-surface text-emphasis text-ink transition hover:bg-line"
                >
                  확인
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-sm flex-col items-center text-center"
        >
          {/* 브랜드 배지 */}
          <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.38em] text-ink-2">
            <span className="h-px w-6 bg-line" />
            A-Beauty
            <span className="h-px w-6 bg-line" />
          </span>

          {/* 메인 타이틀 — 히어로 이미지 없이 여백·수직 리듬으로 차분하게 */}
          <h1 className="mt-11 text-h1 leading-[1.35] text-ink">
            AI가 분석해주는<br />
            내 인생 헤어스타일
          </h1>

          <p className="mt-5 text-body leading-relaxed text-ink-2">
            나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
          </p>

          {/* CTA — 위 타이틀과 넉넉한 간격을 둬 빈 공간이 '미완성' 아닌 '여백'으로 읽히게 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-14 w-full space-y-4"
          >
            {/* A-1 완성도 게이지 — 랜딩 진입부 */}
            <CompletionGauge />

            {/* 남은 횟수 뱃지 */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1 text-aux text-ink-2">
                {remaining === 0
                  ? "오늘 무료 진단 횟수를 모두 사용했어요"
                  : `오늘 남은 무료 진단 횟수: ${remaining}회`}
              </span>
            </div>

            {/* CTA 버튼 — 횟수 차단 게이트(handleStart)를 그대로 태워야 해서 button 모드로 사용 */}
            <BlackCTAButton onClick={handleStart} className={remaining === 0 ? "opacity-45" : ""}>
              나의 맞춤 스타일 분석하기
            </BlackCTAButton>

            {/* ⚠️ 실동작과 일치해야 하는 문구 — 셀카는 합성에만 쓰고 합성 직후 즉시 파기한다
                (app/api/hair-transform finally 삭제, submit-diagnosis는 셀카 미저장).
                "개인정보 미저장"으로 되돌리지 말 것 — 국외이전·즉시파기 고지는 /style/upload에 있다. */}
            <p className="text-center text-aux text-ink-2">
              약 2분 소요 · 무료 · 사진은 결과 생성에 사용돼요
            </p>

            {/* 재방문 링크 — 밑줄버튼 폐지 → Secondary 버튼. /home으로 안내 */}
            <Button href="/home" variant="secondary" fullWidth>
              이미 분석받으셨나요? · 저장한 진단 보기
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </SilkBackground>
  );
}
