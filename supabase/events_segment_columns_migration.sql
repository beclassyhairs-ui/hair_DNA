-- ============================================================================
-- 미알팁 · events 세그먼트 축 컬럼 승격 (Phase 2 · 2026-09-30)
--
-- 목적: 연령대·모발 굵기·숱을 report_view·product_clicked·product_impression 이벤트에
--       "컬럼"으로 승격한다. 기존엔 answer_selected 의 answers(jsonb)에 흩어져 있어
--       Q4 세그먼트 교차 조인이 복잡·느렸다(승격 근거).
--
-- ⚠️ 실행 순서(중요): **이 마이그레이션을 코드 배포보다 먼저 실행**해야 한다.
--    클라이언트 trackEvent 는 events 행 객체를 통째로 insert 하는데, 컬럼이 없는 상태에서
--    age_band 등을 실은 insert 가 오면 Supabase 가 "column not found" 로 행 전체를 거부한다.
--    → 컬럼이 먼저 존재하면, 구코드(컬럼 미전송)든 신코드(컬럼 전송)든 모두 정상 적재된다.
--
-- ⚠️ 파괴적 구문 없음. 전부 nullable 추가(ADD COLUMN IF NOT EXISTS). 기존 행은 NULL 로 남는다.
--    RLS 변경 없음 — anon INSERT 정책은 with check(true) 로 컬럼 무관하게 모든 행을 커버한다.
--    사장님이 Supabase SQL Editor 에서 직접 실행한다(코드에서 실행 금지 — CLAUDE.md §4).
-- ============================================================================

alter table events
  add column if not exists age_band       text,   -- 연령대 (q1_age 원값: age_20 / age_30 / ...)
  add column if not exists hair_thickness text,   -- 모발 굵기 (q7_thickness 원값: coarse / medium_thickness / fine)
  add column if not exists hair_density   text;   -- 모발 숱 (q8_density 원값: thick_density / medium_density / thin_density)

-- 검증(선택): 컬럼이 추가됐는지 확인
-- select column_name from information_schema.columns
--  where table_name = 'events' and column_name in ('age_band','hair_thickness','hair_density');
