-- ============================================================================
-- 어뷰티 — events 퍼널 조회용 인덱스 (2026-07-20)
--
-- 대상: /api/admin/funnel 이 쓰는 조회 패턴
--   where event_time >= :since and event_time < :asOf
--   order by event_time desc, id desc
--   (+ keyset 페이지네이션 커서: event_time < :t or (event_time = :t and id < :id))
--
-- 기존 스키마에는 created_at desc 인덱스만 있고 event_time 인덱스가 없어서,
-- 기간 필터와 정렬이 전부 순차 스캔으로 처리된다. 이벤트가 쌓일수록 대시보드가
-- 느려지고 타임아웃 위험이 생긴다. (Codex 검수 지적)
--
-- 🔴 변경 쿼리 — Supabase SQL Editor에서 사업주가 직접 실행할 것.
--    데이터를 바꾸지 않고 인덱스만 추가하므로 되돌리기 쉽다(맨 아래 롤백 참고).
--    실행 시점의 events 행 수가 적으면 수 초 내로 끝난다.
-- ============================================================================

create index if not exists idx_events_funnel_paging
  on public.events (event_time desc, id desc);

-- 확인용 (🟢 조회 전용):
--   select indexname from pg_indexes where tablename = 'events';
--   → idx_events_funnel_paging 이 보이면 성공

-- ─── 참고 ───────────────────────────────────────────────────────────────────
-- 테이블이 커진 뒤(수십만 행) 다시 만들어야 한다면 쓰기를 막지 않는 concurrently를
-- 쓴다. 단 concurrently는 트랜잭션 안에서 실행할 수 없으므로 BEGIN/COMMIT으로
-- 감싸지 말 것:
--   create index concurrently if not exists idx_events_funnel_paging
--     on public.events (event_time desc, id desc);
--
-- 롤백:
--   drop index if exists idx_events_funnel_paging;
