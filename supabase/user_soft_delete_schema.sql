-- ============================================================================
-- 어뷰티 — 회원 삭제(soft-delete) 스키마 + RPC  [Phase B 설계 초안]
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--   (Phase B 설계·Codex 3회 반론검증 반영본. 실행 전 PM/사업주 최종 검토 필요.)
--
-- 근거: docs/DESIGN_consent_and_deletion.md §4·§7 + docs/DESIGN_phaseB_soft_delete.md
-- 원칙:
--   - users는 hard delete 금지(soft-delete). user_consents FK(NO ACTION)가 안전장치.
--   - 자식(profiles/diagnoses/hair_usage/events)은 실제 파기. user_consents는 보존(감사).
--   - kakao 회원번호는 센티넬('deleted:'||id)로 치환해 PII 파기 + 재로그인 격리.
--   - 삭제 RPC는 단일 트랜잭션(원자성) + 최소권한(service_role 전용).
-- ============================================================================

-- ── 1. users soft-delete 표시 컬럼 ──────────────────────────────────────────
alter table public.users add column if not exists deleted_at timestamptz;
create index if not exists idx_users_active on public.users (id) where deleted_at is null;

-- 센티넬('deleted:...')과 실제 카카오ID(숫자문자열) 영역 분리 —
-- 활성 행은 반드시 숫자 ID, 삭제 행만 'deleted:' 접두. 센티넬-실ID 충돌 원천 차단.
-- ⚠️ 추가 전 기존 활성 행 kakao_user_id가 모두 숫자인지 확인(전부 String(kakao 숫자) 유래라 참일 것).
--    안전하게: 먼저 NOT VALID로 추가 후 검증 → validate.
alter table public.users
  add constraint users_active_kakao_numeric
  check (deleted_at is not null or kakao_user_id ~ '^[0-9]+$') not valid;
alter table public.users validate constraint users_active_kakao_numeric;

-- ── 2. 삭제 후 재삽입 race 차단(Codex #2) ───────────────────────────────────
-- 삭제 트랜잭션과 동시에 me/sync 등이 자식 행을 다시 insert하는 것을 DB 레벨에서 막는다.
-- 애플리케이션 사전조회로는 원자성이 없으므로 트리거(같은 트랜잭션)에 둔다.
create or replace function public.assert_parent_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  if new.user_id is null then
    return new;  -- events 익명분(user_id null)은 부모 없음 → 통과
  end if;
  select deleted_at into v_deleted
    from public.users where id = new.user_id
    for key share;                       -- 부모를 삭제 RPC의 FOR UPDATE와 직렬화
  if not found or v_deleted is not null then
    raise exception 'user % is deleted or missing', new.user_id
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end; $$;

create trigger trg_diag_parent_active  before insert or update on public.diagnoses
  for each row execute function public.assert_parent_active();
create trigger trg_prof_parent_active  before insert or update on public.profiles
  for each row execute function public.assert_parent_active();
create trigger trg_usage_parent_active before insert or update on public.hair_usage
  for each row execute function public.assert_parent_active();

-- ⚠️ events 는 user_id 가 **text**(로그인=계정 uuid 문자열, 비로그인=anonymous_id 문자열)라
--    공용 assert_parent_active()의 `id = new.user_id`(uuid = text)가 전건 예외를 낸다(2026-10-01 계측 중단 사고).
--    events 전용 함수로 분리 — 익명/비계정/비-uuid 는 통과, 실제 계정이 soft-delete 된 경우만 차단.
--    (복구 마이그레이션: events_trigger_fix_2026-10-01.sql)
create or replace function public.assert_event_parent_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  if new.user_id is null then
    return new;  -- 익명분(user_id null) → 통과
  end if;
  -- uuid 형식이 아니면 계정 식별자가 아님 → 통과
  if new.user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return new;
  end if;
  select deleted_at into v_deleted
    from public.users where id = new.user_id::uuid
    for key share;
  -- users 에 없으면 익명(anonymous_id) → 통과. 실제 계정이면서 삭제됐으면 차단.
  if found and v_deleted is not null then
    raise exception 'user % is deleted', new.user_id
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end; $$;

create trigger trg_events_parent_active before insert or update on public.events
  for each row execute function public.assert_event_parent_active();

-- ── 3. 삭제 RPC(단일 트랜잭션·원자성·멱등·최소권한) ─────────────────────────
create or replace function public.soft_delete_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_locked uuid;
begin
  -- 부모 선점 잠금 — 동시 자식 insert 트리거(FOR KEY SHARE)와 직렬화
  select id into v_locked
    from public.users
    where id = p_user_id and deleted_at is null
    for update;
  if v_locked is null then
    return false;   -- 없거나 이미 삭제 → '성공 위장' 안 함(오타/재요청 구분)
  end if;

  delete from public.diagnoses  where user_id = p_user_id;
  delete from public.profiles   where user_id = p_user_id;
  delete from public.hair_usage where user_id = p_user_id;
  delete from public.events     where user_id = p_user_id;  -- FK 없음 → 명시 삭제
  -- user_consents: 보존(감사·append-only 트리거 차단). 이 함수는 건드리지 않는다.

  update public.users
     set deleted_at        = now(),
         kakao_user_id      = 'deleted:' || id::text,       -- 카카오 회원번호 파기
         nickname           = null,
         profile_image      = null,
         marketing_consent  = false
   where id = p_user_id;
  return true;
end; $$;

-- 최소권한: SECURITY DEFINER 함수는 기본 PUBLIC EXECUTE라 anon/authenticated도 호출 가능 →
-- 반드시 회수하고 service_role에만 부여(서버 API 라우트가 service_role로 호출).
revoke all on function public.soft_delete_user(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_user(uuid) to service_role;

-- (assert_parent_active는 트리거로만 실행되지만, 방어적으로 직접 실행권도 회수)
revoke all on function public.assert_parent_active() from public, anon, authenticated;
