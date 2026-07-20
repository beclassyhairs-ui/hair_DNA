# 랜딩 4종 진단 구조 조사 보고서

> 조사일: 2026-07-19 · 조사 방식: 코드 정독(읽기 전용, 수정 없음)
> 목적: 진단 알고리즘 재설계(전문가 규칙 기반 2층 구조 도입)의 기초 자료
> 대상: `/style`(메인 랜딩), `/bangs`(인생 앞머리), `/damage-check`(손상도 체크), `/hair-quiz`(손질 습관) — `/mbti` 제외

---

## ① /style — AI 헤어 진단 (설문 + 사진 업로드 + 이미지 변환)

### 1. 전체 플로우

```
/style → /style/survey (8문항) → /style/upload (사진) → /style/loading (합성 대기) → /style/result
```

| 단계 | 파일 | 역할 |
|---|---|---|
| 진입 | `app/style/page.tsx` | 히어로 + 세션 초기화 + 일일 무료 횟수 게이트(`canUseToday`) → survey로 |
| 설문 UI | `app/style/survey/page.tsx` | 8문항 순차 노출, 선택 즉시 350ms 후 자동 진행 |
| 설문 데이터 | `app/style/surveyData.ts` | 8문항 원문/옵션/구조 |
| 사진 업로드 | `app/style/upload/page.tsx` | 촬영 가이드 동의 → 촬영/갤러리 → 크롭·줌 → 512px JPEG 인코딩 → sessionStorage 저장 (API 호출은 안 함) |
| 로딩(합성) | `app/style/loading/page.tsx` | 마운트 즉시 `/api/submit-diagnosis`(기록용, fire-and-forget) + `/api/hair-transform`(Replicate AI 합성, 62초 타임아웃) 호출, 완료 즉시 result로 이동 |
| 결과 | `app/style/result/page.tsx` | 결과지 렌더링 + 카카오 로그인 잠금/해제 + 다이어리 저장 |
| 산출 로직 A | `app/style/recommend.ts` | 스타일명 조립 함수 (`hairTypeMatrix.ts` 재노출도 겸함) |
| 산출 로직 B | `app/style/hairTypeMatrix.ts` | 108개 "모발 타입 리포트" 룩업 테이블 + `getHairTypeReport()` |
| 카피 번역층 | `app/style/hairTypeCopy.ts` | 108행 원본을 "불편함 해석형" 사용자 언어로 재가공 |
| 합성 API | `app/api/hair-transform/route.ts` | flux-kontext-pro 모델로 셀카+레퍼런스 합성 |

### 2. 설문 문항 전체 (8문항, 화면 순서 고정)

**STEP 1 · 희망 스타일**

| No | id | 질문(원문) | hint | 선택지 (id: label / desc) |
|---|---|---|---|---|
| Q1 | q1_age | 연령대를 선택해 주세요 | 나이대에 맞는 최적의 스타일을 추천해 드려요 | age_20: 20대 / age_30: 30대 / age_40: 40대 / age_50: 50대 / age_60plus: 60대 이상 |
| Q2 | q11_length | 원하는 머리 기장을 골라주세요 | — | short: 숏 / 귀 위로 올라오는 길이; short_bob: 숏보브 / 귀 아래~턱 선; bob: 단발 / 턱선 길이; collarbone: 쇄골 / 쇄골 라인; chest: 롱 / 가슴에 닿는 길이 |
| Q3 | q14_layer | 레이어드 정도를 선택해 주세요 | 층을 얼마나 넣을지 결정해요 | heavy: 무거움(일자) / 층 없이 무게감 있는 스타일; medium: 중간(소프트) / 자연스럽게 가벼운 레이어; light: 가벼움(허쉬) / 허쉬컷처럼 각도 있는 레이어 |
| Q4 | q13_design | 원하는 웨이브를 골라주세요 | — | straight: 생머리 / 자연스럽고 깔끔한 직모; c_curl: C컬 / 부드럽게 안으로 말리는 컬; s_curl: S컬 / S자로 흐르는 자연 웨이브; wave: 웨이브 / 굵고 풍성한 웨이브 |

**STEP 2 · 모질 파악**

| No | id | 질문(원문) | hint | 선택지 (id: label / desc) |
|---|---|---|---|---|
| Q5 | q8_density | 모발 숱은 어느 정도인가요? | — | thick_density: 많음 / 숱이 많아 볼륨감 있는 편; medium_density: 보통 / 평균적인 숱; thin_density: 적음 / 숱이 적어 볼륨이 부족한 편 |
| Q6 | q7_thickness | 모발 굵기는 어떤가요? | — | coarse: 두꺼움 / 모발이 굵고 강한 편; medium_thickness: 보통 / 일반적인 굵기; fine: 얇음 / 모발이 가늘고 약한 편 |
| Q7 | q3_curl | 곱슬기가 있나요? | — | straight_hair: 직모 / 곱슬기 없이 매끈한 편; wavy_hair: 반곱슬 / 습하면 약간 부스스해지는 편; curly_hair: 악성곱슬 / 뻣뻣하거나 곱슬이 강한 편 |
| Q8 | q10_history_count | 1년에 헤어 시술을 몇 번 받으세요? | 펌, 염색, 탈색 등 전체 시술 횟수 | count_1_2: 1~2회 / 전체 펌·염색 위주; count_3_4: 3~4회 / 주기적인 전체 시술; count_5_6: 5~6회 / 잦은 스타일 체인지; count_7plus: 7회 이상 / ⚠️ 잦은 새치·뿌리 염색 |

