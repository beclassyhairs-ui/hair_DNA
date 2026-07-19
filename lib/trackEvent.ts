// ============================================================================
// 어뷰티 — 공용 이벤트 트래킹 진입점 (하위 호환 래퍼)
//
// 과거 이 파일은 console.log만 하는 로컬 fallback이었으나, 이제 실제 트래킹 코어
// (lib/eventTracking.ts)를 그대로 re-export한다. 따라서 `trackEvent("문자열", {...})`
// 형태로 호출하던 기존 호출부(home/items/consulting/style 등)도 전부 Supabase `events`
// 테이블에 적재된다. 스키마에 없는 키는 meta(jsonb)로 자동 분리된다.
//
// 신규 코드는 lib/eventTracking.ts에서 직접 import 하는 것을 권장한다.
// ============================================================================

export { trackEvent, EVENT_NAMES } from "./eventTracking";
export type { EventPayload, TrackedEventName } from "./eventTracking";
