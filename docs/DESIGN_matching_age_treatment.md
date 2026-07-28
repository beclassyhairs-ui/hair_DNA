# 설계 — 상품 노출 조건에 나이·시술횟수 추가

> 작성: 2026-07-28. **조사 + 설계만**. 코드·SQL·커밋 없음.
> 목적: 진단 설문에서 이미 받는 나이·시술횟수를 상품 노출 판정에 사용.
> 규칙: 염색 케어 = 시술 잦은 사람에게만 / 새치 케어 = 나이 많은 사람에게만.
> 준수: CLAUDE.md §8(기록자·소비자 동시 배선), 기존 `validateCoreKeyList` 패턴 재사용(로직 1벌).

---

## 0. ⚠️ 제안과 다른 점 (먼저 확인)

**① 시술횟수 답의 실제 키는 `q10_history_count` — "q8"이 아니다.**
설문 화면 번호는 Q8이지만, 저장 키(question id)는 `q10_history_count`다. (`app/style/surveyData.ts:115`)
나이는 `q1_age`. (`surveyData.ts:33`)

**② 저장값은 라벨이 아니라 옵션 id다. "50대"·"3~4회"가 아니라 `age_50`·`count_3_4`.**
설문의 각 답은 `answers[question.id] = option.id`로 저장된다(`app/style/survey/page.tsx:83`). 따라서 매칭에 쓸 허용값은 **아래 id 원문 그대로**여야 한다(새로 만들지 말 것):

| 나이 `q1_age` | 시술횟수 `q10_history_count` |
|---|---|
| `age_20` (20대) | `count_1_2` (1~2회) |
| `age_30` (30대) | `count_3_4` (3~4회) |
| `age_40` (40대) | `count_5_6` (5~6회) |
| `age_50` (50대) | `count_7plus` (7회 이상) |
| `age_60plus` (60대 이상) | |

**③ 나이·시술횟수는 서버 `profiles` 컬럼에도, `core_key`에도 없다.** `diagnoses.answers`(jsonb)와 로컬 `abeauty:diaryEntries[].answers`에만 있다. → 소비처는 **`core_key`처럼 diaryEntries에서 도출**해야 한다(프로필 컬럼 조회로는 못 얻는다). (조사 2 참조)

---

## 1. 조사 결과 (3건)

### 조사 1 — 설문 답의 저장 키·값
- 저장 위치: 로컬 `abeauty:diaryEntries`(배열)의 각 엔트리 `.answers` 객체. 키=question id, 값=option id.
  - 나이: `answers.q1_age` = `"age_50"` 등
  - 시술횟수: `answers.q10_history_count` = `"count_3_4"` 등
- 라벨("50대")은 화면 표시용일 뿐 저장은 id(`age_50`). (`surveyData.ts`, `survey/page.tsx:83`, `result/page.tsx:68`에서 answers 통째로 diaryEntry에 저장)

### 조사 2 — 서버 저장 여부/컬럼
- `POST /api/me/sync`가 로그인 유저의 diaryEntries를 서버 `diagnoses` 테이블에 올린다. 답변은 **`diagnoses.answers`(jsonb)** 통째로 저장 → `q1_age`·`q10_history_count`가 **jsonb 안에** 들어간다. (`app/api/me/sync/route.ts:88~96`)
- `profiles` 테이블은 `profile`(jsonb)·`hair_tags`·`core_key`만 upsert. **나이·시술횟수 전용 컬럼 없음.** `core_key`는 curl/thickness/density만 인코딩(`deriveCoreKeyFromEntries`). → **나이·시술은 서버에 "구조화 컬럼"으로는 없다.**
- 함의: 매칭은 클라(diaryEntries)에서 나이·시술을 도출해 넘기는 구조가 자연스럽다(coreKey와 동일 경로).

### 조사 3 — `productMatchesCoreKey` 인자와 호출 위치
- 시그니처: `productMatchesCoreKey(fitHairTypes, avoidHairTypes, coreKey)` — 지금은 `coreKey`(문자열) 하나만 본다. (`lib/itemsMatch.ts:56`)
- 실제 진입점은 `selectMatchedProducts(items, coreKey)` (`itemsMatch.ts:82`).
- 호출처:
  - **`app/items/page.tsx:95`** — `deriveCoreKeyFromEntries(readDiaryEntries())`로 coreKey를 만들고 `selectMatchedProducts` 호출. **이미 diaryEntries를 읽으므로 나이·시술도 여기서 도출해 넘길 위치에 있다.** ✅
  - **`app/admin/matching-preview/page.tsx`** — 미리보기 시뮬레이터(같은 함수 사용, 반드시 동시 확장).
