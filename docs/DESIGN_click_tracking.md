# 설계 — 상품 클릭 추적 + 제휴 subid (진단↔구매 연결)

> 작성: 2026-07-29. **조사 + 설계만**. 코드·커밋(이 문서 제외)·SQL 없음.
> 배경: 소싱 상품 138개 유입 예정 + 스타일링 화학품은 제휴 링크로 채움.
> "어떤 진단 결과의 손님이 어떤 상품을 눌렀나"가 사업 판단 핵심인데 지금 반쪽만 기록됨.
> ⚠️ 구현은 **일괄 태깅 구현이 끝난 뒤** 착수한다(오늘은 문서까지).

---

## 1. 조사 결과 (현재 상태)

### events 적재 구조 (`lib/eventTracking.ts`, `supabase/schema.sql`)
- `trackEvent(name, payload)`가 클라에서 Supabase `events`에 insert(anon key = INSERT 전용).
- payload 키 중 `COLUMN_KEYS`(product_id_clicked·product_group_clicked·cta_clicked 등)는 **컬럼**으로, 그 외(coreKey·ui 등)는 **`meta`(jsonb)** 로 분리 적재.
- **events에 `core_key`·`age`·`treatment` 전용 컬럼 없음** — 전부 `meta`로만 들어감.

### 지점별 기록 현황
| 지점 | 이벤트 | core_key | 나이 | 시술 |
|---|---|---|---|---|
| /items 리스트 클릭 (`items/page.tsx:26`) | `product_clicked` | ✅ `meta.coreKey` | ❌ | ❌ |
| /items 노출 (`items/page.tsx:105`) | `product_viewed` | ✅ `meta.coreKey` | ❌ | ❌ |
| 상세 구매 클릭 (`ItemBuyButton.tsx:22`) | `purchase_click` | ❌ **없음** | ❌ | ❌ |

- **가장 큰 구멍**: 전환에 가장 가까운 **`purchase_click`(외부 링크 이탈)에 core_key가 없다.** 진단↔구매를 이벤트 단독으로 못 잇고 `user_id`/`session_id` 우회 조인 필요.
- 나이(`q1_age`)·시술횟수(`q10_history_count`)는 **어디에도 안 실린다.**

### 코드가 발화하는 event_name (참고)
퍼널: landing_view · diagnosis_start · answer_selected · diagnosis_complete · report_view · product_viewed · product_clicked · purchase_click · login_clicked.
자유문자열: consult_*(5) · profile_result_view · diary_checkin · quick_diagnosis_start · diagnosis_card_click · locked_preview_cta_click.
※ `product_clicked`는 /items·hair-quiz·mbti에서 각기 다른 payload로 발화(진짜 커머스 클릭은 /items). ※ **DB 실제 분포·건수는 소유자가 읽기 쿼리로 확인**(`select event_name, count(*) from events group by 1`).

---

## 2. 확정 결정 (사업주, 2026-07-29)

**① subid에는 core_key만 넣는다.** 나이·시술은 subid에 넣지 않고 **우리 events에만** 기록.
**② subid는 압축 인코딩으로 설계.** 짧으면 어떤 상한도 통과하므로 **쿠팡 subId 최대길이를 몰라도 안전**(추측 회피). 진단 전은 센티넬 **`nodx`**. 인코딩·역해독은 **순수함수로 분리**, 매핑표는 아래 §3에 명시.
**③ `events.core_key` 컬럼 승격은 보류.** 지금은 `meta.coreKey`로 충분(쿼리는 `meta->>'coreKey'`).
> 📌 **다만: 첫 실트래픽이 쌓이기 전에 컬럼을 올리는 것이 마이그레이션 비용이 가장 싸다.** 실데이터가 쌓인 뒤 승격하면 기존 행 백필(meta→컬럼)까지 필요해 비용이 커진다. 실트래픽 개시 직전이 승격 결정의 마지노선.

---

## 3. subid 압축 인코딩 (매핑표 = SSOT)

subid = **3글자**, 위치 고정: `[curl][thickness][density]`. 소문자 a–z만 사용(URL-safe, 구분자 없음).
매핑값은 `lib/hairTypeOptions.ts`의 옵션 value와 1:1로 고정한다(값이 바뀌면 이 표도 함께 바꾼다).

| 자리 | core_key 토막 | 코드 |
|---|---|---|
| 1 · 곱슬기(curl) | `straight_hair` | `s` |
| | `wavy_hair` | `w` |
| | `curly_hair` | `c` |
| 2 · 굵기(thickness) | `coarse` | `c` |
| | `medium_thickness` | `m` |
| | `fine` | `f` |
| 3 · 숱(density) | `thick_density` | `t` |
| | `medium_density` | `m` |
| | `thin_density` | `n` |

