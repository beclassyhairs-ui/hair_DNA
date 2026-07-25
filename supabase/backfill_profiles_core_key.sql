-- ============================================================================
-- 어뷰티 — profiles.core_key 백필 (설계 초안)
--
-- ⚠️⚠️ 실행 금지 — 사업주가 Supabase SQL Editor에서 ①미리보기 SELECT로 확인한 뒤
--   ②UPDATE를 직접 실행한다. Claude는 실행하지 않는다.
--
-- 배경: profiles.core_key(상품 매칭 키 curl__thickness__density)를 지금까지 아무 코드도
--   채우지 않아 기존 행이 전부 null이다. 앱 코드가 이제(fix: me/sync) 신규 sync부터
--   채우지만, 이미 쌓인 계정은 이 백필로 한 번 메꿔야 서버 기반 추천이 동작한다.
--
-- 규칙(앱의 lib/itemsMatch.ts deriveCoreKeyFromEntries와 100% 동일):
--   - kind='style' 이고 q3_curl / q7_thickness / q8_density 가 모두 허용값인 진단만 유효
--   - 한 계정에 여러 개면 "가장 최근" 1개 사용
--       · 최신 판정 순서: 엔트리 savedAt(숫자) → createdAt → DB created_at
--         (savedAt/createdAt은 클라 엔트리 원본이라 result jsonb 안에 있다)
--   - 유효 style 진단이 없으면 core_key는 그대로 null 유지(추정 금지)
--
-- 안전장치:
--   - 이미 core_key가 있는 행은 건드리지 않는다(p.core_key is null). 재실행해도 멱등.
--   - savedAt 캐스팅은 숫자일 때만(정규식 가드) — 이상값이 있어도 쿼리가 죽지 않는다.
-- ============================================================================

-- 공통 CTE: 계정별 "가장 최근 유효 style 진단"의 코어 3값
with valid_style as (
  select
    d.user_id,
    (d.answers->>'q3_curl')      as curl,
    (d.answers->>'q7_thickness') as thickness,
    (d.answers->>'q8_density')   as density,
    row_number() over (
      partition by d.user_id
      order by
        case when d.result->>'savedAt' ~ '^[0-9]+$'
             then (d.result->>'savedAt')::bigint end desc nulls last,
        (d.result->>'createdAt') desc nulls last,
        d.created_at desc
    ) as rn
  from diagnoses d
  where d.kind = 'style'
    and d.answers->>'q3_curl'      in ('straight_hair','wavy_hair','curly_hair')
    and d.answers->>'q7_thickness' in ('coarse','medium_thickness','fine')
    and d.answers->>'q8_density'   in ('thick_density','medium_density','thin_density')
)

-- ── ① 미리보기(먼저 이것만 실행해 무엇이 바뀔지 확인) ──
--    현재 core_key(대부분 null)와 백필될 값을 나란히 보여준다.
select
  p.user_id,
  p.core_key                                        as core_key_now,
  v.curl || '__' || v.thickness || '__' || v.density as core_key_new
from profiles p
join valid_style v on v.user_id = p.user_id and v.rn = 1
where p.core_key is null
order by p.user_id;

-- ── ② 실제 백필 UPDATE (①에서 결과를 확인한 뒤에만 실행) ──
-- 위 with 절은 SELECT에 묶여 있으므로, 아래 UPDATE는 with 절을 다시 붙여 단독 실행한다.
--
-- with valid_style as ( ...위와 동일... )
-- update profiles p
-- set core_key   = v.curl || '__' || v.thickness || '__' || v.density,
--     updated_at = now()
-- from valid_style v
-- where v.user_id = p.user_id
--   and v.rn = 1
--   and p.core_key is null;   -- 이미 값이 있으면 덮지 않는다(빈 것만 백필)