- 결론: 소비처는 나이·시술을 넘길 수 있는 위치에 있음. `selectMatchedProducts` 시그니처 확장 필요.

---

## 2. 설계안

### 2.1 DB — products에 두 칸 추가
```
fit_age_groups        text[]   -- 비어 있으면 조건 없음
fit_treatment_freq    text[]   -- 비어 있으면 조건 없음
```
기본값 없음(NULL) = 조건 없음. `fit_hair_types`와 동일 취급.

규칙 반영 예:
- 새치 케어 상품: `fit_age_groups = {age_50, age_60plus}`
- 염색 케어 상품: `fit_treatment_freq = {count_3_4, count_5_6, count_7plus}` (count_1_2 제외)

### 2.2 판정 로직 (소비처, `lib/itemsMatch.ts`)
`fit_hair_types`와 **같은 원칙**을 나이·시술에 각각 적용, 조건 간 **AND**:
- 비어 있으면 통과(조건 없는 상품)
- 값이 있는데 사용자 값이 목록에 없으면 제외
- 값이 있는데 사용자가 그 답이 없으면(null) 제외 — coreKey 없으면 숨기는 것과 동일
- 세 조건(모발타입 · 나이 · 시술) 전부 통과해야 노출

의사코드:
```
productMatchesUser(product, user /* {coreKey, ageGroup, treatmentFreq} */):
  if user.coreKey && product.avoid_hair_types?.includes(user.coreKey) → false
  if product.fit_hair_types?.length:      if !user.coreKey || !includes(coreKey) → false
  if product.fit_age_groups?.length:      if !user.ageGroup || !includes(ageGroup) → false
  if product.fit_treatment_freq?.length:  if !user.treatmentFreq || !includes(treatmentFreq) → false
  return true
```
- `selectMatchedProducts(items, user)` — 인자를 `coreKey` 단건에서 `{coreKey, ageGroup, treatmentFreq}`로 확장.
- 나이·시술 도출: coreKey와 **같은 최신 style 엔트리**에서 뽑는다(스냅샷 혼선 방지). `deriveCoreKeyFromEntries`를 확장하거나 `deriveMatchProfileFromEntries(entries) → {coreKey, ageGroup, treatmentFreq}` 신설.

### 2.3 ✅ 확정: 옵션 A — 진단 전에는 조건 없는 상품만 노출

진단 전(coreKey null) 방문자에게는 **조건(fit_hair_types / fit_age_groups / fit_treatment_freq)이 하나도 없는 상품만** 노출한다. 나이·시술·모발타입 조건이 붙은 상품(새치·염색 케어 포함)은 진단 전 사용자에게 숨긴다. (사업주 확정, 2026-07-28)

**이걸 구현하려면 상위 폴백(`selectMatchedProducts`)을 고쳐야 한다 — 하위 함수만으로는 안 된다.** 아래 §2.6 런타임 검증 참조.

### 2.6 🔴 런타임 검증 — 폴백 충돌의 실제 동작 (요청 확인)

**질문: `itemsMatch.ts:88`의 "진단 전 전체 노출"과 `productMatchesCoreKey`의 "coreKey 없으면 fit 지정 제외"가 엇갈린다. 어느 쪽이 이기나?**

- **상위 폴백이 이긴다.** `selectMatchedProducts`는 `coreKey === null`이면 `return items`로 **조기 반환**한다(`itemsMatch.ts:87-88`). 이 때문에 `productMatchesCoreKey`는 **호출조차 되지 않는다**.
- 따라서 `productMatchesCoreKey`의 `if (!coreKey) return false`(fit 지정 상품 제외) 분기는 **`/items` 경로에서 도달 불가(dead code)**다. `productMatchesCoreKey`의 유일한 호출자는 `selectMatchedProducts`뿐이고(코드베이스 확인), 그 함수는 coreKey null이면 절대 하위를 부르지 않는다.

**진단 안 한 사용자가 /items에서 fit 지정 상품이 보이나? → 보인다(전체 노출).** `/items`(`items/page.tsx:95`)와 미리보기(`admin/matching-preview/page.tsx:49`) 둘 다 `selectMatchedProducts(items, null)` → approved 전체를 그대로 노출. 미리보기 UI도 "진단 전(전체 노출)"이라 명시(`matching-preview:95`).

