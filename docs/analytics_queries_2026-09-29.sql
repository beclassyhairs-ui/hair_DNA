-- ============================================================================
-- 미알팁 계측 조회 SQL (2026-09-29) — 읽기 전용(SELECT만). Supabase SQL Editor에서 실행.
--
-- 실행법: 아래 Q1~Q5 블록을 "하나씩" 복사해 SQL Editor에 붙여넣고 Run. (5개 따로 돌린다.)
--   한 번에 다 붙여도 되지만, Editor가 마지막 결과만 보여주는 경우가 있어 따로 돌리길 권합니다.
--
-- ⚠️ 파괴적 구문 없음(INSERT/UPDATE/DELETE/DDL 전무). events 테이블만 읽는다.
-- ⚠️ 데이터가 거의 없어도 에러 없이 돕니다: 모든 비율은 NULLIF로 0 나눗셈을 막았고,
--    percentile/집계는 빈 테이블에서 NULL/0행을 돌려줄 뿐 에러가 아닙니다. (오픈 초기엔 값이 비거나
--    0으로 나오는 게 정상 — 쿼리가 도는지만 확인하는 용도.)
--
-- 참고(스키마): events 컬럼 = event_name·anonymous_id·user_id·session_id·landing_id·diagnosis_type·
--   result_type·concern_tags(jsonb)·answers(jsonb)·product_id_clicked·source(utm)·utm_medium·utm_campaign·
--   event_time·created_at·meta(jsonb). 그 외 값은 meta에 들어있다.
--   ※ answer_selected 의 답은 answers **컬럼**(jsonb {questionKey, optionId})에 있다(meta 아님).
--   ※ product_clicked·product_impression 은 landing 구분을 diagnosis_type 에 담는다.
-- ============================================================================


-- ── Q1 · 깔때기(랜딩별): 진입 → 설문시작 → 결과지 도달 → 제품 클릭. 단계별 인원과 다음단계 전환율 ──
with funnel as (
  select
    coalesce(landing_id, diagnosis_type) as funnel,
    count(distinct anonymous_id) filter (where event_name = 'landing_view')      as s1_landing,
    count(distinct anonymous_id) filter (where event_name = 'diagnosis_start')   as s2_start,
    count(distinct anonymous_id) filter (where event_name = 'report_view')       as s3_report,
    count(distinct anonymous_id) filter (where event_name = 'product_clicked')   as s4_product
  from events
  where coalesce(landing_id, diagnosis_type) in ('style', 'damage_check')
  group by 1
)
select
  funnel,
  s1_landing, s2_start, s3_report, s4_product,
  round(100.0 * s2_start   / nullif(s1_landing, 0), 1) as "진입→시작_%",
  round(100.0 * s3_report  / nullif(s2_start,   0), 1) as "시작→결과지_%",
  round(100.0 * s4_product / nullif(s3_report,  0), 1) as "결과지→제품_%",
  round(100.0 * s4_product / nullif(s1_landing, 0), 1) as "전체전환_%"
from funnel
order by funnel;


-- ── Q2 · 결과지 체류: photo_state(pending·done·limited)별 스크롤 25/50/75/100 도달 인원과 비율 ──
--    (9월 가설: 사진이 아직 없을 때(pending) 손님이 본문을 더 읽는가?)
with sd as (
  select anonymous_id, coalesce(meta->>'photo_state', '(none)') as photo_state,
         (meta->>'depth')::int as depth
  from events
  where event_name = 'result_scroll_depth' and meta ? 'depth'
)
select
  photo_state,
  count(distinct anonymous_id) filter (where depth >= 25)  as d25,
  count(distinct anonymous_id) filter (where depth >= 50)  as d50,
  count(distinct anonymous_id) filter (where depth >= 75)  as d75,
  count(distinct anonymous_id) filter (where depth >= 100) as d100,
  round(100.0 * count(distinct anonymous_id) filter (where depth >= 50)  / nullif(count(distinct anonymous_id) filter (where depth >= 25), 0), 1) as "50도달_%",
  round(100.0 * count(distinct anonymous_id) filter (where depth >= 75)  / nullif(count(distinct anonymous_id) filter (where depth >= 25), 0), 1) as "75도달_%",
  round(100.0 * count(distinct anonymous_id) filter (where depth >= 100) / nullif(count(distinct anonymous_id) filter (where depth >= 25), 0), 1) as "100도달_%"
