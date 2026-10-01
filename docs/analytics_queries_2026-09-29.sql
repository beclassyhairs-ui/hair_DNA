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
--   age_band·hair_thickness·hair_density(2026-09-30 승격)·event_time·created_at·meta(jsonb). 그 외 값은 meta.
--   ※ answer_selected 의 답은 answers **컬럼**(jsonb)에 있다(meta 아님). ★단, flow마다 키 이름이 다르다:
--       - style·hair-quiz·mbti : { questionId, choice }   (연령/굵기/숱은 여기 · questionId 로 저장!)
--       - damage_check·bangs   : { questionKey, optionId }
--     → Q4는 두 형태를 coalesce로 함께 읽는다(과거 데이터 호환). 9/29 최초본이 questionKey만 봐서 전건 NULL 이었음.
--   ※ product_clicked·product_impression 은 landing 구분을 diagnosis_type 에 담는다.
--   ※ 연령/굵기/숱은 2026-09-30부터 report_view·product_clicked·product_impression 에 컬럼으로도 실린다
--     (마이그레이션+배포 이후 신규 데이터). Q4 하단에 컬럼 기반 "승격판"을 함께 둔다.
-- ============================================================================


-- ── Q1 · 깔때기(랜딩별): 진입 → 설문시작 → 결과지 도달 → 제품 클릭. 단계별 인원과 다음단계 전환율 ──
--    ★ 2026-09-30 수정: report_view 는 "결과지 다시 보기(revisit)"·직접진입에서도 발화한다
--      (meta.source = 'revisit' / 'new'). 이게 섞이면 "시작→결과지"가 100%를 넘는다(9월 데미지 160% 원인).
--      → s3_report 에서 revisit 을 제외하고, 새 진단 흐름(new)만 결과지 도달로 센다.
--      (직접진입=source 'new' 이지만 diagnosis_start 없이 결과지 재열람하는 경우는 아래 Q1b 로 규모를 확인.)
with funnel as (
  select
    coalesce(landing_id, diagnosis_type) as funnel,
    count(distinct anonymous_id) filter (where event_name = 'landing_view')      as s1_landing,
    count(distinct anonymous_id) filter (where event_name = 'diagnosis_start')   as s2_start,
    count(distinct anonymous_id) filter (where event_name = 'report_view'
      and coalesce(meta->>'source', 'new') <> 'revisit')                         as s3_report,
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


-- ── Q1b · (진단) report_view 원인 규명: source(new/revisit)별 인원 + "diagnosis_start 없이 결과지" 규모 ──
--    Q1의 "시작→결과지 160%"가 다시보기(revisit) 때문인지, 직접진입(start 없는 new) 때문인지 판정한다.
with rv as (
  select distinct anonymous_id, coalesce(landing_id, diagnosis_type) as funnel,
         coalesce(meta->>'source', 'new') as src
  from events where event_name = 'report_view'
),
starters as (
  select distinct anonymous_id, coalesce(landing_id, diagnosis_type) as funnel
  from events where event_name = 'diagnosis_start'
)
select
  rv.funnel,
  count(*) filter (where rv.src = 'new')     as report_new,
  count(*) filter (where rv.src = 'revisit') as report_revisit,
  count(*) filter (where rv.src = 'new' and s.anonymous_id is null) as "new인데_start없음",
  count(*) filter (where s.anonymous_id is null)                    as "start없는_결과지_전체"
from rv
left join starters s on s.anonymous_id = rv.anonymous_id and s.funnel = rv.funnel
where rv.funnel in ('style', 'damage_check')
group by rv.funnel
order by rv.funnel;


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
  --   ★ flow마다 키 이름이 달라 두 컨벤션을 coalesce로 함께 읽는다:
  --     style/hair-quiz/mbti = {questionId, choice} · damage/bangs = {questionKey, optionId}.
  --     (연령/굵기/숱은 style 설문에만 있고 questionId 로 저장 → 9/29 최초본의 questionKey 필터는 전건 NULL 이었다.)
  --   ★ 축별 "시간상 최신" 답을 쓴다(재진단·답 변경 대비). max(문자열)는 사전순 최댓값이라
  --     서로 다른 시점 답이 섞일 수 있어 array_agg(order by event_time desc)[1] 로 진짜 최신을 뽑는다.
  select
    anonymous_id,
    (array_agg(coalesce(answers->>'optionId', answers->>'choice') order by event_time desc nulls last)
      filter (where coalesce(answers->>'questionKey', answers->>'questionId') = 'q1_age'))[1]       as age,
    (array_agg(coalesce(answers->>'optionId', answers->>'choice') order by event_time desc nulls last)
      filter (where coalesce(answers->>'questionKey', answers->>'questionId') = 'q7_thickness'))[1] as thickness,
    (array_agg(coalesce(answers->>'optionId', answers->>'choice') order by event_time desc nulls last)
      filter (where coalesce(answers->>'questionKey', answers->>'questionId') = 'q8_density'))[1]   as density
  from events
  where event_name = 'answer_selected'
    and (answers ? 'questionKey' or answers ? 'questionId')
  group by anonymous_id
),
rv as (  -- 결과지 도달자(익명ID + 갈래)
  select distinct anonymous_id, result_type from events where event_name = 'report_view'
),
pc as (  -- 제품 클릭자(익명ID) — style 랜딩 클릭만(다른 진단/items 클릭이 섞이지 않게)
  select distinct anonymous_id from events where event_name = 'product_clicked' and diagnosis_type = 'style'
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


-- ── Q4b · (승격판) 세그먼트 교차: report_view 의 age_band/hair_thickness/hair_density 컬럼 직접 사용 ──
--    2026-09-30 마이그레이션+배포 이후 신규 데이터에서만 채워진다(그 전 행은 컬럼 NULL).
--    조인·jsonb 추출 없이 컬럼 group by → Q4보다 빠르고 단순. 신규 데이터가 쌓이면 이걸 기본으로 쓴다.
with rv as (
  select distinct anonymous_id, result_type, age_band, hair_thickness, hair_density
  from events where event_name = 'report_view' and diagnosis_type = 'style'
),
pc as (  -- style 랜딩 클릭만
  select distinct anonymous_id from events where event_name = 'product_clicked' and diagnosis_type = 'style'
)
select
  rv.age_band                        as 연령대,
  rv.hair_thickness                  as 굵기,
  rv.hair_density                    as 숱,
  rv.result_type                     as 갈래,
  count(distinct rv.anonymous_id)    as 결과지도달,
  count(distinct pc.anonymous_id)    as 제품클릭,
  round(100.0 * count(distinct pc.anonymous_id) / nullif(count(distinct rv.anonymous_id), 0), 1) as "클릭전환_%"
from rv
left join pc on pc.anonymous_id = rv.anonymous_id
group by rv.age_band, rv.hair_thickness, rv.hair_density, rv.result_type
order by 결과지도달 desc, 갈래;


-- ── Q6 · 사진 실패 reason 분포: hair_transform_fail 을 meta.reason 별로 집계(테스트 실패 vs 실제 문제 판정) ──
--    Q3에서 실패 N건이 잡히면, 그 N건이 어떤 사유인지 쪼갠다. (모델 폴백도 함께 본다.)
select
  event_name                                   as 이벤트,
  coalesce(meta->>'reason', '(none)')          as reason,
  coalesce(meta->>'model',  '(none)')          as model,
  count(*)                                     as 건수
from events
where event_name in ('hair_transform_fail', 'hair_transform_fallback')
group by event_name, meta->>'reason', meta->>'model'
order by event_name, 건수 desc;


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
