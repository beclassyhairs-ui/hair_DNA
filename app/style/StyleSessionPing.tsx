"use client";

// ============================================================================
// app/style/StyleSessionPing.tsx — faceswap GPU 세션핑(하트비트) · ③ (파트3)
//
// 배경: ddvinh1/face-swap-gpu 는 저트래픽이라 유휴 시 GPU 가 다시 잠든다(콜드스타트 ~4분).
//   실측(2026-08-16): 직전 요청 완료 후 150초까지 warm 유지(queue 0.02~0.03s), cold 전환은
//   그 이후. → 90초 간격 세션핑이면 GPU 를 계속 warm 으로 붙들 수 있다(90초에서 warm 확정).
//
// 이 컴포넌트는 /style 레이아웃에 상주(App Router 는 하위 라우트 전환 시 layout 을 언마운트하지
//   않음)하여, 손님이 /style 랜딩→설문→로그인→사진→로딩 을 도는 내내 하나의 타이머로 예열을
//   유지한다. 옛 2발 모델(survey 주발사 + upload 보조발사, prewarm.ts)을 대체한다.
//
// 발사 규칙:
//   · 랜딩 진입(마운트) 즉시 1발
//   · 이후 90초 간격 1발
//   · 탭 닫힘/이 구역 이탈(언마운트) 시 타이머 정리 → 자동 중단
//
// 가드레일(서버가 최종 방어 — /api/hair-transform/warmup):
//   · 손님 일일한도 미차감(bump_hair_usage 미호출). 셀카 미수신·미저장.
//   · 서버 90초 쿨다운(우리 간격과 정렬 — 리로드로 중복 발사돼도 서버가 스킵) + 전역 일일상한(5000/일≈$1).
//   · same-origin 게이트. 실패해도 조용히(fire-and-forget) 흐름을 막지 않는다.
// ============================================================================

import { useEffect } from "react";

// 세션핑 간격. 실측상 150초까지 warm 이나, 서버 쿨다운(90초)과 정렬해 90초로 둔다(여유 있는 안전권).
const SESSION_PING_MS = 90_000;

function fireWarmup(): void {
  // keepalive: 라우트 전환(설문→로그인→사진)로 이 컴포넌트가 리렌더돼도 요청이 끊기지 않게.
  void fetch("/api/hair-transform/warmup", { method: "POST", keepalive: true }).catch(() => { /* 무시 */ });
}

export default function StyleSessionPing() {
  useEffect(() => {
    fireWarmup();                                    // 랜딩 진입 1발
    const t = setInterval(fireWarmup, SESSION_PING_MS); // 체류 중 90초 간격
    return () => clearInterval(t);                    // 탭 닫힘/이탈 시 중단
  }, []);
  return null;
}