비고: `q11_length`의 `short`/`short_bob` 선택 시 Q3(레이어드)는 화면에서 숨김, Q4의 `s_curl`도 숨김(짧은 기장엔 해당 없음). `shoulder`는 폐지된 구옵션으로 `collarbone`과 동일 라벨 별칭만 유지(하위호환).

### 3. 결과 산출 로직

**서로 완전히 분리된 두 시스템이 병렬로 작동**한다.

- **(A) 스타일명 — `recommend.ts:getStyleEntry()`**: 룩업 테이블이 아니라 런타임 조립. `EFFECT_PREFIX`(연령2그룹×레이어3) × `BASE_STYLE`(기장6×웨이브4) × `STYLE_MOOD`(웨이브4×레이어3) 세 테이블을 곱해 문자열을 조립. 정규화 규칙(shoulder→collarbone, 짧은기장+s_curl→wave 강제치환) 있음. 사용 변수: Q1·Q2·Q3·Q4(스타일 4문항).
- **(B) 모발 타입 리포트 — `hairTypeMatrix.ts:getHairTypeReport()`**: 순수 문자열 키 룩업. `q3_curl(3) × q7_thickness(3) × q8_density(3) × q10_history_count(4) = 108개` 조합을 `"curl__thickness__density__history"` 키로 직접 조회(분기 로직 없음, 108행 하드코딩 데이터). 원칙: `history_count`는 `hairTypeKey/Title`을 바꾸지 않고 `procedureHint/damageModifier/damageCaution/homeCare`만 보정 — 실질 "타입"은 27종(curl×thickness×density) × 4단계 손상 modifier. 사용 변수: Q5·Q6·Q7·Q8(모질 4문항).
- **(C) 카피 번역층 — `hairTypeCopy.ts:getHairTypeCopy()`**: (B)의 결과를 입력받아 `painPointHeadline/whyItHappens/stylePrescription/discoveryItemHint`는 27종 단위 테이블(`CORE_COPY_27`)에서, `avoidWithReason/salonScript/homeCareDirection`은 108행 원본에 정규식 치환(`SAFETY_CORRECTIONS`, 위험 표현 3종 완화)만 적용.

**결과 종류**: 모발 타입 핵심 진단문구 **27종**(저장 데이터 기준 108종, historyCount modifier 포함) + 스타일명 조합 최대 **144가지**(6기장×4웨이브×3레이어×2연령군, 실질은 강제치환으로 더 적음).

### 4. 결과지 구성 (위→아래)

| 순서 | 섹션 | 데이터 출처 |
|---|---|---|
| 1 | 헤더(다시 찍기/스타일 결과지/처음부터) | 하드코딩 |
| 2 | ResultHeroCard: Before/After 사진, badge(스타일명), title | Before=업로드사진, After=AI합성이미지, badge=`entry.name`(A), title=`copy.painPointHeadline`(C, 27종) |
| 3 | 모발 성질 리포트 | `copy.whyItHappens`(C, 27종) |
| 4 | 추천 스타일 방향 | `copy.stylePrescription`(C, 27종) |
| 5 | 피해야 할 스타일·시술 + 손상 주의 | `copy.avoidWithReason`(C, 108종) + `report.damageCaution`(B 원본, 카피레이어 미적용) |
| 6 | 미용실 상담 팁 | `copy.salonScript`(C, 108종) |
| 7 | 홈케어 방향 + 발견템 유도 문구 | `copy.homeCareDirection`(C, 108종) + `discoveryItemHint`(C, 27종) → `/items` 텍스트 링크(제품 카드 직접 노출 없음) |
| 8 | 저장/공유 카드 | 하드코딩 UI |
| 9 | 진단 로직 디버그 패널(플로팅) | 답변원본/hairTypeKey/damageModifier 노출 — **프로덕션에 조건 없이 항상 렌더링** |
| 10 | 하단 고정 CTA | 잠금 시 "카카오 로그인" / 해제 시 "저장하고 홈에서 오늘 케어 보기" |

주의: `recommend.ts`에 정의된 `getStyleProduct/getSecondStyleProduct/buildAhaText/buildCarePrescription/buildAIDiagnosisText`(쿠팡 링크 포함)는 result 페이지에서 import되지 않는 **죽은 코드로 추정**(재확인 필요).

### 5. 저장 연동

사용자가 결과지에서 저장 버튼을 눌러 카카오 로그인 후에만 저장(자동 저장 아님). `executeSaveAndRoute()`(result/page.tsx:153-189):

```js
const entry = {
  id, answers, styleName, savedAt: Date.now(), generatedImageUrl, hairTags,
  isSevereDamage: answers.q10_history_count === "count_7plus",
  isLowDensity:   answers.q8_density === "thin_density",
  isFineHair:     answers.q7_thickness === "fine",
  isCurly:        answers.q3_curl === "curly_hair",
};
// localStorage["abeauty:diaryEntries"] 배열 앞에 unshift
// localStorage["abeauty:savedDiagnosis"] 단일 저장(하위호환)
refreshBeautyUserProfileFromDiary();
router.push("/home");
```

