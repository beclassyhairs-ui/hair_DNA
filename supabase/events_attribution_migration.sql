-- ============================================================================
-- 어뷰티 — events 테이블 UTM 어트리뷰션 + meta 확장 마이그레이션
--
-- ★ 이 SQL을 Supabase SQL Editor에서 먼저 실행한 뒤 코드를 배포해야 한다. ★
--   신규 트래킹 코드는 insert 시 utm_medium / utm_campaign / meta 컬럼을 함께 보낸다.
--   컬럼이 없으면 PostgREST가 insert를 거부해 "모든" 이벤트 적재가 실패한다
--   (trackEvent는 오류를 삼켜 유저 플로우는 안 막지만, 데이터는 안 쌓인다).
--
-- 기존 컬럼 재사용:
--   source(text) = utm_source  (schema.sql에 이미 존재 — 그대로 사용)
--
-- 안전성: add column if not exists — 이미 있으면 no-op. 재실행 무해.
-- ============================================================================

begin;

-- 유입 출처 세분화 (source=utm_source는 기존 컬럼 재사용)
alter table events add column if not exists utm_medium   text;
alter table events add column if not exists utm_campaign text;

-- 스키마에 없는 임의 이벤트 컨텍스트(productId, coreKey, ui 위치, postId 등)를 담는 자유 필드
alter table events add column if not exists meta jsonb;

-- 캠페인/매체별 퍼널 집계 조회용 인덱스
create index if not exists idx_events_utm_campaign on events (utm_campaign);
create index if not exists idx_events_utm_medium   on events (utm_medium);

commit;
