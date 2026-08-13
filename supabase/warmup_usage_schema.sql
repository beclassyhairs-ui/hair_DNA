-- ============================================================================
-- 어뷰티 — faceswap GPU 예열(warm-up) 전역 일일 상한 (warmup_usage + bump_warmup_usage)
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--
-- 용도: /api/hair-transform/warmup 은 미인증 공개 엔드포인트라, 남용 시 Replicate 예측을
--   무한 생성해 비용을 낼 수 있다. 손님 일일한도(hair_usage/bump_hair_usage)와는 "완전히 별개"인
--   전역(유저 무관) 일일 카운터로 예열 발사 총량을 하드캡한다. → 손님 무료횟수는 절대 안 깎인다.
--
-- bump_warmup_usage(p_max):
--   오늘(current_date) 전역 count 를 원자적으로 +1 하고, 상한 미만이면 증가값(1..p_max)을,
--   상한 도달로 증가 못 하면 -1 을 반환한다. 라우트는 -1 이면 예열을 스킵한다.
--   (함수 미생성/오류 시 라우트는 fail-open — 예열은 계속 동작하고 상한만 미적용. 이 SQL 을 실행하면
--    상한이 켜진다. 즉 미실행 상태에서도 서비스는 정상.)
--
-- 보안(bump_hair_usage 와 동일 패턴):
--   · SECURITY DEFINER → PUBLIC/anon/authenticated 실행권한 회수, service_role(서버 라우트)만 GRANT.
--   · search_path='' 고정 + 객체 스키마 한정(public.*).
-- ============================================================================

create table if not exists public.warmup_usage (
  day    date not null default current_date primary key,
  count  int  not null default 0
);

-- RLS: anon 완전 차단(정책 미생성 = deny-all).
alter table public.warmup_usage enable row level security;

create or replace function public.bump_warmup_usage(p_max int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count int;
begin
  insert into public.warmup_usage (day, count)
    values (current_date, 1)
  on conflict (day) do update
    set count = public.warmup_usage.count + 1
    where public.warmup_usage.count < p_max
  returning public.warmup_usage.count into new_count;

  if new_count is null then
    return -1;            -- 전역 상한 초과: 증가하지 않음
  end if;
  return new_count;       -- 이번 호출로 증가한 값(1..p_max)
end
$$;

-- 실행 권한: PUBLIC 기본 부여 회수, service_role(서버 라우트)만 허용.
revoke execute on function public.bump_warmup_usage(int) from public;
revoke execute on function public.bump_warmup_usage(int) from anon;
revoke execute on function public.bump_warmup_usage(int) from authenticated;
grant  execute on function public.bump_warmup_usage(int) to service_role;