- **kind**: `/style` 항목은 `kind` 필드 자체를 저장하지 않는다 — `lib/beautyProfile.ts:classifyKind()`가 "kind 없으면 style로 간주"하는 방식으로 구분(암묵적 규칙).
- **hairTags**: `buildHairTags()`가 `#손상모/#볼륨처짐/#가는모/#곱슬모`(해당 시) 또는 기본값 `#건강모`.
- 저장 후 `refreshBeautyUserProfileFromDiary()`로 `abeauty_user_profile` 재계산(우선순위 style>damage>bangs>hairquiz 중 1순위).

### 6. 랜딩 간 연결

- 저장 완료 → `/home` (문구 없이 즉시 이동)
- `/items` 텍스트 링크(홈케어 섹션 내 "발견템에서 볼 수 있어요 →")
- `/style/survey`(다시 진단하기), `/style/upload`(다시 찍기), `/style`(처음부터)
- **`/bangs`, `/damage-check`, `/hair-quiz`로 가는 직접 링크는 결과지에 없음** — 오직 `/home`을 경유한 간접 연결만 존재.

---

## ② /bangs — 인생 앞머리 찾기

### 1. 전체 플로우

```
/bangs → /bangs/survey (6문항) → /bangs/result
```

**사진 업로드/AI 이미지 변환 단계 없음**(코드 주석에 명시: "사진 촬영/업로드 단계 없음"). 순수 텍스트 선택지 기반.

| 단계 | 파일 | 역할 |
|---|---|---|
| 진입 | `app/bangs/page.tsx` | 히어로 + CTA → survey |
| 설문 UI | `app/bangs/survey/page.tsx` | 6문항 순차 노출, 선택 즉시 350ms 후 자동 진행, 마지막 답변 시 sessionStorage 저장 후 result로 |
| 설문 데이터 | `app/bangs/surveyData.ts` | 6문항 원문/옵션 |
| 산출 로직 | `app/bangs/bangRecommend.ts` | `diagnoseBangs()` — 순수 함수, 리액트 없음 |
| 결과 | `app/bangs/result/page.tsx` | sessionStorage 답변 읽어 산출 후 렌더링 + 저장/공유 |
| 상수 | `app/bangs/constants.ts` | sessionStorage 키 1개 |

### 2. 설문 문항 전체 (6문항, 화면 순서 고정)

| 화면 No | 내부 qKey | 질문(원문) | hint | 선택지 (label / desc) |
|---|---|---|---|---|
| Q1 (얼굴형) | qFaceShape | 내 얼굴형은 어떠신가요? | 정확히 몰라도 괜찮아요. 뒤 질문에서 이마·광대·턱선을 함께 보고 보정해드릴게요. | oval: 계란형/이마 끝,광대,턱끝이 부드럽게 이어지는 갸름한 라인...; round: 둥근형/양 볼과 턱선에 살이 있어 가로 폭이 넓게...; square: 각진형/턱 끝보다 턱 '각'이 뚜렷하게...; oblong: 긴 얼굴형/가로 폭보다 세로 길이가 확실히...; heart: 역삼각형/하트형/이마·관자놀이 쪽은 넓은데 턱 끝으로...; peanut: 땅콩형/광대 부분이 도드라지고 관자놀이나 볼 중간이... |
| Q2 (현재 스타일) | q1 | 현재 헤어스타일은 어떤가요? | — | side_part: 옆가르마/왼쪽 또는 오른쪽으로 가르마를 타요; center_part: 가운데 가르마(5:5)/정중앙으로 이마를 드러내요; allback: 앞머리 없음·올백/이마를 완전히 드러내고 넘겨요; has_bangs: 앞머리 있음/현재 앞머리가 있어요 |
| Q3 (상안부·이마) | q2 | 이마 / 헤어라인의 가장 큰 고민은? | 앞머리 처방 방향이 달라져요 | narrow_brow: 좁은 이마·튀어나온 눈썹뼈/이마가 좁거나 눈썹뼈가 도드라져요; wide_forehead: 넓은 이마·M자 헤어라인/이마 여백이 넓거나 헤어라인이 올라가요; none: 특별한 고민 없음/이마 쪽은 괜찮아요 |
| Q4 (중안부·광대) | q3 | 얼굴 중앙에서 가리고 싶은 부분은? | 사이드뱅 / 커튼뱅 처방 방향이 달라져요 | cheekbone: 도드라진 옆광대/광대가 옆으로 도드라져 보여요; long_mid: 긴 중안부/긴 코/코 아래~입술 구간이 길어 보여요; none: 특별한 고민 없음/이 부분은 괜찮아요 |
| Q5 (하관·턱선) | q4 | 턱선 주변의 특징은? | 롱 뱅 vs 짧은 뱅 처방 방향이 달라져요 | round_jaw: 둥근 턱·볼살형/볼살이 있거나 턱이 둥글어요; angular_jaw: 각진 턱선/하관이 각지고 턱 라인이 뚜렷해요; pointed_jaw: 뾰족한 V라인·좁은 턱끝/턱끝이 좁고 갸름하게 모여요; none: 특별한 고민 없음/턱 쪽은 괜찮아요 |
| Q6 (앞머리 모질) | q5 | 앞머리 쪽 머릿결의 특징은? | 맞춤 헤어 제품을 추천해드릴게요 | flat_oily: 푹 가라앉고 금방 기름짐/오후만 되면 떡지거나 납작해져요; flyaway: 위로 솟구치거나 잔머리 많음/잔머리가 많거나 위로 뻗쳐나와요; healthy: 건강하고 손질하기 편함/큰 불편 없이 손질해요 |

