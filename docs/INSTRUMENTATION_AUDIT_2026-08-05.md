# 계측 조사 보고서 — 2026-08-05 (읽기 전용 라운드)

> 이 라운드는 **조사**다. 코드 수정·커밋·push·env 변경·SQL 실행 없음. 이 파일 생성이 유일한 쓰기 작업.
> 모든 판정은 실제 소스코드 파일:줄 근거. 과거 51건 진단서 중 지정된 6항목(D-01·D-02·D-03·D-05·S-01·S-02)과 L-03을 대조함.

---

## 1. 한 줄 총평

**지금 우리가 볼 수 있는 것**: "어느 랜딩으로 들어와 → 몇 번 문항에서 이탈하고 → 진단을 완료했는지 → 결과지를 봤는지 → 발견템을 눌렀는지 → **구매하러 가기를 눌렀는지**", 그리고 **"어느 UTM(영상)에서 온 사람이 그 구매 버튼을 눌렀는지"까지 이미 데이터로 볼 수 있다.** 5단계 퍼널 대시보드도 이미 동작 중이다.
> ⚠️ **단 "구매를 눌렀다"는 외부 쇼핑몰로 나가는 클릭(구매 의도)까지다. 실제 결제·매출·환불은 계측 대상이 아니다**(아직 자체 결제 미도입 → 매출 완료 이벤트가 애초에 없음). "어느 영상이 매출을 만들었나"의 **매출**은 현재 구조로는 구매클릭까지만 잇고, 실결제 연결은 PG 도입 시 별도 배선이 필요하다.

**지금 우리가 볼 수 없는 것**: ① **구매를 누른 사람의 모발타입/나이대/시술빈도 세그먼트**(purchase_click에 이 값들이 안 실림) ② **나이대별 퍼널**(events에 나이 컬럼 자체가 없음) ③ **회원 단위 집계**(전부 기기 단위 anonymous_id로만 셈) ④ 광고차단기·즉시이탈 클릭으로 **일부 이벤트 유실**(클라 100% 발화, keepalive 미사용).

**진단서 대조 결과: 이미 해결됨 2건 · 사실 3건 · 부분 사실 1건.** (아래 6절)

---

## 2. A1 이벤트 인벤토리 (전체 자산 표)

계측은 **두 평행 시스템**으로 쪼개져 있다:
- **시스템 A (주력)**: `lib/eventTracking.ts`의 `trackEvent()` → 브라우저 anon 클라이언트가 Supabase `events` 테이블에 직접 insert(`lib/eventTracking.ts:296`). **실제 저장됨.**
- **시스템 B (레거시·사실상 죽음)**: `lib/analytics.ts` → 외부 GA4/Clarity 스크립트 + `/api/track`. **오직 `app/result/page.tsx`(리다이렉트로 도달 불가한 죽은 페이지)에서만 사용**되고, `/api/track`은 `console.log`만 하고 **DB 저장 0**(`app/api/track/route.ts:46`, 주석 "추후 DB INSERT로 교체"). → **시스템 B 데이터는 영구 저장 안 됨.**

### 시스템 A — `events` 테이블에 실제 적재되는 이벤트 (주력)