**문서와 다른가? — 사용자 기억과 실제 문서가 반대다.**
- 저장소에 **"인수인계"라는 문자열은 0건**이다. "인수인계 v6 §3에 '진단 전엔 fit 지정 상품 숨김'"이라는 문서는 **찾지 못했다**.
- 사용자가 기억하는 "숨김"은 아마 **`productMatchesCoreKey` 함수 주석**(`itemsMatch.ts:54`: "coreKey가 null이면 fit 지정 상품은 매칭 불가로 판단한다(페이지에서 fallback 처리)")에서 온 것으로 보인다 — 이 주석은 숨김을 시사한다.
- 그러나 **실제 인수인계/상태 문서는 반대**로 적혀 있다:
  - `_export_for_pm.md:475`: "coreKey 없는(진단 전) 방문자에겐 **approved 전체를 최신순 노출 중.** … 바꿀지 결정 필요."
  - `docs/PROJECT_STATE.md:584`: 동일 문구(미결 백로그).
- **정리**: 코드가 **내부 불일치** 상태였다 — 하위 함수 주석은 "숨김"을 말하고, 상위 래퍼(line 88)는 "전체 노출"을 실행. **런타임은 전체 노출**이고, PM/상태 문서도 런타임과 일치(전체 노출·미결). 옵션 A 확정으로 이 미결이 "숨김"으로 결정되며, 코드도 상위 래퍼를 고쳐 하위 함수 주석의 의도와 다시 맞춘다.

**→ A 구현 위치(확정)**: `selectMatchedProducts`의 `coreKey === null → return items` 조기 반환을 제거/교체하고, **항상 상품별 판정(`productMatchesUser`)을 태운다.** 그러면 coreKey·ageGroup·treatmentFreq가 모두 null인 진단 전 사용자는 "조건 없는 상품만" 통과하게 되어 A와 정확히 일치한다. 부수 효과로 하위 함수의 `!coreKey → false` 분기가 다시 살아나 주석대로 동작한다. 이 변경은 **기존 런타임(전체 노출)을 바꾸는 것**이므로, 배포 시 회귀 확인 대상(진단 전 /items가 조건 없는 상품만 보이는지).

### 2.4 어드민 UI — 개별 체크박스 + "이상" 단축 버튼

나이·시술횟수는 **순서형(ordinal)**이라 "이상" 개념이 자주 쓰인다(새치=50대 **이상**, 염색=3~4회 **이상**). 체크박스로 윗 구간을 빠뜨리면 **에러 없이 조용히 노출만 안 되는** 위험이 있으므로, 개별 체크박스와 함께 "이상" 단축 버튼을 제공한다.

- **순서(SSOT)**: 설문 옵션 배열 순서를 그대로 순위로 쓴다(surveyData의 정의 순).
  - 나이: `age_20 < age_30 < age_40 < age_50 < age_60plus`
  - 시술: `count_1_2 < count_3_4 < count_5_6 < count_7plus`
- **"이상" 버튼**: 누르면 그 값 + 그보다 높은 값이 전부 자동 체크된다(선택된 값들을 배열에 채움).
  - 나이 버튼: `[20대 이상] [30대 이상] [40대 이상] [50대 이상] [60대 이상]`
    - 예) "50대 이상" → `age_50`, `age_60plus` 둘 다 체크
  - 시술 버튼: `[1~2 이상] [3~4 이상] [5~6 이상] [7회 이상]`
    - 예) "3~4 이상" → `count_3_4`, `count_5_6`, `count_7plus` 셋 다 체크
- **개별 체크박스도 유지** — 특정 구간만 노리는 경우(예: 40대만) 대비. "이상" 버튼은 체크 상태를 세팅하는 보조 입력일 뿐, 저장 형식은 동일한 배열(`fit_age_groups`/`fit_treatment_freq`).
- 판정 로직(§2.2)은 이 UI와 무관하게 **집합 포함(includes)**만 본다 — "이상"은 UI에서 배열을 채우는 편의이고, DB엔 선택된 개별 값들이 그대로 배열로 저장된다. 즉 순서 정보는 UI에만 있고 매칭은 순서를 모른다(단순·안전).

### 2.5 검증 (기록자, 공용 함수 1벌)
`validateCoreKeyList`(`lib/hairTypeOptions.ts:63`)와 **같은 패턴**으로 열거형 리스트 검증 공용 함수를 만든다(로직 복사 금지):
```
validateEnumList(raw, field, allowedSet) → { valid: string[], invalid: {field,value}[] }
```
- `AGE_GROUP_VALUES = {age_20, age_30, age_40, age_50, age_60plus}`
- `TREATMENT_FREQ_VALUES = {count_1_2, count_3_4, count_5_6, count_7plus}`
- 허용값 외 원소 → 위반 1건, 요청/배치 거부(products 라우트가 fit/avoid를 거부하는 것과 동일).
- 허용값은 **설문 옵션 id에서 파생**(SSOT). surveyData의 옵션과 어긋나지 않게, 가능하면 surveyData에서 id를 끌어오는 방식 권장.

