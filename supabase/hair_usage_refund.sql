-- ============================================================================
-- 어뷰티 — AI 합성 실패 시 일일 횟수 환불 (refund_hair_usage)
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--
-- 용도: /api/hair-transform가 합성 前에 bump_hair_usage로 횟수를 "예약(선차감)"하는데,
--   합성이 실패(프로바이더 오류·타임아웃·얼굴미검출 등)하면 우리 잘못으로 손님 횟수가
--   깎이는 셈이다. 그래서 선차감된 요청이 실패로 끝나면 이 함수로 1회를 되돌린다.
--   (예약→성공확정/실패환불 패턴 = 동시요청 경쟁에도 안전한 원자적 UPDATE. 클라 날짜 추론
--    없이 서버 current_date로 bump와 동일 행을 잡는다.)
--
-- 보안(bump_hair_usage와 동일):
--   · SECURITY DEFINER → PUBLIC 실행권한 회수, service_role(서버 라우트)만 GRANT.
--   · search_path='' 고정 + 객체 스키마 한정(public.*).
--
-- ※ 이 함수가 없어도 라우트는 안전하게 degrade한다(환불 호출 실패를 catch → 기존 동작=선차감 유지).
--   따라서 이 SQL 미실행 상태에서도 서비스는 정상 동작하고, 실행하면 "실패 시 미차감"이 켜진다.
-- ============================================================================

create or replace function public.refund_hair_usage(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count int;
begin
  update public.hair_usage
    set count = greatest(public.hair_usage.count - 1, 0)
    where public.hair_usage.user_id = p_user_id
      and public.hair_usage.day = current_date
  returning public.hair_usage.count into new_count;

  return coalesce(new_count, 0);  -- 오늘 행이 없으면(선차감 안 됨) 0
end
$$;

-- 실행 권한: PUBLIC 기본 부여 회수, service_role만 허용.
revoke execute on function public.refund_hair_usage(uuid) from public;
revoke execute on function public.refund_hair_usage(uuid) from anon;
revoke execute on function public.refund_hair_usage(uuid) from authenticated;
grant  execute on function public.refund_hair_usage(uuid) to service_role;