| 이벤트명 | 파일:줄 | 언제 | meta/payload 필드 | 저장 |
|---|---|---|---|---|
| `landing_view` | style/page.tsx:32 · hair-quiz/page.tsx:542 · mbti/page.tsx:297 · bangs/page.tsx:21 · damage-check/page.tsx:21 | 랜딩 mount | landing_id, diagnosis_type (+mbti는 source) | events |
| `diagnosis_start` | style:37 · hair-quiz:560 · mbti:306 · bangs:60 · damage-check:61 | 시작 CTA 클릭 | landing_id, diagnosis_type | events |
| `answer_selected` | style/survey:101 · hair-quiz:571 · bangs/survey:50 · damage-check/survey:52,87 · mbti:314 | 문항 선택마다 | answers{questionId/Key, choice/optionId, **step**(style·hair-quiz만)} | events |
| `diagnosis_complete` | style/survey:73 · hair-quiz:582 · bangs/survey:61 · damage-check/survey:42 · mbti/result:233 | 마지막 문항 제출 | landing_id, diagnosis_type (일부 result_type/concern_tags) | events |
| `report_view` | style/result:454 · hair-quiz:548 · bangs/result:298 · damage-check/result:97 | 결과지 실제 열람 | landing_id, diagnosis_type, result_type, concern_tags | events |
| `product_viewed` | items/page.tsx:105 | /items 상품 렌더(상품당 1회) | product_id, category, ui, **coreKey** | events |
| `product_clicked` | items/page.tsx:26 · style/result:300 · mbti/result:348 · hair-quiz:476 | **의미 혼재**(아래 B5) | landing_id, cta_clicked, ui, (items는 product_id_clicked·coreKey) | events |
| `purchase_click` | items/[id]/ItemBuyButton.tsx:22 | 상세페이지 "구매하러 가기" 외부이동 직전 | product_id_clicked, cta_clicked, **ui만**(meta) | events |
| `locked_preview_cta_click` | bangs/result:538 · damage-check/result:237 | 잠금 미리보기 CTA | landing_id | events |
| `save_result_go_home` | style/result:95 | 홈 이동 클릭 | source | events |
| `diary_checkin` | home/page.tsx:176 | 루틴 체크 토글 | stepId, checked, source | events |
| `quick_diagnosis_start` | home/page.tsx:231 | 홈 배너 클릭 | diagnosisType, source | events |
| `diagnosis_card_click` | diagnosis/page.tsx:86 | 허브 카드 클릭 | diagnosisType, source | events |
| `consult_*` (7종) | consulting/page.tsx:175,252,259,373,436,480 | 상담소 상호작용 | postId/rank/category/source 등 | events |
| `login_consent_view` / `login_consent_agree` | login/consent/page.tsx:181,233 | 동의화면 진입/동의 | source / profileOptional | events |
| `login_clicked` | (정의만) eventTracking.ts:32 | **발화 0건 — 죽은 이벤트** | — | — |

### 시스템 B — 죽은 경로(참고, 저장 안 됨)
`referral_landed`·`share_click`·`product_click`·`result_view` — `app/result/page.tsx`(도달 불가) 전용, GA4/Clarity 또는 console.log. **Supabase events에 0건.**

### A2 — 수신·저장 스키마 (`supabase/schema.sql` + `events_attribution_migration.sql`)

| 컬럼 | 타입 | 채워짐 / 죽은칸 (근거) |
|---|---|---|
| user_id | text | ✅ `accountId ?? anonymousId` (eventTracking.ts:280) |
| anonymous_id | text NOT NULL | ✅ 항상 (:282) |
| kakao_user_id | text | ❌ **죽은칸 — 항상 null** (:284) |
| landing_id / diagnosis_type / result_type | text | ✅ 진단 이벤트가 채움 (diagnosisType camelCase는 meta로 감) |
| source / utm_medium / utm_campaign | text | ⚠️ **first-touch UTM 있을 때만** (:289-291). 오가닉 유입은 null |
| answers / concern_tags / recommended_product_groups | jsonb | ✅ 해당 이벤트가 채움 (recommended…는 mbti/result만) |
| product_group_clicked / product_id_clicked / cta_clicked | text | ✅ 상품·CTA 이벤트 일부 |
| session_id | text | ✅ sessionStorage 기반 |
| event_name | text | ✅ 항상 |
| event_time / created_at | **timestamptz** (schema.sql:30,42) | ✅ 항상 — G절 SQL의 시간연산 안전 |
| content_id / marketing_consent / kakao_channel_added | text/bool | ❌ **죽은칸 — 어떤 호출부도 안 넣음** |
| meta | jsonb | ✅ 스키마 외 키(ui/coreKey/postId 등). **원시값만·문자열500자·키20개 제한**(sanitizeMeta) |

**RLS**(schema.sql:63-70): anon은 **INSERT만** 허용, SELECT/UPDATE/DELETE 정책 없음. 조회는 서버 API가 service_role로 RLS 우회.

