-- ============================================================================
-- 어뷰티 — AI 합성 서버측 일일 호출 제한 (hair_usage + bump_hair_usage)
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--
-- 용도: /api/hair-transform가 로그인 유저(users.id) 기준으로 하루 호출 횟수를 서버에서
--   강제 제한한다. 클라 localStorage(lib/dailyLimit)는 시크릿창·기기변경으로 우회되므로
--   서버 카운트로 대체·보강한다. RLS anon 완전 차단 + RPC 실행권한도 service_role만.
--
-- bump_hair_usage(p_user_id, p_max):
--   한 문장으로 원자적으로 "한도 미만이면 count+1, 아니면 거부"를 수행하고
--   증가된 count(1..p_max)를 반환. 한도 초과로 증가하지 못하면 -1 반환.
--   (동시 요청 경쟁 상황에서도 동일 PK 행 잠금으로 max를 넘겨 과금되지 않는다.)
--
-- 보안(Codex 반영):
--   · SECURITY DEFINER 함수는 기본적으로 PUBLIC에 EXECUTE가 부여되므로 anon이 직접
--     호출해 임의 user_id 한도를 소진시킬 수 있다 → PUBLIC/anon/authenticated에서 실행권한
--     회수하고 service_role만 GRANT.
--   · search_path = '' 로 고정하고 객체를 전부 스키마 한정(public.*)한다.
-- ============================================================================

create table if not exists public.hair_usage (
  user_id  uuid not null references public.users(id) on delete cascade,
  day      date not null default current_date,
  count    int  not null default 0,
  primary key (user_id, day)
);

-- RLS: anon 완전 차단(정책 미생성 = deny-all).
alter table public.hair_usage enable row level security;

create or replace function public.bump_hair_usage(p_user_id uuid, p_max int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count int;
begin
  insert into public.hair_usage (user_id, day, count)
    values (p_user_id, current_date, 1)
  on conflict (user_id, day) do update
    set count = public.hair_usage.count + 1
    where public.hair_usage.count < p_max
  returning public.hair_usage.count into new_count;

  if new_count is null then
    return -1;            -- 한도 초과: 증가하지 않음
  end if;
  return new_count;       -- 이번 호출로 증가한 값(1..p_max)
end
$$;

-- 실행 권한: PUBLIC 기본 부여를 회수하고 service_role(서버 라우트)만 허용.
revoke execute on function public.bump_hair_usage(uuid, int) from public;
revoke execute on function public.bump_hair_usage(uuid, int) from anon;
revoke execute on function public.bump_hair_usage(uuid, int) from authenticated;
grant  execute on function public.bump_hair_usage(uuid, int) to service_role;
