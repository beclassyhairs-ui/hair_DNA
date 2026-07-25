# 소싱 TSV 포맷 명세 — 인세인서치 → /admin/sourcing 직접 붙여넣기용

> 이 문서는 **포맷(헤더 정의)만** 정의한다. 연동 코드는 만들지 않는다.
> 우분투 인세인서치가 이 헤더대로 `sourcing/inbox/*.tsv`를 만들면, 사업주가 그 표를
> 열어 **통째로 복사 → `/admin/sourcing` 텍스트칸에 붙여넣기** 하면 그대로 파싱된다.
> (사람 손 필수 경유. DB 자동 투입·정기 스케줄은 실물 수령 검증 게이트 통과 전까지 금지.)
>
> 근거: 파서는 `lib/sourcing.ts`의 `RAW_CANDIDATE_COLUMNS`(아래 14열)를 헤더로 읽는다.
> 헤더 이름은 **철자·소문자까지 정확히** 아래와 같아야 인식된다. 순서는 바뀌어도 되고
> (헤더 이름으로 매칭), 모르는 열이 섞여 있어도 무시된다.

## 1. 파일 형식

- **탭 구분(TSV) 권장** — 쉼표(CSV)도 되지만, 상품명·메모에 쉼표가 흔해 탭이 안전하다.
- 첫 줄 = **헤더**(아래 14개 이름). 둘째 줄부터 데이터 1줄 = 상품 1개.
- 값에 줄바꿈/탭/쌍따옴표가 있으면 그 셀을 `"..."`로 감싼다. 안의 `"`는 `""`로 쓴다.
- 인코딩 UTF-8. 완전히 빈 줄은 무시된다.

## 2. 헤더 14열 (이 이름 그대로)

| # | 헤더 | 필수? | 들어갈 값 | 등록 시 매핑되는 DB 컬럼 |
|---|---|---|---|---|
| 1 | `group_id` | ✅ **필수** | 모발타입 그룹 코드 (예: `G002`) — 아래 3장 참고 | → `fit_hair_types` (그룹→코드 변환) |
| 2 | `product_group_kr` | 선택 | 한글 카테고리 (예: `볼륨 헤어롤`) | → `category` |
| 3 | `original_product_name` | 선택 | 원본(현지) 상품명 | 내부 메모(`sourcing_note`)로만 |
| 4 | `korean_display_name` | ✅ **필수** | 손님에게 보일 한글 상품명 | → `product_name` |
| 5 | `brand_name` | 선택 | 브랜드명 | 내부 메모로만 |
| 6 | `source_platform` | ✅ **필수** | 판매처 (예: `coupang`, `naver`, `AliExpress US`) | → `sales_type` 자동 판정 |
| 7 | `product_url` | ✅ **필수** | 구매 링크(전체 URL, `https://`) | → `buy_link` |
| 8 | `url_confidence` | 선택 | 링크 확신도: `confirmed` / `uncertain` | `uncertain`이면 "재확인" 플래그 |
| 9 | `image_url` | 선택 | 상품 이미지 URL(전체 주소) | → `image_url` |
| 10 | `price_range` | 선택 | 가격대 (예: `12,000~15,000원`) | 내부 메모로만 |
| 11 | `shipping_region` | 선택 | 배송지 (예: `국내`, `해외직배`) | 내부 메모로만 |
| 12 | `material_or_type` | 선택 | 소재/유형 | 내부 메모로만 |
| 13 | `risk_check` | 선택 | 리스크 점검 결과 한 줄 | 내부 메모로만 |
| 14 | `memo` | 선택 | 자유 메모 | 내부 메모로만 |

> **필수 4열**(`group_id`, `korean_display_name`, `source_platform`, `product_url`) 중 하나라도
> 비면 그 줄은 화면에서 **자동으로 "제외(drop)" 처리되고 채택이 잠긴다.** 나머지 열은 비어도 된다.

### 헤더 한 줄 복붙용 (탭 구분)

```
group_id	product_group_kr	original_product_name	korean_display_name	brand_name	source_platform	product_url	url_confidence	image_url	price_range	shipping_region	material_or_type	risk_check	memo
```

## 3. `group_id` → 모발타입 매핑 규칙 ⚠️ 중요

등록 시 `group_id`가 상품의 **매칭용 모발타입(`fit_hair_types`)** 으로 변환된다.
매칭은 유저 진단에서 만든 **`컬__굵기__숱`** 키(밑줄 2개, 3토막)와 **정확히 일치**해야 노출된다.

| 유저 진단 축 | 가능한 값 |
|---|---|
| 컬(q3) | `straight_hair` · `wavy_hair` · `curly_hair` |
| 굵기(q7) | `coarse` · `medium_thickness` · `fine` |
| 숱(q8) | `thick_density` · `medium_density` · `thin_density` |

→ 예: 가는 직모·숱 적음 = `straight_hair__fine__thin_density`

### 🔴 현재 매핑표의 형식 불일치 (item 6 — 아직 수정 안 함)

`lib/sourcing.ts`의 `GROUP_ID_FIT_HAIR_TYPE_MAP` 현황:

| group_id | 현재 매핑값 | 형식 |
|---|---|---|
| G002 | `straight_hair__fine__thin_density` | ✅ 정상(3토막) |
| G004 | `curly_hair__coarse__thick_density` | ✅ 정상(3토막) |
| G001 / G003 | `bangs_babyhair` | ❌ 3토막 아님 → **아무 유저에게도 안 뜸** |
| G005 | `damaged_hair_high_history` | ❌ 3토막 아님 → **아무 유저에게도 안 뜸** |

`bangs_babyhair`(앞머리·잔머리), `damaged_hair_high_history`(손상모)는 **모발타입이 아니라
"고민" 카테고리**라 `컬__굵기__숱`으로 표현할 수 없다. 이건 오타가 아니라 **모델링 문제**이고,
**실물 수령 체크리스트 13번 결과를 보고 확정**한다(지금은 제안만 — 아래 4장).

**그래서 인세인서치 쪽 임시 운용 규칙:**
- 특정 모발타입에 맞는 상품 → `group_id`에 **3토막 코드를 직접** 넣어도 된다
  (예: `group_id` 칸에 `curly_hair__coarse__thick_density`). 형식만 맞으면 그대로 매칭된다.
- 앞머리/잔머리/손상모처럼 **누구에게나 맞는(범용) 상품** → `group_id`를 **비워** 두거나 매핑 안 된
  코드를 쓰면, 등록 시 `fit_hair_types`가 비게 되어 **전체 노출(범용)** 로 처리된다. 이게 현재로선
  가장 안전한 처리다.

## 4. item 6 매핑 불일치 — 🚫 제안 기각, 현행 유지 (2026-07-25 결정)

**한 줄 결론: "`fit_hair_types`에서 빼서 범용 처리" 제안은 기각한다. 코드는 그대로 두고,
실물 수령 체크리스트 13번 결과로 확정한다.**

### 사실관계
- 현행 매칭은 `fit_hair_types.includes(coreKey)` **완전일치**다. `bangs_babyhair`·
  `damaged_hair_high_history`는 3토막(`컬__굵기__숱`)이 아니라 어떤 coreKey와도 안 맞아,
  해당 상품은 **승인돼도 아무에게도 안 뜬다**. 빈 배열이면 반대로 **전체 노출(범용)** 이 된다.
- 앞머리/손상모는 컬·굵기·숱 축이 아니라 **고민 축**이다(손상모는 사실 시술이력 q10에 가깝고
  coreKey에 없다) → 억지로 3토막을 만들 수 없다.

### 🚫 기각된 제안: "두 항목을 fit에서 빼서 빈 배열(=범용)로"
- **기각 사유**: 빈 태그 = 범용 = **전체 노출**이므로, 지금의 "아무에게도 안 뜸"을
  "**모두에게 뜸**"으로 바꾸는 변경이다. **손상모/앞머리 전용 제품이 해당 없는 사람에게
  노출되는 건, 안 뜨는 것보다 나쁘다.** (조용한 실패 > 잘못된 노출)
- 따라서 지금 코드를 고치지 않는다. `GROUP_ID_FIT_HAIR_TYPE_MAP`은 현행 그대로 둔다.

### 확정 시점
- **실물 수령 체크리스트 13번** 결과로 확정한다. 손상모/앞머리 상품을 어떤 축으로 매칭할지
  (시술이력 매칭축 신설 / `solves_concern` 연동 / 다른 방식)는 실제 등록·수령 후에 정한다.

### 그때까지 인세인서치 운용
- 앞머리/손상모 같은 **고민형·범용 상품은 `group_id`를 비워** 두거나 매핑 안 된 코드를 쓴다
  → 등록 시 `fit_hair_types`가 비어 **전체 노출**. (이건 사업주가 상품 성격을 보고 판단)
- 특정 모발타입 전용 상품은 `group_id` 칸에 **3토막 코드를 직접** 넣는다(위 3장).

## 5. 데이터 예시 (탭 구분 1줄)

```
G002	볼륨 헤어롤	Volume Hair Roll Set	숱없는 정수리 볼륨 헤어롤	(브랜드)	coupang	https://www.coupang.com/vp/products/123	confirmed	https://image.example/roll.jpg	9,900원	국내		리스크 없음	베스트셀러
```

- `sales_type`은 `source_platform`으로 자동 판정: `coupang`→쿠팡, `naver`/`smartstore`→네이버,
  `AliExpress`/`Temu`/`eBay`/`Amazon`/`YesStyle` 등→해외후보(+ AliExpress·Temu·eBay는 해외리스크 배지).
- 붙여넣은 뒤 화면에서 **채택(keep) 선택 → "draft로 저장하기" 버튼**을 눌러야만 저장된다.
  저장돼도 `status=draft`·`image_status=needs_review`라 **손님에겐 안 보인다**(관리자 승인 필요).

## 6. 하지 않는 것 (경계)

- ❌ `sourcing_candidates` 테이블 / DB 자동 투입 / 정기 스케줄(cron) / 오픈클로 점검 —
  전부 **실물 수령 검증 게이트 통과 후**.
- ❌ 이 문서에 맞춘 연동 코드 — 만들지 않는다. **붙여넣기 수동 경유가 정책이다.**