### A3 — 유실 구조
1. **모든 이벤트 100% 클라이언트 발화** — 서버사이드 발화 0. no-JS·봇·JS예외 시 전량 유실.
2. **`keepalive`/`sendBeacon` 미사용**(eventTracking.ts:296) → `product_clicked`(`<Link>`)·`purchase_click`(외부이동)처럼 **즉시 페이지를 떠나는 클릭은 in-flight insert가 취소돼 유실 가능**. (시스템 B의 trackServer는 keepalive:true를 쓰는데 정작 그건 죽은 경로.)
3. 시스템 B는 외부 스크립트(gtag·clarity) → **광고차단기에 통째 차단**, 백업 `/api/track`은 DB 저장 없음.
4. ⚠️ **`events_attribution_migration.sql`(utm_medium·meta 등 컬럼 추가)이 실DB에 적용됐는지 미확인** — 미적용이면 해당 컬럼 insert가 전량 실패할 수 있음(G절 SQL로 확인 필요).

---

## 3. B 퍼널 5단계 판정표

| 단계 | 판정 | 근거·비고 |
|---|---|---|
| B1 랜딩 진입(4~5종) | ✅ 찍힘 | `landing_view` 5종 전부(style·damage·bangs·hair-quiz·mbti) |
| B2 진단 시작 | ✅ 찍힘 | `diagnosis_start` 5종. 단 "시작 CTA 클릭" 시점(≈Q1 진입, 실질 차이 미미) |
| **B3 문항별 이탈** | ✅ **찍힘(강점)** | `answer_selected`에 문항ID+**step 번호**(style·hair-quiz). "Q3에서/Q7에서 나갔다" 구분 가능. bangs·damage는 questionKey만(순서 역추론). **추가 비용 없음 — 이미 있음** |
| B4 완료 vs 결과지 | ✅ 분리(mbti 제외) | `diagnosis_complete`(제출) ≠ `report_view`(열람) 별개. style은 그 격차가 **AI합성 대기 이탈**. **mbti만 report_view 없음** |
| B5 상품 3종 | ⚠️ 있으나 혼탁 | 정의는 아래. `product_clicked`에 실상품클릭+CTA가 섞임 |
| B6 랜딩 간 이동 | ❌ 전용 이벤트 없음 | 링크는 존재(L-03 거짓). 이동 자체는 미측정 |

**B5 코드 기준 정의 (이름 추측 아님):**
- **`product_viewed`** = `/items` 리스트에서 매칭 상품이 **실제 렌더될 때 상품당 1회**(items/page.tsx:105, useRef Set 중복방어). **결과지 안 상품 노출엔 안 쓰임.**
- **`product_clicked`** = **의미 혼재**: (a) items 카드 클릭=진짜 상품클릭(items:26) (b) 결과지 "발견템 보러가기" CTA(style/result:300) (c) mbti 외부 상품링크(mbti/result:348) (d) 잠금 미리보기 CTA(hair-quiz:476). → `ui`/`cta_clicked`로 걸러야 순수 상품클릭 계산 가능.
- **`purchase_click`** = **오직 상세페이지 "구매하러 가기"**(ItemBuyButton.tsx:22), 외부 buyLink 이동 직전. **mbti 외부구매는 purchase_click이 아니라 product_clicked로 잡힘** → mbti 실구매전환은 purchase_click에 안 잡힘.

**공식 퍼널 정의**(funnelAggregate.ts:16-20): `landing_view→diagnosis_start→diagnosis_complete→product_clicked→purchase_click`. → **`report_view`·`product_viewed`는 계측되지만 공식 5단계에서 빠져 있다.** style의 핵심 이탈점(합성 대기)이 메인 퍼널에 안 보임.

**B6 / L-03 진위**: "랜딩 간 링크가 거의 없다"는 **더 이상 사실 아님**. 허브 `/diagnosis`가 4종을 카드 링크(diagnosis/page.tsx:35,43,50,57), 결과지 교차링크 다수 존재. 남은 갭: (a) **`/mbti`가 허브에서 누락** (b) 교차 이동이 이벤트로 측정 안 됨.

---

## 4. C UTM 판정

**결론: UTM 캡처·보존이 이미 구현돼 있고, 첫 유입 UTM이 purchase_click까지 살아남는다.**

