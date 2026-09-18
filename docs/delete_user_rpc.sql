-- ============================================================================
-- 미알팁 — 회원 삭제(soft-delete) 스키마 + RPC  [POST /api/me/delete 전제]
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--   (CLAUDE.md §4 — 읽기전용 사전점검 포함 항상 사업주 직접.)
--
-- 이 파일은 supabase/user_soft_delete_schema.sql(Codex 3회 반론검증본)과 같은 설계다.
--   API 라우트(app/api/me/delete)는 아래 soft_delete_user(uuid) RPC 를 service_role 로 호출한다.
--   전부 멱등(if not exists / create or replace)이라 이미 적용됐다면 재실행해도 안전(no-op).
--
-- 원칙:
--   - users 는 hard delete 금지(soft-delete). 자식(profiles/diagnoses/hair_usage/events)은 실제 파기.
--   - user_consents 는 보존(감사·append-only). 이 RPC 는 건드리지 않는다.
--   - kakao 회원번호는 센티넬('deleted:'||id)로 치환 → PII 파기 + 재로그인 격리.
--   - 삭제 RPC 는 단일 트랜잭션(원자성) + 최소권한(service_role 전용).
-- ============================================================================

-- ── 1. users soft-delete 표시 컬럼 ──────────────────────────────────────────
alter table public.users add column if not exists deleted_at timestamptz;
create index if not exists idx_users_active on public.users (id) where deleted_at is null;

-- 활성 행은 반드시 숫자 kakao_user_id, 삭제 행만 'deleted:' 접두 — 센티넬-실ID 충돌 원천 차단.
-- (NOT VALID 로 추가 후 validate — 기존 활성 행은 전부 숫자 유래라 통과.)
-- 멱등: 제약이 이미 있으면 건너뛴다(재실행 안전).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_active_kakao_numeric'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_active_kakao_numeric
      check (deleted_at is not null or kakao_user_id ~ '^[0-9]+$') not valid;
    alter table public.users validate constraint users_active_kakao_numeric;
  end if;
end $$;

-- ── 2. 삭제 후 재삽입 race 차단 ─────────────────────────────────────────────
-- 삭제 트랜잭션과 동시에 me/sync 등이 자식 행을 다시 insert 하는 것을 DB 레벨에서 막는다.
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
    for key share;                       -- 부모를 삭제 RPC 의 FOR UPDATE 와 직렬화
  if not found or v_deleted is not null then
    raise exception 'user % is deleted or missing', new.user_id
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end; $$;

drop trigger if exists trg_diag_parent_active  on public.diagnoses;
drop trigger if exists trg_prof_parent_active  on public.profiles;
drop trigger if exists trg_usage_parent_active on public.hair_usage;
drop trigger if exists trg_events_parent_active on public.events;
create trigger trg_diag_parent_active  before insert or update on public.diagnoses
  for each row execute function public.assert_parent_active();
create trigger trg_prof_parent_active  before insert or update on public.profiles
  for each row execute function public.assert_parent_active();
create trigger trg_usage_parent_active before insert or update on public.hair_usage
  for each row execute function public.assert_parent_active();
create trigger trg_events_parent_active before insert or update on public.events
  for each row execute function public.assert_parent_active();

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

-- 최소권한: SECURITY DEFINER 함수는 기본 PUBLIC EXECUTE → 회수하고 service_role 에만 부여.
revoke all on function public.soft_delete_user(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_user(uuid) to service_role;
revoke all on function public.assert_parent_active() from public, anon, authenticated;
