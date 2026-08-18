-- ============================================================================
-- 어뷰티 — faceswap GPU 예열(warm-up) 전역(다중 인스턴스) 원자적 쿨다운
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--
-- 배경(2026-08-16 D-2 런칭 감사 ③): /api/hair-transform/warmup 의 90초 쿨다운이 지금은
--   라우트 모듈 안의 인스턴스-로컬 변수(let lastWarmAt)로만 구현돼 있다. Vercel 서버리스는
--   트래픽에 따라 여러 인스턴스를 동시 기동하므로, 공격자가(Origin 헤더 위조로 same-origin
--   게이트를 넘겨) 짧은 시간에 대량 동시요청을 보내면 각 요청이 서로 다른 콜드 인스턴스
--   (lastWarmAt=0)에서 처리되며 90초 쿨다운을 개별적으로 통과한다 — 남는 방어선은 전역 일일
--   상한(warmup_usage/bump_warmup_usage) 하나뿐이라, burst 한 방으로 그날 예열 예산(5000회)
--   전체를 수 초~수십 초 안에 태워 정상 손님의 예열 효과를 하루 종일 무력화할 수 있다.
--
-- 해결: 90초 쿨다운 "그 자체"도 인스턴스 로컬 변수가 아니라 DB의 단일 행에 원자적으로
--   기록한다. UPDATE ... WHERE ... RETURNING 은 Postgres 행 잠금으로 직렬화되므로, 아무리
--   많은 인스턴스가 동시에 요청해도 90초당 "딱 1번"만 실제로 쿨다운을 통과한다 — burst 로
--   5000회 상한을 소진하려면 이제 5000 × 90초(≈125시간)가 걸려, burst 자체가 무의미해진다.
--
-- try_acquire_warmup_cooldown(p_cooldown_seconds):
--   단일 행(id=1)의 last_warm_at 이 "지금 - p_cooldown_seconds" 보다 오래됐을 때만 원자적으로
--   now() 로 갱신하고 true 를 반환한다. 쿨다운 안 지났으면(다른 인스턴스가 방금 획득) false.
--   (함수 미생성/오류 시 라우트는 fail-open — 기존 인스턴스-로컬 쿨다운만 적용되고 서비스는
--    정상 동작한다. 이 SQL 을 실행하면 전역 보호가 켜진다.)
--
-- 보안(warmup_usage/hair_usage 와 동일 패턴):
--   · SECURITY DEFINER → PUBLIC/anon/authenticated 실행권한 회수, service_role(서버 라우트)만 GRANT.
--   · search_path='' 고정 + 객체 스키마 한정(public.*).
-- ============================================================================

create table if not exists public.warmup_cooldown (
  id           int primary key default 1,
  last_warm_at timestamptz not null default '1970-01-01T00:00:00Z'::timestamptz,
  constraint warmup_cooldown_singleton check (id = 1)
);

insert into public.warmup_cooldown (id) values (1)
  on conflict (id) do nothing;

-- RLS: anon 완전 차단(정책 미생성 = deny-all).
alter table public.warmup_cooldown enable row level security;

create or replace function public.try_acquire_warmup_cooldown(p_cooldown_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  acquired boolean;
begin
  update public.warmup_cooldown
    set last_warm_at = now()
    where id = 1
      and last_warm_at <= now() - make_interval(secs => p_cooldown_seconds)
  returning true into acquired;

  return coalesce(acquired, false);
end
$$;

-- 실행 권한: PUBLIC 기본 부여 회수, service_role(서버 라우트)만 허용.
revoke execute on function public.try_acquire_warmup_cooldown(int) from public;
revoke execute on function public.try_acquire_warmup_cooldown(int) from anon;
revoke execute on function public.try_acquire_warmup_cooldown(int) from authenticated;
grant  execute on function public.try_acquire_warmup_cooldown(int) to service_role;