- **C1 읽기**: `captureAttribution()`이 `utm_source/medium/campaign`을 URL에서 읽음(eventTracking.ts:180-183).
- **C2 저장**: localStorage `abeauty:attribution`에 **first-touch**(덮어쓰기 안 함, :179) + 루트 layout에서 앱 전역 1회 캡처(AttributionCapture.tsx:17 → layout.tsx:76). 추가로 **모든 이벤트에 동승** — `trackEvent`가 매번 attribution을 읽어 `source/utm_medium/utm_campaign` **전용 컬럼**으로 insert(:289-291). (meta jsonb 아님.)
- **C3 생존**: 최초 first-touch 고정 → 페이지 이동해도 유지 → purchase_click 발화 시 다시 읽어 컬럼에 실음. → **"어느 영상(utm)에서 온 사람이 구매버튼을 눌렀나"는 이미 이어짐.** (어드민 FunnelPanel의 utm_source/campaign 분해로 노출.)
  - ⚠️ **한계(과신 금지)**: (a) purchase_click은 구매 **의도**일 뿐 실결제 아님(위 총평). (b) **first-touch 단일 모델** — 영구 localStorage라 오래된 캠페인이 새 클릭에 귀속될 수 있고, last-touch·직접유입·멀티터치·크로스디바이스·쿠키삭제는 처리 못 함. "이 영상이 원인"이 아니라 "이 영상으로 처음 들어온 사람의 클릭"으로 읽어야 함.
- **엣지(사실)**: `captureAttribution`은 루트 마운트 시 1회만 → UTM 없이 들어온 뒤 **클라 내부 이동으로 나중에 UTM URL에 도달하면 그 UTM은 놓침**(전체 새로고침/신규진입이면 잡힘).
- **C4**: 추가 제안 불필요(이미 구현). 개선 여지는 위 엣지(라우트 변경 시 재캡처) 정도 — 난이도 하.

---

## 5. D 식별자 판정 (Phase B 숙제3 관점 포함)

- **D1 익명 식별자**: `anonymous_id` = `crypto.randomUUID()`(eventTracking.ts:110), localStorage `abeauty:anonymous_id`(:17,125). **회전·만료·재생성 로직 없음 — 최초 1회 생성 후 영구**(주석 :119). 소멸은 사용자가 localStorage 삭제/다른 브라우저·시크릿 접속 시뿐. (세션성 `session_id`는 별도, sessionStorage.)
- **D2 익명→회원 병합**: **코드에 없음.** 소급연결 안 함(profileSync.ts:194-196 명시). 로그인 시 `setAccountId`로 **그 시점 이후** 이벤트에만 계정 uuid 부착(:206). anonymous_id는 로그인 무관 항상 실려서 사후 병합은 **데이터상 가능하나 그 코드는 없다.**
- **D3 events 채움 규칙**: `user_id = accountId ?? anonymousId`(:280). 회원/익명 판별 = `user_id === anonymous_id`(익명) vs 별도 uuid(회원). `kakao_user_id`는 항상 null(죽은칸). 스키마 주석("user_id=kakao면 그 값")과 실제 구현 불일치.

> **★ Phase B(삭제 기능) 숙제3 직결 판정**: `anonymous_id`는 **지속 단말식별자**다(localStorage·영구·무회전). 세션성 랜덤이 아니므로 **개인정보(온라인 식별자)로 취급해야 한다.** 단 서버측 영속 매핑 없고 크로스디바이스로 안 이어짐. → 삭제요청 시 계정 events(user_id)만 지우면 **로그인 前 익명 events(anonymous_id)는 남고, 그게 개인정보일 수 있다**는 Phase B 우려가 코드로 확인됨. 대응: 삭제요청 시 브라우저 anonymous_id 동반 파기 or 익명 events 짧은 보존.

---

## 6. E 진단서 6항목 대조표