주의: **화면 번호(Q1~Q6)와 내부 answers 키(qFaceShape, q1~q5)가 어긋난다** — 화면 "Q3"이 내부 키로는 `q2`. Q3~Q6은 `isNone: true`인 "특별한 고민 없음" 옵션이 항상 포함.

### 3. 결과 산출 로직

**점수 합산(가중치 룩업) 방식**, if/switch는 최종 승격 판단에만 사용. 핵심 함수 `diagnoseBangs()`(`bangRecommend.ts:537-599`):

1. `selectedFaceShape` = Q1 답변 그대로(무효 시 oval 기본값)
2. `inferSignalBasedFaceShape()` — Q3~Q5(내부 q2,q3,q4)의 얼굴형 신호 가중치 테이블을 합산해 별도의 "신호 기반 얼굴형"을 8종(diamond 포함) 중 최댓값으로 추론
3. `calcBangScores()` — 얼굴형별 기본 적합도표(`FACE_BANG_AFFINITY`)에 Q1~Q5 보정 신호(현재스타일/이마/중안부/턱/모질 5개 테이블)를 가감산해 앞머리 10종 점수 산출. "선택 얼굴형 축"(감점만)과 "신호 얼굴형 축"(가점+감점) 두 번 계산
4. 두 축 결과가 일치하면 그대로 채택, 불일치 시 신호 점수가 임계값(**SIGNAL_PROMOTE_THRESHOLD = 4**) 이상이면 신호 기반 결과로 승격(`promoted`)

**결과 종류**: 실제 산출 후보 앞머리 **10종**(`ACTIVE_BANG_TYPES`: see_through/curtain/long_side/side_swept/soft_full/wisp/face_line/round_bang/volume_bang/side_bang — `inner/hippy/block`은 타입만 정의되고 후보에서 제외). 얼굴형은 자가선택 6종 + 신호전용 diamond 1종(`hexagon`은 정의만 있고 미사용).

### 4. 결과지 구성 (위→아래)

| 순서 | 섹션 | 데이터 출처 |
|---|---|---|
| 1 | 헤더(다시 하기/진단 결과지/공유) | 하드코딩 |
| 2 | ResultHeroCard: 1순위·서브 추천 이미지, 배지, 1순위 추천 이유 | `diagnoseBangs()` 결과 |
| 3 | 서브 추천 카드 | `result.secondaryBangLabel` + 이유 |
| 4 | 추천 이유 요약(일치 시 1개 / 불일치 시 2개 비교) | 선택 얼굴형 축 vs 신호 얼굴형 축 비교 |
| 5 | 현재 스타일 체크 | Q2(`q1`) × 선택 얼굴형 매트릭스 |
| 6 | 피하면 좋은 스타일(NG) | `result.ngStyle` |
| 7 | 디버그 박스(조건부: `SHOW_BANG_DEBUG` 또는 `?debug=1`) | 내부 점수/로직 노출 |
| 8 | 저장 CTA 카드 | — |
| 9 | 공유 카드(카카오톡/링크복사) | — |
| 10 | 하단 고정 CTA | "내 맞춤 헤어홈으로 이동하기" / "처음부터 다시 하기" |

### 5. 저장 연동

`handleSaveAndGoHome()`이 `appendDiaryEntry()` 호출:

```js
appendDiaryEntry({
  id: result.resultId, kind: "bangs", savedAt: Date.now(),
  diagnosisType: "bangs", landingId: "bang_test", resultId,
  selectedFaceShape, selectedFaceBang, selectedFaceBangLabel, selectedFaceReason,
  signalBasedFaceShape, signalBasedBang, signalBasedBangLabel, signalBasedReason,
  primaryBang, primaryBangLabel, secondaryBang, secondaryBangLabel,
  debugReasonSummary, topBangScores,
  currentStyle: answers.q1, concernTags, hairTextureTag, hairTags, answers,
  diagnosisSummary, resultImages: [...],
});
refreshBeautyUserProfileFromDiary();
```

- **kind**: `"bangs"` (명시적 문자열)
- **hairTags**: `[...concernTags, hairTextureTag, "#1순위앞머리라벨", "#서브앞머리라벨", "#선택얼굴형라벨", "#신호얼굴형라벨"]`
- 우선순위(`lib/beautyProfile.ts`): style > damage > **bangs(3순위)** > hairquiz

### 6. 랜딩 간 연결

- 저장 → `/home` ("결과 저장하고 오늘헤어에서 보기" / 하단 CTA "내 맞춤 헤어홈으로 이동하기")
- "처음부터 다시 하기" → `/bangs`, "다시 하기" → `/bangs/survey`
- **`/style`, `/damage-check`, `/hair-quiz`로 가는 직접 링크는 결과지에 없음**. `/home` 경유만.

---

## ③ /damage-check — 손상도 체크

### 1. 전체 플로우

```
/damage-check → /damage-check/survey (4문항) → /damage-check/result
```

**사진 업로드/AI 이미지 변환 단계 없음**. 순수 텍스트 4문항 자가진단.

| 단계 | 파일 | 역할 |
|---|---|---|
| 진입 | `app/damage-check/page.tsx` | 히어로("내 머리, 진짜 손상도는 얼마나 될까?") + CTA → survey |
| 설문 UI | `app/damage-check/survey/page.tsx` | Q1~Q3 단일선택(선택 즉시 350ms 후 자동 진행), Q4 다중선택(확인 버튼) |
| 설문 데이터 | `app/damage-check/surveyData.ts` | 4문항 원문/옵션 |
| 산출 로직 | `app/damage-check/damageRecommend.ts` | `diagnoseDamage()` |
| 결과 | `app/damage-check/result/page.tsx` | sessionStorage 답변 읽어 산출 후 렌더링 |

