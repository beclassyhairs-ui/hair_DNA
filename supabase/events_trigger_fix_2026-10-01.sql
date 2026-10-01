-- ============================================================================
-- 긴급 수정 · events 계측 전건 중단 복구 (2026-10-01)
--
-- 증상: 2026-09-18 soft-delete 라운드에서 events 에 붙인 트리거
--   trg_events_parent_active → assert_parent_active() 가 모든 insert 를 거부.
--   브라우저 콘솔: "[trackEvent] Supabase insert 실패 (...): operator does not exist: uuid = text"
--
-- 원인: assert_parent_active() 는 `public.users where id = new.user_id` 로 부모를 조회한다.
--   - diagnoses/profiles/hair_usage: user_id 가 uuid → 정상
--   - events: user_id 가 **text**(로그인=계정 uuid 문자열, 비로그인=anonymous_id 문자열) →
--     uuid = text 비교 불가로 전건 예외. 게다가 익명분은 users 에 없어 설령 캐스팅해도 not found 로 거부됨.
--   events 는 익명 트래픽이 대부분이라 이 트리거 자체가 events 에는 잘못 적용된 것.
--
-- 수정: events 전용 함수로 교체 — 익명/비계정/비-uuid user_id 는 통과시키고,
--   user_id 가 실제 계정(users 에 존재)이면서 soft-delete 된 경우에만 차단한다(원래 의도 유지).
--   diagnoses/profiles/hair_usage 의 트리거(assert_parent_active)는 건드리지 않는다 — 그쪽은 정상.
--
-- ⚠️ 파괴적 구문 없음(함수/트리거 교체만). 사장님이 Supabase SQL Editor 에서 실행.
-- ============================================================================

create or replace function public.assert_event_parent_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_deleted timestamptz;
begin
  -- 익명분(user_id null)은 부모 없음 → 통과
  if new.user_id is null then
    return new;
  end if;

  -- user_id 가 uuid 형식이 아니면 계정 식별자가 아님(구형 익명 등) → 통과
  if new.user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return new;
  end if;

  -- uuid 형식이면 계정일 수 있으니 조회. users 에 없으면 익명(anonymous_id) → 통과.
  select deleted_at into v_deleted
    from public.users where id = new.user_id::uuid
    for key share;                       -- 계정이면 삭제 RPC 의 FOR UPDATE 와 직렬화

  -- 실제 계정이면서 soft-delete 된 경우에만 차단(원래 의도). 미존재(익명)·활성은 통과.
  if found and v_deleted is not null then
    raise exception 'user % is deleted' , new.user_id
      using errcode = 'integrity_constraint_violation';
  end if;

  return new;
end; $$;

drop trigger if exists trg_events_parent_active on public.events;
create trigger trg_events_parent_active before insert or update on public.events
  for each row execute function public.assert_event_parent_active();

-- 검증(선택): 복구 후 익명 insert 가 통과하는지 — 임시 1행 넣고 바로 삭제
-- insert into public.events (user_id, anonymous_id, event_name, event_time)
--   values (gen_random_uuid()::text, gen_random_uuid()::text, 'healthcheck', now());
-- delete from public.events where event_name = 'healthcheck';