---

## 3. CLAUDE.md §8 — 기록자·소비자 동시 배선 (같은 커밋)

| 축 | 파일 | 할 일 |
|---|---|---|
| **기록자 API** | `app/api/admin/products/route.ts`(POST), `app/api/admin/products/[id]/route.ts`(PUT) | `validateEnumList`로 `fit_age_groups`·`fit_treatment_freq` 검증 후 저장(허용값 외 거부). fit/avoid와 나란히. |
| **기록자 UI** | `app/components/admin/ProductManager.tsx` | `CoreKeyBuilder`(566~573줄) 옆에 나이·시술 **선택 UI**: 개별 체크박스 + "이상" 단축 버튼(§2.4, **자유 입력 금지**). 저장 시 빈 배열→undefined 규칙 유지. |
| **소비자** | `lib/itemsMatch.ts` | `productMatchesUser` 확장 + `selectMatchedProducts` 시그니처 확장 + 나이·시술 도출 함수. |
| **소비자(실서비스)** | `app/items/page.tsx:95` | diaryEntries에서 나이·시술 도출해 `selectMatchedProducts`에 전달. |
| **소비자(미리보기)** | `app/admin/matching-preview/page.tsx` | 시뮬레이터에 나이·시술 입력 추가(실서비스와 동일 함수 써야 어긋나지 않음). |
| **검증 공용함수** | `lib/hairTypeOptions.ts`(또는 신설 `lib/matchOptions.ts`) | `validateEnumList` + 허용값 상수. `validateCoreKeyList`와 1벌 원칙 공유. |
| **타입/allowlist** | `lib/products.ts` | `Product`·`ProductInput`·`ADMIN_PRODUCT_FIELDS`·`PUBLIC_PRODUCT_FIELDS`·`PublicProduct`에 2컬럼 추가(공개 allowlist에 포함 → `/api/items`가 자동 반환). |
| **DB** | `supabase/` 마이그레이션 | `fit_age_groups text[]`, `fit_treatment_freq text[]` 추가. (SQL 실행은 사업주, 이번엔 작성만) |

> §8 위반 방지: 위 기록자(API+UI)·소비자(itemsMatch+items+preview)·검증을 **한 커밋에** 배선한다. 서버 컬럼만 만들고 소비를 미루지 않는다.

---

## 4. 손대야 할 파일 목록 (요약)
1. `supabase/` 새 마이그레이션 SQL (컬럼 2개)
2. `lib/products.ts` (타입 3곳 + allowlist 2곳)
3. `lib/hairTypeOptions.ts` 또는 신설 `lib/matchOptions.ts` (허용값 상수 + `validateEnumList`)
4. `app/api/admin/products/route.ts` (POST 검증·저장)
5. `app/api/admin/products/[id]/route.ts` (PUT 검증·저장)
6. `app/components/admin/ProductManager.tsx` (나이·시술 선택 UI)
7. `lib/itemsMatch.ts` (도출 + 판정 + 시그니처 확장)
8. `app/items/page.tsx` (도출값 전달)
9. `app/admin/matching-preview/page.tsx` (시뮬레이터 입력 추가)

## 5. 결정/미해결
- ✅ **진단 전 폴백 = 옵션 A 확정**(2026-07-28). 구현은 `selectMatchedProducts` 상위 폴백 교체(§2.3·§2.6). 배포 시 회귀 확인: 진단 전 /items에 조건 없는 상품만 보이는지.
- ⚠️ **코드·문서 불일치 발견(§2.6)**: 하위 함수 주석("숨김")과 상위 래퍼("전체 노출")가 어긋나 있었고 런타임은 전체 노출. A 구현으로 정합화됨. "인수인계 v6 §3"라는 문서는 저장소에 없음(추정 출처는 `itemsMatch.ts:54` 주석).
- 나이·시술을 담은 최신 style 엔트리에 셋이 다 있다는 가정 검증(설문 8문항 전부 응답 강제 여부) — 구현 시 도출 함수에서 null 안전 처리로 흡수.
- 허용값 SSOT를 surveyData에서 직접 끌어올지, 상수로 복제할지(권장: 끌어오기).