- **위치 고정이라 글자 중복 무해**: 2자리 `c`(coarse)와 1자리 `c`(curly), 2자리 `m`(medium_thickness)와 3자리 `m`(medium_density)는 자리로 구분된다.
- 예:
  - `straight_hair__fine__thin_density` → `s`+`f`+`n` = **`sfn`**
  - `curly_hair__coarse__thick_density` → `c`+`c`+`t` = **`cct`**
  - `wavy_hair__medium_thickness__medium_density` → `w`+`m`+`m` = **`wmm`**
- **진단 전 / 무효 core_key** → **`nodx`** (4글자). 빈 값 대신 명시 버킷 → 대시보드에서 "진단 전 전환"도 집계.

### 순수함수 계약 (신규 `lib/affiliateSubid.ts`)
```
encodeSubid(coreKey: string | null): string
  - 유효 3토막(isValidCoreKey)만 3글자로 인코딩, 그 외/null → "nodx"
decodeSubid(subid: string): string | null
  - 3글자 → coreKey(curl__thickness__density) 복원, "nodx"/무효 → null
```
- 매핑표는 hairTypeOptions value 집합에서 파생(자유 문자열 금지, 오타 시 nodx).
- 최대 길이 4자 → **쿠팡·타 제휴 어떤 subId 상한도 통과**(②의 근거).
- 테스트: 27개 유효 코드 왕복(encode→decode 항등) + null/무효→nodx + nodx→null.

---

## 4. subid 부착 위치 → 클라이언트, 클릭 시점, `ItemBuyButton`

- buy_link는 상세페이지에서 렌더되지만 방문자 core_key는 그 사람 localStorage(diaryEntries)에만 있음 → 서버는 모름.
- → **`ItemBuyButton` onClick에서** `deriveCoreKeyFromEntries(readDiaryEntries())` → `encodeSubid()` → 최종 URL에 `&subid=<3글자|nodx>` 부착 후 이동. (같은 자리에서 `purchase_click`도 발화 중이라 자연스러움.)
- 쿠팡 파트너스 대시보드가 subid별 클릭·구매·수익을 집계 → **진단(core_key)↔구매 연결 복원**.
- ⚠️ subid엔 core_key(비식별 모발타입)만. 이름·카카오번호 등 식별정보 절대 금지.

---

## 5. 구현 우선순위 (일괄 태깅 구현 완료 후 착수)

> 순서: **일괄 태깅 구현 → 그다음 이 건.**

1. **[1순위] `purchase_click` meta에 `coreKey`·`ageGroup`·`treatmentFreq` 추가**
   — 전환 이벤트에 진단이 없는 게 지금 제일 큰 구멍. `ItemBuyButton`에서 diaryEntries로 도출해 meta에 실음. (쿠팡 밖 제휴/직접 링크까지 **우리 events 1차 데이터로** 진단↔전환을 잇는다.)
2. **[2순위] `product_clicked` meta에 `age`·`freq` 추가**
   — core_key는 이미 있음. 나이·시술만 보강(`items/page.tsx`).
3. **[3순위] subid 부착** (`ItemBuyButton` + `lib/affiliateSubid.ts`).

- 나이·시술 도출 함수는 [DESIGN_matching_age_treatment.md](DESIGN_matching_age_treatment.md)의 도출 로직 재사용(diaryEntries → q1_age·q10_history_count). 값은 옵션 id 원문(`age_50`·`count_3_4`).

## 6. 손댈 파일 (구현 시)
1. `lib/affiliateSubid.ts` (신설) — encodeSubid/decodeSubid 순수함수 + 매핑표(§3).
2. `app/items/[id]/ItemBuyButton.tsx` — purchase_click meta에 coreKey/age/freq + subid 부착.
3. `app/items/page.tsx` — product_clicked meta에 age/freq 추가.
4. (보류) `events.core_key` 컬럼 승격 SQL — 실트래픽 개시 직전이 마지노선(§2 ③).

## 7. 미해결/확인
- 쿠팡 파트너스 subId 실제 상한·허용문자 — 압축(≤4자)으로 **회피 확정**(몰라도 안전). 참고용으로만 나중에 확인.
- 타 제휴망(스타일링 화학품)의 subid 파라미터명은 망마다 다름 → §5-1순위(우리 events 자체 기록)가 그 커버리지를 담당.