### 2. 설문 문항 전체 (4문항, 순서 고정)

| No | qKey | stepTag | 질문(원문) | hint | 선택지 (label / desc) |
|---|---|---|---|---|---|
| Q1 | q1_pull | 물리 테스트 | 샤워 후 젖은 머리카락 한 올을\n살짝 당겨보면? | 미용사들이 손상도를 볼 때 가장 먼저 하는 테스트예요 | snap: 힘없이 툭 끊어진다/당기자마자 바로 끊어지는 느낌; stretch: 고무줄처럼 늘어나다 끊어진다/늘어나긴 하는데 결국 끊어짐; elastic: 탄력 있게 늘어났다 돌아온다/당겨도 원래 길이로 복원됨 |
| Q2 | q2_friction | 마찰 테스트 | 트리트먼트 없이 샴푸만 하고\n빗질해보면? | 큐티클이 얼마나 살아있는지 알 수 있어요 | tangled: 엉켜서 잘 안 풀리고 뜯긴다/빗질할 때 뭉텅이로 뽑히는 느낌; loosens: 좀 엉키지만 몇 번 빗으면 풀린다/처음엔 걸리는데 곧 부드러워짐; smooth: 뽀득거리고 잘 빗긴다/빗질이 걸림 없이 매끄러움 |
| Q3 | q3_dry | 관찰 테스트 | 드라이기로 머리를 말릴 때\n보통 어떤가요? | 마르는 속도로 모발 상태의 다른 면을 볼 수 있어요 | fast: 순식간에 마른다/수분이 금방 날아가는 느낌; slow: 유독 오래 걸린다/속까지 마르는 데 시간이 많이 걸림; normal: 적당히 보통으로 마른다/특별히 빠르거나 느리지 않음 |
| Q4 (다중선택) | q4_habits | 습관 체크 | 평소 자주 하는 시술이나\n습관을 모두 골라주세요 | 해당하는 걸 전부 선택해 주세요 (복수 선택 가능) | heat_daily: 고데기·매직기를 자주 쓴다/주 3회 이상 고열 스타일링; heat_noprotect: 열 보호제 없이 스타일링한다/열 기구 사용 전 보호 제품 안 바름; chem_repeat: 염색·새치커버를 자주 한다/2~3개월 주기로 반복; chem_bleach: 탈색(블리치)을 받아본 적 있다/톤업·탈색 시술 경험; perm_repeat: 펌·매직을 자주 한다/디지털펌 포함, 6개월 내 반복; multi_combo: 여러 시술을 한꺼번에 받았다/예: 탈색+펌을 연달아 진행; none: 해당 없음/최근 특별한 시술·스타일링 안 함 |

Q4는 `none` 선택 시 다른 항목 전부 해제, 다른 항목 선택 시 `none` 자동 해제.

### 3. 결과 산출 로직

**"심각도(Level)"와 "원인(Type)"을 완전히 분리한 두 축 점수 합산 + 분기 로직 혼합** (설계 의도가 코드 주석에 명시: "bangRecommend.ts 감사에서 발견된 16개 조합 하드코딩 문제를 반복하지 않기 위해" 축 분리).

- `calcLevel(answers)`: PULL_SCORE(snap=3/stretch=2/elastic=0) + FRICTION_SCORE(tangled=3/loosens=1/smooth=0) + DRY_SEVERITY(fast=1/slow=2/normal=0) 합산 → 구간 분기(severity≤1→Lv1, ≤4→Lv2, ≤6→Lv3, 그외→Lv4)
- `calcAxes(answers)`: Q3의 DRY_HEAT_BONUS(fast=2) + Q4 각 습관의 HABIT_AXIS 가중치(heat/chem/perm) 합산
- `pickType(level, axes, habits)`: 분기 로직. level===1이면 무조건 "HEALTHY"(습관 무관, 도메인 규칙). 축 최댓값 0이면 "ENV". `multi_combo` 선택 + chem·perm 모두 >0이면 "MIXED". 동점 시 우선순위(화학>펌>열, 확정된 도메인 규칙)로 CHEM/PERM/HEAT 결정
- `buildConcernTags(level, type)`: Level/Type을 `#건강모/#경미손상/#손상모/#극손상모` + `#열손상/#화학손상/#펌손상/#복합손상/#환경손상` 태그로 변환
- 메인 엔트리 `diagnoseDamage(answers)`: 위를 조합해 `resultCode`(예: "L3_HEAT"), `level`, `typeInfo`, `headline`, `concernTags` 반환

**결과 종류**: Level 1은 Type이 무조건 HEALTHY로 고정, Level 2~4는 Type 5종(HEAT/CHEM/PERM/MIXED/ENV) 가능 → 총 **`1 + 3×5 = 16`가지** `resultCode` 조합(Level 엔티티 4개 + Type 엔티티 6개).

### 4. 결과지 구성 (위→아래)

