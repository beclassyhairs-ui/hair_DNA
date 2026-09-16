-- ============================================================================
-- user_consents.consent_type CHECK 에 'marketing' 포함 보장 (마케팅 알림 신청 기능 전제)
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. Supabase SQL Editor 에서 사업주가 직접 실행한다.
--   (자동 실행·읽기전용 사전점검 포함 항상 사업주 직접 — CLAUDE.md §4)
--
-- 배경: 데미지 결과지 '새치 축'의 출시 알림 신청은 user_consents 에 consent_type='marketing'
--   행을 append-only 로 남긴다. user_consents_schema.sql 로 테이블을 만들었다면 CHECK 에 이미
--   'marketing' 이 포함돼 있어 이 파일은 불필요하다. 다만 테이블이 그 값 추가 이전에 만들어졌다면
--   'marketing' INSERT 가 CHECK 위반으로 실패(→ POST 500 → 신청이 조용히 안 남음)하므로 아래로 보정한다.
--
-- 실행 순서:
--   0) (사전점검) 현재 제약 내용 확인 — 아래 SELECT 를 먼저 돌려 'marketing' 포함 여부를 본다.
--      SELECT conname, pg_get_constraintdef(oid)
--        FROM pg_constraint
--       WHERE conrelid = 'user_consents'::regclass AND contype = 'c';
--      → 결과에 'marketing' 이 이미 있으면 이 파일은 실행하지 않는다(no-op).
--
--   1) 'marketing' 이 없다면(그리고 제약명이 아래 기본명과 같다면) 실행:
-- ----------------------------------------------------------------------------
alter table user_consents drop constraint if exists user_consents_consent_type_check;
alter table user_consents add constraint user_consents_consent_type_check
  check (consent_type in ('privacy','terms','overseas_transfer','marketing'));
-- ----------------------------------------------------------------------------
-- ※ 위 drop 은 인라인 CHECK 의 Postgres 기본 제약명(user_consents_consent_type_check)을 가정한다.
--   0) 사전점검 결과의 conname 이 다르면, 그 이름으로 drop 한 뒤 위 add 를 실행한다.
--   ※ 기존 행(privacy/terms/overseas_transfer/marketing)은 새 제약도 모두 통과하므로 재적용 안전.
-- ============================================================================
