# 소싱 정식 API 전환 설계 — 도매꾹/도매매 OpenAPI

> 작성: 2026-07-28. 이 문서는 **설계 기록만**이다. 코드·SQL·스케줄 없음.
> 배경: 크롤링으로는 오너클랜(Cloudflare)·도매토피아(JS렌더)·알리바바(캡차)가 전부 막혔다.
> 도매꾹/도매매는 공식 OpenAPI가 있어 그쪽으로 전환한다. **우리가 쓸 채널은 도매매(위탁, 최소수량 없음).**
>
> 근거 출처: [openapi.domeggook.com](https://openapi.domeggook.com/ko/) (Channel.io 호스팅). 아래 필드·파라미터는
> 2026-07-28 기준 문서 원문에서 확인한 값이다. 확인 못 한 항목은 §7에 그대로 남긴다.
>
> ⚠️ **게이트 불변**: API를 "설계·구현"하는 것과 "자동수집을 켜는 것"은 별개다. 실물 수령 +
> 15항목 체크리스트 통과 전까지 `sourcing_candidates` 자동 투입·정기 스케줄(cron)은 금지
> (CLAUDE.md §4). 이 문서는 게이트를 열지 않는다.

---

## 1. 두 API 호출 방식

두 API 모두 같은 엔드포인트에 `mode`만 다르다. GET, 인증은 쿼리 `aid`.

| | 상품 검색 | 상품 상세 |
|---|---|---|
| mode | `getItemList` | `getItemView` |
| 권장 ver | `4.1` | `4.6` |
| Endpoint | `https://domeggook.com/ssl/api/` | 동일 |
| Method | GET | GET |
| 출력 | `om=json` (또는 xml) | 동일 |

### 1.1 getItemList (검색)
```
https://domeggook.com/ssl/api/?ver=4.1&mode=getItemList&aid={API키}&market=supply&om=json&kw=검색어&sz=50&pg=1&so=rd
```
- **검색조건은 최소 1개 필수**: `kw`(검색어) / `ca`(카테고리) / `ev`(기획전) / `id`(판매자) / `itemNo`(상품번호)
- 가격대: `mnp`(최저)·`mxp`(최고) · 최소구매수량: `mnq`·`mxq`
- 필터: `who`(배송비부담 S무료/B착불/P선결제/C선택), `org`(kr국내/fr국외), `dfos`(해외직배송), `sgd`(우수판매자), `fdl`(빠른배송), `lwp`(최저가확인)
- 정렬 `so`: se정확도·rd랭킹(기본)·ha인기·aa낮은가격·ad높은가격·da최근등록·qa적은판매단위
- 페이지: `sz`(1~200, 기본 20)·`pg`
- 응답 `list.item`: `no`·`title`·`price`·`thumb`·`unitQty`(MoQ)·`comOnly`·`deli.*`·`url`·`market.domeggook`·`market.supply`
- ※ 판매중지·종료·품절·단종 상품은 응답에 포함되지 않는다.

### 1.2 getItemView (상세)
```
https://domeggook.com/ssl/api/?ver=4.6&mode=getItemView&aid={API키}&no={상품번호}&om=json
```
- `no`만 필수. **4.1+부터 market 파라미터 불필요**(도매꾹·도매매 정보 동시 반환).
- `multiple=true` → `no`에 상품번호를 콤마로 연결해 **최대 100개 일괄 조회**.
- 응답 주요 블록: `basis`(상품명·상태·키워드·판매방식·과세), `price`(dome/supply 단가·수량별차등·할인전가·재판매준수가), `qty`(재고·domeMoq·domeUnit·supplyUnit), `deli`(배송방법·채널별 배송비·해외직배송·출고지·제주/도서산간 추가비), `channel`(dome/supply 판매여부), `thumb`(small/large/original/png/hash), `seller`(사업자유형·상호·사업자번호·평점), `detail`(원산지·제조사·모델·KC안전인증·의무고시·공급사상품코드), `category`(상위/현재 카테고리 코드).

### 1.3 인증
- 모든 호출에 `aid={API_KEY}` 쿼리 파라미터. OAuth·헤더토큰 아님.
- 발급: 도매꾹 로그인 → [API 키 발급/관리](https://mobile.domeggook.com/APIs/gate). Open API 키와 Private API 키가 구분됨(Private는 권한승인 필요).
- **발급 자격**: 도매꾹 OpenAPI 가이드 원문 — "개인/사업자 모두 가능하나, 일부 API는 사업자만 이용 가능".
  - 따라서 **사업자등록 없이 개인 계정으로 API 키 발급 및 조사 착수 가능**.
  - 단 응답의 `comOnly`(사업자전용상품) 항목은 개인 계정에서 제한될 수 있음. 실제 제한 범위는 키 발급 후 확인 필요.
- **운영 원칙**: 키가 URL 쿼리에 실리므로 반드시 **서버-서버 호출**로만 사용. 클라이언트 번들·로그·커밋에 노출 금지 (CLAUDE.md §8 "공개 조회는 서버 API 라우트 경유"와 정합, §4 "service_role 등 비밀은 서버 라우트 밖 금지"와 같은 취지).

---

## 2. 도매꾹(사입) vs 도매매(위탁) 구분

우리가 쓸 채널은 **도매매(위탁 = 최소수량 없음)**. API에서 4중으로 구분 가능:

| 구분 근거 | 도매꾹(사입) | 도매매(위탁) |
|---|---|---|
| 요청 파라미터 (getItemList) | `market=dome` | `market=supply` |
| 응답 불리언 | `market.domeggook` / `channel.dome` = true | `market.supply` / `channel.supply` = true |
| 가격 필드 (getItemView) | `price.dome` (없으면 도매꾹 미판매) | `price.supply` (없으면 도매매 미판매) |
| 수량 필드 (getItemView) | `qty.domeMoq`(최소구매수량)·`qty.domeUnit`(구매단위) | `qty.supplyUnit`(구매단위)만 존재 |

- **정확한 도매매 매입가는 `price.supply`를 써야 한다.** getItemList의 `list.item.price`는 단일값이라 채널 구분이 모호하므로, 검색으로 후보를 좁힌 뒤 getItemView로 `price.supply`를 확정한다.
- ⚠️ **도매매 "최소수량 없음"은 필드 부재로 추정**이다. 문서에 도매매용 MoQ 필드가 없고(`domeMoq`는 도매꾹 전용) `supplyUnit`(구매 배수 단위)만 있다. "도매매는 MoQ 없음"이라고 문서가 명문화한 것은 아니다(§7 참조).

---

## 3. 14컬럼 매핑 대조표

`lib/sourcing.ts`의 `RAW_CANDIDATE_COLUMNS`(14열) 기준. 소싱을 TSV 붙여넣기에서 API 수집으로 바꿔도 이 14열은 그대로 채워질 수 있어야 한다.

| 우리 컬럼 | API 필드 (list / detail) | 상태 |
|---|---|---|
| group_id | 없음 | ❌ 내부 부여 |
| product_group_kr | `category.current.name` (detail) | 🟡 파생 |
| original_product_name | `title`(list) / `basis.title`(detail) | ✅ 직접 |
| korean_display_name | `title` 기반 | 🟡 원본명 편집 |
| brand_name | `detail.manufacturer`(제조사) | 🟡 파생(브랜드 전용 필드 없음) |
| source_platform | `market`/`channel.*` | ✅ 파생(도매꾹/도매매 확정) |
| product_url | `url`(list) / 상세는 `no`로 조립 | ✅ 리스트 직접, 상세 파생 |
| url_confidence | API 조회 성공 = 실존 보장 | ✅ API 성공을 confirmed로 대체 |
| image_url | `thumb`(list) / `thumb.large·original`(detail) | ✅ 직접 |
| price_range | `price.supply`(detail, 도매매 단가) | ✅ 직접(채널별·구간별) |
| shipping_region | 직접 없음 → `detail.country`·`seller.global`·`deli.fromOversea`로 파생 | 🟡 파생 |
| material_or_type | 직접 없음 → `detail.model`·`category` | 🟡 파생/보완 |
| risk_check | `detail.safetyCert`·`basis.tax`·`comOnly`·`adult` | 🟡 자동 보강(1:1 아님) |
| memo | 없음 | ❌ 내부 작성 |

### 3.1 파생 필요 3칸 — 파생 규칙 (명시)

**① source_platform** — `channel.supply === true` → `"도매매"`, `channel.dome === true` → `"도매꾹"`. 둘 다 true면 우리 채널 정책상 `"도매매"` 우선(위탁이 최소수량 이점). 이 값이 곧 `lib/sourcing.ts`의 해외 리스크 판정(§OVERSEAS_RISK_KEYWORDS)에 안 걸리는 국내 플랫폼임을 의미.

**② brand_name** — `detail.manufacturer`(제조사)를 1차 소스로 사용. 제조사가 비었거나 "상세정보별도표기" 같은 placeholder면 **빈칸으로 두고 사람이 상세페이지 보고 보완**(억지 파생 금지 — 잘못된 브랜드 표기는 사고).

**③ shipping_region** — 다음 우선순위로 파생: `deli.fromOversea === true` → `"국외(해외직배송)"`; 아니고 `seller.global === true` → `"국외(해외판매자)"`; 아니면 `detail.country`(원산지)가 국내면 `"국내"`, 국외면 `"국외"`; 전부 불명이면 빈칸. (지역 세부값은 API에 없음 → 국내/국외 수준까지만.)

> **material_or_type**도 직접 필드가 없어 사실상 파생/수동이다: `detail.model`(규격/품명)·`category.current.name`을 참고하되, 소재 확정은 실물 확인 후 사람이 채운다(게이트 원칙과 정합).

---

## 4. 컬럼 확장 3개 — 저장 대상 + 소비처 (CLAUDE.md §8 동시 배선)

API가 주는 값 중 아래 3개는 **저장 대상**으로 설계에 넣는다. CLAUDE.md §8에 따라 **기록자(writer)와 소비자(consumer)를 같은 커밋에서 배선**해야 하며, 각각의 소비처를 여기 못박는다. (구현 시점은 게이트 통과 후. 지금은 설계만.)

| # | 신규 컬럼(가칭) | API 소스 필드 | 기록자(writer) | **소비자(consumer) — 반드시 같은 커밋** |
|---|---|---|---|---|
| 1 | `stock_qty` (재고수량) | `qty.inventory` | 소싱 수집 시 저장 | **(a) 품절 자동 숨김** — 공개 조회 API 필터에 `stock_qty > 0` 추가. **(b) 판매자 지속성 추적** — 재고 0 지속/급감 시 관리자 화면 경고 표시 |
| 2 | `kc_cert` (KC 안전인증) | `detail.safetyCert`(cert/certType/certName/no/imgUrl/면제정보) | 소싱 수집 시 저장 | **상세페이지 표시** — 상품 상세 컴포넌트에 KC 인증정보/인증번호(또는 면제사유) 노출. 법정 표시 대응 |
| 3 | `origin_country` (원산지) | `detail.country` | 소싱 수집 시 저장 | **(a) 법정 표시사항** — 상세페이지 원산지 표기. **(b) shipping_region 파생 입력**(§3.1 ③) |

> §8 위반 방지: 위 3개는 "서버 컬럼만 만들고 소비는 나중" 패턴을 반복하지 않는다. 각 컬럼을 추가하는 커밋에서 위 소비처 코드까지 같이 배선한다. 배선 못 할 상황이면 컬럼도 그때는 만들지 않는다.

### 4.1 보류 (저장 안 함 — 쓸 곳 없음, 명시)

아래는 API가 주지만 **현재 소비처가 없어 저장하지 않는다.** 나중에 소비처가 생기면 그때 §8대로 writer+consumer 동시 배선.

- **사업자등록번호/상호/대표/주소** (`seller.company.*`) — 발주 자동화(Private API) 단계에서나 필요. 지금은 소비처 없음.
- **판매자 평점/등급** (`seller.score`·`seller.rank`·`seller.good`) — 소싱 우선순위에 쓸 여지는 있으나 현재 랭킹 로직 없음. 보류.
- **수량별 차등단가** (`price.supply` 문자열형 `1+3800|20+3500|...`) — 위탁은 낱개/소량이라 구간 할인 활용처 없음. 단일가(첫 구간)만 `price_range`에 쓰고 차등표는 저장 안 함.

---

## 5. Rate Limit (PM방이 공식 문서에서 확인, 출처: openapi.domeggook.com/main/guide/start)

- **분당 180회**
- **일 15,000회**
- **키 5개**까지 발급 가능
- 초과 시 **HTTP 429**

→ 설계 함의: 수집 배치는 분당 180·일 15,000 예산 안에서 순차·간격 호출로 짜야 한다(기존 `verify-sourcing-tsv.mjs`의 순차+딜레이 방식과 동일 철학). getItemView `multiple=true`(100개 일괄)를 쓰면 상세 조회 호출수를 1/100로 아낄 수 있다. 429는 백오프 대상. **단, 이 배치를 정기 스케줄로 거는 것은 게이트 밖 — 지금은 금지.**

---

## 6. 전환 설계 요지 (구현은 게이트 후)

1. **수집**: `getItemList`(market=supply, kw/ca)로 후보 상품번호 수집 → `getItemView`(multiple)로 상세 확정.
2. **매핑**: §3 대조표대로 14열 + §4 확장 3열을 채운 후보를 만든다.
3. **사람 경유 유지**: 수집 결과도 여전히 "붙여넣기/검토 후보"다. `/admin/sourcing` 사람 승인 → draft 저장. **API가 실존을 보장해도 status='approved' 자동 승인은 금지**(CLAUDE.md §4).
4. **실존검증 CLI 대체**: API 조회 성공 자체가 URL·가격 실존을 보장하므로, 기존 크롤링 기반 `verify-sourcing-tsv.mjs`의 할루시네이션 방어 역할을 API가 흡수한다(도매매 한정). 알리바바 등 API 없는 채널은 여전히 사람 확인.

---

## 7. 확인 못 한 것 (정직 기록 — 추측 금지)

1. **Private API 29개 아티클의 구체 스펙** — 이번에 열어보지 않음. 주문수집/발주처리용, 권한승인 필요. 소싱(조회)엔 Open API로 충분해 조사 보류.
2. **도매매 "최소수량 없음"의 명문 규정** — 필드 부재(도매매용 MoQ 필드 없음)로 추정일 뿐, 문서가 명시적으로 규정한 것은 확인 못 함.
3. **개인 계정의 `comOnly`(사업자전용상품) 응답 제한 범위** — 개인 계정 발급은 가능하나(§1.3), 사업자전용상품 조회가 어디까지 제한되는지는 키 발급 후 확인 필요.
4. (Rate limit은 §5에 기록 — PM방이 공식 문서에서 확인한 값이며, 문서 화면 자체는 이번 세션에서 직접 캡처하지 못했다.)