| 항목 | [진단서 서술] | [실제 코드] | 판정 |
|---|---|---|---|
| **E1 / D-01** | purchase_click meta에 coreKey/ageGroup/treatmentFreq 없음 | ItemBuyButton.tsx:22 — meta는 `ui:"item_detail"` 하나뿐, 세 값 없음. 전 코드에서 purchase_click 발화는 이 1곳 | **사실** |
| **E2 / D-02** | events.core_key가 컬럼 아니고 meta->>'coreKey' 조회뿐 | events에 core_key 컬럼 없음(맞음). 그러나 meta->>'coreKey'를 **읽는 쿼리도 없고**, coreKey는 items 이벤트 meta에만 실림. 진짜 core_key는 **profiles 실컬럼**(users_auth_schema.sql:30)이고 me/sync:177이 기록 | **부분 사실** |
| **E3 / D-03** | selectMatchedProducts가 coreKey null이면 조기반환→전체 노출 | itemsMatch.ts:88 `if(coreKey===null) return items` — 전체 반환 맞음. **단 의도된 진단-전 fallback**(status='approved' 필터는 상위 /api/items에서 이미 걸림) | **사실**(의도됨) |
| **E4 / D-05** | profiles에 나이·시술 전용 컬럼 없음 | users_auth_schema.sql:27-36 — user_id/hair_tags/core_key/profile(jsonb)/updated_at뿐. 나이·시술은 profile jsonb·diagnoses.answers 안에만 | **사실** |
| **E5 / S-02** | isSevereDamage가 보는 q10_history_count 문항 키가 사라짐 | recommend.ts:202·result:73이 `q10_history_count==="count_7plus"` 읽음. surveyData.ts:115에 **q10_history_count 문항 엄연히 존재**(옵션 count_1_2/3_4/5_6/7plus) | **✅ 이미 해결됨** |
| **E6 / S-01** | 곱슬 4구간(straight/semi/curly/very_curly) vs 매트릭스 3값 불일치 | q3_curl은 **3구간**(straight_hair/wavy_hair/curly_hair, surveyData.ts:105-113) = CurlKey 3값과 완전 일치. 미스 시 getHairTypeReport가 DEFAULT_ENTRY로 **안전 폴백**(빈화면·크래시 없음) | **✅ 이미 해결됨** |

**합계: 이미 해결됨 2 · 사실 3 · 부분 사실 1.**

**★ /style 설문 문항 키 전체(8개, surveyData.ts:28-128)** — 계측 배선의 선행조건:
`q1_age`(연령대) · `q11_length`(기장) · `q14_layer`(레이어드) · `q13_design`(웨이브) · `q8_density`(숱) · `q7_thickness`(굵기) · `q3_curl`(곱슬) · **`q10_history_count`(1년 시술 횟수)**.
→ **시술 빈도(treatment_freq)의 출처 문항은 `q10_history_count`로 확정**(값: count_1_2/count_3_4/count_5_6/count_7plus). 나이대는 `q1_age`. coreKey는 curl__thickness__density(q3_curl·q7_thickness·q8_density). **세 세그먼트 모두 설문에 살아있어 purchase_click에 실을 재료는 이미 있다.**

---

## 7. F 어드민 현황 + 퍼널 화면에 부족한 것

`/admin`은 **두 블록**:
- **블록 A `AdminDashboard`**: `/api/admin/events`(select* limit 5000, service_role) → **브라우저에서 집계**. 총 방문자(landing_view 고유 anon)·완료수·전환율·제품클릭수·전체/랜딩별 퍼널·최근이벤트10건. **기간필터 없음(전기간 5000행 고정)**, 타임라인에 **anonymous_id 직접 렌더**.
- **블록 B `FunnelPanel`**: `/api/admin/funnel?range=`(서버 집계, 숫자만 반환) → 조회1만당 구매·유입→구매전환율·**5단계 퍼널표**·**utm_source/campaign 분해**. **기간필터 today/7d/30d 있음.**

**F2 있는 것 / 없는 것**:
| | 상태 |
|---|---|
| 기간필터 | ⚠️ FunnelPanel만(today/7d/30d). AdminDashboard는 없음 |
| 전환율 | ✅ 직전대비+최초대비 |
| UTM 분해 | ⚠️ source·campaign 있음 / **medium은 컬럼만 있고 UI 없음** |
| 나이대 필터 | ❌ **없음(events에 나이 컬럼 자체가 없음)** |