| 순서 | 섹션 | 데이터 출처 |
|---|---|---|
| 1 | 헤더(다시 하기/진단 결과지/공유) | 하드코딩 |
| 2 | ResultHeroCard: badge="Level N·라벨", title=headline | `diagnoseDamage()` |
| 3 | 진단 요약 | `level.summary`, `level.careIntensity` |
| 4 | 원인 분석 | `typeInfo.label`, `typeInfo.causeExplain`, `typeInfo.avoid` |
| 5 | 발견템 안내 카드(하드코딩 문구) | `/items` 텍스트 링크 (제품 직접 미노출; `typeInfo.products`는 result 화면엔 안 쓰이고 저장 시에만 `products[0]` 사용) |
| 6 | 저장 CTA | "내 홈에 저장하고 관리 시작하기" |
| 7 | 공유 카드(카카오톡) | — |
| 8 | 하단 고정 CTA | "AI 헤어 분석으로 내 스타일도 찾기"(→`/style`) + "처음부터 다시 하기"(→`/damage-check`) |

### 5. 저장 연동

`handleSaveAndGoHome()`:

```js
appendDiaryEntry({
  id, kind: "damage", savedAt: Date.now(),
  resultCode, levelLabel, typeLabel, headline, concernTags,
  hairTags: result.concernTags,
  diagnosisSummary: result.headline,
  product: result.typeInfo.products[0],
});
refreshBeautyUserProfileFromDiary();
```

- **kind**: `"damage"`
- **hairTags**: `result.concernTags` 그대로(예: `["#손상모","#열손상"]`)
- 우선순위: style > **damage(2순위)** > bangs > hairquiz

### 6. 랜딩 간 연결

- 하단 고정 CTA "AI 헤어 분석으로 내 스타일도 찾기" → **`/style`로 직접 연결**(4개 랜딩 중 유일하게 결과지에서 다른 진단 랜딩으로 바로 가는 링크가 있는 사례)
- 저장 버튼 → `/home`
- `/bangs`, `/hair-quiz`로 가는 링크는 없음

---

## ④ /hair-quiz — 손질 습관/관리법

### 1. 전체 플로우

**단일 파일(`app/hair-quiz/page.tsx`, 513줄) 내 로컬 상태(`phase`) 전환** — 다른 3개 랜딩과 달리 별도 survey/result 라우트가 없음. layout.tsx도 없음.

```
intro → survey → analyzing(연출용 1.8초 대기, 실제 계산 없음) → result
```
(전부 `app/hair-quiz/page.tsx` 한 파일 내부)

- `IntroView`(L233-264) → `handleStart()`로 survey 전환
- `SurveyView`(L268-330) → 답변 즉시 확정형(다음 버튼 없음), 마지막 문항 응답 시 점수 계산 후 analyzing으로
- `AnalyzingView`(L334-355) → `setTimeout(1800ms)`로 result 강제 전환
- `ResultView`(L359-437) → 결과지

**사진 업로드 단계 없음.**

### 2. 설문 문항 전체 (6문항, 코드 선언 순서 고정)

| id | 질문(원문) | 선택지(key: label) |
|---|---|---|
| 1 | 평소 샴푸는 언제 하시나요? | A: 밤에 씻고 잔다 / B: 아침 외출 전에 감는다 |
| 2 | 머리를 감고 난 후,\n말리는 습관은? | A: 시간 없다. 수건으로 털고 자연건조 / B: 두피만 대충 말린다 / C: 롤빗이나 고데기까지 써서 모양을 잡는다 |
| 3 | 평소 낮 시간에 머리를\n어떻게 하고 계시나요? | A: 주로 묶거나 집게핀으로 올린다 / B: 풀고 다닌다 |
| 4 | 내 머리에 대해\n얼마나 알고 계신가요? | A: 가르마 방향, 숱, 곱슬기 등을 잘 안다 / B: 솔직히 잘 모른다. 미용실 갈 때마다 헷갈린다 |
| 5 | 미용실에서 디자이너와\n보통 어떻게 상담하시나요? | A: 인스타 레퍼런스 사진을 보여준다 / B: 대략적인 길이만 말한다 / C: "알아서 예쁘게 해주세요" 맡긴다 |
| 6 | 지금 당장 내 머리의\n가장 큰 불만은? | A: 푹 주저앉은 정수리 볼륨 / B: 붕 뜨고 부스스한 결 / C: 금방 풀리고 밋밋해지는 스타일 |

**주의: 6번 문항은 응답을 받지만 결과 산출 로직(`calcScore`)에서 전혀 사용되지 않는 죽은 입력값이다.**

### 3. 결과 산출 로직

**점수 합산 방식**(1~5번 문항만 사용, 6번 미사용):

- `calcScore(answers)`: Q1 A→+1 / Q2 C→+2·B→+1·A→0 / Q3 B→+1 / Q4 A→+1 / Q5 A→+2·B→+1·C→0. 총점 범위 0~7
- `getResultKey(score)`: 0~1→A, 2~3→B, 4~5→C, 6~7→D (구간 매핑)

**결과 종류**: 정확히 **4가지**(A/B/C/D), `RESULTS` 객체에 완전히 정적으로 하드코딩(개인화 삽입 없음).

- A: "수면 압박·자연건조로 인한 뿌리 구조 붕괴 상태"
- B: "루틴 이행률 50%"
- C: "방향성 미스매치 상태"
- D: "전국 상위 5% 헤어 관리 레벨"

### 4. 결과지 구성 (위→아래, `ResultView`)

