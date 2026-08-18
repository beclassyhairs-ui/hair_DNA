# V2_PRECHECK.md — 결과지 V2 리팩터링 착수 전 실물 확인

> 작성: 2026-08-18 · 작업방(Claude Code) · **본 작업의 첫 산출물(산출물 A)**
> 방법: 지시문 §1의 12개 항목을 코드에서 직접 대조(에이전트 요약 아님, 실파일 인용).
> 원칙: **코드=진실.** 지시문 수치(747021e 추정)와 코드가 다르면 코드 기준으로 보고.
> 결론 한 줄: **지시문의 핵심 가정은 코드와 거의 일치.** 정정 필요 1건(스탬프 개념), 주의 3건(레거시 잔재·폴백·styleGate 동결)만 아래에 표시.

---

## 0. 워크스페이스 상태(착수 전)

- 현재 HEAD: `decff2b` (2026-08-16 어드민 3건). 지시문이 기준 삼은 `747021e`(2026-08-14)는 그 이후 커밋들에 포함돼 **확정124가 이미 라이브**다.
- 미커밋 삭제 88건(`public/references/**/.gitkeep` + mature PNG 4장)은 **커밋 금지 항목**(PROJECT_STATE 반복 경고). 이번 작업과 무관 — 건드리지 않는다.
- ⚠️ **PROJECT_STATE 불일치 1건**: 문서 "확정124 — …커밋/배포 승인 대기"(라인 92~101)는 낡음. 실제 코드(`damageRecommend.ts:68,265`, `surveyData.ts:11,82`)에 firm·매직 코팅이 **이미 존재**. → 세션 종료 시 PROJECT_STATE 정정 대상.

---

## 1. Q1 당김 값 목록과 보정치 (확정124 검증)

`app/damage-check/surveyData.ts:11` · `damageRecommend.ts:68`

| id | 라벨(설문) | 보정치 |
|---|---|---|
| `snap` | 살짝만 당겨도 톡 끊어져요 | **+1.0** |
| `stretch` | 고무줄처럼 쭉 늘어나다 끊어져요 | **+0.7** |
| `elastic` | 늘어났다가 다시 돌아와요 | **+0.3** |
| `firm` | 단단해서 잘 안 늘어나요 | **−0.3** (건강 신호, 유일 음수) |
| `unsure` | 잘 모르겠어요 | 0 |
| `""` | (미응답) | 0 |

물리 상한 합 = snap 1.0 + tangled 1 + slow 1 = **3.0** → 물리 단독 Lv3(4.5)·Lv4 도달 불가(확정80·85 유지). **지시문 §5-2의 5값과 정확히 일치.**

---

## 2. 매직 코팅 규칙 (확정124)