**F3 퍼널 화면 확장 시 스키마상 막히는 것(배선 선행)**:
1. **나이대 세그먼트 = 불가.** events에 연령 컬럼 없음 → 유저 나이 수집 + events에 age_band 스냅샷 또는 events↔users 조인 선행.
2. **회원(계정) 단위 dedup = 불가.** 퍼널 고유수는 anonymous_id로만(funnelAggregate.ts:70). 같은 사람 폰+PC면 2명. user_id 기준 집계 전환 필요.
3. **결과지 노출→클릭 CTR 단계 = 부분 배선.** report_view·product_viewed가 공식 퍼널에 없음. 결과지 임프레션 발화 여부는 **확인 못 함**(별도 확인 필요).
4. **규모 상한**: funnel 25,000행·events 5,000행에서 잘림 → 초과 시 DB측 RPC/뷰 집계 전환 필요.

---

## 8. G 사장님용 조회 SQL (🟢조회 전용 — 사장님이 Supabase SQL Editor에서 직접 실행)

> 전부 SELECT만. 데이터 변경 없음. 각 결과의 "해석 기준"을 함께 읽으세요.

**(1) 이벤트명별 집계 + 최초/최근 시각** — 지금까지 뭐가 얼마나 쌓였나
```sql
select event_name,
       count(*)            as 건수,
       min(event_time)     as 최초,
       max(event_time)     as 최근
from events
group by event_name
order by 건수 desc;
```
해석: purchase_click·product_clicked 행이 있으면 **전환 트래픽이 이미 존재**. landing_view만 있고 뒷단계가 0이면 초기 이탈. 이벤트명이 아예 안 보이면 그 계측은 실제로 안 쌓이는 것(코드는 있어도 트래픽/유실 문제).

**(2) meta에 coreKey가 실린 이벤트 비율** — 세그먼트 분석 가능 범위
```sql
select count(*) as 전체,
       count(*) filter (where meta ? 'coreKey') as coreKey포함,
       round(100.0 * count(*) filter (where meta ? 'coreKey') / nullif(count(*),0), 1) as 퍼센트
from events;
```
해석: 현재 coreKey는 `/items` 노출·클릭 이벤트에만 실림 → **낮게 나오는 게 정상**. 이 숫자가 낮다는 것은 "구매/전환을 모발타입으로 쪼개 보려면 배선(9절 P1)이 필요하다"는 근거.

**(3) profiles·diagnoses 행 수 + 나이정보 보유 비율**
```sql
select 'diagnoses' as 테이블,
       count(*) as 행수,
       count(*) filter (where answers ? 'q1_age') as 나이있음,
       round(100.0*count(*) filter (where answers ? 'q1_age')/nullif(count(*),0),1) as 나이퍼센트
from diagnoses
union all
select 'profiles', count(*), null, null from profiles;
```
해석: diagnoses.answers에 q1_age가 있는 비율이 곧 "나이대 분석에 쓸 수 있는 진단 비율". profiles 행수는 로그인·서버동기화한 유저 수. (profiles의 나이는 profile jsonb 내부라 키 구조 확인 후 별도 조회 필요 — 우선 diagnoses 기준으로 판단.)

**(4) 최근 30일 일자별 이벤트 수** — 실트래픽 유무 = 컬럼 승격 긴급도
```sql
select date_trunc('day', event_time)::date as 날짜, count(*) as 이벤트수
from events
where event_time >= now() - interval '30 days'
group by 1 order by 1;
```
해석: 일자별 수가 사실상 0이면 **아직 실트래픽 전 → 지금 컬럼을 올려도 백필 불필요**(잃을 과거 데이터가 없음). 이미 수백/일이면 **컬럼 승격은 신규 데이터만 잡고 과거는 meta/jsonb에서 백필해야** 연속성이 생김.

**G2 판단 한 줄**: **(4)의 최근 일자별 이벤트가 거의 0이면 지금이 컬럼·계측을 고치기 가장 싼 시점(백필 불필요)**. 트래픽이 이미 쌓였으면 승격은 "오늘 이후"만 잡히니 백필 여부를 함께 정해야 한다.

---

## 9. 배선 제안 (제안만 — 이 라운드에서 구현 안 함)

> 원칙(CLAUDE.md §8): 새 컬럼/필드는 **기록자(writer)와 소비자(consumer)를 같은 커밋에** 배선.

