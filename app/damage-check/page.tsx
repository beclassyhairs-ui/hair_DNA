"use client";

// ============================================================================
// 손상도 자가진단 랜딩  [아이보리 리뱀프 3단계 · 진단 랜딩]
// 디자인 SSOT: docs/ui-spec.html §3 — 액자 히어로(모델 사진) + 명조 헤드라인
//   + 차콜 CTA. 흰 카드는 액자 1장뿐. 완성도 게이지는 인라인(플랫).
// ============================================================================

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

import { EVENT_NAMES, trackEvent } from "../../lib/eventTracking";
import InlineCompletion from "@/components/InlineCompletion";

const LANDING_ID = "damage_check";

// 결 대비 히어로 — 건강한 결 vs 상한 결 견본 2장(세로 2단, 1:1 정사각 동일 크롭 기준).
//   ★ 스타일 랜딩과 공유하는 LandingFrameHero(폴라로이드+EXAMPLE+기울임)는 이 자리에 쓰지 않는다
//     — 여긴 "예시"가 아니라 손님이 자기 머리끝과 대조하는 "결 견본"이라 액자·EXAMPLE·기울임 부적합.
//     LandingFrameHero 컴포넌트 자체는 손대지 않는다(수정 시 /style이 함께 바뀜).
//   원본 이미지는 편집하지 않고 object-cover 정사각 크롭 + object-position으로만 결을 정렬한다.
function TextureSample({ src, label, objectPosition }: { src: string; label: string; objectPosition: string }) {
  return (
    <div className="relative aspect-square w-full bg-soft">
      <Image
        src={src}
        alt={`${label} 견본`}
        fill
        sizes="(max-width: 430px) 88vw, 300px"
        priority
        className="object-cover"
        style={{ objectPosition }}
      />
      <span className="absolute left-2.5 top-2.5 rounded-pill bg-white/85 px-2.5 py-1 text-aux font-semibold text-ink shadow-[0_1px_5px_rgba(42,38,31,0.14)] backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

export default function DamageCheckLandingPage() {
  useEffect(() => {
    trackEvent(EVENT_NAMES.LANDING_VIEW, {
      landing_id: LANDING_ID,
      diagnosis_type: LANDING_ID,
    });
  }, []);

  return (
    <div className="relative min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-page py-10 text-ink">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-sm flex-col items-center text-center"
        >
          <span className="font-serif text-[13px] tracking-[0.3em] text-sub">MIALTIP</span>
          <p className="mt-1.5 text-aux text-sub">미용실에서 알 수 없는 꿀팁</p>

          {/* 결 대비 히어로 — 위 건강한 결 / 아래 상한 결. 한 세트로 읽히도록 한 카드에 붙여 세로 2단. */}
          <div className="mt-5 w-full max-w-[300px] overflow-hidden rounded-2xl bg-card shadow-soft">
            <TextureSample src="/images/damage-hero-healthy.png" label="건강한 결" objectPosition="50% 45%" />
            <div className="h-px bg-line" />
            <TextureSample src="/images/damage-hero-damaged.png" label="상한 결" objectPosition="50% 50%" />
          </div>

          <span className="mt-6 inline-flex items-center rounded-pill bg-soft px-4 py-1.5 text-aux font-medium tracking-wide text-sub">
            미용실 가기 전 1분 팩트체크
          </span>

          <h1 className="mt-4 font-serif text-h1 font-semibold leading-[1.4] text-ink">
            내 머리, 진짜<br />손상도는 얼마나 될까?
          </h1>
          <p className="mt-4 text-body leading-relaxed text-sub">
            현업 미용사들이 쓰는 시크릿 테스트 3가지로<br />
            비싼 케어 무작정 받기 전에 먼저 확인해보세요.
          </p>

          <div className="mt-8 w-full space-y-4">
            {/* 완성도 게이지 — 인라인(카드 아님) */}
            <InlineCompletion className="justify-center" />

            <Link
              href="/damage-check/survey"
              onClick={() => trackEvent(EVENT_NAMES.DIAGNOSIS_START, { landing_id: LANDING_ID, diagnosis_type: LANDING_ID })}
              className="btn-primary w-full"
            >
              1분 자가진단 시작하기
            </Link>
            {/* ⚠️ 실동작 — 사진은 받지 않지만 문항 답변은 이벤트로 서버에 적재된다.
                "개인정보 미저장"으로 되돌리지 말 것. */}
            <p className="text-center text-aux text-sub">사진 촬영 없음 · 4문항 · 약 1분 소요</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
