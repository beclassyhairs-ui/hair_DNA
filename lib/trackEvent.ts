// ============================================================================
// 어뷰티 — 홈 대시보드 계열 페이지(app/home, app/diagnosis, app/consulting,
// app/items, app/myhair) 공용 이벤트 트래킹 fallback.
//
// 실제 analytics 연동 경로(lib/analytics.ts — GA4/Clarity, lib/eventTracking.ts —
// Supabase 실DB)가 두 갈래로 나뉘어 있어, 우선 이 로컬 fallback(console.log)으로
// 이벤트를 남긴다. 추후 실 연동 시 이 함수 내부만 교체하면 되도록 시그니처
// (name, payload)를 통일해둔다.
// ============================================================================

export const trackEvent = (eventName: string, payload?: Record<string, unknown>) => {
  console.log("[trackEvent]", eventName, payload);
};