from sd
group by photo_state
order by photo_state;


-- ── Q3 · 사진 파이프라인: 모델(원본primary/폴백fallback) 비율, 완료 소요(중앙값·90분위 ms), 실패율 ──
with pipe as (
  select event_name,
         meta->>'model' as model,
         (meta->>'job_elapsed_ms')::numeric as elapsed_ms
  from events
  where event_name in ('photo_arrived', 'hair_transform_done', 'hair_transform_fail')
)
select
  count(*) filter (where event_name = 'photo_arrived' and model = 'primary')  as 도착_원본,
  count(*) filter (where event_name = 'photo_arrived' and model = 'fallback') as 도착_폴백,
  count(*) filter (where event_name = 'hair_transform_done')                  as 완료_done,
  count(*) filter (where event_name = 'hair_transform_fail')                  as 실패_fail,
  round(100.0 * count(*) filter (where event_name = 'hair_transform_fail')
        / nullif(count(*) filter (where event_name in ('hair_transform_done', 'hair_transform_fail')), 0), 1) as "실패율_%",
  round(percentile_cont(0.5) within group (order by elapsed_ms) filter (where event_name = 'photo_arrived')) as 소요_중앙값_ms,
  round(percentile_cont(0.9) within group (order by elapsed_ms) filter (where event_name = 'photo_arrived')) as 소요_90분위_ms
from pipe;


-- ── Q4 · 세그먼트 교차: 연령대(q1)·굵기(q7)·숱(q8)·갈래(result_type)별 결과지 도달 & 제품 클릭 ──
--    ※ 연령/굵기/숱은 events 컬럼이 아니라 answer_selected 의 answers(jsonb)에서 세션별로 끌어와 조인한다.
--      → 조인·jsonb 추출이 많아 느리고 복잡하면 그 자체가 "컬럼 승격 근거"(Phase 2).
with ans as (   -- 손님별(익명ID) 마지막 답에서 축 3개 추출
  select
    anonymous_id,
    max(answers->>'optionId') filter (where answers->>'questionKey' = 'q1_age')       as age,
    max(answers->>'optionId') filter (where answers->>'questionKey' = 'q7_thickness') as thickness,
    max(answers->>'optionId') filter (where answers->>'questionKey' = 'q8_density')   as density
  from events
  where event_name = 'answer_selected' and answers ? 'questionKey'
  group by anonymous_id
),
rv as (  -- 결과지 도달자(익명ID + 갈래)
  select distinct anonymous_id, result_type from events where event_name = 'report_view'
),
pc as (  -- 제품 클릭자(익명ID)
  select distinct anonymous_id from events where event_name = 'product_clicked'
)
select
  a.age                              as 연령대,
  a.thickness                        as 굵기,
  a.density                          as 숱,
  rv.result_type                     as 갈래,
  count(distinct rv.anonymous_id)    as 결과지도달,
  count(distinct pc.anonymous_id)    as 제품클릭,
  round(100.0 * count(distinct pc.anonymous_id) / nullif(count(distinct rv.anonymous_id), 0), 1) as "클릭전환_%"
from rv
left join ans a on a.anonymous_id = rv.anonymous_id
left join pc  on pc.anonymous_id = rv.anonymous_id
group by a.age, a.thickness, a.density, rv.result_type
order by 결과지도달 desc, 갈래;


-- ── Q5 · 제품 노출 대비 클릭: product_impression(노출) 대비 product_clicked(클릭) 비율. 랜딩별 ──
select
  coalesce(diagnosis_type, '(none)') as 랜딩,
  count(distinct anonymous_id) filter (where event_name = 'product_impression') as 노출인원,
  count(distinct anonymous_id) filter (where event_name = 'product_clicked')    as 클릭인원,
  round(100.0 * count(distinct anonymous_id) filter (where event_name = 'product_clicked')
        / nullif(count(distinct anonymous_id) filter (where event_name = 'product_impression'), 0), 1) as "노출대비클릭_%"
from events
where event_name in ('product_impression', 'product_clicked')
group by 1
order by 1;
