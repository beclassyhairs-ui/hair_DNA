"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
  STYLE_PREWARM_KEY,
} from "./constants";
import { getRemainingUses, canUseToday, DAILY_MAX } from "@/lib/dailyLimit";
import { EVENT_NAMES, trackEvent } from "@/lib/eventTracking";
import InlineCompletion from "@/components/InlineCompletion";
import LandingFrameHero from "@/app/components/LandingFrameHero";
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
      sessionStorage.removeItem(STYLE_PREWARM_KEY); // 새 진단 시작 → 예열 플래그도 초기화(다음 발사 허용)
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
    <div className="relative min-h-screen">
      <main className="relative mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-page py-10 text-ink">

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
          {/* 브랜드 배지 (명조) */}
          <span className="font-serif text-[13px] tracking-[0.3em] text-sub">A-BEAUTY</span>

          {/* 액자 히어로 — 흰 매트 + 기울임 + EXAMPLE 라벨 (유일한 흰 카드) */}
          <div className="mt-5 w-full">
            <LandingFrameHero src="/landing/style-hero.jpg" caption="EXAMPLE · AI 스타일 미리보기" />
          </div>

          {/* 명조 헤드라인 */}
          <h1 className="mt-7 font-serif text-h1 font-semibold leading-[1.4] text-ink">
            AI가 분석해주는<br />
            내 인생 헤어스타일
          </h1>

          <p className="mt-4 text-body leading-relaxed text-sub">
            나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 w-full space-y-4"
          >
            {/* 완성도 게이지 — 인라인(카드 아님) */}
            <InlineCompletion className="justify-center" />

            {/* 남은 횟수 뱃지 */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-soft px-3 py-1 text-aux text-sub">
                {remaining === 0
                  ? "오늘 무료 진단 횟수를 모두 사용했어요"
                  : `오늘 남은 무료 진단 횟수: ${remaining}회`}
              </span>
            </div>

            {/* 주 CTA — 차콜 채움. 횟수 차단 게이트(handleStart) 유지 */}
            <button
              onClick={handleStart}
              className={`btn-primary w-full ${remaining === 0 ? "opacity-45" : ""}`}
            >
              나의 맞춤 스타일 분석하기
            </button>

            {/* ⚠️ 실동작과 일치해야 하는 문구 — 셀카는 합성에만 쓰고 우리 서버/Blob에 저장하지 않는다
                (2026-08-07 개정 Replicate faceswap: 요청에 data URI로만 전송, submit-diagnosis는 셀카 미저장).
                국외이전·미저장 상세 고지는 /privacy §5 및 /style/upload에 있다. */}
            <p className="text-center text-aux text-sub">
              약 2분 소요 · 무료 · 사진은 결과 생성에 사용돼요
            </p>

            {/* 보조링크(신규 2026-08-15) — 다른 진단(손상도)으로 넘어가는 교차 진입.
                주 CTA와 경합하지 않게 텍스트 링크로. (홈의 진단 랜딩 2장과 같은 이벤트로 계측) */}
            <Link
              href="/damage-check"
              onClick={() => trackEvent("diagnosis_card_click", { diagnosisType: "damage", source: "style_landing_secondary" })}
              className="block min-h-[44px] py-2 text-center text-aux text-sub transition-colors active:text-ink"
            >
              머리 상태부터 볼까요? · 1분 손상도 체크 →
            </Link>

            {/* 재방문 링크 — Secondary 버튼. /home으로 안내 */}
            <Button href="/home" variant="secondary" fullWidth>
              이미 분석받으셨나요? · 저장한 진단 보기
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