`damageRecommend.ts:264-265`
```ts
let pullAdj = PULL_ADJ[a.q1_pull];
if (a.q1_pull === "firm" && a.h_recent === "straight_perm") pullAdj = 0;
```
- 조건: **`q1_pull==="firm"` AND `h_recent(마지막)==="straight_perm"(매직)`** → firm의 −0.3을 0으로 무효화.
- **매직에만·마지막 슬롯(h_recent)에만.** h_prev가 매직이어도 적용 안 됨. +보정·시술 점수는 그대로.
- **지시문 §1-2·§5-2(#5)·§8(invariant 4)와 정확히 일치.**

---

## 3. 레벨 컷 상수 실제값 (문서 엇갈림 해소)

`damageRecommend.ts:71-74`
```
LV2_MIN = 1.6   LV3_MIN = 4.5   LV4_MIN = 8.0
NO_BLEACH_CAP = 7.9   (무탈색이면 총점 clamp → Lv4 구조적 불가)
```
- 구간: Lv1 `0~1.5` / Lv2 `1.6~4.4` / Lv3 `4.5~7.9` / Lv4 `8.0+`.
- **지시문이 "1.6/2 엇갈림"이라 한 LV2_MIN = 실제 `1.6`.** (코드가 진실)
- 점수 상수(참고): 탈색 `[0,4.5,8.0]` / 펌(열펌·매직) `[0,1.5,2.25]` / 염색·일반펌 `[0,1.0,1.5]` / MORE `none0 few0.5 many1.2` / 뿌리염색 주기 `over_3m0.2 m1 0.5 w2_3 0.8`, 6개월+ `+0.5`, 최대 `1.3`.
- 탈색 2회+(`h_bleach_2plus`)는 bleachN=2 고정 → 8.0 자연 도달(별도 강제문 없이 Lv4).

---

## 4. `h_root_gray`가 뿌리염색 선택 시에만 뜨는 하위 체크인지 (확정95)

`app/damage-check/survey/page.tsx:55,118`
```ts
const hasRootDye = !recentIsNone && (recent === "root_dye" || prev === "root_dye");
...
{hasRootDye && <Chk ... label="뿌리염색은 새치 염색이에요" />}
```
- **맞음.** 독립 질문이 아니라 **최근/그전 슬롯 중 하나가 `root_dye`일 때만** 뜨는 하위 체크박스.
- 저장(`page.tsx:72`): `h_root_gray: hasRootDye && rootGray` — 뿌리염색 아니면 항상 false.
- → **지시문 §5-5의 "새치 있음 + 염색 안 함 = 존재 불가"가 코드로 보장됨.** Gray 상태는 항상 뿌리염색 위에서만 additive.
- 같은 블록의 형제 하위체크: `h_bleach_2plus`(탈색 슬롯 시), `h_self_dye`(dye/root_dye 시), 뿌리염색이면 `h_root_interval`(3옵션, 필수) + `h_root_over6m`.

---

## 5. 예언 14종 match 조건 + 첫 매칭 로직

`damageRecommend.ts:114-228`

- ctx 파생(`prophecyCtx`): 슬롯 = `[h_recent, h_prev]` 중 none 제외. `perm=열펌|일반펌`, `heat=열펌`, `magic=매직`, `rootDye/fullDye/anyDye`, `bleach=탈색|h_bleach_2plus`, `selfDye=h_self_dye`.
- match 조건: 1 `perm&&rootDye` · 2 `magic&&rootDye` · 3 `rootDye&&fullDye` · 4 `fullDye&&heat` · 5 `fullDye&&magic` · 6 `selfDye&&anyDye` · 7 `heat&&magic` · **8 `()=>false`(길이문항 부재로 구조상 미노출)** · 9 `bleach&&magic` · 10 `bleach&&heat` · 11 `perm` · 12 `magic` · 13 `anyDye` · 14 `bleach`.
- 선택 로직(`selectProphecy`): **① id≤10 위에서부터 첫 매칭.** ② 없으면 마지막 시술(h_recent, none이면 h_prev) 기준 폴백 11~14 중 1개. ③ 시술 전무 → `null`.
- 화면(`result/page.tsx:262-268`): 예언 있을 때만 섹션. door/aha/tip 3덩어리. **첫 매칭 1개만(Phase 1.0 현행 유지 = 지시문 §5-6).**
- ⚠️ **주의(폴백 겸용)**: 11~14는 "다른 시술 없음" 조건이 제거돼 순수 `perm/magic/anyDye/bleach`다. §5-6 secondary(riskFamily dedupe) 도입 시 이 폴백 항목이 primary와 중복될 수 있어 family 태깅 설계에 반영 필요.

---

## 6. Style `resolveCrossBranch()` b1~b10 우선순위 + absorbed

`app/style/crossBranch.ts:41,67-107`

- 우선순위 배열: `PRIORITY = ["b1","b2","b3","b4","b5","b6","b7","b10"]`. (b9=게이트 최우선 별도, b8=폴백이라 목록 제외)
- 발동 조건(`fired`):
  - b1 `isCurlStrong && wantsStraight` (곱슬·악성 × 펴기)
  - b2 `isWavyPlus && wantsCurl` (반곱슬↑ × 컬)
  - b3 `isThick && isFine && hasCurl && wantsStraight`
  - b4 `isFine && isThin && (collarbone|chest)`
  - b5 `isFine && isThin && (short|short_bob|bob)`
  - b6 `isThick && isCoarse`
  - b7 `isFine && isStraightHair && wantsCurl`
  - b10 `isThick && isFine && isStraightHair`
- 결과: `gateBlocked` → primary=`b9`, absorbed=`[]`. / 아무것도 안 걸림 → primary=`b8`. / 그 외 → **primary=첫 발동, absorbed=나머지 발동(`firedList.slice(1)`).**
- 부가카드 `scalpRoutineCard`(갈래 독립): `q8_root_gray==="1"` OR (뿌염+열펌·일반펌) OR (fine&thin) OR (age_50 & fine).
- **지시문 §6-5(b분해·absorbed)·§6-3(볼륨 갈래 우선규칙 넣지 말 것)와 정합.** 현재 b9(차단)가 전체를 덮는 구조가 §6-6에서 해체 대상.

---

## 7. `styleGate.ts` pass/caution/block 판정 입력·출력 (⚠️ 수정 금지 대상)

`app/style/styleGate.ts` · `styleGate.constants.ts`

- **입력**: `q8a_recent`, `q8b_prev`(TreatmentId), `q8c_more`(MoreLevel), `q8_bleach_2plus`("1"), `q8_root_gray`(게이트 점수엔 미반영).
- **점수**: `TREATMENT_SCORE[a]+[b]+MORE_BONUS[more]`, root_dye면 슬롯당 `+0.5`. (탈색4.5/매직·열펌1.5/일반펌1/염색1/뿌리1)
- **출력**: `{ score, level, historyKey, bleachTwicePlus }`.
  - level: `bleachTwicePlus || score>=7.0 → block` / `>=4.5 → caution` / else `pass`.
  - historyKey(4단): `≤1.4 count_1_2 / ≤4.4 count_3_4 / ≤6.9 count_5_6 / else count_7plus`.
- ⚠️ **§8-6·§10-10: 이 파일은 Phase 1.0에서 수정 금지.** 결과지 렌더·resolver만 건드리므로 손댈 필요 없음. 구조 변경 필요하면 **작업 중단 후 보고.**

---

## 8. 카카오 공유 템플릿의 stampTitle 사용처 → **정정 1건**

**Damage** (`app/damage-check/result/page.tsx:143`)
```ts
const stampTitle = isHealthy ? result.level.label : `${result.level.label} · ${result.typeInfo.label}`;
```
- 저장 필드가 아니라 **`level.label + typeInfo.label`에서 런타임 파생.** 사용처 4곳: HairTypeHero title(248) · 다이어리 headline(173) · **카카오 공유 description(199) `나는 [${stampTitle}]입니다`** · navigator.share text(212).
- → §5-1 "stampTitle 호환 위해 화면 유지" = **정확히 이 파생 문자열(예 "손상모 · 건조형")을 유지**해야 한다는 뜻. §5-7 internalType(DRY/RIGID/HEALTHY) 분리는 이 파생식의 `typeInfo.label` 소스만 내부 스키마로 옮기고 **표시 문자열은 동일 유지**하면 됨.

**Style** (`app/style/result/page.tsx:675`) — ⚠️ **정정**
```ts
const text = `AI가 처방한 나의 스타일은 [${entry.name}] 입니다.`;
```
- **Style에는 "stampTitle" 개념이 없다.** 공유는 `entry.name`(간판명)을 쓰고, 화면 스탬프(`VerdictStamp`, line 558)는 **갈래 카피 `bcopy.stamp`**(예 "할 수 있습니다 — 주기가 관건이에요")를 쓴다. 게이트 레벨은 색(amber/green)만 결정.
- → **지시문이 "스탬프"를 Damage/Style 공통으로 가정하면 안 됨.** Style 스탬프 = 갈래 문장, Damage 스탬프 = Lv·유형 파생. §6 작업 시 Style stamp는 §6-3 Primary Insight로 흡수되므로 공유 문자열(entry.name)은 영향 없음.

---

## 9. Q2/Q3 실제 enum·라벨·보정치

`surveyData.ts:12-13,86-108` · `damageRecommend.ts:69-70`

- **Q2 마찰**(`FrictionTest`): `tangled`(엉켜서 빗질 전혀 안 됨) **+1** / `loosens`(몇 번 빗으면 풀림) **+0.5** / `smooth`(뽀득) **0** / `unsure` 0 / `""` 0.
- **Q3 건조**(`DryTest`): `slow`(한참 걸림) **+1**(손상) / `normal`(보통) **0** / `fast`(금방) **0**(중립·손상 단정 금지) / `""` 0.
- → §5-3과 정합. fast=중립(확정117), slow=오래=손상(확정115) 코드 확인.

---

## 10. h_recent 실제 enum + none 처리

`surveyData.ts:17` — `DamageTreatment = "bleach"|"straight_perm"(매직)|"heat_perm"(열펌)|"normal_perm"(일반펌)|"dye"|"root_dye"|"none"`
- none 처리: 슬롯 필터에서 제외(`prophecyCtx:120`), 점수 슬롯엔 포함되나 어느 카테고리도 아님(0점), 유형은 `pickType:283` — none & Lv1 → HEALTHY / none & Lv2↑ → DRY 흡수.
- → §5-4의 h_recent 6종(전체염색=dye/뿌리염색=root_dye/탈색/매직/열펌/일반펌) 원인 블록 키로 그대로 사용 가능. **탈색은 dye와 별도 고위험 분기 필요**(현재 유형은 둘 다 DRY로 뭉침 = §5-4 세분화 대상).

---

## 11. h_self_dye · h_root_interval · h_root_over6m 실제 존재·배선

`surveyData.ts:32-34` (타입) · `survey/page.tsx:49-51,73-75,118-134` (기록) · `damageRecommend.ts:63,131,257-258` (소비)
- **셋 다 실존·완전 배선.** self_dye→예언6(점수 무영향), root_interval/over6m→뿌리염색 점수(주기 가중, 최대 1.3).
- 노출 조건: self_dye = dye|root_dye 슬롯 시 / interval·over6m = root_dye 슬롯 시(interval은 필수 진행 조건).
- ⚠️ `h_self_dye`만 옵셔널(`?:`, 옛 세션 호환) — resolver는 `=== true`로 방어.

---

## 12. Style Volume 판정용 enum (thickness/density/curl/length) — §6-4

`app/style/surveyData.ts:47-131`

| 축 | 키 | 값 |
|---|---|---|
| 굵기 | `q7_thickness` | `coarse`(두꺼움) / `medium_thickness`(보통) / `fine`(얇음) |
| 숱 | `q8_density` | `thick_density`(많음) / `medium_density`(보통) / `thin_density`(적음) |
| 곱슬 | `q3_curl` | `straight_hair` / `wavy_hair`(반곱슬) / `curly_hair_mid`(곱슬) / `curly_hair`(악성곱슬) |
| 기장 | `q11_length` | `short` / `short_bob` / `bob`(단발) / `collarbone`(쇄골) / `chest`(롱) |
| (참고) 나이 | `q1_age` | `age_20/30/40/50/60plus` |
| (참고) 레이어 | `q14_layer` | `heavy/medium/light` |
| (참고) 디자인 | `q13_design` | `straight/c_curl/s_curl/wave` |

- → §6-4 "thickness×density×curl×length + b3/b4/b5/b6/b10 판단" 조합에 필요한 축 전부 존재. `curly_hair_mid`는 신설 곱슬 중간값(Phase 2 12종 전개 대상).

---

## 부록. 지시문 문제 진술(§2) 코드 검증 — 전부 사실 확인

- **Damage Q1~Q3 화면 미출력**: 맞음. 물리 답변은 `calcScore` ±보정에만 쓰이고 결과지(`result/page.tsx`)에 문장 렌더 0. → §5-2·5-3이 이걸 살림.
- **관리 꿀팁 전원 동일 고정문구**: 맞음. `MANAGEMENT_TIP` 단일 상수(`result/page.tsx:81`)를 모두에게 노출. → §5-3에서 Q2 신호 있는 사람으로 이동.
- **유형 설명 레벨 무관 동일**: 맞음. `TYPE_INFO[type].causeExplain`이 level 파라미터를 안 받음(`damageRecommend.ts:89-102`). 실질 2종(DRY/RIGID)+HEALTHY. → §5-4 h_recent 6종 세분화.
- **예언 첫 매칭 1개**: 맞음(§5-6 Phase1.0 유지).
- **Style b1~b10 하나가 본문 대부분 결정 / b2 door 치환 / block이 b9로 전체 덮음**: 맞음. `result/page.tsx:522,558,590,634` + `crossBranch.ts:94`. → §6-3~6-6이 해체.

---

## 착수 판단 (요약)

| 항목 | 상태 |
|---|---|
| §1 12항목 코드 확인 | ✅ 완료(위 전량) |
| 지시문 가정 vs 코드 | 거의 일치. **정정 1(Style엔 stampTitle 없음, §8)** |
| 주의(구현 시 반영) | ① 예언 11~14 폴백 겸용(§5-6 secondary family 설계) ② 레거시 `q10_history_count`가 `isDamageBlock`에 아직 참조됨(`style/result:29-31`) — coverage 표에 포함 ③ `styleGate.ts` 동결 준수(§8-6) |
| DB/API/Auth 변경 필요 | **없음**(설문 스키마·DB 불변, 결과지 렌더+resolver+copy registry만) |
| styleGate 수정 필요 | 없음(§8-6 준수) |

**다음 단계(승인 후)**: §8 behavior invariant 테스트를 **착수 전 먼저 작성**(전 과정 green 유지) → §7 copy registry(`/copy-drafts`) 구조 수립 → Damage(§5)·Style(§6) 결과 객체 스키마(§5-7·§6-6) → 블록 resolver → 결과지 렌더 → §9 품질테스트 4종 + 덤프 2종(M·N) + §11 산출물.

> 지시문 §11-2에 따라 **이 파일이 1차 검수 첫 제출물**입니다. PM방 확인 후 구현 착수하겠습니다.