| # | 제안 | 난이도 | 같은 커밋 묶음 |
|---|---|---|---|
| **선결** | events_attribution_migration.sql 실DB 적용 여부 확인(G절 SQL) — 미적용이면 utm/meta insert가 실패 중일 수 있음 | 하(사장 SQL) | 단독 |
| **P1** | **purchase_click(+product_clicked) meta에 세그먼트 3종 추가**: coreKey·age_band(q1_age)·treatment_freq(q10_history_count) → "어느 영상×어느 모발타입이 산다" 완성. D-01 해소 | 중 | 발화부(ItemBuyButton·items) + 어드민 소비를 **한 커밋** |
| **P1** | **keepalive/sendBeacon 도입**(eventTracking.ts insert) — product_clicked·purchase_click 유실 방지 | 하 | 단독(코어 1파일) |
| **P2** | **report_view·product_viewed를 퍼널 지표에 편입**(결과지 도달·합성대기 이탈·노출→클릭 CTR) | 중 | funnelAggregate + FunnelPanel 한 커밋 |
| **P2** | **product_clicked 의미 분리** — 실상품클릭 vs CTA를 이벤트명 또는 명문화된 ui 필터로 구분 | 중 | 발화부 + 어드민 집계 한 커밋 |
| **P3** | **나이대 세그먼트 배선** — events에 age_band 스냅샷 기록(또는 user_id↔users 조인) | 상 | 스키마 + writer + admin 소비 한 커밋(사장 SQL 선행) |
| **P3** | **익명→회원 병합**(anonymous_id 기반) — Phase B 삭제범위 결정과 연동 | 중 | Phase B와 함께 |
| **정리** | 죽은칸 제거(kakao_user_id·content_id·marketing_consent·kakao_channel_added)·시스템 B(/api/track·GA죽은경로) 정리·mbti 허브 누락·mbti report_view/purchase 보정 | 하 | 성격별 분리 |

**추천 순서**: 선결(마이그레이션 확인) → P1 두 개(세그먼트+keepalive, "매출 원인 분석"의 마지막 조각) → P2 → 나머지.

---

## 10. 확인 못 함 목록 (왜 못 했는지)

1. **events 테이블 실제 적재 데이터**(행 수·이벤트 분포·마이그레이션 반영 여부) — 규칙상 SQL 미실행. → G절 SQL을 사장님이 실행해야 확정.
2. **결과지(진단 result) 내 상품 노출 임프레션 발화 여부** — product_viewed는 /items에서만 확인됨. 결과지 임프레션은 코드에서 못 찾음(없을 가능성 높으나 단정 보류).
3. **supabase.co insert의 실제 광고차단 차단율·네비게이션 유실률** — 코드가 아니라 실측 필요.
4. **profiles.profile(jsonb) 내부 나이 키 구조** — jsonb라 실데이터 없이 키 경로 단정 불가. G(3)은 diagnoses.answers 기준으로 작성.
5. 과거 "51건 진단서" 원문 — 이 세션에 미제공. 지정된 6항목+L-03만 대조.

---

## 11. Codex 반론·추가 지적

_(이 보고서를 Codex CLI에 "빠진 항목·잘못된 판정을 찾아라"로 검수시킨 결과. ✅표시는 위 본문에 이미 반영·정정한 것.)_

### Codex — 빠진 계측 항목(현재 코드에 아예 없는 것들)
- **에러 계측**: JS 예외·API/Supabase insert 실패·AI 생성 실패/타임아웃·상품 0건. **이벤트 저장 실패 자체가 관측 불가**(무엇이 얼마나 유실되는지 모름).
- **체류시간·성능**: 페이지·문항·AI 대기시간, LCP/INP/CLS. style의 "AI 대기 이탈"은 시간·오류 계측 없이는 원인(느림 vs 싫증 vs 에러)을 못 가림.
- **스크롤·노출 임프레션**: 결과지 CTA·상품·잠금 CTA의 impression. 클릭만 있고 분모(노출)가 없어 CTR 계산 불가.
- **페이지 이탈(pagehide/visibilitychange)**: 외부 구매링크 이동 "완료" 여부. 클릭≠이탈≠구매.
- **세션/재방문**: 세션 정의·타임아웃·신규vs재방문 구분.
- **동의 상태 스냅샷**: 이벤트별 analytics/marketing 동의 시점, 철회 후 수집 중단 여부.
- **데이터 품질 지표**: insert 성공률·중복률·필수필드 누락률·봇/내부트래픽 제외.
- **구매 결과(매출)**: 주문·결제성공·매출액·환불 — 현재 purchase_click은 의도일 뿐(✅ 본문 총평·C3에 반영).