| 순서 | 섹션 | 데이터 출처 |
|---|---|---|
| 1 | ResultHeroCard(eyebrow/badge/title/description) | `RESULTS[key].badge/title/summary`(정적) |
| 2 | 원인 분석 — 팩트 폭격 | `result.causes`(문자열 3개, 정적) |
| 3 | 전문가 데일리 처방전 | `result.prescriptions`(각 `{title,detail}` 3개, 정적) |
| 4 | Feat. 미용실 소통 팁 | `result.salonScript`(정적) |
| 5 | "다시 진단받기" 버튼 | 액션(intro로 복귀) |
| 6 | 하단 고정 CTA | "AI 헤어 분석으로 내 스타일 찾기!" → `/style` |

### 5. 저장 연동 — **미연동**

`app/hair-quiz/page.tsx` 전체에 `localStorage` 호출, `appendDiaryEntry`/`refreshBeautyUserProfileFromDiary` import가 **전혀 없음**. 결과가 어디에도 저장되지 않는다.

단, `lib/beautyProfile.ts`는 `"hairquiz"` kind를 이미 1급 시민으로 준비해둔 상태(타입 정의, `PRIORITY_ORDER` 4순위, `KIND_LABEL.hairquiz="헤어 성향 진단"`, `classifyKind()` 분기까지 전부 존재) — **"구조 없음"이 아니라 "연결만 안 함"**. PROJECT_STATE.md 백로그 메모("/hair-quiz 저장 미연결, kind는 준비됨")는 코드로 정확히 확인됨.

### 6. 랜딩 간 연결

- 결과지 CTA 하나뿐: "AI 헤어 분석으로 내 스타일 찾기!" → `/style`
- `/bangs`, `/damage-check`, `/home`으로 가는 링크 없음. "다시 진단받기"는 자기 자신(intro) 순환.

---

## 요약 표

| 랜딩 | 문항 수 | 사진 업로드 | 결과 종류 수 | 산출 방식 | 프로필 저장(kind) | 타 랜딩 직접 CTA |
|---|---|---|---|---|---|---|
| **/style** | 8 (STEP1 4 + STEP2 4) | ✅ (AI 합성) | 27종 핵심문구(저장데이터 108종) + 스타일명 최대144조합 — **이중 산출** | (A) 런타임 조립(테이블 곱) + (B) 108행 룩업 테이블 | ✅ kind 없음(암묵적 style) | ❌ 없음(→/home만) |
| **/bangs** | 6 | ❌ | 앞머리 후보 10종 (얼굴형은 6~7종) | 점수 합산(가중치) + 임계값 분기(승격) | ✅ kind:"bangs" | ❌ 없음(→/home만) |
| **/damage-check** | 4 (Q4 다중선택) | ❌ | 16종 (Level4×Type6, Lv1은 Type고정) | 점수 합산(Level) + 분기 로직(Type) | ✅ kind:"damage" | ✅ →`/style` |
| **/hair-quiz** | 6 (1문항 미사용) | ❌ | 4종 (A/B/C/D, 완전 정적) | 점수 합산 + 구간 매핑 | ❌ **미연동** (kind만 준비됨) | ✅ →`/style` |

---

## 관찰 노트 (2층 구조 확장 시 걸림돌)

### 랜딩 간 공통 구조 이슈

1. **4개 랜딩이 서로 다른 산출 패러다임을 쓴다.** style은 "조립식+룩업 테이블 이중화", bangs는 "이중 축 점수 합산+승격 임계값", damage-check는 "레벨/타입 분리 축", hair-quiz는 "단순 가산+구간 매핑". 전문가 규칙 기반 2층 구조를 공통으로 얹으려면 이 4개의 서로 다른 1층 로직 위에 어떻게 균일하게 규칙 레이어를 씌울지부터 설계가 필요하다. 현재는 재사용 가능한 공통 인터페이스(예: "답변→축 점수→결과키" 표준 파이프라인)가 없다.

2. **하드코딩 텍스트 총량이 매우 크고 조합 폭발 구조.** `hairTypeMatrix.ts`(3500줄, 108행 자연어 콘텐츠)가 대표적 — 축을 하나만 추가해도 조합이 배수로 늘어나는 구조라, 규칙 기반으로 전환하지 않으면 확장이 사실상 불가능하다. `bangRecommend.ts`도 과거 "16개 조합 하드코딩 테이블"을 축 분리로 리팩터한 이력이 있고(damage-check 설계 주석에서 확인), damage-check는 그 교훈으로 축 분리를 선반영했다 — 즉 **damage-check의 Level/Type 분리 설계가 4개 중 가장 확장 친화적**이라 2층 구조의 참고 모델로 적합해 보인다.

3. **매직넘버 임계값이 여러 곳에 흩어져 있다.** damage-check의 severity 구간(`≤1/≤4/≤6`), bangs의 `SIGNAL_PROMOTE_THRESHOLD=4`, hair-quiz의 점수 구간(`0-1/2-3/4-5/6-7`) 모두 파일 내 상수로 추출되지 않은 채 함수 본문에 하드코딩되어 있다. 전문가 규칙 도입 시 이 임계값들을 어떤 근거로 재조정할지, 재조정 후 결과 분포가 어떻게 바뀌는지 검증할 장치(테스트/시뮬레이션)가 현재 없다.

4. **결과 콘텐츠가 전부 정적 텍스트(개인화 없음).** 4개 랜딩 모두 최종 결과 카피는 결과 키에 따라 미리 써놓은 문장을 그대로 노출하는 방식이다(사용자 답변 원문을 그대로 인용하거나 동적으로 조합하는 부분은 style의 스타일명 조립 정도). 전문가 규칙 기반 2층 구조에서 "왜 이 결과가 나왔는지"를 답변 근거와 함께 설명하려면 이 정적 텍스트 구조를 규칙엔진 출력 방식으로 재설계해야 한다.

5. **죽은 코드/미사용 필드가 다수 존재.** style의 `getStyleProduct` 등 5개 함수(쿠팡 링크 포함, result 페이지 미사용 추정), bangs의 `hexagon`/`inner`/`hippy`/`block` 타입(정의만 있고 미사용 또는 배제), hair-quiz의 6번 문항(응답은 받지만 채점 미반영). 재설계 착수 전 이런 "이미 있는데 안 쓰는" 조각들을 활용할지 폐기할지 결정이 필요하다.

6. **디버그 정보의 프로덕션 노출.** style의 `DiagnosisDebugPanel`은 조건 없이 항상 렌더링, bangs는 `?debug=1` 쿼리로 접근 가능 — 둘 다 내부 점수/로직 키가 사용자 화면에서 열람 가능하다. 로직 재설계 검증에는 유용하지만, 알고리즘이 고도화될수록(전문가 규칙 자체가 자산) 외부 노출 위험이 커진다.

7. **프로필 저장 일관성 부족.** style은 `kind` 필드를 아예 저장하지 않고 "없으면 style"이라는 암묵적 규칙으로 구분되며, hair-quiz는 저장 자체가 안 된다. bangs/damage-check만 명시적 `kind`를 저장한다. 4개 랜딩이 공유하는 `abeauty_user_profile`/`diaryEntries` 스키마가 있음에도 저장 규약이 랜딩마다 다르다 — 2층 구조에서 결과를 프로필에 통합 반영하려면 이 저장 규약부터 표준화가 선행되어야 한다.

8. **랜딩 간 교차 유도가 사실상 없다.** 4개 랜딩 중 결과지에서 다른 진단 랜딩으로 직접 연결되는 경우는 damage-check→style, hair-quiz→style 단 2건뿐이며, 전부 `/style`로만 향한다(`/style`→다른 랜딩, `/bangs`→다른 랜딩 연결은 전무). 진단 결과가 서로 다른 랜딩의 통찰(예: style에서 곱슬모로 진단된 사용자에게 damage-check를 유도)을 연계하는 구조가 전혀 없어, "발견→교차진단→통합프로필"이라는 흐름을 만들려면 이 부분을 신규 설계해야 한다.

9. **화면 표시 순서와 내부 데이터 키의 불일치.** bangs는 화면 Q1~Q6과 내부 answers 키(qFaceShape, q1~q5)가 어긋난다(화면 Q3=내부 q2). 코드를 유지보수하거나 규칙 엔진에서 답변을 참조할 때 이 오프셋을 놓치기 쉽다.

10. **/hair-quiz의 구조적 위상이 불명확.** 유일하게 단일 파일 구조(survey/result 라우트 분리 없음)이고, 저장 미연동이며, 사진 업로드도 없고, 결과가 4종으로 가장 단순하다. 이는 우연이 아니라 애초에 다른 3개 랜딩이 따르는 "survey/+result/ 라우트 분리 → result에서 appendDiaryEntry 호출" 패턴 자체를 따르지 않고 만들어졌기 때문으로 보인다. 2층 구조 설계 시 이 랜딩을 "본진단과 동급"으로 승격시킬지(라우트 분리+저장 연동 리팩터 필요), "가벼운 리텐션용 사이드 콘텐츠"로 유지할지 먼저 정책 결정이 필요하다.

### 랜딩별 개별 걸림돌 (요약)

- **style**: 스타일명(조립식)과 모발타입(룩업식) 두 산출 로직이 서로 다른 답변 변수를 쓰며 완전히 격리되어 있어, "희망 스타일"과 "실제 모질"을 교차 반영하는 규칙(예: 곱슬모+원하는 직모 조합 시 시술 난이도 경고)을 넣으려면 두 파이프라인을 새로 연결해야 함. 카피 번역층의 정규식 치환도 원본 문구가 조금만 바뀌어도 조용히 실패할 수 있는 취약 결합.
- **bangs**: 감점/가점 누적 방식이라 "이 조건이면 반드시 배제"류의 전문가 하드 규칙을 넣으려면 점수 감산이 아닌 별도 하드 필터 단계 분리가 필요. 100% 클라이언트 로직이라 규칙이 복잡해지면 서버 이전도 고려 대상.
- **damage-check**: 축 분리 설계는 좋으나 동점 우선순위(화학>펌>열)가 고정 규칙으로 박혀 있어, 전문가 규칙이 다른 우선순위를 요구하면 `pickType()` 자체를 재작성해야 함. 제품 추천이 결과지에서 실제 노출되지 않아(커머스 연결 약함) 확장 시 이 부분이 실질적 개선 지점.
- **hair-quiz**: 결과 4종이 답변과 무관하게 완전 고정 텍스트라, 규칙 기반으로 전환하려면 이 정적 콘텐츠 자체를 규칙엔진 출력으로 전면 교체해야 함. 다만 저장 연동 자체는 `lib/beautyProfile.ts`가 이미 준비돼 있어 작업량은 작음(`appendDiaryEntry` 호출 추가 수준).