### Codex — 잘못된·위험한 판정 지적
- ✅ **"UTM으로 매출 원인 이미 분석가능"은 과신** — 실결제 아님 + first-touch 단일모델 한계. → 본문 총평·C3에 정정 반영.
- ✅ **G절 SQL 시간연산 우려** — 확인 결과 event_time은 timestamptz(schema.sql:30)라 SQL 유효. 표기 모호성만 정정.
- **"회원 단위 집계 불가"는 부정확** — 로그인 이후엔 user_id 집계 가능. 정확히는 **로그인 前後 소급 병합·크로스디바이스 통합**이 불완전(F3-2 표현 보정 필요).
- **B3 "문항별 이탈"은 근사** — 마지막 answer_selected가 Q3이라고 Q3에서 이탈한 건 아님(Q3 답하고 Q4 보고 이탈 가능). bangs/damage는 순서 역추론이라 설문 변경 시 깨짐.
- **anon INSERT 보안 위험 누락**(중요) — 클라 직접 insert라 **이벤트 위조·스팸·비용공격·임의 식별자 주입** 가능. 서버 검증·rate limit·허용 이벤트/필드 화이트리스트 필요. (배선 제안에 추가 권장.)
- **식별자 범위 협소** — anonymous_id뿐 아니라 user_id·session_id·answers·연령·모발/시술·UTM조합도 결합 시 가명정보. 관리자 화면 raw anonymous_id 노출은 마스킹·최소권한·감사로그 대상(단순 현황 아님).
- **삭제 대응이 "브라우저 ID 동반"만으론 불충분** — 타 기기 요청·localStorage 삭제 시 과거 anon ID 제시 불가. 로그인 시점 연결표·보존정책·DSAR 절차 필요(Phase B로 이관).
- **배선 우선순위 재고** — 세그먼트 enrichment(P1)보다 **실적재 확인·insert 실패 관측·클릭 유실·이벤트 의미분리**가 먼저여야 한다는 의견. (본 보고서는 "선결=마이그레이션 확인"을 최상단에 뒀으나, Codex는 유실/관측을 P1 세그먼트보다 앞에 두라 권고.)
- **keepalive를 "하"로 본 건 낙관** — Supabase SDK insert를 그대로 beacon화 못 할 수 있음. 전용 수집 endpoint+검증+중복방지가 딸려올 수 있어 난이도 **중**으로 상향 검토.
- **세그먼트를 ItemBuyButton에 얹는 제안은 선행조건 있음** — 상세페이지까지 **진단 snapshot이 안정 전달·복원**되는지 먼저 보장(URL/localStorage만 의존 시 오염·누락).
- **같은-커밋 원칙 강화** — 스키마 변경은 migration+하위호환 writer+consumer+검증/롤백까지 한 세트. 이벤트명 분리는 대시보드뿐 아니라 기존 쿼리·백필/호환 집계까지 같은 커밋.
- **조회 SQL 해석 보정** — (1) 이벤트명 부재=계측실패 단정 금지(트래픽이 없었을 수도). (2) coreKey 비율은 전체가 아니라 "기대되는 이벤트만" 분모로. (3) q1_age 비율은 진단유형별 문항차·null검증·중복진단 고려. 단순 행수 SQL은 퍼널 인과 증명이 아님(순서·기간·중복 미반영).

> **총평(Codex 반영)**: 계측 골격은 견고하나, 이 보고서가 **낙관 쪽으로 기운 지점**이 있다 — 특히 "매출 원인 분석가능"(→구매의도까지), "회원단위 불가"(→소급병합·크로스디바이스가 정확한 갭), keepalive 난이도. **에러·유실·보안(anon insert)·실결제 연결**은 세그먼트 배선보다 먼저 볼 가치가 있다.
