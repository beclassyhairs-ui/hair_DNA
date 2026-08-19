# PROJECT_STATE.md — A-Beauty 현재 상태

> 이 파일이 프로젝트 상태의 단일 출처다. Claude Code는 매 세션 시작 시 이 파일을 읽고, 종료 시 갱신한다.
> 최종 갱신: 2026-08-19

## 🟦 결과지 V2 블록 조립 리팩터링 — Phase 1.0 착수 (2026-08-18, **진행 중 · 미배포**)

지시서 「결과지 V2 블록 조립 리팩터링」(PM방 3라운드 교차검증본) Phase 1.0. `/style/result`·`/damage-check/result` 진단 엔진·결과지 렌더를 "답 하나하나가 결과지 곳곳에 살아있는 블록 조립 구조"로 전환. **설문 스키마·DB 불변, styleGate.ts 동결(§8-6), Production 배포 금지.**

- **산출물 A `V2_PRECHECK.md`(커밋됨)**: §1 실물확인 12항목 코드 직접 대조 완료. 결론: 지시문 가정 코드와 거의 일치. 정정 1건(**Style엔 stampTitle 개념 없음** — 공유=간판명 entry.name, 화면 스탬프=갈래 카피 bcopy.stamp / Damage만 `level.label · typeInfo.label` 파생). 주의 3건(예언 11~14 폴백 겸용·레거시 q10_history_count 존치·styleGate 동결).
- **PM 승인 확정(2026-08-18)**: ① Style stampTitle 정정 수용(스탬프 유지 규정은 Damage만) ② Gray 블록 = 예언 뒤(현행)로 Phase 1.0 확정, **순서배열 기반 렌더 필수**(추후 한 줄 교체), §12 안건 유지 ③ secondary 예언 = Phase1.0 첫 매칭 1개 유지 + riskFamily 태깅은 스키마만, 실노출 1.5 flag ④ **레거시 q10_history_count는 Coverage 기록만·이번 Phase 제거/수정 금지(게이트 영향, invariant 위반 우려) → Phase 2 이관**.
- **§8 invariant 하네스 작성(커밋됨)**: `tests/invariant/engine-invariants.ts`(INV1~6 + 자가생성 스냅샷 damage 13·style 10) + `tests/tsconfig.invariant.json`(TS→CJS, 프레임워크 무설치) + `package.json` `test:invariant` + `.gitignore` `tests/.build/`. INV1 탈색2회+→Lv4 / INV2 무탈색 Lv4불가+CAP7.9 / INV3 물리단독 Lv3불가 / INV4 확정124 매직코팅(score 기반) / INV5 숏·숏보브+s_curl→wave / INV6 styleGate pass/caution/block 불변.
- ✅ **baseline 스냅샷 기록·커밋 완료 (2026-08-18, `bd0e509`)**: 무변경 main에서 `npm run test:invariant` 실행 → **8/8 PASS**(1회차=최초기록, 2회차=실비교 green). `tests/invariant/engine.snapshot.json`(damage 13·style 10, 206줄) 커밋 — **그 1파일만**(스테이지 전후로 `public/references` 0건 검증, 삭제 88건 미포함). → **447dfd3의 "다음 세션 첫 행동(하네스 green + baseline)" 항목은 이번 세션에서 완료 — 체크 해제.**
- ✅ **INV1 해결 완료 (2026-08-19, `da79bae`) — 방향 ⓐ 확정·엔진 수정됨**: (아래는 발견 당시 기록) §8 "탈색2회+ → **무조건** Lv4"가 엔진에 **강제되지 않았음.** `calcLevel`은 강제문 없이 점수 8.0 자연 도달에만 의존하는데(`damageRecommend.ts:273` 주석이 그 가정을 명시), `PULL_ADJ.firm = -0.3`(`:68`)이 유일한 음수이고 탈색 경로엔 이를 막는 장치가 없다. **반례(실제 설문 도달 가능)**: `h_recent="bleach"` + `h_bleach_2plus=true` + `Q1="firm"` → `8.0 − 0.3 = 7.7` → **Lv3 / L3_DRY**(코팅 무효화는 `h_recent==="straight_perm"`일 때만이라 bleach엔 미적용 `:265`; `NO_BLEACH_CAP`도 bleachN≠0이라 미적용). 실제 2회(`h_prev="bleach"`)도 동일. **INV1이 못 잡는 이유** = 테스트 입력이 `q1_pull` 미지정(`""`→보정 0)이라 반례를 비켜감(`engine-invariants.ts:57`) — 통과하지만 "무조건"을 증명하지 않는다. 후보 **ⓐ 강제문 추가**(`h_bleach_2plus → Lv4`) / ⓑ §8 문구를 "무조건"에서 완화 / ⓒ 탈색 경로에서 firm 배제. **→ ⓐ 채택 확정·구현 완료(`da79bae`)**(확정124 매직 코팅 논리와 동형 — "특정 시술에서는 firm의 건강 신호를 신뢰하지 않는다"). **구현**: `bleachCount()` 헬퍼 신설로 탈색 회수 정의를 `calcScore`/`calcLevel` 단일화 + `calcLevel` 진입부에서 `bleachCount(a) >= 2 → return 4`(점수 감점이 아니라 **레벨 강제**라 어떤 감점 조합도 뚫지 못함). **테스트**: INV1에 firm 반례 직접 검증 추가 + 스냅샷 페르소나 `d_bleach2_firm`(score 7.7인데 level 4 = 강제 발동을 박제) 추가. **회귀 0 확인**: 스냅샷 diff가 **신규 1건 추가뿐, 기존 23행 변경 0건** → 무탈색·탈색1회 등 다른 경로 판정 완전 불변. `npm run test:invariant` **8/8 PASS**.
- ℹ️ **전수 대조 결과(2026-08-18)**: 스냅샷 23행(damage 13 + style 10)을 엔진 소스와 수동 대조 — **값 오류 0건**. §8 6규칙 중 INV3·4·5·6 정확, INV1 위 불일치, **INV2는 값은 맞으나 검증력 없음**(무탈색 최대 도달 점수 7.0 < CAP 7.9라 CAP은 구조상 미발동 = 설계된 안전망. 다만 INV2가 검사하는 worst 조합 실제 점수 6.45라 `NO_BLEACH_CAP` 상수를 지워도 통과 → "CAP 보호"는 사실상 미검증).
- ℹ️ **부수발견 2건**: ① **예언6(셀프염색) 커버리지 누락** — 페르소나 `d_self_dye`(`:133`) 주석은 "예언6"이나 실제 산출은 **예언3**(`rootDye && fullDye`가 우선순위 상위에서 먼저 걸려 id6까지 안 내려감). 스냅샷 값 자체는 엔진과 일치(오류 아님), 예언6이 하네스에서 빠져 있다는 뜻. ② **레거시 `q10_history_count` 잔존** — `style/result:29-31` `isDamageBlock`이 아직 참조. **PM 승인 ④에 따라 Phase 2 이관**(이번 Phase 제거/수정 금지).
- ✅ **§7 copy registry 구조 수립 완료 (2026-08-19, `5c84696`)**: PM방 §7 원문 규약 그대로 `/copy-drafts` 신설. **블록 11개(style `volume·hair-structure·curl-fit·cut·safety` 5 + damage `elasticity·friction·drying·cause·gray·risk` 6), entry 0건(구조만 — 카피 채우기는 다음 단계).**
  - **`types.ts`**: copy entry 필수 메타데이터(`id·status·sourceGrade·sourceRef·evidenceKeys`) 타입 고정. status 3종(`draft`/`owner_reviewed`/`approved`), sourceGrade 3종(`재배치`/`파생`/`신규`). **evidenceKeys 실존 보증** — damage는 `DamageSurveyAnswers`와 `Record<K,true>`로 컴파일타임 결속(인터페이스 변경 시 tsc 에러), style은 `StyleAnswers = Record<string,string>`이라 타입 결속 불가 → `STYLE_SURVEY` 질문 id + 시술이력 하위키 5개(`q8a_recent·q8b_prev·q8c_more·q8_bleach_2plus·q8_root_gray`) + 레거시 `q10_history_count`와 런타임 대조.
  - **`env.ts` 환경 게이트(§7-1)**: dev/preview = `draft`·`owner_reviewed` 렌더 허용, production = `approved`만. 판정 순서 `NEXT_PUBLIC_VERCEL_ENV → VERCEL_ENV → NODE_ENV`(결과지가 클라 컴포넌트라 서버 전용 `VERCEL_ENV`만으로는 부족), 판정 불가 시 **production으로 fail-closed**.
  - **`guard.ts` production 빌드 FAIL 게이트**: `assertProductionCopyReady(reachableIds)` 구현·자체검증 완료. 🔴 **아직 빌드 미연결** — `reachable`은 resolver가 정하는데 미배선이라 도달 집합 계산 불가. 빈 집합으로 통과시키면 거짓 신호라 `check`가 **미검증으로 표기하고 통과로 세지 않는다**(§7-3 미커버 명시 원칙). **활성화 2줄**: `check.ts`의 `RESOLVER_WIRED=true` + `package.json` `prebuild`에 `npm run copy:check` 체인 → 위치는 `copy-drafts/README.md` §5에 기재.
  - **`npm run copy:check` 신설**: 구조(블록 11개 존재·id 중복) + evidenceKeys 실존 + 환경 게이트 3status×3환경 자체검증. tsc CJS→node, 프레임워크 무설치(invariant 하네스와 동일 방식). ⚠️ `@/` 별칭 금지 — tsc가 emit된 require를 재작성 안 해 node가 못 찾는다(실제로 1차 실행에서 터짐). **`copy-drafts` 내부는 상대경로만.**
  - **§7 미규정 2건(추측 대신 명시)**: ① `id` 문자열 형식 — `<domain>.<block>.<slug>`를 저장소 규약으로 고정 ② `text` 필드 — §7-1 목록은 "필수 **메타데이터**"라 본문이 없어 payload로 추가. 둘 다 README에 §7 미규정임을 적어둠.
  - **경계 준수**: 엔진 파일 무변경(`damageRecommend.ts`·`crossBranch.ts`·`branchCopy.ts`·`styleGate.ts`), resolver·렌더 배선 없음, 설문 스키마·DB 불변. 검증 = `copy:check` 구조 OK + **`test:invariant` 8/8 PASS**(구조 추가가 엔진 안 건드렸음 증명).
- ✅ **§7 카피 채우기 완료 (2026-08-19, `9997344`·`08f383b`·`4a9df26`·`cb260d8`) — 139 entry, 미배치 0**: damage 6블록 64 + style 6블록 75. **재배치 121 · 파생 4 · 신규 14 · 전건 `status:"draft"`**(승인 전 production 렌더 차단). 검증 = `copy:check` OK(**원문 대조 115건 불일치 0**, refId 3건 해석 3건) + `test:invariant` **8/8 PASS**(엔진 무변경).
  - **PM 확정 — unsure 처리(2026-08-19)**: Q1·Q2 `unsure`는 **블록 숨김 금지, 짧은 안내 문구 제공.** 근거 = "잘 모르겠어요"를 고르는 손님은 자가진단을 어려워하는 분(주 고객 50~60대에 많음)이라, 답했는데 항목이 사라지면 "내 답을 안 읽었나" 하는 허전함이 생겨 V2 목적("내 답을 다 읽었구나")과 정반대가 된다. 두 문항 **동일 3단 구조**(답 확인 → 재확인 방법 → 비중 작음 안심)로 통일. 손상 단정·겁주기 금지. ⚠️ **지시는 "Q2 3값"이었으나 코드 실제 4값**(unsure 포함) — 4값으로 확정.
  - **§6 보정(2026-08-19 PM) 3건 반영**: ① **`insight` 블록 신설**(§7-1 style 목록에 추가) — §6-3 Primary Insight(stamp·door·aha)를 담을 칸이 원래 목록에 없었다. ② **`refId` 참조 도입** — `CopyEntry`를 `text | refId` 유니온으로 바꿔 둘 다 갖거나 둘 다 없는 상태를 타입이 막는다. b3/b6/b10 aha는 hair-structure에서 **복사가 아니라 참조**(같은 문장 두 벌 = 원문 대조 두 벌 + 한쪽만 빨간펜 시 화면 분기). 참조 체인 금지·끊긴 참조는 `check` FAIL. ③ **걸침 슬롯은 "주된 목적" 한 곳에 두고 sourceRef에 걸침 명시** — b3 procedure→curl-fit / b5 procedure·b10 detail→volume / b6 procedure→cut / b8 3슬롯→insight(폴백·범용).
  - **엔진에 맞춘 판단 2건**: ① `damage.elasticity.firm_after_magic`(파생) — `firm`(−0.3)은 유일한 건강 신호인데 확정124 코팅 규칙이 마지막 시술=매직이면 그 −0.3을 무효화한다. 한 문장만 두면 매직 손님 화면에 "좋은 신호"가 뜨는데 엔진은 가산을 안 주는 어긋남이 생겨 분기했다. ② `damage.cause.bleach`(신규) — 현행 `TYPE_INFO`가 탈색을 전체염색과 함께 DRY로 뭉치는데 탈색은 색을 **빼내는** 시술이라 출발선이 다르다. §5-4 고위험 분기로 신설.
  - **검사 하네스 보강**: `verbatim.ts` 신설 — "원문 그대로" **주장을 기계 대조**한다(원본 파일 텍스트 containment). ⚠️ 원본 읽기 실패를 `catch`로 삼키면 검사기 버그가 "전건 불일치"로 위장되므로 **즉시 throw**한다(실제로 이 함정에 한 번 빠져 44/44 거짓 실패가 났다). `\n`·`\t` unescape 포함(b6.detail 문단 구분).
  - 🟡 **미충족 1건 — §6-5(2) C컬/S컬/웨이브 내용 차등**: 규정은 "door 치환이 아니라 내용이 실제로 달라야 함(시작점·크기·순서)"인데 현행 원문은 `B2_DOOR_BY_DESIGN` door 한 줄만 갈릴 뿐 시작점·크기·순서가 동일하다. **원문에 없는 신규라 사장님 빨간펜 대상** → PM 지시로 이번에 쓰지 않음. **Phase 2 또는 사장님 원고 조달 후 착수.** (`copy-drafts/style/curl-fit.ts` 상단에 명시)
  - **레지스트리 밖으로 둔 것**: `products`(P-키 배열 9개) — `PRODUCT_MASTER` 참조라 카피 텍스트가 아님. PM 승인.
- ✅ **① resolver 배선 완료 (2026-08-19, `3a57f1d`) — 엔진 무변경**: `copy-drafts/resolver/` 5파일. registry 139 entry를 손님 답 → 결과지 블록으로 연결한다. 엔진(`diagnoseDamage`·`resolveCrossBranch`·`evaluateStyleGate`) **출력만 읽고 판정을 재계산하지 않는다.** `styleGate.ts` 무수정(§8-6).
  - **검증**: 도달 가능 id **136** + 도달 불가 3(예언 8번, 엔진 `match:()=>false`) = 139 — **레지스트리에 있는데 resolver가 못 닿는 죽은칸 0건**(CLAUDE.md §8 기계 확인). 스모크 **7/7**(INV1 반례·확정124 코팅·새치·시술전무·b1·b8 폴백·게이트 차단). `test:invariant` **8/8 PASS**.
  - **예언 id 취득 방식**: 엔진의 `selectProphecy`가 module-private라 결과에 예언 **문자열**만 있고 id가 없다. 엔진에 export 추가는 경계 밖이라, **risk 카피가 원문과 한 글자도 다르지 않음이 기계로 증명된 점**(verbatim 불일치 0)을 이용해 문자열 역방향 조회로 원본 entry를 되찾는다. 같은 문장이 2개 entry에 있으면 모호해지므로 issue로 승격 — 현재 0건.
  - 🔴 **§6-6 임시 우회 (PM 승인 2026-08-19) — 손상 엔진 v2에서 정식 수정할 별건 안건**: `resolveCrossBranch`는 gate가 block이면 `primary:"b9", absorbed:[]`를 돌려주고 **실제 발동한 모질 갈래 목록을 버린다**(`crossBranch.ts:94-96`). §6-6은 차단이어도 모질/궁합/커트를 정상 출력하라고 하므로, resolver가 **시술이력 키만 비운 탐침 입력으로 같은 함수를 한 번 더 호출**해 갈래를 재취득한다. 성립 근거 = 갈래 발동 조건(`crossBranch.ts:67-78`)이 `q3_curl·q13_design·q8_density·q7_thickness·q11_length`만 읽고 시술이력 키는 안 읽음(코드 확인). `scalpRoutineCard`는 시술이력을 읽으므로 실제 호출값 사용. **PM 판단**: 결과가 엔진 수정과 동일하고 런칭 직전이라 엔진 동결(8/8 안전망 보존)이 우선 → 우회 유지. **정식 해법 = crossBranch가 block에서도 firedList를 함께 반환(엔진 1줄) → 손상 엔진 v2에 묶어 처리**(어차피 그때 엔진을 건드린다). ⚠️ **코드의 🔴 탐침 경고 주석 유지 필수** — 누가 시술이력을 읽는 갈래 조건을 추가하면 우회가 조용히 깨진다.
  - **차단 시 insight를 비우고 safety가 대표 판정을 대신한다**(PM 승인). b9의 stamp·door·aha가 §6-6에 따라 이미 safety에 있어서다.
- 🔴 **다음 작업(순서 고정)**: **② production 게이트 활성화 → ③ §7-3 전수 덤프.**
  - **② 게이트 활성화(2줄)**: `check.ts`의 `GATE_ENFORCED=true` + `package.json` `prebuild`에 `npm run copy:check` 체인. 위치는 `copy-drafts/README.md` §5. **현재 상태**: 게이트는 계산은 되고 적용만 안 된 상태로, `copy:check`가 "도달 136건 중 승인 아님 136건 → 지금 켜면 production 빌드 FAIL"을 미리 알려준다(전건 draft라 정상). **사장님 승인(status→approved)이 먼저다.**
  - **③ §7-3 전수 덤프**: `RESULT_ENUMERATION_V2.md`/`DAMAGE_ENUMERATION_V2.md`. "전수" 정의 = copy entry 100% + resolver branch·state·riskFamily·grayFlag·volumeState 100% + unique rendered signature 전량. **Cartesian 전량 실행이 비현실적이면 exhaustive라 표기하지 말고 실행 개수·생성 방식·seed·미커버를 명시할 것.**
  - **블록별 최종 분포(139)**: `style/insight` 30 · `style/volume` 19 · `style/curl-fit` 12 · `style/safety` 7 · `style/cut` 4 · `style/hair-structure` 3(전부 refId 참조) / `damage/risk` 42 · `damage/cause` 7 · `damage/elasticity` 6 · `damage/friction` 5 · `damage/drying` 3 · `damage/gray` 1.
  - **§7-2 최우선 정독 검수 대상(`신규` 14건)** — 사장님 빨간펜은 여기 집중: Q1 5값+unsure 안내(elasticity 5) · Q2 4값+unsure 안내(friction 4) · Q3 3값(drying 3) · **`damage.cause.bleach`**(탈색 고유 판단, 원문 대응 문장 없음) · `style.volume.balanced`(§6-4가 신규로 명시한 BALANCED 축소 카피).
- ℹ️ **확정124 정정**: 아래 "확정124 …커밋/배포 승인 대기" 항목은 **낡음** — Q1 firm·매직 코팅은 실제 코드(`damageRecommend.ts:68,265`, `surveyData.ts:11,82`)에 이미 반영·라이브(747021e 이후). 대기 아님.

## 🟠 손상 엔진 v2 — 질문지·점수 개편 (2026-08-19 안건 등록, **착수 전 · 별건**)

**착수 시점(사업주 확정)**: 결과지 V2(카피 블록화) **완료 직후**, 아래 4건을 **일괄** 진행한다. 결과지 V2 진행 중에는 손대지 않는다(설문 스키마 불변 원칙 유지).

- **(1) 추가 시술 문항 전환**: 현행 `h_more`(없음/몇번/많이 3단계)를 폐기하고 **시술 종류별 중복체크**로 전환. "몇 번 했는지"가 아니라 "무엇을 했는지"를 받는다.
- **(2) 길이 문항 신설**: 데미지 진단에는 랜딩 사진이 없어 기장을 **추론할 수 없다** → 질문으로 직접 받는 것이 **필수**. (스타일 진단과 달리 사진 기반 추정이 불가능한 구조적 이유.)
- **(3) 길이 × 시술빈도 = 누적 배율**: 길이는 **단독 손상 가산을 하지 않는다**(긴 머리 자체가 손상이 아님). 길이는 시술 누적이 머리끝에 얼마나 오래 쌓였는지를 나타내는 **배율**로만 작동한다.
- **(4) 죽어있는 예언 8 부활**: 길이 문항이 생기면 예언 8번의 match 조건이 성립 → 활성화. (2026-08-14 "6·8번 문항 추가 안 함" 보류 결정의 해제 조건이 이번 (2)로 충족됨.)

**등급 체계 확정(변경 없음)**: **4단계 유지.** 명칭 = **1 건강 / 2 약손상 / 3 손상 / 4 극손상**.

**함께 처리할 엔진 수정 1건(2026-08-19 추가)**: 🔴 **`crossBranch`가 gate=block일 때도 firedList를 반환하도록 1줄 수정.** 현재는 `primary:"b9", absorbed:[]`로 갈래 목록을 버려서(`crossBranch.ts:94-96`) §6-6("차단이어도 모질/궁합/커트 정상 출력")을 못 지킨다. resolver가 탐침 입력으로 우회 중이며(`copy-drafts/resolver/style.ts` 🔴 주석), 이 개편 때 엔진을 어차피 건드리므로 그때 정식 수정하고 우회를 제거한다. **우회 제거 전에는 시술이력을 읽는 갈래 발동 조건을 추가하면 안 된다** — 탐침이 조용히 깨진다.

**연관**: INV1 Lv4 강제(`da79bae`)는 이 개편 이후에도 유지되어야 하는 하드 invariant다 — 점수 체계가 바뀌어도 `calcLevel`의 `bleachCount>=2 → 4` 분기는 점수와 독립이라 자동 보존되나, §8 invariant 재실행으로 확인한다. 개편 시 스냅샷 23+1행은 **의도적 대량 변경**이 예상되므로 `UPDATE_SNAPSHOT=1` 전에 변경분을 전수 검토한다.

## 🔴 어드민 신규 2건 + 정리 1건 (2026-08-16, **배포 완료 `3657477..c02cf08`**)

화면단·조회 전용(Codex 생략·§3). 순수 로직 node 실검증(tsc/next build는 세션 권한 제약으로 미실행 — Vercel 빌드가 최종 타입 게이트).
- **① 대시보드 요약 KPI 타일(`eacdd47`)**: /admin 상단(FunnelPanel 최상단)에 5개 한눈 KPI(총 방문·진단 시작·진단 완료·결과지 도달·구매 클릭). 기존 퍼널 기간 필터·고유 유저 집계 재사용. 결과지 도달(report_view)만 `funnelAggregate.distinctUsersOf`로 이미 읽은 rows에서 추가 집계 — 새 쿼리·SQL 0. 각 타일 지표 정의 명시.
- **② 쿠팡 링크 점검 페이지(`6217c9a`)**: `/admin/coupang-check` 신설. `lib/coupangCards.ts`(STYLE+DAMAGE) 직결 → 제품 변경 자동 반영. g 병합 21종(G05 양면 배지·G21 보류 표시), '열기'(새 탭)+'확인함'(localStorage). COUPANG_CARDS_LIVE 상태 배너. AdminSidebar '링크 점검' 탭.
- **③ debug-sentry 삭제(`c02cf08`, 🟡-07)**: Sentry 실연동(설정 4파일+loading 프로덕션 보고) 확인 → 고아 진단 하네스(route+page)만 삭제, 실연동 유지.
- 검증: distinctUsersOf(중복/null 제거)·카드 병합(21종·양면·보류·정렬) node PASS. 어드민 페이지 브라우저 렌더는 로컬 ADMIN_SECRET 미설정으로 미확인(미들웨어 500).

## 🔴 D-2 재검수 라운드2(UI/UX) 6건 (2026-08-16, **배포 완료 `de9e5da..23a6e98`**)

감사 ■5 기준 UI/UX 묶음 수정. 커밋 6개 분리(화면단이라 Codex 생략·§3, next dev 컴파일 200·에러 0 검증).
- **🟡-01 버튼 어포던스(`7777373`)**: style/result 저장하기→아웃라인 버튼, 공유·재진단→테두리 보조버튼, damage 헤더 공유→테두리 pill. 헤더 nav·밑줄 텍스트링크는 관례적 위계라 유지.
- **🟡-03 연차·직함 통일(`c08cc3a`)**: damage 푸터 "25년 경력 원장"→"20년차 디자이너"(스타일 결과지/로딩과 동일 페르소나). 렌더 텍스트 25년 잔재 0.
- **🟡-11 에러 문구 분리(`cc1a39a`)**: failMessage를 5종(얼굴/사진내용·사진파일·네트워크·시간초과·서버일시)으로 분리, 각 사유마다 다음 행동 다르게. 일일한도는 기존 별도 카드.
- **🟡-05 배지 줄바꿈(`c2732e4`)**: AFTER 모질 배지 nowrap+max-w+truncate(320px pill 깨짐 방지).
- **🟡-02 로딩 진행감(`6326e6a`)**: 매초 "N분 N초째 준비 중"(20초 후 등장) + 경과 구간별 4단계 점진 문구. 폴링/8분 예산 미변경(표시 전용). 옛 longWait 제거.
- **⑥ 아이콘 교체(`23a6e98`)**: 나의 헤어 User(사람)→FileText(결과지), 홈 링크에도 동일. 사람 실루엣이 랜딩 사진과 겹쳐 헷갈리던 문제.
- 🟡 **남은 감사 발견분(3건)**: 🟡-04 결과지 폰트 이원화(전역 토큰 상향 패스 — 실측 목록 보고됨: 설문 옵션 14/12px·업로드 10px가 결과지 17px보다 작음, 승인 대기) / 🟡-06 미커밋 삭제 88건 / 🟡-07 debug-sentry 잔존. 🔴-01(라이선스)=사업판단.

## 🔴 D-2 전체 재검수 + 라운드1 수정 4건 (2026-08-16, **배포 완료 `497d53f..4359e50`**)

병렬 서브에이전트 7건(■1~■6 + Codex 적대검수)으로 확정사항 전수 대조 → `docs/LAUNCH_AUDIT_2026-08-16.md` 생성. **치명 보안 취약점 0건**, 🔴 2 + 🟡 11 발견. 이 중 오픈 전 필수(라운드1) 4건 수정·배포. **Codex 3라운드 검수**(1·2라운드 "수정 필요" → 재수정 → 3라운드 핵심 통과).

- **🔴-02 결과지 직접진입 가짜진단 차단(`feedba5`)**: 설문 데이터(answers) 없이 `/style/result`·`/damage-check/result` 직접 진입 시 기본값(bob/medium/straight, DEFAULT_ANSWERS)으로 "진단받은 척"하던 화면 → answers 빈값이면 랜딩 리다이렉트. 세션조작(JSON "null"·배열) 방어 포함. style은 `Object.keys(answers).length>0` 단일조건, damage는 `hasSurveyData` 별도추적(로그인 확인 후 리다이렉트).
- **🟡-09·10 폴백 강제우회 차단 + quota 순서(`b2d2e05`)**: ⑤ 폴백(lucataco 미화모델)을 콜드미스 없이 강제하던 사업정책 우회 차단. ①`primaryAttestation`(신규 별도서명, 원본 kickoff만 발급 → 폴백 체이닝 구조적 차단) ②`verifyFallbackEligibility`(Replicate 직접조회, succeeded 거부·failed/canceled는 completed_at-created_at 7분+·진행중은 created_at 7분+로 즉시cancel 우회 차단) ③quota 차감을 전체 검증 뒤로 이동. 잔여(hair_jobs 원장 도입 시): attestation 1회소비 원자적클레임·폴백검증 rate limit.
- **🟡-08 warmup burst 방어(`ae5d09b`)**: 인스턴스-로컬 쿨다운이 서버리스 다중인스턴스 앞 무력 → 신규 SQL `try_acquire_warmup_cooldown`(단일행 원자적 UPDATE...RETURNING)로 90초당 1회 직렬화. **🔴 사업주: `supabase/warmup_global_cooldown_schema.sql`을 SQL Editor에서 직접 실행해야 발동**(미실행 시 fail-open, 회귀 없음).
- **문서(`4359e50`)**: 감사 보고서 + 라운드1 수정 반영.
- 🟡 **남은 감사 발견분(라운드2+ 이월, 9건)**: 🔴-01(inswapper 라이선스 — 코드 아닌 사업판단) / 🟡-01 저장버튼 어포던스 / 🟡-02 로딩 20초~8분 고정문구 / 🟡-03 "20년차 디자이너"↔"25년 원장" 연차·직함 불일치 / 🟡-04 결과지 폰트 이원화(style 26/17px vs damage 22/16px) / 🟡-05 모질배지 줄바꿈 위험 / 🟡-06 미커밋 삭제 88건(mature PNG 4장 의도확인) / 🟡-07 debug-sentry 라우트 잔존 / 🟡-11 에러 사유별 문구 뭉뚱그림.
- ⚠️ **미커밋 삭제 88건 여전히 유지**(라운드1 3커밋에 딸려가지 않게 pathspec 커밋 확인). public/references .gitkeep 84 + mature/short_bob PNG 4 — 커밋 금지 유지.

## 🔴 런칭 필수 UX(파트1·2·③·④·⑤·⑥) + ddvinh1 세션핑 실측 (2026-08-16, **배포 완료 `56a2783..0fdfe2f`**)

사업주 런칭 체크리스트 구현. 프론트 4커밋 + 백엔드 2커밋(Codex 4라운드 통과). 커밋 `d57b4e0`·`4178ef8`·`0f3052c`·`a11dd72`. **push·Vercel 배포 완료** — 라이브 스모크 통과(/style 200, POST /api/hair-transform 401 login_required, default_style.jpg 200, 신규 마커 "AI가 읽고 있는 내 모발" 노출·옛 "헤어 꿀팁" 소멸로 새 빌드 확정).

- **ddvinh1 유휴 잠드는 시간 정밀 실측(2초~150초 공백 메움)**: warmup 콜드부팅 232s 후, 직전 완료 기준 **30/60/90/120/150초 전 구간 warm**(queue 0.02~0.03s). 콜드 전환은 150초 이후. → **90초에서 warm 확정 → 세션핑(90초) 유효 → ddvinh1 유지 확정.** 루카타코 참고: queue 0.03s·run 0.56s(상시 warm). 🔴 저잔액(<$5)이라 429(6/분) 1회 재현(10초 후 통과).
- **①파트2 결과지 버튼 계단식(`d57b4e0`)**: 사진+진단배지 → 간판명+판정 → 훅 한 줄 → 큰 버튼①(진단·처방 펼침) → 큰 버튼②(케어 제품 펼침). 50·60이 스크롤 안 하고 사진만 보는 문제 직격. 스타일엔 손님 이름·손상단계 없어(데미지 소관) 훅/배지를 **모질 요약**으로 적응. 차단(block) 시 제품 대신 데미지 CTA. 버튼 클릭 계측(result_diagnosis_open·result_products_open). dev 실측: 비차단/차단·데스크톱/모바일(375, 가로스크롤0) 통과.
- **②파트1 로딩 순차공개 + ④문구 정합(`4178ef8`)**: 대기 중 손님 진단 8줄 순차공개(3초 페이드·8줄 후 루프) + 진행라벨 4단계(사진분석→얼굴형→스타일→마무리). 실제 설문 8문항만, 결측 시 그 줄만 일반 문구 폴백. **{이름}=/api/auth/me가 PII(닉네임) 미반환 → 이름 없는 문구 고정**(스펙 폴백·프라이버시 부합). **{손상톤}=결과지 판정 스탬프 그대로 재사용**('N단계' 임의생성 금지). **④**: "나갔다 와도"는 과약속(탭 종료 시 폴링 끊김) → "이 화면 잠깐 벗어났다 돌아오셔도 이어서 진행돼요"로 정직화. 진짜 백그라운드(탭 종료 후 복귀)=`hair_jobs` 원장 필요 → 오픈 후 과제(사업주 결정: 문구만).
- **③세션핑 90초(`0f3052c`)**: GPU 예열을 옛 2발(survey 주발사/upload 보조발사, `prewarm.ts`)에서 **/style 레이아웃 상주 클라 하트비트(`StyleSessionPing.tsx`)**로 교체 — 랜딩 진입 1발 + 90초 간격 + 언마운트(탭 닫힘/이탈) 중단. `STYLE_PREWARM_KEY` 제거(하트비트는 sessionStorage 공유 불필요). 서버 warmup 라우트·90초 쿨다운·전역상한(5000/일) 불변. dev 실측: /style 진입 warmup POST 발사 확인.
- **⑤루카타코 폴백(`a11dd72`)**: 세션핑이 못 막은 드문 8분 콜드 미스에서 상시-warm lucataco로 **1회 재착수**(에러보다 결과, 사업주 재판정 — 과거 lucataco 기각을 폴백 한정으로 뒤집음). **★긴급 킬스위치 `HAIRSYNTH_FALLBACK_ENABLED`로 즉시 무력화 가능**(미화 문제 시 한 줄). 서버가 클라 `fallback:true`를 그대로 신뢰 안 함: 킬스위치 OFF면 무시(ddvinh1) + **원본 kickoff 토큰(verifyJobToken) 검증**해야만 허용(임의 lucataco 직접호출 차단) + `fallbackUsed` 응답 계약. 클라: `fallbackAttempted`(1회 가드)·`fallback`(모델/예산) 분리 영속화로 새로고침 안전. 과금=1회 예약(일일한도 7 완충). **Codex §11 반론**: 미화 재노출·즉시폴백/replay로 '8분 미스에서만'은 서버 보장 아님 ↔ 콜드미스 드묾·실패보다 전환가치·비용 일일한도 상한. 남은 한계(8분경과·replay·fail-open)=`hair_jobs` 원장 도입 시 이월.
- **⑥50·60 가독성(부분)**: 결과지 버튼 17px·간판명 26px, 로딩 순차공개 16px·안내 13px 등 런칭 핵심화면 확대. **전역 토큰 대비 상향은 별도 신중 패스(전 페이지 영향)로 이월.**
- 🔴 **유입 전 필수(미완)**: **Replicate 잔액 충전**(<$5 → 생성 429로 축소). 코드는 배포됐으나 손님 실합성 전 반드시 충전. (① push ③ 삭제분 제외는 완료.)
- 🟡 **사업주 폰 확인(헤드리스 불가)**: 로그인 게이트 뒤 화면 = 로딩 순차공개 실동작·폴백 실합성(미화 정도)·이름없는 문구. 결과지 계단식은 코드+dev 검증됨.

## 로그인 게이트(데미지 추가·공용화) + 나의 헤어 다운로드 수정 (2026-08-15, 배포 완료 9eeb61b·1eefacc)

UX 2건, 성격이 달라 커밋 분리. push 승인 후 배포.
- **① 로그인 게이트**(`9eeb61b`): 공용 `lib/authGate.ts` `ensureLoggedInOrRedirect(returnTo,{onRedirect})` 신설 — `/api/auth/me` 확인, 미로그인/조회실패는 fail-closed로 `/login/consent?return_to=…`. 두 흐름 공유.
  - **스타일**: `style/loading` 인라인 클라 체크만 헬퍼로 치환(**동작 100% 불변** — 게이트 조건 `isLoginRequiredBeforeSynthesis`·`return_to=/style/loading`·`clearAccountId`·fail-closed 그대로). **불가침 유지**: 서버 강제(`api/hair-transform` 401)·`style/upload` 동의 게이트·`goRelogin`(401 핸들러) 미변경.
  - **데미지**: `/damage-check/result` **마운트 가드**(returnTo=`/damage-check/result`). `authOk` 확인 전 결과 미렌더(플래시·직접URL 우회 차단), `report_view`도 통과 후에만 기록. (클라 표시 게이트 — 데미지는 서버 합성/비용 없어 보호 대상이 로그인 캡처뿐.)
  - **Codex 3항목 통과**: ①데미지 익명우회 없음 ②스타일 3중 방어 불변 ③return_to 복귀 정상. 검증: 미로그인 결과 직접진입 → 미노출 → `/login/consent` 리다이렉트·return_to 확인. tsc 통과.
- **② 다운로드**(`1eefacc`, `app/my-diary/page.tsx`): 원인=저장 대상이 **data URI**라 URL만료·CORS 아님 → 실패는 저장 방식(iOS 사파리 `a[download]` 무시 + click 직후 동기 `revokeObjectURL` 조기취소). 수정=`navigator.canShare({files})` 시 **Web Share(파일)**로 '사진에 추가'(iOS, AbortError는 조용히), 미지원은 **`a[download]`+revoke 10초 지연**. data URI라 화면단(Codex 불필요).
  - 검증: 인앱 헤드리스 Chromium(share 미지원)=경로② 실행 확인(앵커 클릭·파일명·blob href·revoke 즉시호출 0). 🟡 **iOS 사파리 Web Share 경로·안드로이드 실기기 = 사업주 폰 확인 몫**(headless엔 `navigator.share` 없음).
- 🟢 이월 정리: 로그인 게이트·다운로드 버그 닫힘. 남은 이월 = faceswap 콜드스타트 확인 / 계측 유출(events anon SELECT — 조회 SQL 6블록 사업주 전달됨, 실행 대기).

## 완성도 게이지 옵션 A + /items 재시도 + /style 보조링크 (2026-08-15, 배포 완료 36df528·f5c24e0·d879b59)

[구조 수정판] 후속. 프론트 전용(Codex 생략·§3), tsc 통과, dev 서버 DOM 실측 검증.
- **게이지 옵션 A**(`36df528`, `components/InlineCompletion.tsx`·`CompletionGauge.tsx`): bangs·hairquiz 랜딩을 내렸으므로 완성도 게이지가 숨긴 페이지로 가는 라이브 막대 링크가 되지 않게, 게이지 전용 `VISIBLE_DIAGNOSIS_KINDS=['style','damage']`만 카운트+링크. **lib 공용 `ALL_DIAGNOSIS_KINDS`는 불변**(홈 태그·집계 등 다른 소비처 보존 — 게이지 전용 목록만 좁힘). 검증: /style 랜딩 `0/2`·링크 style·damage만, /damage 랜딩 `완성`(2/2 도달), /bangs·/hair-quiz 라이브 링크 소멸(`hasBangsOrQuiz:false`). CompletionGauge(스타일 결과지)도 "네 가지"→"지금" 문구까지 일관화.
  - 참고: 데미지 결과지 전용 교차추천 링크("평소 손질 습관 진단 →/hair-quiz")는 이미 `SHOW_HAIRQUIZ=false`로 숨김 상태였음(라이브 broken 아님). 숨긴 페이지로 닿던 유일 라이브 경로가 이 게이지 막대였고, 그걸 이번에 닫음.
- **/items 재시도**(`f5c24e0`, `app/items/page.tsx`): fetch를 `loadItems()`로 추출, 에러 상태에 "다시 시도 ↻" 버튼(로드 실패→재호출). 검증: 강제 실패→버튼→클릭→재호출 성공→해소.
- **/style 보조링크**(`d879b59`, `app/style/page.tsx`): 사업주 선택 "새 보조링크 추가" — 기존 재방문 링크(→/home) 유지하고, 다른 진단(손상도)으로 넘어가는 교차 텍스트 링크 신설 "머리 상태부터 볼까요? · 1분 손상도 체크 →" → /damage-check(홈 랜딩과 동일 `diagnosis_card_click` 계측).
- **폴리시 4건 결론**: /items 재시도·/style 보조링크 = 이번 처리 완료. **폭 430 통일 = 이미 충족**(라이브 페이지 전부 `max-w-[430px]`, 아웃라이어 0 — 유일 예외 레거시 /result는 라이브 동선 아님). **저대비 상향 = 이미 적용**(토큰 `--sub:#6e665b`, `--ink-2=--sub`, BottomNav도 토큰 사용 — 문서 목표 #6B6355와 일치). 두 건은 코드 변경 없음.
- 🟡 **이월(이번 배포에 없음)**: 로그인 게이트 양쪽 + 나의 헤어 '다운로드' 버그 / faceswap 콜드스타트 확인 / 계측 유출(events anon SELECT) 확인 / B군 폴리시 중 v1 문서가 특정 대상 콕 집으면 추가 처리.

## [구조 수정판] 홈/탭 개편 + '나의 헤어' 통일 + my-diary 가로스크롤 수정 (2026-08-15, 배포 완료 baadd9f)

프론트 전용 UI 개편(Codex 생략·§3, tsc 통과). dev 서버 DOM 실측 검증.
- **하단 탭 5→3개**(`BottomNav.tsx`): 홈·발견템·나의 헤어. AI진단 허브·고민상담소 탭 제거. active 3탭 기준 정상.
- **홈 재구성**(`home/page.tsx`): '오늘케어 루틴'·'퀵 진단 →' 배너 제거 → 진단 랜딩 2장(스타일·데미지)이 주인공. '물어보세요' 소통 블록은 `CONSULT_CHANNEL` feature flag(`enabled:false`)로 숨김 — 카카오 채널 개설 후 `href` 주입+`enabled=true`로 켠다(`enabled && href` 둘 다 있어야 렌더 = 갈 곳 없는 노출 차단). 프로필 카드·완성도 게이지 유지.
- **진단 허브**(`diagnosis/page.tsx`): 직접 URL 접근용 존치, bangs·퀵진단 카드 숨김(스타일·데미지 2종만). 라우트 자체는 생존.
- **명칭 '나의 헤어' 통일**: 탭 라벨·페이지 타이틀(`my-diary` h1)·저장 버튼(`나의 헤어에 저장`)·result·style/result 모달/버튼 5곳·장식 라벨(`A-Beauty Diary`→`MY HAIR`). **사용자 대면 '다이어리' 0건**(브라우저 확인). 남은 grep은 전부 코드 주석/식별자(비렌더)·데이터 마이그레이션 주석(`surveyData.ts:164`·`styleReference.ts:18` 과거 저장값 방어라 의도적 존치)·`/result`·`/myhair` 레거시 스텁·`showDiaryModal` 변수명.
- **버그: my-diary 가로 스크롤**: 원인=카드 헤더 `flex justify-between` 좌측 자식 `min-w-0` 부재 → 긴 제목/유형라벨이 뷰포트(375) 밖(right≈422)으로 삐져 카드 `overflow-hidden`에 클리핑·날짜 밀림(4개 카드 공통). 수정=좌측 `min-w-0`+날짜 `shrink-0`+헤더 `gap-2`(overflow-x:hidden 미사용) + 시술이력 입력(`TreatmentHistoryField.tsx:51`) `min-w-0` 하드닝. 검증 375px: 동일 긴 제목 right=422 → offenders=0·pageHScroll=0.
- 변경 7파일: BottomNav·home·diagnosis·my-diary·result·style/result·TreatmentHistoryField.
- 🟡 **사업주 후속**: 카카오 채널 개설 시 `home/page.tsx`의 `CONSULT_CHANNEL`에 링크 주입+`enabled=true`로 '물어보세요' 노출.

## 확정125 — ddvinh1 복귀(enhance=false) + 예열 B안 재이식 + 폴링 5→8분 (2026-08-14, 배포 완료 3ab553f)

**현재 라이브 모델 = ddvinh1/face-swap-gpu · enhance=false.** lucataco의 GFPGAN 상시 미화(원본 대비 15~20년 젊어짐)가 50·60 타겟에 치명 → 미화 끌 수 있는 ddvinh1로 복귀, 콜드스타트(~4분)는 선점 예열로 숨김. 라이선스 상태는 lucataco와 동일(둘 다 inswapper) → 방침 변경 없음. **배포 후 며칠 완료율 실측으로 재평가**(로딩 이탈 크면 §롤백으로 lucataco 복귀).
- **모델 교체**: `lib/hairSynthModel.ts` MODEL/VERSION(`d766886c…2971d`)/`HAIRSYNTH_ENHANCE=false` + **입력 빌더 `buildFaceswapInput`**(ddvinh1=`input_image`/lucataco=`target_image` 흡수). `route.ts`가 빌더 사용. **롤백 스위치**: 이 파일 MODEL/VERSION/빌더만 lucataco(`9a4298…843d20d`, `target_image`, enhance 없음)로 바꾸면 라우트·예열 자동 정합 = 몇 분 작업.
- **예열 재이식(B안)**: `app/api/hair-transform/warmup/route.ts`(신규) + `app/style/prewarm.ts`(신규). 주발사=/style/survey 마운트 1회(`STYLE_PREWARM_KEY` 타임스탬프), 보조발사=/style/upload 마운트·직전 180초 초과 시. keepalive. 서버 **90초 쿨다운(실패에도 유지=잔액 태우기 방어 핵심)**·모든 경로 **204**·`default_style.jpg` 2장·전역 `warmup_usage` 상한(5000/일) 재사용·same-origin. **손님 일일한도 미차감**. 세션 초기화(/style 랜딩) 시 플래그 삭제.
- **폴링 5→8분**: `loading/page.tsx` `POLL_BUDGET_MS=480_000`. 로딩 "최대 N분" 문구를 같은 상수(`POLL_BUDGET_MIN`)에서 파생 → 표기 상한↔폴링 상한 결속. 문구="보통 몇 초 안에 완성돼요 · 이용자가 많을 때는 최대 8분까지…"(평소값 앞·최악값 뒤). cancel·status 주석도 8분 정합. 토큰은 만료 없는 stateless capability라 8분 안전.
- **검수**: Codex 통과(1차 warmup 쿨다운 실패-무력화 지적 → 실패에도 쿨다운 유지로 수정 후 재검수 통과). `tsc --noEmit` 통과. 입력키·버전해시 Replicate 공식 스키마 일치 확인.
- **확정(안 함)**: 로그아웃 버튼·탈퇴 UI 미제작(세션 유지 선호/이메일 접수로 커버). 재이용은 카카오ID 일일한도+비용상한으로 방어됨.
- 🟡 **배포 후 사업주 검증(§5)**: ①콜드 상태 손님속도(설문4분+) 완주 → 수십초 내 결과 + 미화 없는지 눈 판정 ②빠른속도(30초)로도 에러 없이 8분 폴링 받는지 ③Replicate 대시보드: 설문 진입 워밍 1건 → 실합성 warm(queue~0) 도는지.
- 🔴 **블로커(이월)**: Replicate 잔액 충전(저잔액 시 rate limit 6/분 축소 — 유입 전 필수). `public/references` 삭제분(mature png 3·.gitkeep·default_style.jpg) 커밋 금지 — 이번 커밋도 제 11개 파일만 스테이징해 제외함.

## 확정124 — Q1 4단계·Q2 문구·매직 코팅·UI 겹침 (2026-08-14, 로컬 검증 완료·커밋/배포 승인 대기)

데미지 물리테스트 개편 + 결과지 UI 버그 수정 4건. 로컬 렌더 검증 완료.
- **Q1 당김 3→4단계**: 타이틀 "젖은 머리 한 가닥…", 옵션 5개(snap +1.0 / stretch +0.7 / elastic +0.3 / **firm(단단=건강) −0.3 신규** / unsure 0). 물리 상한 3.0 → Lv3·Lv4 단독 불가 유지. (surveyData.ts, damageRecommend PULL_ADJ)
- **Q2 문구**: "엉켜서 잘 안 풀리고 뜯긴다" → "…빗질이 전혀 안 돼요"(desc도 뽑히는→걸리는으로 완화). 점수폭 불변.
- **★매직 코팅 규칙**: 마지막 시술(h_recent)이 매직이면 Q1 firm(−0.3, 건강 신호)을 무시(0). 매직에만·마지막 슬롯만. +보정·시술점수는 그대로. (damageRecommend calcScore)
- **UI 겹침 수정**: 설문 스크롤 컨테이너 `min-h-0` + 콘텐츠 `min-h-full` → 긴 Q4에서 내부 스크롤 정상, "진단 결과 보기 →" 버튼 클리핑/푸터겹침 해소. (survey/page.tsx)
- 검증: Q1 5옵션·새 타이틀 렌더, 긴콘텐츠 내부스크롤+버튼 도달(bottom721<812), 코팅 COAT(마지막=매직)=Lv3 vs NOCOAT(마지막=열펌)=Lv2(동일 시술), firm+dye=Lv1.
- 변경 파일: surveyData.ts, damageRecommend.ts, survey/page.tsx. **커밋/push/배포 승인 대기.**
- 미해결(이월): Replicate $2.51 충전, 통신판매 도메인 변경신고, 8번 예언(길이 문항), 예시사진 3장, 손님10명 레벨컷 검산, pH밸런서→6번 제품.

## 셀프염색 하위체크 추가 → 예언 6번 활성화 (2026-08-14, 배포 완료 aa1d890)

염색/뿌리염색 선택 손님에게만 "집에서 직접 하신 적 있어요" 하위체크(`h_self_dye`, 새치체크와 동일 방식·필수 아님) 추가 → 예언 **6번(셀프×미용실 얼룩) 활성화**(`match: selfDye && anyDye`, 문구 원문 그대로, 우선순위 6번 유지). 점수 무영향(calcScore 미사용). pH 밸런서 제품은 링크 부재로 미연결(coupangCards에 TODO 자리만).
- 사장님 결정: ①문구·순서 그대로 ②6번은 "염색 OR 뿌리염색"만(탈색 확장 안 함 — 탈색 손님은 14번이 맞음) ③pH 밸런서는 나중.
- 검증: ④셀프O+염색=6, ⑤셀프O+매직+뿌리=2(우선순위), ⑥셀프X+염색=13, ⑦점수 오염 없음(셀프O·X 동일 레벨), ⑧옛세션(키 없음) 무크래시. ①②③(설문 체크 노출)은 하네스 hidden-pane 타이머 동결로 UI 드라이브 불가 → 코드검증+폰 확인.
- 변경 파일: surveyData.ts, survey/page.tsx, damageRecommend.ts, result/page.tsx, lib/coupangCards.ts.

## 데미지 예언 14종 엔진 교체 (2026-08-14, 배포 완료 f3bb8d3)

기존 단일 C2 예언(열펌+뿌리염색+새치 3중첩에서만) → **시술이력 기반 14종 우선순위 엔진**으로 교체(2026-08-13 지시서 원문 그대로). 위에서부터 첫 매칭 하나만 노출(1~10=두 시술 겹침, 11~14=단일). 렌더에 **관리(3번째 덩어리)** 추가. `damageRecommend.ts`(PROPHECIES 배열+selectProphecy, DamageResult에 prophecyTip 추가) + `damage-check/result/page.tsx`(관리 문단 렌더).
- 로컬 검증 7/7: ①일반펌+뿌리=1 ②매직+뿌리=2 ③염색+매직=5 ④탈색+열펌=10(관리 렌더 확인) ⑤매직만=12 ⑥염색만=13 ⑦시술전무=예언 숨김. 전부 통과.
- **[사장님 결정 반영, 2026-08-14 2차]** ① 6·8번은 문항 추가 안 함(오픈 급함) → match=false 유지·문구 보존(6번 셀프염색은 시술 선택지에 실제 없음 확인). ② **구멍 조합은 폴백 처리**: 1~10 미매칭 시 "마지막 시술" 기준 11~14 중 하나 노출(열펌/일반펌→11·매직→12·전체/뿌리염색→13·탈색→14). 이를 위해 11~14의 "다른 시술 없음" 조건 제거. ③ 새치체크와 예언 분리 유지(1·2번은 뿌리염색이면 뜸, 흰머리 원고만 새치체크 조건).
- 2차 검증 통과: ⑧일반펌+염색(마지막=염색)→13, ⑨탈색+뿌리(마지막=탈색)→14, ⑤매직만→12(폴백), ①일반펌+뿌리→1(paired), ⑦전무→미노출.

## 결과지 덤프 검토 → 결과지 제품/카피 수정 3건 (2026-08-14, 배포 완료 d563dc7)

데미지·스타일 결과지 전수 덤프 검수 후 사업주 지시로 3건 수정(프론트/매칭 전용 → Codex 대상 아님). dev 서버로 실제 렌더 검증 완료.
- **FIX-A(저장≠표시 버그)**: 데미지 결과지가 화면엔 쿠팡카드를 띄우면서 홈/다이어리엔 `damageRecommend.products[0]`(화면에 없는 제품)을 저장하던 문제 → 화면에 뜬 쿠팡카드 첫 장 기준으로 저장. `app/damage-check/result/page.tsx`(damageCards 단일 출처) + `app/my-diary/page.tsx`(product 옵셔널·미저장 가드).
- **FIX-B(제품 1~2개 조합 메움)**: 매칭축 6종에 안 걸리는 '보통' 조합이 1~2개로 뜨던 문제 → `lib/coupangCards.ts` topUp()로 **최소 3개 보장**(COUPANG_MIN_CARDS=3). 폴백은 범용카드만, 상충(굵은/숱많은 머리에 볼륨류)은 skip. 검증: 건강모 2→3, 직모·보통 1→3, 곱슬·보통 2→3.
- **FIX-C①(카피↔제품)**: 갈래b7(직모+컬희망) 등 wantWave면 컬 제품(G17/G18)을 볼륨보다 앞으로(`pickStyleCards` 부분정렬). 검증: b7 컬크림·무열웨이브가 1·2번째로.
- **FIX-C②(카피 오출)**: 갈래b2 예언이 웨이브 손님에게도 "C컬 해달라고…"로 나가던 것 → `resolveDoor()`로 웨이브/S컬 문장 분기(`branchCopy.ts`+`style/result/page.tsx`). 검증: 웨이브→"웨이브 넣었는데…".
- **확인(가드)**: `COUPANG_CARDS_LIVE=false` 시 전 조합 0개 → 경고 배너 주석 + 런타임 console.warn 추가.
- **미커밋**: 위 5개 코드 파일 + 이 문서. 커밋 승인 대기(3개로 분리 제안). 별도 콘텐츠 작업 2건(관리꿀팁 개인화·예언 도달률)은 사업주가 별도 진행.

## 🔴 합성 모델 라이선스 전수 조사 — lucataco 기각 + inswapper 계열 전체 상업 불가 (2026-08-14)

**사업주 판정: lucataco 기각.** ① 라이선스 "Research & Non-commercial only"(상업 서비스 불가) ② GFPGAN 상시 내장 미화(원본 대비 15~20년 젊어짐 → 나이별 레퍼런스 무력화). 선택 = (C) 추가 탐색. 우선순위 **라이선스 > 미화 없음 > 속도**(4분만 아니면 10~30초 수용).

**🔴 최대 발견 — inswapper_128(InsightFace) 원본이 비상업 전용**: 코드는 MIT지만 **사전학습 가중치(inswapper 계열)는 non-commercial research only**, 상업 이용은 InsightFace 유료 별도 라이선스(contact@insightface.ai) 필요. → 우리가 검토한 **lucataco·cdingram·codeplugtech·ddvinh1 전부 inswapper 래퍼**(미화 비교테스트에서 3개 출력 거의 동일 = 같은 계열 실증) → **계열 전체가 상업 사용 불가.** Replicate `license_url` 전부 null(상업 허가 명시 없음).
- **ddvinh1**: `enhance` 토글(기본 false) 있어 미화는 끌 수 있으나 **inswapper라 라이선스로 막힘** → 롤백해도 법적 문제 미해결.
- **HairFastGAN(헤어 트랜스퍼 대안)**: 코드 MIT지만 가중치가 **StyleGAN2(NVIDIA NC)+FFHQ(비상업)** 파생 → **자체호스팅해도 상업 불가.** 헤어트랜스퍼 계열도 라이선스로는 해법 아님.

**상업 가능(명시) 대안 — 전부 관리형 API**:
- **Easel AI advanced-face-swap**(fal.ai): 상업 OK·$0.05/run·user/scene 보존·`upscale`/`detailer` 토글(미화 제어 가능). ⚠️ **deprecated·no longer supported**(프로덕션 리스크).
- **Akool** faceswap API: 상업(Pro Max+ 플랜)·피부결 보존·보정 선택적(강제 아님). 구독/엔터프라이즈 과금·검증 필요.
- **Segmind** faceswap v2~v5/ai-face-swap: 상업 플랫폼·종량제. 내부 모델 inswapper 여부·가중치 라이선스 미확인.
- **fofr/face-swap-with-ideogram**(Replicate, 우리 토큰으로 테스트 가능): Ideogram-character+Nano Banana(Gemini) 조합 → **라이선스는 깨끗**(둘 다 상업 API)하나 **생성형이라 정체성 흔들림·미화 우려**.
- **InsightFace 직접 상업 라이선스 구매**: 기존 빠른/싼 파이프라인을 합법화. 비용 미상.

**현재 라이브**: lucataco가 프로덕션 라이브(유입 0). 법적 리스크는 실재하나 유입 0이라 당장 낮음. **상업 오픈(유튜브) 전 반드시 교체.** 롤백 의견: ddvinh1 회귀는 inswapper라 법적 이득 0 + 콜드스타트 4분 재발 → **무의미**. 긴급 롤백보다 (a)공개 미노출/미홍보 유지 → (b)상업 API 확정·배선·테스트 → (c)오픈 순서 권장.
- **다음(사업주 판정 후)**: 상업 API 1~2개 선정 → 실제 미화 정도 비교테스트(각 API 키 필요, fofr는 즉시 가능) → 교체는 §11 Codex 교차검증 후.

### 의존성 트리 정밀 감사 결과 (2026-08-14, 병렬 리서치 4건)
겉 라이선스(Apache/MIT)만 봐선 안 됨 — 얼굴 임베딩에 InsightFace(antelopev2/buffalo_l/ArcFace) 의존 시 오염(InstantID 사례). GitHub 원문 인용으로 전수 확인:
- **얼굴 스왑/ID 개인화 계열 거의 전부 탈락**: InstantID·PuLID(SDXL+FLUX)·IP-Adapter-FaceID·Arc2Face·PhotoMaker **v2**·InfiniteYou·Face-Adapter → 전부 antelopev2/buffalo_l 의존. (IP-Adapter-FaceID·InfiniteYou는 가중치 자체도 NC.)
- **자체호스팅 클린 예외 2개**: ① **PhotoMaker v1** — Apache 코드+가중치, CLIP 전용, InsightFace 無(단 CLIP 기반이라 정체성 약함/생성형). ② **Stable-Hair(v1)** — Apache 코드, InsightFace 無·StyleGAN 無, 헤어만 편집·얼굴 보존(미화 없음에 최적). 유일 blocker=배포 가중치가 FFHQ 학습 → 상업 데이터 재학습 시 클린.
- **StyleGAN/FFHQ 헤어트랜스퍼(HairFastGAN·Barbershop·Style-Your-Hair·HairCLIP)**: NVIDIA NC + FFHQ NC로 **가중치 오염 + 얼굴 전체 재생성→미화**. 이중 부적합.
- **상업-클린 정답은 "스왑"이 아니라 "지시편집(instruction-edit)"**: **Gemini 2.5 Flash Image(Nano Banana)** 유료 API(상업OK·InsightFace無·정체성 최고·~$0.039/장·2~5s, 단 SynthID 워터마크) / **Qwen-Image-Edit(Apache-2.0 자체호스팅 완전 클린)** / FLUX.1 Kontext(dev 비상업·pro/max API 상업). 손님 사진을 직접 편집→실제 얼굴/피부 보존, 미화는 프롬프트로 억제.
- **관리형 스왑 API**: Akool(상업OK지만 내부 inswapper 의심·보정 불투명), Segmind(inswapper 기반=회피대상), fal Easel(상업OK·비inswapper 추정이나 확인 엔드포인트 deprecated+보정 pass).
- **핵심 결론**: 오픈 페이스스왑 생태계는 사실상 전부 InsightFace(비상업)에 물려 있음. 실현 경로 = (A)지시편집 파운데이션(Gemini/Qwen/Flux), (B)InsightFace 상업 라이선스 구매(기존 파이프라인 합법화), (C)Stable-Hair v1 재학습 자체호스팅. **권고 방향(사업주 판정·§11 대상): A의 Gemini Nano Banana 파일럿 + Qwen 자체호스팅 폴백.**


## 🟢 faceswap 모델 교체(lucataco) + 예열 전면 제거 (2026-08-14)

**원인**: ddvinh1/face-swap-gpu가 58K런 저트래픽이라 GPU 항상 cold → 콜드부팅 ~4분. 사전 예열(2~3분)로는 원리상 못 덮음(부팅 자체가 4분).
**실측 비교**(동일 셀카+레퍼런스 1회씩, queue=대기/콜드·run=연산):
- **lucataco/faceswap** ⭐ 채택: queue **0.0s** · run **0.25s** · 총 4.2s · 27.5M런(항상 warm). 스키마 `swap_image`/`target_image`(enhance 없음). ver `9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d`.
- cdingram/face-swap: queue 0.1s · run 7.2s · 3.1M런. 스키마 `swap_image`/`input_image`. **★ 폴백(lucataco 장애 시 차선)**. ver `d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111`.
- codeplugtech/face-swap: queue 0s지만 run 56s(느림) → 탈락. xiankgx: 스키마 특이·실패. omniedgeio: 404(죽음).
- **품질**: 세 결과 사실상 동일(같은 inswapper 계열).
**변경**:
- `lib/hairSynthModel.ts`·`route.ts`: 모델 lucataco, 입력 `swap_image`/`target_image`, `HAIRSYNTH_ENHANCE` 제거.
- **예열 전면 제거**: 스타일 설문 Q4 ping·업로드 2차 ping·`STYLE_WARMUP(2)_KEY`·`/api/hair-transform/warmup` 라우트 삭제. (이유: lucataco 상시 warm이라 무의미 + 손님당 예측 3건=비용 3배 → 제거가 명백 이득.) ※ Supabase `warmup_usage` 테이블·함수는 그대로 둠(무해, 삭제 SQL 안 만듦).
- **유지**: 비동기 폴링·`status`·`cancel`·에러 UI(§0-6)·가드레일(동의403·로그인·일일한도·비용상한·셀카 서버미저장).
- 🔴 **잔액 경고**: 측정 중 저잔액으로 Replicate가 생성 rate limit을 6/분·버스트1로 축소(429). 손님 합성 throttle 방지 위해 **Replicate 잔액 충전 필요**.

## 🟡 쿠팡 파트너스 제휴(21개) — 구현 완료·Codex 통과·**LIVE 대기** (2026-08-13)

**최종 방식(사업주 확정)**: **텍스트 카드**(사진 없음)+쿠팡 단축링크. 배너 iframe·이미지 핫링크 **폐기**(쿠팡 로고·로켓배지·가격이 정직 톤을 광고로 보이게 함 — 장사 판단). **새 SQL/DB 미사용 → `lib/coupangCards.ts` config 단일출처**(제품 수십 개로 늘거나 사업주 직접 관리 필요 시 DB 재논의). 위탁 도매매 35개는 `draft` 유지(삭제 금지). 결제·주문·반품 로직 없음.
- **노출 위치**: 스타일+데미지 **결과지 하단**(확정48). 하드코딩 이름박스 → 매칭 쿠팡 카드로 교체, 결과지에서 바로 쿠팡 연결. `/items`는 별도 구경 페이지(동선 필수 아님).
- **카드**: 아이콘+이름+추천사유+**또렷한 "쿠팡에서 보기 →" 채운 버튼**(사진 없는 약점 보완). 가격 미표시. 대가성 문구 공식형·**13px 가독**·제품 바로 아래. rel=sponsored.
- **매칭**(config 매칭함수, 상위 4개 컷): 스타일=모발타입(q3_curl/q7_thickness/q8_density/q13_design), 데미지=유형(DRY/RIGID)+새치(h_root_gray)+시술이력. **G13(파우더) 데미지 하드차단**(DAMAGE_CARDS에 없음). **G21(잔머리스틱) 비활성**(묶는 습관 문항 없음 — 문항 생기면 활성, 카드는 유지). G05(열보호)·G10(디탱글)=전원.
- **승인 게이트(§4)**: `COUPANG_CARDS_LIVE=false` → 화면에 아무것도 안 뜸. 코드 자동승인 없음. 🔴 **사업주: 폰에서 링크 21개 확인 후 `lib/coupangCards.ts`의 `COUPANG_CARDS_LIVE=true`로 바꿔 배포하면 라이브.**
- **검증**: Codex 통과(tsc0·lint0). 매칭 샘플 3케이스 통과(새치+열펌→G01·G02 / 펌→G04·G09 / 얇은직모→G06·G07). 링크 21개는 서버 curl에 403(쿠팡 anti-bot, 죽은 것 아님) → 폰 확인 필요.
- **리서치 기록(보류)**: 이미지 핫링크=회색지대(판매자 저작권·공중송신, 안전지대 아님). "이미지+가격숨김" 공식 배너 없음. → 나중에 클릭 많은 3~4개만 사업주 촬영 자체호스팅 사진으로 교체.

## 🟡 faceswap GPU 예열(warm-up) — 구현 완료·Codex 통과·커밋 대기 (2026-08-13) [미배포]

콜드스타트(GPU 부팅 3~5분, 실제 run ~1초) 대기 완화. **동기 폴링(5분)은 안전망으로 유지**, 예열은 흔한 경우 개선.
- **트리거**: 설문 **Q4 진입(1차)** + **사진 화면 진입(2차)** 시 `/api/hair-transform/warmup` 발사(각 세션당 1회, fire-and-forget). 더미 예측 생성만으로 GPU 부팅 유발, 결과 버림.
- 🔴 **idle 창 실측(리서치 결론)**: Replicate는 공개모델 idle 창을 **문서화하지 않음**. warm-up ping은 공식적으로 "best-effort, 보장 아님". 확실한 warm 은 ⓐofficial 모델(항상 warm·무료 — 우리 face-swap-gpu는 해당 없음) 또는 ⓑ유료 deployment(min_instances≥1, ~$583/월)뿐. → 1차가 2~3분 버틴다는 보장이 없어 **합성 직전 2차 ping** 추가(서버 60초 스로틀이 60초 이내 중복은 자동 스킵).
- **가드레일**: `bump_hair_usage` 미호출 → **손님 일일한도 안 깎음**. 셀카 미수신/미저장. WARM_IMAGE=공개 alias `default_style.jpg`(**200·리다이렉트0 검증**, 302 아님).
- **남용 방어**: Origin/Referer 동일출처 + 인스턴스별 60초 스로틀 + **전역 예열 일일상한**(`warmup_usage`/`bump_warmup_usage` RPC, 손님 한도와 완전 별개, 상한 5000/일≈$1). ✅ **SQL 실행 완료(2026-08-13) → 상한 활성**(라이브 예열 1회 {ok:true} 확인). 남은 권장: Vercel Firewall로 warmup IP rate-limit.
- **배포 완료(2026-08-13)**: `ef2d7d7..b7d198c` push. warmup 404→200, same-origin 게이트 실측(curl·위조 Origin 차단·정상 통과), `default_style.jpg` 200. 커밋 `97a6bef`(코드)·`839eec3`(SQL)·`b7d198c`(docs).
- **비용**: 예열 회당 ~$0.0002(T4). 월 1천세션×2ping ≈ $0.44. 상시 warm(T4 deployment) ~$583/월 대비 예열 ping 채택.
- **검증 예정(배포 후)**: Replicate 대시보드 queue 시간 before/after 실측(사장님 접근).

## 📄 헤어 트랜스퍼 조사 기록 — **보류** (2026-08-13, 파일럿 안 함)

재개 조건: **HairFastGAN급 2장 입력 모델이 Replicate에 살아나거나, Cog 자체호스팅을 별건으로 결정**할 때.
- **HairFastGAN**(camenduru; `face_image`+`shape_image`+`color_image` 3장, V100 <1초 — 우리에 최적): Replicate 공개 엔드포인트 **404(죽음)** → Cog **자체호스팅** 필요.
- **cjwbw/style-your-hair**: 라이브·2장 입력 맞지만 **~22분/회·~$0.29** → 인터랙티브 불가.
- hairclip: 텍스트/편집(정체성보존 2장전송 아님). flux **change-haircut**: 사진1+**텍스트만**(우리 42레퍼런스 못 씀). custom-hair(L40S): 미검증.
- **롱→숏**: 드러나는 목·어깨·배경 **인페인팅**이 GAN 공통 약점(아티팩트·정체성 흔들림).
- **결론**: 배포 가능한 빠른 2장 트랜스퍼 모델 부재 → 품질만 봐도 출시 경로 없어 **파일럿도 보류**.

## 🟢 나이별 레퍼런스(50·60 mature) + faceswap 정식가동 **배포 완료** (2026-08-12)

**배포**: `3f2e9af..2955681` push → Vercel 빌드. mature 이미지 404→200(≈90s), young/`default_style` 200 유지 확인.
- 커밋 `4452c62`(mature 이미지 33장), `2955681`(코드+병합 manifest). Codex 통과(tsc/lint exit0).
- **나이 픽**: `q1_age` `age_50`·`age_60plus` → `references/mature/` 우선, 슬롯 비면 young 폴백. **40대↓·미상=young**. 경계=50대(사업주 확정).
- **manifest 생성기**: `references/` + `references/mature/` 둘 다 스캔, `mature/` 접두 슬롯키. 이미지 있는 슬롯만 활성(빈폴더·txt 제외). prebuild가 빌드마다 재생성.
- **mature 채움**: bob·collarbone 3층×4컬, short·short_bob light 3컬(=young 패턴). chest·롱 없음 → 30 mature 슬롯.
- **숏 기장**: 설문이 숏은 층 미질문 → 기존처럼 light 폴백 유지(특수처리 없음).
- **faceswap 302 수정**: `getAssetBaseUrl` = `NEXT_PUBLIC_SITE_URL`(미설정 시 공개 alias `hair-dna.vercel.app`) 우선, `VERCEL_URL` 배제. flux/텍스트엔진 없음(주석만). 가드레일(로그인·동의403·일일한도·셀카 미저장) 보존.
- **합격 기준(사장님 폰)**: 50대로 /style 합성 → mature 스타일이 반영되는지.
- 🔴 **미해결**: ① mature 오배치 이미지 3장(weight레벨 직속 = 생성기 미스캔): `mature/bob/heavy/2adfd19a`,`3267cc70`, `mature/short/light/1430bfe2` — 쓰려면 컬 하위폴더로 이동(사업주). ② 미커밋 355개 정리 시 `public/references` 삭제(특히 `default_style.jpg`) 커밋 금지 — 배포 자산 누락으로 faceswap 사망.

## 🟢 faceswap 콜드스타트 → 비동기 폴링 전환 **배포 완료** (2026-08-12)

**배포**: `f981069..32b6ef5` push → Vercel 빌드 성공. status 라우트 404→401(≈90s) + 레퍼런스 200(`default_style.jpg` 포함) 확인.
**원인 정정**: 아래 FIX4의 "Vercel env REPLICATE_API_TOKEN 문제" 결론은 **오진**이었다. 실제는 Replicate GPU(face-swap-gpu) **콜드스타트 큐가 3~4.5분**으로 늘어, 동기대기(Prefer:wait·maxDuration 60s·클라 abort 62s)를 초과 → 식은 날 첫 요청이 100% `poll_timeout` 실패(대시보드: 잔액·호출·성공 정상, 큐만 폭증).
**해결(E″ 안, SQL 없이)**: 동기대기 폐기 → POST는 예측 생성만 하고 `{id,token}` 반환, 클라가 `/api/hair-transform/status`를 2.5s 간격 최대 5분 폴링(새로고침 재개, 20s↑ 안내문구). `status`/`cancel` 라우트 신설 + (predictionId,userId) HMAC 소유권 토큰(IDOR 차단).
**과금**: POST 예약(bump) 유지 + **환불 전면 폐지**(멱등/DoS 구멍 소거), 일일한도 5→7 보상. 5분 초과 시 예측 cancel(비용 중단, 환불 없음).
**보안(Codex 3회 반복 통과)**: debugError 손님응답 제거·output fetch `redirect:manual`+호스트 화이트리스트·시크릿 fail-closed·status `pr.ok`·4xx/3MB/output누락 명확 실패분류.
**합격 기준(사장님 폰)**: 콜드 상태에서 /style 합성 1회 → 4분 걸려도 사진이 나오면 성공.
**⚠️ 잔여 리스크(수용)**: kickoff 응답 유실/탭 종료 시 재시도하면 1회 더 차감 가능(원장 없이 완전 차단 불가, 손님 자기불리라 악용 아님, 한도 7로 완충). 결제 붙일 때 `hair_jobs` 원장으로 정확한 멱등 도입 예정.
**백로그**: 미커밋 355개(문서·스캐치 + `public/references` 구조 개편) 정리 필요 — ⚠️ references 삭제 커밋 시 배포 자산 누락으로 faceswap 사망 주의(디스크 실물 정합 먼저).

## 🟡 라이브 테스트 수정 FIX1~5 — 커밋·미배포 (2026-08-12)

사장님 실화면 테스트 발견분. **FIX2/3/5 커밋**, FIX1 이미 배포됨, FIX4 진단→env 소관.
- **FIX1 (새치 하위체크)**: 데미지에 **이미 존재**(라이브 청크 확인 `73083ec`). 사장님이 데미지 배포 전 구버전 테스트하신 것. 코드 변경 없음.
- **FIX2 `3fcb7cd` (매직·열펌 분리)**: `straight_perm`(매직) + `heat_perm`(열펌·세팅·디지털) 분리(데미지+스타일). 점수 동일 1.5. **C2 예언은 heat_perm만 트리거**(매직 제외). styleGate 상수·배열·crossBranch usedPerm 반영.
- **FIX3 `0ce37f6` (링크 숨김)**: 데미지 결과지 `SHOW_HAIRQUIZ=false`·`SHOW_ITEMS=false`(플래그, 삭제 아님). 중복 스타일 텍스트링크 제거→LockedPreviewCard 송객 1개. 인라인 제품카드 유지.
- **FIX4 (faceswap AFTER 실패)**: ⚠️ **정정됨(2026-08-12, 위 최상단 섹션)** — "env `REPLICATE_API_TOKEN` 문제" 결론은 오진. 실제 원인은 **GPU 콜드스타트 큐(3~4.5분)가 동기대기 타임아웃 초과**. 비동기 폴링 전환으로 해결·배포 완료(`32b6ef5`).
- **FIX5 `cb7a23f` (QQ8 오타)**: 스타일 설문 `Q{q.no}`→`{q.no}`.
- 미조치(확인만): 시술이력 두 랜딩 중복=정상(확정118 보류), 손대지 않음.

## 🟡 /damage-check 개편 §1~§5 — 커밋 완료·미배포 (2026-08-11)

**근거**: 확정 68·72·73·77·80·81·85·95·104·106·115·116 (PM 붙여넣기 = 스펙, 지시서 파일 없음). **커밋 `522b736`**, tsc·next build 통과. ⚠️ **미배포**.
- **§1 건조 뒤집기(확정115)**: 자연건조 "감고 나서 다 마르는 데" · slow=한참걸린다=손상. `DRY_SEVERITY`/`DRY_HEAT_BONUS` 폐기 → `DRY_ADJ`(오래1/빨리0). **축(heat/chem/perm) 시스템 통째 폐기** — 유형을 시술이력이 정하므로. (PM 확인: DRY_HEAT_BONUS는 유일 heat 경로 아니었음.)
- **§2 문항**: Q1/Q2 "한 줌"+"잘 모르겠어요"(확정73), Q4 습관다중 폐기 → **시술이력 전용 렌더러**(최근/그전/추가+탈색2회·뿌리새치). 데미지 전용 키 `h_recent/h_prev/h_more/h_bleach_2plus/h_root_gray`(스타일 정렬, 통합 대비).
- **§3 v3 채점**(damageRecommend, const·PM임시): 탈색4.5/열펌1.5/일반염색1/뿌염+0.5·h_more가산·물리±보정(단독 Lv4 불가), 컷 `LV2_MIN=2/LV3_MIN=4.5/LV4_MIN=8.5`, 탈색2회+ Lv4강제. **유형=마지막시술 3버킷**: 화학→건조형/펌→경직형/없음&Lv1→건강모/없음&Lv2↑→건조형흡수(`// TODO 전용칸`). **ENV·MIXED 폐기**. **C2 예언**(확정116): 열펌 AND (뿌리+새치)만.
- **§4 결과지**: 스탬프(Lv+유형)→예언→유형설명→흰머리원고(확정104,새치만 접힘)→제품. 4단계 확정81. "25년 원장 판단 기준" 푸터. % 미노출.
- **§5 제품**: 정수리·볼륨 제외. 18-MEA 약산성 샴푸 간판("채우는 게 아니라, 안 빼앗기는 겁니다", 확정106). 새치 마스카라 최상단(새치 체크 시).
- **경계 준수**: `styleGate.ts`·스타일 자산 불가침. 유형 설명·경직형 제품은 AI 초안(빨간펜 대상).

### ⏭ 데미지 이월 (변동 없음 · PM)
손님 10명 이력→점수 검산→레벨컷 조정 / 매듭·당김 예시 사진 3장(사장님 촬영) / 교차 2~4위 예언(매직×새치 등) / 18-MEA 유사 국내 제품 소싱 / 59칸 전면 재산정.

## 🟢 /style 전면 개편(A) 배포됨 + 카피 최종본 — 2026-08-11

**배포 완료**: `609ea75..430a42a` push → Vercel 빌드 성공, 라이브 `hair-dna.vercel.app/style`. 스모크: /style·/style/survey 콘솔 에러 0건, 렌더 정상. (Q8 육안은 사업주 직접 확인.) ⚠️ 로컬 headless pane은 rAF 정지로 문항 전환 애니메이션이 안 굴러 자동 구동 불가였음(코드 버그 아님) — 실브라우저 정상. **faceswap 재전환은 이 이전(`609ea75`)에 이미 배포됨.**



**근거**: `docs/코드방_대규모수정_지시서_v1.md` + `docs/스타일_결과지_목업_v4.html`. **PM 범위조정**: 이번 패스는 **스타일(A)만**, 데미지(B-1~7)·공용엔진 추출은 별도 패스로 보류(데미지 확정문서 레포 부재 + B-1 실충돌). **원칙**: 지시서/목업 명시 구조+확정카피만, 나머지 원고는 `[카피 대기]`로 비움(임의 생성 금지). ⚠️ **미배포**(커밋만).

**확정문서 상태**: 확정 44~138은 레포에 없음 → 지시서/목업이 유일 스펙. 목업 v4가 갈래 2·5·7 최종카피 제공.

### ✅ 커밋 완료 — A 패스 구조 전부(스코프 커밋, 미배포)
- `100725a` **A-6 네이밍**: 간판명 12조합 맵(design×layer) + 부제(기장+컬). 조립접두어·연령분기 폐기. 부제 세부문구 확정분(목업)만, 나머지 [카피 대기].
- `ecd9689` **A-1① 곱슬 4값**: q3_curl 4값(직/반/곱슬/악성). 매트릭스 108→144(곱슬중간=악성곱슬 복제, 타입서술 [카피 대기]), 코어카피 27→36키(곱슬중간 9키 [카피 대기]). 폴백0건 구성증명.
- `ba36540` **A-2 게이트**: `styleGate.constants.ts`(PM-임시 점수·경계 격리) + `styleGate.ts`. 한 점수→게이트3단+HistoryKey4단. getHairTypeReport 어댑터((가)안).
- `2fb8f0c` **A-1② 시술이력 문항**: q10_history_count 폐기 → 전용 다단계 렌더러(TreatmentHistoryStep). 최근/그전/더+하위체크(탈색2회·뿌리새치), 최근='없음' 단락. 키 q8a_recent/q8b_prev/q8c_more/q8_bleach_2plus/q8_root_gray → styleGate 소비. 결과지 #손상모·isSevereDamage·CTA를 isDamageBlock으로 갱신.
- `18d9210` **A-4 crossBranch**: 10갈래 엔진. 갈래9(차단) 최우선, 복수발동 시 문1개(표순서 첫발동=대표)+흡수. 부가 정수리 카드(새치/뿌염+펌/fine+thin/50대+fine).
- `37fc61a` **A-5 branchCopy**: 갈래별 카피 레지스트리(빈칸-후주입). 갈래 2·5·7 목업 원문, 나머지 [카피 대기]. SCALP_ROUTINE·판정스탬프·주의줄 확정.
- `bd539bc` **A-5 결과지 재작성**: 목업 v4 구조(BA캡션→간판명+부제+스탬프3단→예언→아하→꿀팁+정수리접기→시술참고접기(대표+흡수)→제품3종→저장). 게이트 주의=노란줄+CTA/차단=스탬프전환·After유지. 살롱 스크립트 카드 삭제. 금지어 grep 클린.

### ✅ 마무리 검증
- **tsc 무에러**(각 단계). **폴백0건**: 매트릭스 4×36=144·코어 4×9=36 구성증명(런타임 전수 스윕은 node TS resolver 이슈로 보류, 구성상 완전). **금지어 grep 클린**(재미로/복구·재생·영양·강화·탈모). **A-7**: q3_curl은 faceswap 슬롯키(referencePick)에 없음 → 영향 없음 확인.
- **next build 성공(exit 0)**: 전 라우트 컴파일 완료(/style/survey·/style/result 포함), lint·타입 에러 0(dangerouslySetInnerHTML 통과). A 패스 프로덕션 빌드 검증 완료.

### ✅ 카피 최종본 주입 완료 — `13ddd1b` (docs/카피_최종본_코드방주입용.md)
- **branchCopy**: 갈래 1~10 전 원문(2·5·7도 새 원문 교체), 7필드. 제품 마스터 P1~P8 통일(구표기 8종 grep 0). 갈래9 제품 미노출. 신규 공용 `curlyMidCopy.ts`(C1~C9) → hairTypeCopy 9키 + matrix 타입서술(§3). recommend 부제 12개. 정수리 6단계 '집게형 볼륨 롤', 갈래 3·5·10 공용. **[카피 대기] 0건 · tsc · next build 통과.**
- 참고: getHairTypeCopy/discoveryItemHint는 현재 결과지에서 미렌더(갈래 구조로 대체)지만 타입시스템·후속 서피스 위해 채워둠.

### ⏭ 남음: 게이트 튜닝 + B 패스(별도)
- **게이트 임시값 튜닝**: `styleGate.constants.ts`(형님 분포 시뮬 후).
- **B 패스(데미지)**: 지시서 B-1~7 별도. 건조문항 충돌 PM 재확정 대기.
- 배포: A 완료 후 별도 승인.

### PM 확정 답(이번 세션)
- (가)안: 게이트 점수 하나로 HistoryKey 파생. 경계 0~1.4/1.5~4.4/4.5~6.9/7.0+ → styleGate.constants(PM-임시).
- 블로커3: 곱슬중간 modifier/케어 = 악성곱슬 복제, 핵심카피 [카피 대기].
- B(데미지)·건조문항: 이번 범위 밖.

## 🟡 합성 모델 faceswap 재전환 — 커밋 대기(미배포) (2026-08-08)

**OpenAI gpt-image → Replicate faceswap 되돌림.** 채택 = `ddvinh1/face-swap-gpu` · `enhance=false`(스윕 최선, 0.37s·≈₩0). 근거: 합성 방식 전수 탐색 결과 gpt-image는 얼굴을 미화·재생성해 정체성이 흔들렸고, 인페인팅 경로도 실전 장벽(스킨톤 이음새·자동 랜드마크·재동의)이 커 폐기. **git revert 아님 — 코드 호출부와 방침 문구만 교체, 그간 개선(A안 미저장·한국어 실패 UX·환불·가드레일 4종)은 유지.** ★ **미커밋·미배포**(사업주 승인 대기).

- **모델 단일출처 `lib/hairSynthModel.ts`**: `HAIRSYNTH_MODEL`=ddvinh1/face-swap-gpu, `HAIRSYNTH_MODEL_VERSION`=d766886c…2971d(해시 고정), `HAIRSYNTH_ENHANCE=false`(핵심 상수). 프롬프트·quality·size·output_format 상수 전부 제거(faceswap은 프롬프트 안 받음).
- **route 재작성**: `REPLICATE_API_TOKEN` 사용, 예측 생성(`Prefer: wait`)+폴백 폴링. **입력순서 고정: swap_image=셀카(얼굴)/input_image=레퍼런스(헤어)**. 결과는 output URL을 fetch→**data URI**로 반환(서버·Blob 미저장 유지). Codex 지적 반영: 출력 크기 가드(3MB, data URI 한도 방어)·`succeeded`는 응답 객체 생성 후 설정(직렬화 실패 시 환불 유지).
- **Phase 0-1 결과**: face-swap-gpu는 **data URI 입력 수용 확정**(이번 세션 fs3 combo A로 재확인) → **Blob 부활 불필요, "서버 미저장" 유지**.
- **OpenAI 정리(1-4)**: `OPENAI_API_KEY`·`api.openai.com`·`OPENAI_EDIT_ENDPOINT`·gpt-image 상수 **기능 참조 0건**(grep 증명). dead route `app/api/analyze-face/route.ts`(gpt-4o, 호출부 없음 — PROJECT_STATE 기존 감사서 dead 확정)를 삭제해 0건 달성.
- **방침 정합(Replicate 공식 확인)**: §4 표 OpenAI→**Replicate, LLC (미국)**. §5 국외이전 값 교체(항목 구조 유지) — 이전받는 자 **Replicate, LLC / 101 Townsend Street, San Francisco, CA 94107** · 연락처 **privacy@replicate.com** · 처리방침 **replicate.com/privacy** · 학습 **원본 입력·출력 미사용, 익명·집계 통계만**(replicate.com/terms) · 보유 **API 예측 입·출력·로그 기본 1시간 후 자동 삭제**(replicate.com/docs/topics/predictions/data-retention). 동의화면 "미국(OpenAI)"→"미국(Replicate)"+파기서술 1시간. `CONSENT_POLICY_VERSION 2026-08-08`(재동의 강제) + /privacy 시행일 2026년 8월 8일.
- **Phase 3-1 진행표시**: 3단계 간격 2.5s→1.1s + **최소 표시 2.8s**(faceswap 0.4s라 깜빡임 방지). "보통 30초 안팎"→"보통 몇 초면 끝나요".
- **검증**: tsc 무에러 · **Codex 통과**(입력순서·가드레일 4종·방침 정합·환불·크기가드 확인). 레퍼런스 manifest·폴백·budget·bump·refund 불변.
- 🔴 **사업주 배포 전 필수**: (1) **Vercel env `REPLICATE_API_TOKEN` 등록(Prod·Preview) 확인** — 없으면 no_token. (2) **Replicate spend limit(월 예산 상한) 설정**. (3) 선택: 미사용 `OPENAI_API_KEY` env 제거. (4) 커밋·배포 승인.
- 🟡 **배포 후 사업주 실기기**: 실합성 1회(얼굴 유지+헤어 교체) · 재동의 재노출(2026-08-08) · `user_consents`에 `policy_version='2026-08-08'` 3종 적재.

## (재전환됨 → 위 faceswap 섹션) 🟢 합성 모델 OpenAI 라이브였음 (2026-08-07)

**Replicate faceswap → OpenAI `gpt-image-1-mini`(quality "low") 전면 전환.** "얼굴 유지 + 머리만 교체"가 faceswap보다 우수(블라인드 A/B로 사업주 결정). **셀카 미저장(A안)**. **커밋 `8863dd4` → 배포 `hair-ie37ek4r7`(● Ready), main push(`54c77d9..8863dd4`).**

- **모델**: `/v1/images/edits` · gpt-image-1-mini · quality="low" · jpeg 출력. **단일출처 `lib/hairSynthModel.ts`**(quality 한 줄로 low↔medium 전환). 프롬프트=얼굴보존/헤어충실도 분리 + 흰 반팔 통일.
- **셀카 미저장(A안)**: Blob 업/삭제 제거, 셀카를 요청에 **바이트로만** 실어 OpenAI 전송. 결과도 **data URI**(서버·Blob 미저장) → orphan 갭 소멸. image[0]=셀카/[1]=레퍼런스 순서 고정. 레퍼런스는 공개 URL에서 바이트 fetch(manifest·폴백 해석 유지, public/references 읽기전용).
- **죽은코드 제거**: `faceswapModel.ts`·`storage.ts` 삭제, `REPLICATE_*` 코드 0(grep). `@vercel/blob`은 admin mirror-image가 계속 써서 유지.
- **재동의 + 방침 정합**: `CONSENT_POLICY_VERSION 2026-08-07`(전 유저 재동의) + /privacy 시행일 + §3/§4/§5 + 동의화면 + 업로드 문구를 **OpenAI OpCo, LLC·"서버 미저장"·학습 미사용·30일 보관·거부방법(§28-8)**으로 전면 교체.
- **가드레일 4종 불변**(로그인401·동의403·일일한도429·환불). Codex 통과(예산 첫줄 이동·bump 후 전경로 환불·셀카 크기가드·content_flagged 안전필터 한국어).
- **배포 후 스모크 통과**: ① 무인증 401 `login_required` ② 레퍼런스 200 image/jpeg ③ /privacy 라이브에 "OpenAI OpCo, LLC"·"2026년 8월 7일"·"privacy@openai.com"·"최대 30일" 노출, **Replicate 0건**.
- 🔴 **사업주 조치(배포됐으나 이거 전엔 합성 안 됨)**: (1) **Vercel env `OPENAI_API_KEY` 등록(Prod·Preview) + 재배포** — 없으면 no_token. (2) **OpenAI usage limit(월 예산 상한) 설정** — Replicate spend limit 방어 대체(감사서 O-02 재개봉). (3) 선택: 미사용 `REPLICATE_*` env 제거.
- 🟡 **사업주 실기기 확인**: 실합성 1회(얼굴 유지+머리 교체·흰반팔) / **재동의 재노출**(2026-08-07로 올라 동의화면 재등장 — 8/4엔 스킵됐음) / `user_consents`에 `policy_version='2026-08-07'` 3종 적재.
- ⚠️ `selfie1.jpg`·`selfie2.jpg` 로컬 삭제 — 환경 권한거부로 Claude가 못 지움 → **사업주 직접 삭제**. `.env.local` OPENAI_API_KEY는 gitignored 잔존(로컬용).

## (모델 재전환됨 → 위 OpenAI 섹션) 🟢 faceswap lucataco 라이브 (2026-08-06)

**원인 확정(Replicate 실기록)**: 8/5 배포된 **codeplugtech(278a81e7)의 predict_time가 56.9s·59.3s**로 함수 예산(52s)을 넘겨 `poll_timeout`("지금 잠시 붐볐어요"). **prediction 자체는 Replicate에서 succeeded**였고 결과 이미지도 생성됐으나 우리가 안 기다리고 버렸다. 큐 0초·입력 fetch 정상(input_image=hair-dna.vercel.app 확인) → 순수 "모델이 느림". 진짜 원인 = 6/25 옛 동작본(**lucataco 9a4298**, 실측 0.6~1s)을 주석이 "codeplugtech"으로 **잘못 라벨** → 8/5 복원 때 진짜 codeplugtech으로 오전환.

- **원복 커밋 `19fbeff` → 배포 `hair-62laej28n`(● Ready), main push(`b9e2587..19fbeff`)**:
  - 모델 **lucataco/faceswap 해시 `9a4298…843d20d`**. 스키마 `{target_image=레퍼런스, swap_image=셀카}`.
  - **모델명·해시 단일출처 `lib/faceswapModel.ts`** 신설(라벨↔실물 재분리 방지). 코드에 `278a81e7` 0건(grep 증명).
  - Prefer wait 45→10, 진단로그(prediction id/status/get) 추가, `canceled` 명시 처리(초기·폴링).
  - 잘못된 라벨 정정: 라우트 주석 + `DESIGN_task3_faceswap.md:8` 미결문구→확정.
- **canary(배포 전, `.env.local` 토큰 직접 요청)**: lucataco 9a4298 + target/swap 스키마 → **HTTP 201·succeeded·predict_time 1.15s**(codeplugtech 57~59s 대비).
- **배포 후 스모크**: ③ 무인증 `/api/hair-transform` 401(가드레일), ① 레퍼런스 외부 GET 200 image redirects=0.
- **가드레일 불변**: 로그인401·동의403·일일한도429·비용상한·셀카 finally 삭제. Codex 통과("입력 필드 의미 안 뒤바뀜·매핑 그대로").
- 🟡 **남은 사장 확인**: (a) **실기기 실제 합성 1회** → Replicate 대시보드 소요 1초대 + 6/25 결과 대비 **얼굴 보존·아티팩트(★50·60 얼굴 — 이번 전체 라운드 목적)** (b) `hair_usage_refund.sql` 실행(미실행이면 실패 시 차감).

## (모델 원복됨 → 위 섹션) 🟢 faceswap 프로덕션 라이브 — 스모크 ①③ 통과 (2026-08-05)

**flux-kontext(텍스트 생성) 완전 제거 → codeplugtech/face-swap 전용.** 실서비스 테스트에서 손님 얼굴이 다른/나이 든 얼굴로 나간 결함 대응. **두 라운드(잔업 소탕 + faceswap) main push 완료(`26fa726..2ffe9af`) → 웹훅 프로덕션 배포 `hair-i41km6oma`(● Ready).**

**★ 배포 후 스모크 결과(2026-08-05):**
- **① 레퍼런스 URL 외부 무인증 GET(=getAssetBaseUrl 산출 public alias) → ✅ 200 · `image/jpeg` · redirects=0 · 56298B.** **대조군: 같은 파일을 배포도메인(SSO보호)으로 부르면 302 재현** → 아침 장애 원인이 이 fix로 해소됨을 side-by-side 입증(브라우저 200만 보고 넘겼던 실수 반복 안 함 — 무인증 curl로 확인).
- **③ 무인증 POST /api/hair-transform → ✅ 401 `login_required`**(로그인 가드레일 라이브 생존).
- **② Replicate 실fetch 합성 canary — 미실행(REPLICATE 토큰=§4라 Claude가 못 씀).** ①이 "URL 공개 fetch 가능"을 입증하므로 Replicate 접근 조건은 충족. 남은 실패모드는 정직한 실패화면(가짜얼굴/전건장애 아님). **→ 사장 실기기 실제 합성으로 최종 확인 요망.**
- **④ REPLICATE_VERSION/토큰/잔액 — §4(env·계정)라 미확인. → 사장 Replicate 대시보드 확인.**
- **롤백 안 함**: 롤백 게이트(①/② 실패)에서 ①은 통과, ②는 "실패"가 아니라 "Claude가 실행 불가"(사장 확인 대상)라 유지 판정.

🟡 **남은 사장 조치**: (a) 실기기 합성 1회(②검증) (b) `hair_usage_refund.sql` 실행(C-2 활성화 — 미실행이면 실패도 차감됨) (c) Replicate 잔액 확인.

- **핵심 발견**: 롤백(`26fa726`) 후 프로덕션은 처음부터 끝까지 **flux-kontext(생성형)**였고 faceswap은 코드에 없었음. 손님이 본 "다른 얼굴"은 **폴백이 아니라 flux가 신원을 보존 못 한 것**(flux가 유일 경로였음). → 재전환은 폴백 삭제가 아니라 모델 교체.
- **커밋(미push, main `b3dffe1`→`12cb523`, 앞 잔업라운드 위에 얹음)**:
  - `b3dffe1` **Phase B 재전환** — flux 모델호출·프롬프트(`buildHairStylePrompt`) 완전 삭제(grep 0). codeplugtech/face-swap 복원(`input_image`=레퍼런스/`swap_image`=셀카, `/v1/predictions`+version). `referencePick.ts`·`referencesManifest.json`(42슬롯/60장)·prebuild 생성기 복원. **롤백 원인 URL-302 수정: `getAssetBaseUrl`이 배포환경에서 공개 alias `hair-dna.vercel.app`을 고정 최우선**(요청Host·env·VERCEL_URL 추론 안 함 — Codex 반론 반영, 호스트 스푸핑·스테일 env 차단). 레퍼런스 내부 폴백(규칙 6-가) 유지.
  - `f83eddc` **C1 실패 UX** — 결과지 raw 에러(영어) 제거 → 사유별 한국어(face_not_detected="밝은 곳서 정면 다시 찍어주세요"/그 외="잠시 후 다시"). 401→로그인·403(consent)→동의 리다이렉트(서버 fail-closed 불변). 성공/실패 이벤트(`hair_transform_done`/`hair_transform_fail`, 사유 allowlist 정규화). Sentry에 원본에러(DSN 미설정 시 no-op).
  - `944a067` **C2 실패 시 미차감** — 예약→성공확정/실패환불. `supabase/hair_usage_refund.sql` 신규(**⚠️사업주 직접 실행, §4**). 셀카삭제 가드레일 우선(중첩 try/finally). 미실행 시 degrade(기존=선차감 유지, 서비스 정상).
  - `12cb523` **D 진행표시·고지** — 로딩 3단계 사람말("사진 확인 중"→"스타일 입히는 중"→"마무리 중")+소요시간 범위("보통 30초 안팎"). 미리보기 고지 복원("미리 만들어 본 스타일 이미지예요. 실제 시술 결과와 다를 수 있어요").
- **가드레일 불변(Codex 4회 검수 확인)**: 로그인401·동의403 fail-closed·일일한도429·비용상한 budget·셀카 finally 즉시삭제 — 전부 보존.
- 🔴 **배포 전 필수 관문(안 하면 전건 실패 재발)**:
  1. **스모크 교정(필수)**: `getAssetBaseUrl` 실제 URL을 **쿠키·인증 없는 외부 GET**으로 때려 **200 image/*** 확인(브라우저 200만으론 부족 — 과거 장애가 그렇게 샘). + Replicate 실fetch canary.
  2. **REPLICATE 토큰/VERSION env** + Replicate 계정 정상.
  3. **C-2 활성화**: 사업주가 `hair_usage_refund.sql` 실행(미실행이면 실패도 차감됨 — 서비스 자체는 정상).
- **사장님 눈으로 확인(배포 후)**: /style→설문→사진→합성 **성공** 시 얼굴 보존+레퍼런스 헤어스타일. **일부러 실패시키는 법**: 얼굴이 안 나온 사진(손·풍경 등)을 업로드 → "얼굴이 잘 안 보여요…다시 찍어주세요" + [다시 찍기]. 어드민/SQL로 `events` `event_name='hair_transform_fail'`·`meta.reason` 확인. refund SQL 실행 상태면 실패 후 일일횟수 안 깎임.
- ⚠️ **앞 잔업 소탕 라운드(아래)도 함께 미push** — push는 사장 승인 후 두 라운드 한 번에.

## 🧹 잔업 소탕 라운드 — Phase 0·1·3·4 커밋 완료 · 1-4 보류·2 보류 (2026-08-05)

계측 조사(`docs/INSTRUMENTATION_AUDIT_2026-08-05.md`) 후속. **push 안 함(커밋만) — 배포는 사장 승인 후 별도.** 라이브는 여전히 flux(롤백 상태).
**커밋 범위: `564037f`(track제거) → `3c9e6dc`(죽은함수) → `f4a0e21`(게이지링크) → `2e8297a`(구매세그) → `cdcbd16`(문서) → `391e809`(사진화면).** 사장이 눈으로 볼 곳은 아래 각 항목 "확인" 참조.

- **커밋(미push, main)**:
  - `564037f` **/api/track 죽은 경로 제거(시스템 B)** — route.ts + lib/analytics `trackServer` + app/result(리다이렉트로 도달불가) 호출부. 살아있는 시스템 A(`lib/eventTracking`) 불변. Codex: 제거 로직 자체 통과(전체 워킹트리 diff의 범위 오염만 지적 → 해당 3파일만 스테이징해 커밋).
  - `3c9e6dc` **죽은 추천함수 5종 삭제(S-07)** — getStyleProduct/getSecondStyleProduct(가짜 "어뷰티…샴푸" 상품카피)·buildAhaText·buildCarePrescription·buildAIDiagnosisText + 고아 심볼(AHA_BLOCKS·getPrimaryConcern·HairConcern·AhaBlock·CarePrescription·StyleProduct). 살아있는 getStyleEntry·toSheetAnswers·getHairTypeReport 불변. 전수 grep 미참조 확인.
  - `f4a0e21` **완성도 게이지 미완료 칸 링크화(L-03)** — InlineCompletion 미완료 칸 → 해당 랜딩(/style·/damage-check·/bangs·/hair-quiz). `completion_nav_click` 이벤트 신설(B6 "랜딩 간 이동 미측정" 갭 해소). 50·60 탭영역 확대(py-2.5 -my-2.5).
  - `2e8297a` **purchase_click meta 세그먼트 3종(D-01)** — coreKey·ageGroup(q1_age 원값)·treatmentFreq(q10_history_count 원값). 진단 전 방문자는 3값 null 안전 적재. 확인경로: `events.meta.{coreKey,ageGroup,treatmentFreq}` (event_name='purchase_click'). 컬럼승격(D-02/D-05)은 미착수.
- **Phase 1-2(L-02) 무변경**: style 저장 `kind:"style"` 명시는 이미 `27d6780`(2026-07-20)에 완료돼 있었음(감사서가 stale). classifyKind 폴백 유지 → 추가 작업 없음.
- ✅ **Phase 3(사진화면) A안 구현·커밋(`391e809`)**: 사장 A안 채택. 국외이전 문구 제거(로그인 시 동의·user_consents 기록 완료·/privacy §5 상세) + "곧바로 삭제돼요"(단정) → **"원본 삭제를 곧바로 진행해요"**(/privacy "삭제를 곧바로 진행"과 동일 강도) + 큰 고지박스 → 안심 한 줄, 하단 얇게(pt-4) → **촬영 가이드가 화면 주인공**(잘림 원인=하단 고정블록 과대였음). **동의 게이트·서버 403 fail-closed·onConfirm 불변(표시만).** **CONSENT_POLICY_VERSION 상향 불필요**(동의내용 불변). Codex 통과("삭제 강도 정합·게이트 미훼손·JSX 정상"). **확인: 로그인 후 /style → 설문 → 사진 등록 진입 시 가이드 화면**(국외이전 문구 사라짐, 안심 한 줄만).
- 🔵 **Phase 1-4(이벤트 위조 방어) — 이번엔 안 함(사장 결정)**: 검증 결과 events는 브라우저 **anon키로 Supabase 직 insert**(서버 수집라우트 없음, `eventTracking.ts:296`) → 클라 allowlist/Origin은 위조에 무력(anon키로 REST 직접 우회 가능), meta캡은 `sanitizeMeta`에 이미 존재. 효과 없는 클라 방어는 넣지 않기로. **진짜 방어 = 서버 인제스트 라우트 + anon INSERT 회수(RLS/스키마) → 별도 라운드**(영상 돌리기 직전 레이트리밋과 함께 검토 후보).
- 🔴 **Phase 2 보류(사장 지시)**: faceswap-only 재전환(§0-6) 완료 후 그 위에 얹는다. 지금 라이브가 flux라 Phase 2-1(진행표시) 전제 불일치. 2-2 에러문구도 §0-6 규칙 위에서.

## (해소됨) 🔴 faceswap 프로덕션 장애 → flux 롤백 (2026-08-05) — ✅ 위 "faceswap 전용 재전환" 커밋으로 대체됨

**증상**: 프로덕션 faceswap 합성이 "Replicate 폴링 타임아웃"으로 전건 실패.
**확정 근본원인(추측 아님, 증거)**: `getBaseUrl`이 레퍼런스 URL을 **VERCEL_URL(배포도메인)** 으로 만드는데, 그 배포도메인(`hair-xxxxx-beclassyhairs-3736s-projects.vercel.app`)은 **Vercel 배포보호(SSO)로 302→vercel.com/sso-api**를 반환한다(curl 실측). 그래서 Replicate가 `input_image`(레퍼런스)를 못 가져와 prediction이 starting에서 멈추고 우리 폴링(~52s)이 타임아웃. **공개 alias `hair-dna.vercel.app`는 200**이라 canary(data URI)·스모크(alias 직접 fetch)는 성공했었음 → 실경로만 실패. (스모크가 alias를 직접 썼지 코드의 getBaseUrl 출력을 안 써서 못 잡음 — 재발방지 교훈.)
- **롤백 완료(`26fa726`, main push→프로덕션 `hair-77s7ny6yb` Ready)**: route.ts·styleReference.ts·result/page.tsx·package.json을 `f5f22bc`(flux)로 복원 + referencePick/manifest/gen스크립트 제거. **레퍼런스 60장·폴백 이미지는 유지**(무해, 재전환 시 재사용). (Vercel instant rollback은 직전 배포까지만=Pro 필요라 코드 롤백으로.)
- **라이브 검증**: 무인증 hair-transform 401(로그인게이트) / privacy 보호책임자·시행일 유지 / /login/consent 200(동의게이트) / /style·/diagnosis·/items 200. **오늘의 동의게이트·privacy 전부 유지.**
- 🟡 **faceswap 재전환 수정안(구현·배포 X, 승인·Replicate 복구 후)**:
  1. **1순위(사장 env)**: Vercel 프로덕션 env에 `NEXT_PUBLIC_SITE_URL=https://hair-dna.vercel.app` 등록 → getBaseUrl이 공개 alias로 레퍼런스 URL 생성(§4라 값 등록은 사장). NEXT_PUBLIC_*은 빌드타임 인라인이라 등록 후 재배포 필수.
  2. **코드 하드닝(권장)**: getBaseUrl이 레퍼런스 같은 **공개 자산 URL**은 VERCEL_URL(배포도메인)보다 요청 Host헤더(공개 alias)를 우선하도록. env 없이도 안전.
  3. **스모크 교정(필수)**: 재전환 전 스모크는 **코드의 getBaseUrl이 실제로 만든 URL**을 Replicate로 fetch시켜 검증(이번처럼 alias를 직접 넣지 말 것). 이게 이 버그를 잡는 유일한 게이트.
  - 순서: env 등록 → 코드 하드닝(선택) → 프리뷰/프로덕션에서 getBaseUrl 실측 URL이 200인지 + Replicate 실fetch canary → 됨 확인 후 faceswap 재전환.
- ⚠️ Replicate 목록 API가 조사 시점 500(Internal server error) 반환 → prediction 원문 로그는 사장님이 Replicate 대시보드에서 직접 확인 가능(원인은 URL 302로 이미 확정이라 블로커 아님).

## (이전) faceswap 전환 — 프로덕션 배포·스모크 통과 (2026-08-05, 위 장애로 롤백됨)

`/api/hair-transform`를 flux-kontext($0.04) → **codeplugtech/face-swap($≈0.01) 복원(그래프트)**. 사업주 품질승인 후 `feat/faceswap-restore` → **main clean FF 머지(`f5f22bc..ae2a167`) → 프로덕션 배포 Ready**.
- **프로덕션 스모크 전부 통과**: ① 레퍼런스 URL 200(bob jpg·chest png·루트 폴백 c9248590) ② 무인증 `/api/hair-transform` → **401 `login_required`**(로그인 가드레일 라이브 정상) ③ **Replicate가 프로덕션 레퍼런스 URL 정상 fetch·합성**(output image/jpeg 200 — 프리뷰서 302로 막혔던 지점 해소).
- **폴백 배선(`ae2a167`)**: `DEFAULT_REFERENCE_PATH` → 사업주가 references 루트에 넣은 `c9248590…jpg`(정면·단일얼굴). 빈 슬롯·폴백 실패 시 최종 캔버스.
- **REPLICATE_VERSION**: 코드에 `278a81e7` 기본값 고정 → env 없이도 프로덕션이 그 해시 사용(env 설정은 사업주 선택 하드닝).
- **가드레일**: 로그인401 라이브 검증. 동의403 fail-closed·일일한도429·비용상한·셀카 finally 즉시삭제는 로그인 뒤 동일 블록에 byte-보존(Codex diff 검증) — 인증 요청(사업주 실기기)에서 동작.
- **롤백**: 문제 시 직전 프로덕션(flux, `hair-6lynwjslz` 등) Instant Rollback 대기.
- ⚠️ 미커밋 임시파일 `_canary_tmp.mjs`(프로젝트 루트, 미추적·미배포·무해) — 샌드박스가 터미널 삭제 차단. `git add .` 금지 유지하면 커밋 안 됨. 수동 삭제 요망.

### (이전) 브랜치 구현 기록
- **그래프트(revert 아님)**: 모델 호출부만 이식 — 엔드포인트 `/v1/predictions`+version(`278a81e7`), 입력빌더 `{input_image=레퍼런스, swap_image=셀카}`. **가드레일(로그인401·동의403 fail-closed·일일한도429·비용상한·셀카 finally 즉시삭제) 전부 보존**(diff·Codex 확인).
- **레퍼런스 해석 = 빌드타임 manifest**(`lib/referencesManifest.json`, 42슬롯/60장). 런타임 fs 폐기(Vercel 서버리스 대비). `prebuild` 훅 자동재생성. 경로 무나이 `<len>/<heavy|medium|light>/<curl>`, shoulder→collarbone, 슬롯키 allowlist(traversal 불가), 폴백 체인.
- **레퍼런스 60장 커밋·배포**(사업주 자산, 내용 무변경 §0). default_style.jpg는 로컬삭제·커밋본 존재 → **사업주 대표 폴백 1장 지정 대기**.
- **결과지 UI 고지** "AI 스타일 미리보기·실제와 다를 수 있음" 추가. 셀카 URL 로깅 제거.
- **Codex 검수 2회 통과**(치명: codeplugtech 스키마가 target_image 아닌 `input_image`=Target image → 수정). tsc 통과.
- **canary 1회 성공**: data URI로 레퍼런스 2장 전송 → HTTP 202→succeeded, output image/jpeg 200. **캔버스 단발+뱅에 얼굴 자연 스왑 확인**(제품 동작 재현). 결과 이미지 사업주 전달함.
- 🔴 **프리뷰 레퍼런스 URL은 Vercel 배포보호로 302**(Replicate 미접근). **프로덕션 도메인은 공개 200**이라 머지 후 정상. 이게 전면전환 전제.
- 🟡 **다음(승인 후)**: 사업주 품질승인 → main 머지(프로덕션 전환) + 대표 폴백 지정. `REPLICATE_VERSION` env 고정 권장. 미커밋 임시파일 `_canary_tmp.mjs`(무해) 삭제 필요(샌드박스가 터미널 삭제 차단).

## ✅ /privacy 본문 마감 — 프로덕션 배포 완료 (2026-08-05, Phase A)

법적 마감 라운드 Phase A. `app/privacy/page.tsx` 단일 파일(`2f3b7c5`) → main push → 웹훅 프로덕션 배포 `hair-6lxsker9g`(● Ready). **라이브 검증(hair-dna.vercel.app/privacy) 통과**: HTTP 200 / 보호책임자 김진성·beclassyhairs@gmail.com 노출 / 초안배너 0 / 시행일 2026년 8월 2일 / **noindex 메타 제거(색인 허용)** / 수탁표 "Vercel Blob"·"Google Sheets" 표기.
- **반영**: 보호책임자 실값, noindex 해제, 초안배너·(초안)표기 제거, 시행일 2026-08-02(`CONSENT_POLICY_VERSION` 정합·같은 성격 커밋), 수탁표 명칭 정밀화, 셀카 파기 문구를 best-effort 실동작에 맞춰 행위 서술로 정직화("삭제를 곧바로 진행"), 국외이전 Replicate 보유주체 분리, 삭제권(6항) "셀프 삭제기능 없음→보호책임자 이메일 10일 내 조치·통지+제외항목".
- **Codex 3차 통과**: "식별자 삭제≠개인정보 파기" 과장 경계. (a)셀카 지체없이삭제 결과보증 (b)Replicate 파기보증 (c)"익명 집계" 법적 단정 3건 지적 → 행위·사실 서술로 완화. 의도적 유지: 시행일 2026-08-02(상수 정합 불변식), "익명" 법적 라벨 제거하고 "개인식별정보 제외" 사실만(재식별 판단은 사장/변호사 몫 — PM ③).
- 🟡 **Phase B(삭제 기능) 착수 예정**: soft-delete(users.deleted_at)+세션폐기+deleted_at 필터+조건부 유니크+RPC 단일 트랜잭션. 스키마+RPC 설계→Codex 반론검증→PM 보고 후 멈춤. 되돌릴 수 없는 삭제·스키마는 사장 승인 전 실행 금지.
- **P-01(셀카 합성 후 자동파기)는 이미 구현됨**(hair-transform finally del, best-effort 2회). 신규 삭제코드 불필요. 남은 갭: orphan 정리(스윕/TTL) 부재 — Phase B에서 저비용이면 동반, 아니면 별건.

## (이전) 상태

## 🟡 Sentry 고지 배포 완료 → DSN 켜기 대기 (2026-08-01)

`/privacy` Sentry 국외이전 고지(6항목 불릿·US 리전 확정) **프로덕션 배포 완료(`984c19a`)**. 이제 사업주가 US 리전으로 DSN 발급 → Vercel env 등록·재배포하면 고지가 자동 노출되며 순서가 맞는다. 현재 DSN 미설정이라 Sentry는 완전 no-op(문구도 안 뜸 — 정상). 상세는 아래 「Sentry — 고지 배포 완료 → DSN 켜기 대기」 섹션.

## ✅ 랜딩 히어로 사진 교체 배포 (2026-08-01)

`public/landing/` 히어로 4종(style·damage·bangs·quiz-hero.jpg)을 **50대 모델 사진으로 교체** — 파일명 동일, 코드 변경 없음. 커밋 `0bdb81d`, `feat/ui-ivory-revamp` push(프리뷰) + `vercel --prod`로 프로덕션 배포(`hair-ow3ig46h9`, READY). 라이브 검증: `hair-dna.vercel.app`의 `/diagnosis` 썸네일 4장·`/style` 히어로 전부 200. (파일 실측 880×1168 ~3:4지만 프레임 CSS `aspect-[4/5]`+`object-cover`로 4:5 크롭 — 레이아웃 정상. LandingFrameHero.tsx·diagnosis/page.tsx 주석의 "896×1120 4:5" 표기는 실제 규격과 불일치 → 정정 미실시.)

## ✅ 배포 완료 (2026-07-20)

**랜딩 P0 6종 + 회귀픽스 + 파트너스 제거 + /mbti 분리 — 전부 검증 후 push·배포 완료.** 누적 미push 18커밋을 사용자 승인 하에 일괄 push(`c767c80..3eabdb7`), Vercel 프로덕션 Ready. 라이브 검증: `/style`·`/items`·`/privacy`·`/my-diary` 전부 200, sitemap에서 `/mbti` 제외 확인, `/mbti` noindex 확인, 프로덕션 `/my-diary`에 coupang 링크·고지 0건.

이후 `/mbti` 유입 경로 차단(6a63669) 추가 — 배포 진행 중.

### /mbti 미끼 랜딩 분리 정책 (확정, 2026-07-20)

`/mbti`는 **파트너스 링크·고지를 유지하는 실험장**이고 본진(hair-dna 본 서비스)과 완전 분리한다. **페이지 코드는 삭제하지 않고 방치** — 더 손대지 않는다.

- `app/sitemap.ts`에서 제외 (3eabdb7)
- `app/mbti/layout.tsx`에 `robots: { index: false, follow: false }` — `/mbti/result`도 상속 (3eabdb7)
- `og:`/`twitter:` 태그는 **의도적으로 유지** — 카카오톡 공유 미리보기가 미끼 랜딩의 핵심이고, noindex는 검색 색인만 막지 SNS 공유 카드엔 영향 없음
- `next.config.mjs`의 `/upload`·`/result`·`/ai-loading` 리다이렉트 대상을 `/mbti` → `/style`로 변경 (6a63669). **이게 유일하게 살아 있던 손님 유입 경로였다** — `/diagnosis`(sitemap 공개 엔트리) → `/diagnosis/quick` → `/upload` → 리다이렉트 → `/mbti` 착지. 이제 `/style`로 간다.
- `AdminDashboard` 빈 상태 안내의 `/mbti` 링크 → `/style` (6a63669)
- **현재 코드베이스에 `/mbti` href·리다이렉트 0건** (`/mbti` 자체 코드 제외). 남은 `mbti` 문자열은 전부 링크 아님: AdminDashboard의 analytics 라벨 맵(`mbti_test`, 과거 이벤트 표시용), `/hair-mbti-og.png` 이미지 파일명(`app/result/*` — 라우트 아님), 주석.

> ⚠️ **`/result` 페이지는 도달 불가 코드다.** `next.config.mjs`가 `/result`를 통째로 리다이렉트하므로 `app/result/page.tsx`는 렌더되지 않는다. 과거 이 페이지의 제휴 링크를 제거했지만(f0c4eb8) 실효는 없었고 dead code 정리였다. 이 페이지를 되살리려면 리다이렉트부터 걷어내야 한다.

## ⚠️ 사업자 표시(푸터) — 환경변수 + 재배포 필요 (2026-07-31)

`lib/business.ts`가 사업자 6항목을 **환경변수에서만** 읽는다(소스 하드코딩 금지 — 자택 주소 git 히스토리 잔존 방지). 미설정이면 "" 폴백 → `isBusinessInfoReady()` all-or-nothing 게이트가 false → 푸터 사업자 블록 숨김(링크·저작권은 항상 노출).
- **Vercel 프로젝트 환경변수에 6개 등록 후 반드시 재배포(redeploy)** 해야 반영됨(NEXT_PUBLIC_* = 빌드타임 인라인, 런타임 주입 아님). 변수명(값은 사업주가 Vercel에 직접 입력, 여기 기재 금지):
  `NEXT_PUBLIC_BIZ_COMPANY_NAME`(상호) · `NEXT_PUBLIC_BIZ_REPRESENTATIVE`(대표자) · `NEXT_PUBLIC_BIZ_REG_NO`(사업자등록번호) · `NEXT_PUBLIC_BIZ_MAILORDER_NO`(통신판매업신고번호) · `NEXT_PUBLIC_BIZ_ADDRESS`(주소) · `NEXT_PUBLIC_BIZ_EMAIL`(이메일 — 서비스 전용 계정 개설 대기).
- 전화번호는 표시 6항목에 **없음**(050 안심번호는 추후 별건). 이메일 개설·주소 확정(비상주 사무실 이전) 전까진 블록이 안 뜨는 게 정상.
- ⚠️ 실제 값은 소스·커밋·`.env.example`에 절대 넣지 말 것. Vercel env + 로컬 `.env.local`(gitignored)로만.

## ✅ 카카오 로그인 前 국외이전 동의 화면·서버강제 + 동의기록(user_consents) — 프로덕션 배포 (2026-08-05)

**목적**: 국외이전(얼굴) 동의가 `upload:66 useState(agreed)`뿐이라 어디에도 안 적히던 구조(입증력 0)를 **"한 번 묻고 영구 기록, 안 적혔으면 서버가 차단"**으로 전환. 순서변경(로그인·동의를 사진 前으로)은 부산물.

- **main FF 머지·배포 완료**: `feat/kakao-consent`(3커밋 c0b2898·535b741·11077a1 + 배너제거 74ac895) → main clean FF(`46711d7..74ac895`) → 프로덕션 `hair-5gkgsra5j` Ready. 라이브 검증(무인증): 전 경로 200(미끼 3종 포함 무회귀), 동의화면 "초안" 배너 제거 확인, `/api/hair-transform`·`/api/consents` 무인증 401.
- **동의 기록 user_consents(append-only)**: 서버권위(user_id/policy_version/시각/필수판정=서버, granted 클라 목록만), 멱등 `UNIQUE(user_id, submission_id, consent_type)`, UPDATE/DELETE 차단 트리거, RLS deny-all, **IP 미저장**. 사업주가 `users_auth_schema.sql`+`user_consents_schema.sql` 실행 완료(count 0 확인).
- **서버 강제(§13 B안)**: `/api/hair-transform`에 로그인(:130) 뒤·비용(일일한도) 前 동의 확인 추가 — 미동의/조회실패 모두 **403 fail-closed**. 기존 로그인·일일한도 로직 불변(사이 추가만).
- **게이트(§8)**: 로그인만으론 스킵 불가 — 현재 방침버전 국외이전 동의 보유까지 확인. `/api/auth/me`에 consent 필드 추가(기존 구조 불변→loading 백스톱 무영향). `lib/consentServer`(서버)·`lib/consentGate`(클라)·`lib/consent`(상수 `CONSENT_POLICY_VERSION="2026-08-02"`).
- **Codex**: 1차 반론검증(IP미저장/캐시없음/멱등/게이트/순서) + 2차 보안(멱등키 user_id 누락 실버그·append-only 트리거·pending 수정) + 3차 B안(통과). ⚠️ codex는 `-s read-only` + '레포탐색 금지'로 실행해야 함(안 그러면 승인대기로 hang).
- **프리뷰 카카오 왕복 이슈 해결**: `KAKAO_REDIRECT_URI`가 Prod+Preview 공용이라 프리뷰가 프로덕션으로 튕기던 것 → **Prod 항목은 그대로 두고 Preview 스코프 별도 항목 추가**(프로덕션 폴백 위험 회피, getKakaoEnv는 NEXT_PUBLIC_SITE_URL 폴백에 기본값 없음에 유의).
- 🟡 **남은 것**: (a) **사업주 실기기 최종 스모크**(카카오 로그인 필요 — 정상흐름 / 미동의 직접호출 403 / user_consents insert / 멱등). (b) ~~**/privacy 본문 마감**~~ **[완료 2026-08-05, 위 Phase A 참조]** — 시행일을 현재 버전 2026-08-02에 맞춰 확정했으므로 `CONSENT_POLICY_VERSION` 상향·재동의 없음(PM 결정). (c) 탈퇴는 soft-delete(단계3=Phase B, `docs/DESIGN_consent_and_deletion.md` §4·§7).
- **불변 유지**: `LOGIN_REQUIREMENT_POINT`·`hair-transform` 비용게이트·loading 백스톱·`/api/auth/me` 기존 응답구조.

## ✅ 다이어리 통합 — main FF 머지·프로덕션 배포 완료 (2026-08-02)

**하단탭 "마이헤어" 목적지를 껍데기 더미(/myhair) → 실체(/my-diary)로 통일. 방식 (가)(회귀 최소).**
- 반전 확인: **/my-diary가 실체**(실기록·AI이미지·상품CTA·시술이력), **/myhair가 껍데기 더미**였음. 그래서 "묻은 건 /myhair".
- 변경 3파일(`087ff06`): ① `BottomNav` "마이헤어" href `/myhair`→`/my-diary` ② `/my-diary` 자체 sticky 헤더 제거→**AppShell 하단탭 셸**+명조 제목 "내 헤어 다이어리"(5-B 톤), **카드 기능 본체(4종 카드·이미지 모달·갤러리 저장·/items 상품CTA·TreatmentHistoryField)는 코드 이동 없이 그대로 유지 — 유실 0** ③ `/myhair`는 `REDIRECT_TO_DIARY:boolean=true` 플래그로 `/my-diary` 리다이렉트(더미 데이터·컴포넌트 삭제 없이 보존, 가짜 2건 노출 0, false 플립 시 복귀).
- 홈 "지난 진단 기록 보기" 링크는 **이미 /my-diary**라 통일 상태였음(무변경).
- 배포: `feat/diary-merge` → 프리뷰 push(Ready) → 사업주 실기기 확인 → main **clean FF 머지**(머지커밋 없음, `7a2354f..087ff06`) → 프로덕션 `hair-r6qltsy5q`(● Ready).
- **라이브 검증(hair-dna.vercel.app) 통과**: 하단탭 마이헤어 href `/my-diary` / 홈 링크 `/my-diary` / `/myhair` 307→실브라우저에서 `/my-diary` 착지 / 하단탭 5개+/my-diary 200 / 더미 누출 0 / 시술이력·상품CTA·AI이미지 카드 정상(dev 샘플 주입 검증). 저장→/home 흐름은 결과지 코드 미변경으로 무회귀.
- ⚠️ **주의(다음 세션)**: /myhair는 이제 리다이렉트 스텁이다. 되살리려면 `REDIRECT_TO_DIARY=false`. **하단탭·홈링크·구 /myhair 세 경로 모두 /my-diary로 수렴** — 새 진입점 만들 때 이 통일 유지.
- 🟡 **다음 라운드(미착수)**: /my-diary 카드의 5-B 선-리스트 톤 심화(현재 카드는 이미지·CTA 보존 위해 카드형 유지) / 히어로 이미지 / 게시판 실기능(카카오 인증).

## ✅ UI 5단계(노안 배려) — main FF 머지·프로덕션 배포 완료 (2026-08-01)

**5단계 묶음 main 머지·배포 완료. 3·4단계(리뱀프 페이지·진단허브 BEST)는 이미 기배포돼 있었음(아래 정정).**
- `feat/ui-ivory-revamp`(11커밋)을 `main`으로 **clean fast-forward 머지**(머지커밋 없음) → `origin/main` push(`1629090..8117b9e`). `origin/main == feat/ui-ivory-revamp`(동일 커밋 `8117b9e`).
- push가 **프로덕션 웹훅 자동배포** 트리거 → `hair-r3q0h7hww`(Production, ● Ready). `vercel --prod` 수동 실행 안 함(웹훅이 정확한 커밋을 빌드 → 로컬 untracked 오염 회피).
- **라이브 검증(hair-dna.vercel.app) 전부 통과**: 하단탭 5개(/diagnosis·/consulting·/home·/items·/myhair)+/style 전부 200. /home `--sub` #6e665b·aux 14px/22.4px. /diagnosis BEST 뱃지+히어로 4종(50대 사진) 깨짐0. /myhair 명조 제목·선 구분 리스트·흰그림자카드0·뱃지 --soft. /consulting 준비중 화면(더미/인기랭킹/🔥/FAB 누출0). /style 콘솔에러0·"저장한 진단 보기" 진입정상(저장→이동 로직 코드 미변경=무회귀).
- **정정**: 이전 문서의 "아이보리 리뱀프 3단계 main 머지 대기" 및 "main은 origin보다 19 뒤처짐"은 **낡은 표기였음**. 실제로 3·4단계(`e114be3`~`c394b70`)+사업자 env(`301721d`·`1629090`)는 이미 origin/main에 있었고, 이번 FF가 새로 올린 건 **5단계(5-A/B/C)+랜딩 히어로 사진(`0bdb81d`)+문서**뿐. 랜딩 사진은 과거 `vercel --prod`로만 배포됐고 git main엔 미반영이었던 것도 이번에 일치됨.
- 🟡 **다음 라운드(이번 미착수)**: 다이어리 통합(/my-diary 폐기, 저장→/myhair 연결)·라우팅 정리 / /myhair·고민상담소 히어로 이미지 / 게시판 실기능(글쓰기·답글·인기정렬·로그인)은 카카오 인증과 함께(BOARD_LIVE=true 플립).

## (이전) UI 5단계 프리뷰 진행 기록

`feat/ui-ivory-revamp` 프리뷰 브랜치. (아래는 머지 전 기록 — 현재는 위 ✅대로 프로덕션 반영됨)

- **5-A 홈 폰트·대비(`b2686b7`)**: 대비 강화가 핵심 — `--sub` #948d82 → **#6e665b**(globals.css). `aux` 13→14px·줄간격 1.5→1.6(tailwind.config). **body 16px·제목류 현행 유지**(PM "본문 현행유지" + h2 18px 위계 보존, "큰글씨앱" 회피 위해 body는 안 올림). 홈: 지난기록 링크 min-h 44px, 프로필 썸네일 84→92px. dev 검증: `--sub` rgb(110,102,91)·aux 14px/22.4px·/style 오버플로 없음.
- **5-B 마이헤어(`7526547`)**: **대상 = /myhair**(지시엔 /my-diary였으나 "고객님의 헤어 기록" 배너·"흰 카드 더미"가 /myhair에만 있어 사업주 확인 후 확정). /my-diary는 **미변경**(localStorage 진단기록+AI이미지+상품CTA 기능 페이지, 회귀 방지). 배너 카드 제거→명조 제목만, 더미 카드→선 구분 리스트(뱃지 --soft/--sub + 요약 + 날짜, 그림자 제거). dev 검증: h1 Noto Serif 22px, 그림자 흰카드 0, 뱃지 bg --soft·text --sub.
- **5-C 고민상담소(/consulting) — 준비중 예고 화면 교체 완료(`4535fff`, B안 승인)**: 조사 결과 **전부 껍데기**(목록=하드코딩 더미 `INITIAL_POSTS`/`HOT_TOPICS`, 글쓰기·답글·좋아요=in-memory만, 인기정렬 로직 없음, 로그인 게이트 없음)여서 **가짜 게시글·댓글·인기순위 노출 전면 중단**. `BOARD_LIVE:boolean=false` 플래그로 더미·핸들러 렌더만 차단(실게시판 코드·상태·핸들러는 **삭제 없이 보존** — 카카오 인증 라운드에 Supabase posts/comments 실데이터 배선하며 true 플립으로 복귀). 노출은 명조 "고민상담소, 곧 열려요" + 안내 1~2줄, 아이보리·절제된 차콜 라인아이콘(검정뱃지·🔥·원색 이모지 0). 하단탭·라우팅 불변. 진입 이벤트 `consult_coming_soon_view` 계측(수요 측정). dev 검증: 더미/인기랭킹/FAB/🔥 누출 0, h1 Noto Serif 22px, 서브 --sub 대비, 탭 유지.
- 🟡 **UI 5단계 남은 것**: (a) /myhair·고민상담소 **히어로 이미지는 다음 라운드**(어울리는 이미지 미정). (b) **main 머지는 여전히 보류** — `feat/ui-ivory-revamp`가 프로덕션이지만 5단계 묶음도 사업주 실기기 확인 후 머지 판정(브랜치 경고 유지). (c) 게시판 **실기능(글쓰기·답글·인기정렬·로그인)은 카카오 인증 라운드**.

## (이전) 현재 상태 한 줄

**법적 P0 전부 닫힘 + 운영 안전망 구축 완료 — 2026-08-01.
다음은 50·60 UI/UX 개편(2덩어리).**

### 사업 방향 전환 (2026-07-31 확정) ⭐ 가장 중요

지원금 심사 탈락 후 방향을 재고정했다.

| | 이전 | 확정 |
|---|---|---|
| 타겟 | 여성 전체 | **50·60 여성 고정** |
| 핵심 과제 | 맞춤 제품 판매 | **50·60 데이터 확보** |
| 뿌리볼륨 제품 | 확정 전제 | **가설 하나일 뿐** |
| 프론트엔드 | 감각적 사진 중심 | **50·60이 "나도 되겠다" 싶게** |
| 제품 | 먼저 소싱 | **데이터 보고 만든다** |

순서: UI/UX 수정 → 테스트 → 데이터 확보 → 제품 제작.
유입은 유튜브 채널. 장기 방향은 온라인 헤어디자이너 상담 강화.

**docs/ROADMAP.md는 이 전환 이전 문서다. 우선순위를 그대로 따르지 마라.**

### 2026-08-01 순서 변경 (PM방 확정)

- **E 고민상담소 게시판 → 현 UI 개편 라운드로 상향** (기존 P3 "카카오 인증 이후"에서 앞당김). **단 조건**: 글쓰기·답글 기능 **실동작부터 조사** → **껍데기(비작동)면 톤 정리만** 하고, **기능 구현(글쓰기·답글)은 카카오 인증과 함께**. → `docs/ROADMAP.md` 「📌 PM방 확정 변경(2026-08-01)」에 동일 기록.
- **가독성 정비 P0 규격(본문 15~16px 등)은 현행 유지** — 변경 없음.

### 2026-08-01 완료 — 법적 P0

- **통신판매업 신고 확인**: 제2026-서울동작-0611호 (신고일 2026-05-04,
  서울 동작구). 공정위 조회로 확인.
  ⚠️ **인터넷도메인이 `쿠팡`으로 등록돼 있다.** hair-dna.vercel.app은
  이 신고에 없다. 지금은 결제를 안 받아 무방하나,
  **PG 붙이기 직전 변경신고 1회 필수**(도메인 추가 + 주소 이전 동시 처리).
  PG 심사에서 신고증 도메인과 결제 도메인을 대조하므로 안 맞으면 반려.
- **사업자등록**: 어뉴컴퍼니 / 602-13-77571 / 간이과세자 / 전자상거래 소매업
- **A-1 푸터 사업자 표시 완료**: lib/business.ts를 하드코딩 상수 →
  process.env 읽기로 전환. `NEXT_PUBLIC_BIZ_*` 6개.
  - all-or-nothing 게이트 `isBusinessInfoReady()` 유지(완화 금지)
  - `BUSINESS_PLACEHOLDER` 상수 유지(디버깅 단서)
  - 하드코딩 금지 이유: 주소가 **사업주 자택(동·호수)** 이고
    PG 연동 시 비상주 사무실 이전 예정 → 값이 바뀐다.
    소스에 박으면 git 히스토리에 영구 잔존.
  - NEXT_PUBLIC_*는 빌드타임 인라인 → **Vercel 등록 후 재배포 필수**

### 2026-08-01 완료 — 운영 안전망

| 항목 | 상태 |
|---|---|
| **B-2 업타임** | ✅ HetrixTools, `/api/health`, 검사지점 도쿄·싱가포르·SF 3곳, 연락처 등록 확인 |
| **B-3 DB 백업** | ✅ **수동 1회 완료** — CSV 6종(users·profiles·diagnoses·hair_usage·events·products), OneDrive 바탕화면(레포 밖) = 클라우드 사본 자동 확보. **자동화는 미착수** |
| **레포 private** | ✅ 전환 완료 |
| **Vercel 배선** | ✅ private 전환 후 push → **8초 만에 웹훅 자동 배포 트리거** → Ready. 배선 정상 확인 |
| **B-1 Sentry** | 🟡 **고지 배포 완료(984c19a)**. `/privacy` 4항·5항에 SENTRY_ENABLED 게이팅 문구 확정(Replicate와 동일 6항목 불릿, US 리전). **DSN 투입만 남음** |

### 2026-08-01 — 백업 유출 조사 결과: 유출 없음 ✅

레포가 7/28까지 public이었고 "백업을 레포 폴더에 저장했다"는 진술이
겹쳐 긴급 조사. **고객 개인정보 백업은 레포에 커밋된 적 없음.**
- 워킹트리 + 히스토리 **전 브랜치 293커밋** + origin 전수 조사
- `kakao_user_id`는 전부 **컬럼 이름**(DDL·마이그레이션·코드·문서).
  실제 데이터 값 0건
- `scripts/dump-table.mjs`는 이름만 dump — 얼굴형 landmark 계산, DB 연결 없음
- 잔여: 과거 history rewrite + force-push 흔적은 로컬에서 100% 배제 불가.
  그런 흔적은 발견되지 않음

### 🔴 다음 세션이 반드시 알아야 할 것

1. **인수인계 v7 §2 절대규칙 9개는 전부 유효하다.**
2. **작업 순서는 PM방이 확정한다.** ROADMAP.md를 근거로 스스로
   다음 작업을 골라 착수하지 마라. (v7 §8)
3. ~~**브랜치 주의**: main 19 뒤처짐 / 3단계 머지 미결~~ **[해소·정정 2026-08-01]**
   `feat/ui-ivory-revamp`를 `main`으로 clean FF 머지·배포 완료(`8117b9e`).
   `origin/main == feat` 동일 커밋. 3·4단계는 이미 기배포였음(위 ✅ 참조).
   로컬 main도 origin/main으로 FF됨.
4. **아이보리 리뱀프는 방향 전환 전 디자인이다.** 50·60 기준으로
   살릴지 다시 볼지 판정이 선행돼야 한다.
5. **진행 중**: 랜딩 히어로 4종 50대 모델 사진 교체(`0bdb81d`, 배포됨)
6. **사업주가 "했다"고 하면 현물부터 확인한다.** 2026-08-01 하루에
   두 번 기억과 실제가 어긋났다(백업·private). v7 §2-7의 재현.

## (이전) 현재 상태 한 줄

**아이보리 리뱀프 3단계 전 페이지 완료 — 커밋·프리뷰 push 완료, 프로덕션(main) 머지 대기(2026-07-31).** 브랜치 `feat/ui-ivory-revamp`. 2단계(토큰)는 이미 프로덕션(`origin/main`=e39fe25). 3단계는 프리뷰에만 있고 **사업주 실기기 확인 후 main 머지 예정**.
- **완료 페이지(전부 dev 검증)**: /home(카드 다이어트+kind태그규칙+0건 빈상태) · 미끼 결과지 3종(손상도·앞머리·퀵진단) · 진단 랜딩 4종(액자 히어로) · 설문 3종+퀵진단설문(명조 질문+알약) · /my-diary(셸 투명+명조+차콜 CTA).
- **핵심 방향**: 텍스처 사선 스와치 **폐기**(판독불가) → 곱슬축 3장 이미지(`public/hairtypes/hairtype_{straight,wavy,curly}-01.jpg`, next/image, coreKey 곱슬축 1:1). 스와치 코드(TextureSwatch/TYPE_SWATCH/SwatchHero)는 미참조 dead code로 보존. 앞머리 결과지만 추천 앞머리 사진 히어로.
- **공용 신설 컴포넌트**: `components/InlineCompletion`(플랫 게이지) · `app/components/HairTypeImage`(홈 썸네일 4:5) · `HairTypeHero`(미끼 히어로) · `LandingFrameHero`(랜딩 액자). `lib/hairType.ts`(곱슬축 매핑) · `lib/beautyProfile.selectHomeTags`(kind 출처 태그 규칙, P0 해소).
- **불변 유지**: /style 흐름, 진단·매칭 로직(coreKey는 deriveCoreKeyFromEntries 재사용), 저장/이벤트/일일한도/카카오공유/푸터, 폰트 크기.
- 🟡 **다음**: 사업주 실기기(프리뷰)로 전 페이지 확인 → OK 시 **main 머지(프로덕션 배포)** 승인 요청. 구 팔레트(cream/gold 등, dead/admin/mbti 전용)·구 토큰 별칭(--surface/--ink-2/--btn-*) 정리는 후속.
- ⚠️ **환경 이슈**: OneDrive가 `.next` 빌드캐시를 잠가 EBUSY 간헐 발생 → `.next` 삭제 후 재빌드로 우회함. 상시 방지엔 `.next`를 OneDrive 동기화 제외 권장.

## (이전) 현재 상태 한 줄

**아이보리 리뱀프 3단계 진행 중 — task0/1/2 + /home 완료(커밋만, 미push), 실기기 확인 대기(2026-07-31).** SSOT: `docs/ui-spec.html` v3. 브랜치 `feat/ui-ivory-revamp`. 2단계(토큰)는 이미 프로덕션 배포됨(`origin/main` = `e39fe25`).
- **task0 자산 정리(`d7be9cd`)**: 모델 사진 6장 `public/textures/1~6.jpg` → `public/landing/`(사진 확인 후 재매핑: 1→damage 2→bangs 3→home 4→style 5→spare 6→quiz). 텍스처 채택 6장(-03 우선/flat -02)만 유지, 탈락 11장은 `public/textures/_rejected/`(미커밋). `public/references/` 무손상.
- **task1 27타입 매핑(`d7be9cd`)**: `lib/textures.ts`에 `TYPE_SWATCH`(coreKey→스와치 primary/secondary) 1단계 확정본 상수화 + "임의 수정 금지" 주석. ratio 50 고정. `swatchForCoreKey()` 헬퍼(폴백 straight). 검증: 27건·flat+care 0·단일 3(#2·#5·#23)·#7~9 secondary=straight 통과. `TextureSwatch.tsx`(clip-path 경계선) 커밋.
- **task2 --tone 폐기(`bdc04a9`)**: 2톤 원칙. `--tone`(globals.css)·`tone` 색(tailwind) 제거. 실사용처 0(정의 2곳뿐)이라 교체 대상 없었음.
- **task3 /home(다음 커밋 예정)**: 스펙 §5/§7대로 전면 재구성. 흰 카드 1장(프로필: 텍스처 스와치 + 최근 진단 기준·날짜 + 타입명 명조 + 태그 ≤4)만, 완성도 게이지·루틴·퀵배너는 카드 벗겨 플랫. 0P·진행률% 제거. coreKey는 기존 `deriveCoreKeyFromEntries` 재사용(매칭 로직 무변경). **AppShell `bg-bg` 제거**(공용 셸 → 아이보리 그라데이션 노출, 5개 AppShell 페이지 공통·무회귀). dev 검증: 흰 카드 1개, 스와치 200, 명조 2곳, body 그라데이션·셸 투명 확인.
- 🟡 **다음**: 사업주 실기기로 /home 색·배경·스와치 확인 → 통과 시 나머지 페이지(미끼 결과지 3종 → 진단 랜딩 4종 → 설문 → /my-diary) 순서 진행. **관문**: /home 확인 후 진행(기존 유지).
- 🔴 **미해결 입력**: 태그 "얼굴형 제외/damage 최신 1건만" 세부 필터는 태그 카테고리 메타데이터 부재로 미적용(표시상 slice(0,4)만). 필요 시 태그 분류 소스 필요.
- 🔴 **결정 1(텍스처 WebP opt/)**: 여전히 미배치, 계속 대기(3단계와 별개 트랙).

## (이전) 현재 상태 한 줄

**아이보리 리뱀프 2단계(토큰 SSOT) 커밋·push 완료 — `feat/ui-ivory-revamp` 브랜치 `e39fe25`, Vercel 프리뷰 대기(2026-07-31, 사업주 승인).** 프론트 전용 2파일(`app/globals.css`·`tailwind.config.ts`).
- **globals.css :root**: 확정 색 토큰 7종(--bg #F5F2EC 아이보리 / --card #FFFFFF / --ink #2A261F 차콜 / --sub #948D82 / --line #E9E3D8 / --soft #EFEAE0 / --tone #7A8B99 "타입명 강조" 전용). 구 토큰명(--surface→--soft, --ink-2→--sub, --btn-* )은 **3단계 마이그레이션 중 별칭으로 병존**. 전역 아이보리 3중 radial 그라데이션(CSS만, 이미지 금지) + `word-break:keep-all`. @layer components에 버튼 3단(.btn-primary 차콜채움·아이보리텍스트 / .btn-secondary 흰배경 / .btn-textlink) + .card-soft(옅은그림자·radius18) — **정의만, 적용은 3단계**.
- **tailwind.config**: sub/soft/tone 색 + sec-1/2/3(12/20/32px) 간격 var 배선. 구 팔레트(cream/gold/champagne/brown)는 **미제거**(라이브 유저 페이지엔 0건, 남은 사용처는 dead/admin/mbti뿐 — 지금 지우면 그 페이지 빌드 깨짐. 3단계 페이지 마이그레이션 때 처리).
- **폰트**: 이미 배선됨(Noto Serif KR 500/600/700 = --font-serif, Pretendard 본문 = --font-sans, 둘 다 `<html>`). 크기 현행 유지. 명조 실적용(헤드라인/타입명)은 3단계.
- **검증**: dev computed style — body bg=rgb(245,242,236) #F5F2EC ✓, color=rgb(42,38,31) #2A261F ✓, word-break keep-all ✓, --tone/--soft/--sub resolve ✓, 컴파일 에러 0. (로컬 스샷 불가 — Browser pane 미표시, 기존 환경 한계.)
- 🔴 **결정 1(텍스처 opt/) 계속 대기**: `public/textures/opt/`에 640px WebP 6장(tex_curl-03.webp 등) 미배치. 원본 JPG 17장만 존재. 배치 확인 전엔 `lib/textures.ts` 매핑·스테이징 안 함(지시대로 생성 금지·대기).
- 🟡 **다음**: 사업주 실기기로 프리뷰 색·배경 확인 → 3단계(페이지 적용: 명조 헤드라인/타입명, 버튼·카드 클래스 배선, 구 토큰명·구 팔레트 제거) 진행 여부 판정. + WebP 배치되면 결정 1 즉시 처리.

## (이전) 현재 상태 한 줄

**`feat/admin-bulk-tag` 브랜치 push + bulk-tag API Codex 검수 통과·하드닝(2026-07-30, 사용자 승인).** origin 커밋 3개: `c3398a0`(클릭추적·제휴 subid 설계 문서) → `7a65cd5`(/admin 일괄 태깅 화면 + bulk-tag API) → `d322370`(Codex 반영 하드닝). 브랜치 업스트림 추적 설정 완료. **아직 main 미머지·배포 안 됨**(브랜치만 올림, PR 생성 링크: github.com/beclassyhairs-ui/hair_DNA/pull/new/feat/admin-bulk-tag).
- **일괄 태깅 도구(`7a65cd5`)**: `app/admin/bulk-tag/page.tsx` + `app/components/admin/BulkTagger.tsx`(383줄) + `POST /api/admin/products/bulk-tag`(80줄, 관리자 게이트 뒤) + `AdminSidebar` 진입 링크 + `lib/hairTypeOptions.ts` 헬퍼 확장. 여러 상품에 fit/avoid 태그를 한 번에 배선하는 관리자 화면.
  - **✅ Codex 검수 통과 + 하드닝 `d322370`**: 1차 '수정 필요'(태그 배열 크기 상한 없음·중복 미제거·오류 응답 `invalid` 전체 노출) → 반영(fit/avoid 각 배열 **최대 27개 초과 400 거부** + 저장 전 **Set 중복제거** + `invalid` **slice(0,10)** 제한) → 2차 통과. tsc 통과. 나머지(관리자 인증·service_role·coreKey 3토막 검증·200개 id 상한·무회귀)는 1차부터 통과.
- **설계 문서(`c3398a0`)**: `docs/DESIGN_click_tracking.md`(109줄) — 상품 클릭 추적 + 제휴 subid 설계 기록(코드 없음).
- 🟡 **미추적 파일은 그대로 로컬에만**: `docs/DESIGN_bulk_tagging.md`, `references_pilot_*` 다수 폴더, `public/references/**` 신규 이미지, `scripts/gen_references.py`·README, `_export_for_pm.md`, `sourcing/inbox/새 텍스트 문서.txt` — push에 미포함(커밋 안 됨).

## (이전) 현재 상태 한 줄

**소싱을 크롤링 → 도매꾹/도매매 정식 OpenAPI로 전환 결정. 조사 완료·설계 문서 기록(2026-07-28). 코드·커밋·SQL·스케줄 없음(조사·기록만).**
- **설계 문서**: [docs/SOURCING_API_DOMEGGOOK.md](SOURCING_API_DOMEGGOOK.md) 신규. getItemList(검색)/getItemView(상세) 호출법, `market=supply`(도매매=위탁, 우리 채널)/`market=dome`(도매꾹=사입) 구분법, 14컬럼 매핑 대조표(파생 3칸 규칙 포함), rate limit(분당 180·일 15,000·키 5개·초과 429), 확인 못 한 4가지 기록.
- **컬럼 확장 3개(게이트 후 구현)**: `stock_qty`(재고→품절 자동숨김+판매자 지속성), `kc_cert`(KC인증→상세페이지 표시), `origin_country`(원산지→법정표시+shipping_region 파생). CLAUDE.md §8대로 각 소비처 문서에 못박음(writer+consumer 동시 배선). 보류: 사업자번호·평점·차등단가(소비처 없음).
- **게이트 불변**: API 설계≠자동수집 켜기. 실물 수령+15항목 통과 전 `sourcing_candidates` 자동투입·cron 금지. 수집 결과도 사람이 /admin/sourcing 승인 후 draft 저장, status='approved' 자동승인 금지.
- 크롤링이 막힌 이유(전환 근거): 오너클랜 Cloudflare 429 / 도매토피아 JS렌더 / 알리바바 캡차. 도매꾹만 크롤링 통과(2차 TSV 검증 10/30 통과, 전부 도매꾹).

## (이전) 현재 상태 한 줄

**해외 리스크 키워드 1688/alibaba 추가 — 커밋·push·배포 완료(2026-07-28, `8793a50` 코드 / `9f10cc4` 문서, push `671a7c8..9f10cc4`). 유출 감사 클린. + 주간 자동 DB 백업은 레포 public이라 착수 중단.**
- **② 해외 리스크 키워드**(`lib/sourcing.ts`): 소싱 대상이 1688.com/alibaba.com으로 바뀌어 `OVERSEAS_RISK_KEYWORDS`에 `1688`·`alibaba` 추가(기존 aliexpress/temu/ebay 유지). 판정 로직·응답 형식 불변, 부분문자열 매칭 유지(overseasRisk는 차단 아닌 사람검수용 'maybe' 힌트 → 과잉주의 방향이라 안전). `ReviewFlags.overseasRisk` 주석도 갱신. tsc 통과, Codex 재검수 통과(53/53 테스트·eslint 통과). 오늘 밤 들어올 1688/alibaba 후보 TSV에 해외 배지 정상 표시.
- 🔴 **① 주간 자동 DB 백업(GitHub Actions) — 착수 중단**: 선행 게이트(레포 private 여부) **실패**. `beclassyhairs-ui/hair_DNA`가 **public**(인증 없는 API 200 확인). public 레포는 인증 없이 Actions artifact 다운로드 가능 → 백업 덤프의 `kakao_user_id` 등 고객 개인정보 유출 위험. 워크플로 파일 미생성. **재개 조건: 레포를 private로 전환.**
- **③ 비밀키 유출 감사 완료 — 전 항목 노출 안 됨**: 265커밋 전체(삭제분 포함) JWT·토큰프리픽스·DB문자열·변수대입·서비스계정JSON 스캔 0건. `.env.local.example`은 placeholder만. **재발급 불필요.** 🟡 갭 1건: `.gitignore`가 `.env*.local`만 막아 bare `.env`/`.env.production` 미차단(유출 아님, 예방 강화 제안 — 미커밋).
- **⑥ .gitkeep 삭제분 복원 완료**(git restore, 작업트리 정리).
- 🟡 **④ private 후 Vercel 배포 정상 확인 / ⑤ weekly-backup.yml 구현 — 레포 private 전환 대기 중**(사업주 전환 후 착수).

## (이전) 현재 상태 한 줄

**products API에 fit/avoid 3토막 coreKey 검증 추가(비대칭 제거) — 커밋·push 완료(2026-07-26, `b69eb65` 코드 + `2247336` 문서). 배포본 무회귀 확인(공개 3종 200 / 관리자 2종 307→로그인 / health 신선). 라이브 인증 스모크는 소유자 직접 진행 대기.**
- import 라우트에만 있던 검증을 공용 함수 `validateCoreKeyList`(lib/hairTypeOptions.ts)로 추출, POST/PUT `/api/admin/products`에서 재사용. API 직접 호출로 비3토막 값이 저장되던 구멍 차단. **로직 1벌만 존재**(복사 안 함).
- 검증 결과 15/15 실제 실행 통과: 거부 12(비배열·비문자열원소·빈문자열/공백·1·2·4토막), 통과 3(유효 단일/복수/빈배열→null 저장). 대문자=거부(대소문자 구분), 앞뒤공백=trim 후 통과·**저장값은 trim된 값**. import와 동일 동작(같은 함수 공유).
- **null vs [] 비대칭은 사고 아님**: `productMatchesCoreKey`(itemsMatch.ts:62)가 `!fitHairTypes || length===0`으로 둘을 완전히 같게 처리(범용 노출). avoid도 동일(null falsy / []는 includes false). 어드민 fit 삭제 상품 = 소싱 fit 없는 상품, 손님에게 동일하게 보임. **커밋 범위 밖, 조치 불필요.**
- 무회귀: 정상 UI(CoreKeyBuilder)는 유효 3토막만 생성→검증 통과, 저장 경로 기존과 동일(빈 값→null). fit 빈 상품 승인 확인창은 클라(ProductManager.tsx)에 있고 이번 커밋 미변경(마지막 변경 `a1fecd2`).

## (이전) 현재 상태 한 줄

**컬럼 연결 전수 감사 완료 + 소싱 fit 노출 예방 3종 — 커밋 완료·push 대기(2026-07-26).**
- **전수 감사(6테이블 69컬럼)**: "데이터면이 둘(클라 localStorage 주도 / 서버 DB는 write-only 거울)" 구조 확인. ①core_key·③events.user_id는 값은 채우나 소비처 없음(죽은칸) — **리버트 안 함**(서버 이전 대비). 서버→로컬 pull 확정(profileSync:236→249). hair_usage RPC 배포·작동 확인.
- **예방 3종(커밋 `60a35b2`·`a1fecd2`·`dd65bff`)**: ① 소싱 fit 자동 태깅 중단(`AUTO_TAG_ENABLED=false`, MAP 휴면·재가동조건 주석) — 소싱 상품은 fit 없이 draft 저장. ② 3토막 coreKey 검증 가드(`isValidCoreKey`, import 위반 시 배치 400+행·값 노출). ③ fit 빈 상품 승인 시 전체노출 확인창. + CLAUDE.md §8 "새 컬럼 기록자·소비자 동시 배선" 규칙. Codex 2회 통과, 단위검증 12/12.
- 🔴 **미노출 오염 1건**(`fit=damaged_hair_high_history`, draft): 소유자가 관리자 화면에서 직접 삭제(터미널 데이터 정리 금지).
- 🟡 **보류(실물 수령+15항목 후)**: GROUP_ID 재작성 / 고민 매칭 / coreKey 정확일치→랭킹. **보류(첫 손님 후)**: events.user_id·users.nickname/marketing_consent 소비자 배선.

## (이전) 현재 상태 한 줄

**프로덕션 DB 3건 중 ①③ 코드 수정 완료 + housekeeping — 커밋 완료·push 대기, ②는 별도 커밋으로 보류(2026-07-25).**
- **① core_key null 해소**(`19de662`): `/api/me/sync`가 이 계정의 kind=style 진단 전체에서 `deriveCoreKeyFromEntries`로 core_key 재계산 후 저장. 파생값 non-null일 때만 넣어(=null이면 제외) 랜딩 단독 sync가 기존값을 지우지 않음. Codex 통과(PostgREST가 payload 없는 컬럼을 UPDATE 시 보존함을 소스로 확인).
- **③ 이벤트 계정 연결**(`29257cf`): 서버 OAuth 전환 후 끊겼던 로그인↔트래킹 다리 복구. `setKakaoUserId→setAccountId` 개명(키 `abeauty:account_id`), **events.user_id에만 계정 uuid**, `kakao_user_id`는 카카오번호 전용이라 **null 유지**(사업주 지시로 제안 변경). `getAuthState` 3-상태(authed/unauth/indeterminate)로 일시장애 시 익명화 방지, 전환·401 지점 clear로 교차계정 오귀속 차단. Codex 3회 통과.
- **housekeeping**(`80845d6`): `sourcing/inbox/.gitkeep` 커밋 + 소싱 TSV/CSV 데이터 gitignore(폴더 구조만 유지, 새 클론 스크립트 입력 폴더 보장).
- 🔴 **② last_login_at**(쿠키 자동로그인이 DB 미갱신 → 첫 OAuth에 고정): (b) `/api/auth/me`에서 24h 스로틀 UPDATE로 확정했으나 **이번엔 미착수**(인증 경로 커밋은 하나씩 — ①③ 후 별도 커밋).
- 🟡 **백필 SQL 초안**(`supabase/backfill_profiles_core_key.sql`, **실행 금지**): 기존 profiles.core_key를 diagnoses에서 재계산해 채우는 미리보기 SELECT + UPDATE. 실행은 사업주.

## (이전) 현재 상태 한 줄

**소싱 파이프라인 2종 정리 + Codex 검수 통과 — 커밋 완료, push 대기(2026-07-25).**
- **(A) `/admin/sourcing` 링크 UI 개선**(`d94f22b`): 상품 링크를 도메인만 표시(전체 URL은 hover 툴팁) + 열어본 링크 표시(✓·onAuxClick 휠클릭 포함) + **위험 스킴 XSS 가드**(http/https만 링크, `javascript:`/`data:`는 텍스트로만). Codex 2회 후 통과(XSS 우회 없음 확인). 프론트+보안이라 검수 실행.
- **(B) 소싱 후보 실존검증 CLI `scripts/verify-sourcing-tsv.mjs` + 테스트**(`f3b21ef`): AI가 지어낸 소싱 URL·가격을 실제 HTTP로 대조해 거르는 **할루시네이션 방어의 본체**. Codex 3회 검수 통과. 로컬 1회성 CLI(DB·cron 없음, 순수 파일 in/out). 통과분만 `.verified.tsv`, 저장은 사람이 `/admin/sourcing`에서.
  - **보안 하드닝(Codex 반영)**: SSRF는 IP를 16바이트로 파싱 후 CIDR 판정(fe80::/10 전체·hex-word IPv4-mapped·NAT64·대괄호·특수대역), 리다이렉트 매 hop 재검사. 본문은 타임아웃이 읽기 끝까지 유지+미완료시 미검증(skip). robots는 선형 glob matcher(ReDoS 원천 제거)·빈 UA 무시·접두 매칭. 가격은 숫자경계 대조+미확인시 비움. **회귀 테스트 53개**(`verify-sourcing-tsv.test.mjs`, SSRF 우회/ReDoS 타이밍 포함).
  - ⚠️ **[실물 수령 검증 게이트]는 그대로 유효** — 이 CLI는 후보를 "거르기"만 하고 DB 투입·자동등록은 안 한다. 게이트 통과 전까지 `sourcing_candidates` 자동 투입·cron 금지 규칙 불변.

## (이전) 현재 상태 한 줄

**커머스 검증 작전 착수 — 게이트 규칙 교체 완료(2026-07-25, 0단계).** 「커머스 검증 작전 — 자동등록 먼저, 내가 사서 받기」 결정 반영:
- **게이트 교체**: 기존 "상품 1개 수동 엔드투엔드 완주 [게이트]" → **"자동/반자동 등록 상품 실물 수령 검증 [게이트]"**. 통과 기준 = 자동/반자동 등록 상품 **최소 1개(권장 2개) 실물 도착 + 수령 체크리스트 통과**. 통과 전까지 **`sourcing_candidates` 자동 투입·정기 스케줄(cron) 착수 절대 금지.** `CLAUDE.md` §4 + `PROJECT_STATE.md`(완료이력 16·P0 경고문) 반영.
- 기존 금지 규칙 5종(keep 즉시저장 / status 자동 approved / image_url 없는 상품 노출 / uncertain 자동등록 / AI 상품사진 생성)은 **그대로 유지**.
- 🔴 **1단계(등록 파이프라인 점검) 및 이후는 사업주 승인 후 착수.** `sourcing_candidates` 자동 투입은 게이트 통과 전까지 손대지 않음.

## (이전) 현재 상태 한 줄

**🟢 사업주 조치 완료(SQL 2종 실행 + Vercel env 등록) — B 전체가 실제 동작 상태로 전환됨(2026-07-24).** 프로덕션 실측으로 배선 확인:
- `/api/auth/kakao/start` → **307 `https://kauth.kakao.com/oauth/authorize`**, `client_id` 주입됨(32자), `redirect_uri=https://hair-dna.vercel.app/api/auth/kakao/callback`(콜백 라우트와 일치), CSRF `state` 발급 — **카카오 로그인 배선 정상**.
- `NEXT_PUBLIC_KAKAO_APP_KEY`(공유용 JS키)가 클라 번들에 인라인됨 — 카톡 공유도 동작 가능(`NEXT_PUBLIC_*`는 빌드 타임 주입이라 env 추가 후 재배포가 필요한데, 현 빌드엔 이미 들어가 있음).
- `/api/me/data`·`/api/me/sync`·`/api/hair-transform` 무인증 **401** 정상.
- ⚠️ **이제부터 라이브 동작이 바뀐다**: ① AI 합성 전 **카카오 로그인이 실제로 강제**된다(전엔 env 미설정 시 503으로 막혔을 수 있음) ② `hair_usage` 실행으로 **서버 일일 제한이 활성**됐다(fail-open 해제, `SERVER_DAILY_MAX=5`/일·계정 기준, 시크릿창·기기변경으로 우회 불가).
- 🔴 **남은 것은 사업주 실기기 스모크 1회뿐** — 로그인 왕복 1회를 하면 B-1(자동로그인)·B-2(기기 간 동기화)·B-3(일일제한) AC가 한 번에 검증된다. 코드로 할 수 있는 일은 없음.

## (이전) 현재 상태 한 줄

**B-2(서버 저장·기기 간 동기화) 코드 완료 + 사업주 안내서 작성 — push·배포 완료(2026-07-24).** 커밋 3개(`a3728fb`·`c153b8b`·`e24cf12`). **Codex 검수 8회 끝에 통과.** 라이브: `/api/me/data`·`/api/me/sync` 무인증 401, 주요 경로 8종 정상(회귀 없음).
- **서버**: `GET /api/me/data`(프로필+진단 최신 200건) · `POST /api/me/sync`(멱등 upsert). userId는 **오직 쿠키 세션**에서만(`lib/userSession.ts`). 계정 일관성 assertion(`expectedUserId`)을 **DB 접근 전에** 강제, 본문 바이트 상한·client_id 길이·계정당 행 상한(best-effort)·요청 내 중복 id 제거.
- **스키마**: `users_auth_schema.sql`에 `profiles.profile`(jsonb)·`diagnoses.client_id` 추가. `create table if not exists`가 기존 테이블에 컬럼을 안 붙이는 함정 때문에 **alter add column if not exists + backfill + not null + 유니크 인덱스**를 마이그레이션 구간으로 분리(신규/기존 DB 모두 안전, 재실행 멱등).
- **클라**: 루트 레이아웃에 `ProfileSync` 1개만 마운트 → 라우트 변경마다 동기화(결과지 4종 미수정. 저장 후 /home 이동 흐름 활용). 미로그인이면 즉시 종료해 **기존 localStorage 동작 그대로**.
- **교차 계정 오염 방지(공용 기기)**: 로컬 캐시 소유자(`abeauty:syncedUserId`) 기록 + 불변식 "**서버 데이터를 내려받기 전에 소유자가 현재 계정으로 확정돼 있어야 한다**". 다른 계정 캐시면 비우고 확정, 익명이면 먼저 올려 성공해야 확정. 삭제·기록은 재읽기 검증, 실패 시 중단.
- 그 외: push 실패를 성공으로 보고 안 함, 100건 청크(프로필은 첫 청크 동승), 전 요청 10초 타임아웃, 실행 중 라우트 변경 시 1회 재실행 예약.
- 🟡 **알려진 한계(문서화됨)**: ① id 없는 과거 엔트리는 멱등키가 없어 서버 동기화 대상 아님(로컬엔 계속 보임) ② GET 200건 상한 초과분은 새 기기에서 안 보임(데이터는 보존) ③ 계정당 500행 상한은 트랜잭션이 아니라 best-effort.
- 🔴 **AC 검증은 사업주 조치 후 가능** — `users_auth_schema.sql` 실행 전에는 API가 "컬럼 없음"으로 실패한다(단, 로그인 env가 없으면 ProfileSync가 애초에 호출조차 안 해 무해). 안내서: **`docs/OWNER_SETUP_GUIDE.md`**(511줄, 카카오 콘솔·Vercel env·Supabase SQL 클릭 단위).

## (이전) 현재 상태 한 줄

**A(코드 4종) — A-1·A-2·A-3 완료, A-4 부분완료(2026-07-24).** 커밋 5개(`2de5416`→`934ba3f`), 미push. tsc·`next build` 통과.
- **A-1 완성도 게이지**(`components/CompletionGauge.tsx`): 진단 4종 중 서로 다른 kind 완료 수 ÷ 4, 4칸 진행바. kind 판별은 기존 `classifyKind` 재사용(누락=style). 삽입 8곳(결과지 4 + /home + 랜딩 3). **실측 AC 충족**: 1개=25%(1칸·뱃지 없음), 4개=100%(4칸·"프로필 완성" 뱃지).
- **A-2 잠금 미리보기**(`components/LockedPreviewCard.tsx`): /bangs·/damage-check·/hair-quiz 결과지 하단. 블러 예시 이미지(`public/references/default_style.jpg`, git 추적됨·200 서빙)+자물쇠+"예시" 뱃지+/style CTA. **세 랜딩 사진 수집 0건 코드 재확인**(getUserMedia/file input/photo 키 전무).
- **A-3 시술 이력**: `TreatmentRecord` 타입 + `treatmentHistory` 필드 + `TreatmentHistoryField`(입력칸 1개, /my-diary). **AC 충족**: 저장→새로고침 회수 정상, 진단 재합산 후에도 보존(순수함수 단위검증 PASS — `buildBeautyUserProfileFromDiary`가 previousProfile로 이어받게 처리). ※ 시술주기 알림·경고·재구매 트리거 **미구현(의도)**.
- **A-4 공유 카드 — 완료(얼굴 제외 확정)**: damage-check가 앞머리 아트(bangs-og.png 2MB)를 잘못 쓰던 것 → 브랜드 OG로 교체, /style/result 공유가 title+url뿐이던 것 → 타입 별명+주소+utm 포함으로 통일. 공유 카드 = 브랜드 OG + 타입 별명 + 한 줄 진단 + 주소.
  - ✅ **"얼굴 포함 여부 선택"은 사업주 결정으로 폐기(2026-07-24)** — 공유 카드에 얼굴을 넣으려면 얼굴 이미지를 공개 URL로 상주시켜야 해 **셀카 즉시파기 정책과 충돌**하고, 동적 OG 생성 시스템도 필요(과거 `@vercel/og` 빌드 실패 이력). **얼굴은 공유 카드에 넣지 않는다**가 확정. 되살리려면 /privacy·/style/upload 즉시파기 문구부터 법적 검토 후 고쳐야 함.
  - 🟡 남은 것(사업주): AC "카톡 왕복 1회"는 `NEXT_PUBLIC_KAKAO_APP_KEY` 등록 + 실기기 카톡 확인 필요. 미등록 시 Kakao SDK 초기화가 안 돼 navigator.share/클립보드로 폴백(동작 자체는 안 깨짐).
- 겸사: WORKORDER-03에서 놓친 `/my-diary` 인라인 `background:var(--btn)` 차콜 버튼 4곳 → 연한필 토큰(클래스가 아닌 인라인이라 스캔에서 누락됐었음).

### 🔴 B 착수 전 정정 — 브리핑 전제가 실제 코드와 다름

"현 카카오 로그인은 localStorage 플래그뿐" 은 **옛 상태다.** 실제:
- **B-1 Phase B는 이미 구현·배포 완료**(2026-07-21). `lib/loginGate.ts`가 `KAKAO_LOGIN_ENABLED=true`·`LOGIN_REQUIREMENT_POINT="before_ai_synthesis"`, 서버 OAuth 라우트 4종(`/api/auth/kakao/start`·`callback`·`me`·`logout`) 존재, 가짜 게이트 제거됨. **남은 건 코드가 아니라 사업주 조치**(카카오 콘솔·env 3종·users SQL). → 착수할 코드 거의 없음.
- **B-3 서버측 일일 제한도 이미 구현됨.** `/api/hair-transform`에 서버 로그인 검사(401 `login_required`) + 원자적 RPC `bump_hair_usage`(429 `daily_limit`), `SERVER_DAILY_MAX=5`. **`supabase/hair_usage_schema.sql` 실행 전엔 fail-open(제한 비활성)** — SQL만 실행하면 활성.
- **B에서 실제로 남은 코드 작업은 B-2(profiles/diagnoses 서버 저장·데이터 통합)뿐.** `users_auth_schema.sql`은 초안만 있고 저장/회수 코드는 없음.

## (이전) 현재 상태 한 줄

**WORKORDER-03 검은 버튼 폐지 + 완전 무채색(연한 필) — 배포 진행(2026-07-24).** 커밋 3개(`34365a7`→`be26fca`): ① 토큰 신설 `--btn-bg #F1EEE8`·`--btn-border #E3DED5`·`--btn-text #33302C` + 공용버튼(BlackCTAButton·ui/Button primary)을 연한 회색 필(1px 테두리·ink텍스트·700·min48)로, ui/Button secondary·ResultHeroCard 배지·RoundedOptionButton 선택 accent → bg-ink ② 페이지 버튼 위계: 인라인 주CTA 연한필, 보조액션(공유·복사·재진단·닫기·댓글등록) 고스트(텍스트만), 활성탭·전문가배지 bg-ink, myhair 배지 틴트→ink ③ /style 랜딩 수직리듬(mt-11/5/14·space-y-4)로 히어로 이미지 없이 차분하게. **라이브 검증(dev)**: /style 주CTA computed = bg `rgb(241,238,232)`·border `rgb(227,222,213)`·text `rgb(51,48,44)`·weight 700·min-h 48px 정확. 소스 전수 스캔: 유채색·골드·순검정(#3B3733)·구 bg-btn 채움 **0건**(dead/mbti/admin/dev-debug 제외). `next build` 통과. 프론트 전용이라 Codex 생략. → main push 배포 예정.

## (이전) 현재 상태 한 줄

**WORKORDER-02.1 무채색 완전 통일 정리 패스 완료 — 브랜치 `workorder-02-1-achromatic`, 미push, Vercel 프리뷰 대기(2026-07-24).** 커밋 8개(`5b3d864`→`7b5a239`): A 토큰·ResultHeroCard(h1 26→22, eyebrow 골드→ink-2, badge 순검정#1C1A17→--btn#3B3733, 히어로 타이틀 한 단계↓) · B 결과지 카카오 노란(#FEE500) 공유버튼→무채색 아웃라인 · E /style/upload 촬영/갤러리 선택화면 다크→라이트(FaceGuide tone prop, 카메라 로직·좌표 무변경) · F1 /diagnosis·/consulting·/myhair·/style/survey 페이지 스윕(카테고리 유채색·랭킹 골드/실버/브론즈→ink 명도, 헤어기록 골드 그라데이션→평면 surface) · F2 설문 데코 공용(RoundedOptionButton 선택표시 골드→ink, ProgressBar·TestHeader·BottomStickyCTA) · F3 공용 Header · F4 /bangs·/damage-check survey·/style/loading 골드 스피너·SiteFooter·/items/[id]. **17개 유저 화면 전수 스캔 0 잔재**(유채색·골드·순검정 클래스/헥스), `next build` 통과. 프론트 전용이라 Codex 생략.
- ⚠️ **로컬 스샷 불가**(Browser pane 미표시 → 프레임 미컴포짓, 기존 환경 한계). 시각 검증은 Vercel 프리뷰 필요 → **브랜치 push 승인 대기**(프로덕션 아님, main만 프로덕션).
- ✅ **호칭 통일 반영**(`87b26e2` 직전 커밋): 로그인 전 전부 "고객님". `/home`·`/myhair` name "지환"→"고객", `/consulting` 더미 닉네임 "지환님"→"수진님". 실명 개인화는 WORKORDER-01에서 연결.
- ✅ **AdBanner 제거 반영**(`87b26e2`): `/style/loading` AdSense 슬롯·import 제거(광고 완전 제거 정책). 헤어 꿀팁만 유지.
- 총 11커밋(`5b3d864`→`e491521`), **main 머지·프로덕션 배포 완료(2026-07-24)**. 라이브 검증: `hair-dna.vercel.app/myhair`에 "고객" 노출·"지환" 0건·골드 헥스 0건.
- ✅ **전역 AdSense 완전 제거(2026-07-24, 사업주 승인)**: `app/layout.tsx` `<head>` 전역 `adsbygoogle.js` 로더 스크립트 삭제 + `app/components/AdBanner.tsx` 컴포넌트 파일 삭제 + dead `/ai-loading`·`/result` 광고 플레이스홀더 제거. 코드베이스 내 `adsbygoogle`/`AdBanner`/`ca-pub`/`googlesyndication` 참조 **0건**. 이유: 광고 완전 제거 정책 준수 + **셀카 다루는 앱에 제3자(구글) 추적 스크립트 상주 = 개인정보 리스크 제거**. `next build` 통과.
- dead code(/mbti 방치·/result·/upload·/ai-loading·/diagnosis/quick 리다이렉트·admin·dev debug 패널)는 스윕 제외.

## (이전) 현재 상태 한 줄

**WORKORDER-02(웜 그레이지 UI 시스템) 1·2단계 완료 + 3단계 진행 중 (2026-07-23).** 커밋 5개: `c7424dd`(1단계 토큰+Pretendard) → `9bb7180`(2단계 공용 컴포넌트) → `8e0e68c`(3단계-a 랜딩4종+공유데코) → `c465649`(3단계-b /home+AppShell) → `15b43ce`(3단계-c /items 계열). 전부 `next build` 통과, **미push**.
- **토큰 SSOT**: `app/globals.css` `:root`(색10·형태5) ← `tailwind.config.ts`가 `var()`로 참조. 구 팔레트(cream/gold/champagne 등)는 **스윕 완료 전까지 병존** — 마지막에 제거할 것.
- **타이포**: Noto Sans KR → **Pretendard**(`app/fonts/PretendardVariable.woff2`, next/font/local). 굵기 위계 `text-h1`(26/700)·`text-h2`(18/600)·`text-body`(16/400)·`text-emphasis`(16/600)·`text-aux`(13/400). 700은 화면당 1~2곳.
- **공용 컴포넌트**: `app/components/ui/`(Button·Card·Pill·SectionTitle+배럴). BottomNav는 이모지→Lucide 단색(활성만 `--ink`). 구 데코 3종(SilkBackground·GlassCard·BlackCTAButton)도 토큰화해 전 랜딩 일괄 정리.
- **3단계 남은 화면**: `/my-diary`(⚠️ 전체 다크테마, 인라인 style 60곳 — 라이트 전환은 별건 규모) · `/style/upload`(⚠️ 아래 결정 필요) · 결과지 3종(`/style/result`·`/bangs/result`·`/damage-check/result`) · `/privacy`·`/terms`. 이후 4단계(제거목록 8종 검증)·5단계(375px 스크린샷 6화면).
- 🔴 **사업주 결정 대기**: `/style/upload`의 카메라 뷰파인더 블록은 코드 주석에 "리디자인 대상 아님"으로 명시돼 있으나 WORKORDER-02는 "순검정→웜차콜 #1A1714"를 요구 — 충돌. 안심문구는 **문구 불변·표현만 강화**로 해석함.
- 참고: 워킹트리의 `public/references/**/.gitkeep` 삭제분은 **레퍼런스 폴더 42조합 병합**(별건 작업) 잔여분이며 UI 커밋에 미포함.

## (이전) 현재 상태 한 줄

**레퍼런스 파일럿 v6 생성 완료 — 검수 대기(2026-07-22).** `scripts/generate-references.mjs`(FLUX.2 Pro, black-forest-labs/flux-2-pro, 조합 파라미터화) 신규 작성·커밋(`8294056`). 3조합×5장=**15장 생성 성공(0 실패)**: ①숏컷 `group_2040/short/straight/soft` ②단발웨이브 `bob/wave/soft` ③가슴선C컬 `chest/c_curl/soft`(각 seed 3 + 시스루뱅 2). 리얼리즘 블록 v6(입체 염색·모공/필름 그레인·잔머리) 반영 → 위그/플라스틱 느낌 제거 확인. 이미지·preview.html은 `references_pilot_v6/`(untracked, 검수 통과 전 public/references 반입·커밋 안 함). 비용 ≈ $0.45(15×~$0.03, FLUX.2 pro=$0.015+MP당$0.015). **남은 것: 사업주 검수(조합·앞머리별 베스트/피드백) → 통과분만 `public/references/`로 승격.** ⚠️ FLUX.2 Pro엔 negative_prompt 입력이 없어 NEG는 프롬프트 내 `Avoid:` 절로 접음(스크립트 주석 참조).

**(직전) 카카오 로그인 Phase B(가짜 게이트 → 실제 로그인 교체) — push·배포·라이브 검증 완료(2026-07-21).** `2990e3e..1e8aa8c` push, Vercel 배포. 라이브: `/privacy` 카카오 문구 노출·마커 0, `/api/auth/kakao/start`→307 카카오, 결과지 프로덕션 번들에 "카카오 로그인하고 결과 보기" 0건, 주요 경로 6종 200. **남은 것: ① 사업주 RLS anon-차단 확인 쿼리(권장) ② 로그인 게이트 전체 흐름 실기기 스모크 1회 ③ 서버비 안전장치(아래 3번).** `KAKAO_LOGIN_ENABLED=true` + 로그인 요구지점 `before_ai_synthesis`(AI 합성 직전=결과 보기 직전). `/style/loading`이 합성 전 `/api/auth/me` 확인 → 미로그인 시 카카오로 보냈다가 복귀해 재개(셀카·답변 sessionStorage 유지). `/style/result`의 가짜 게이트(KakaoLockModal·kakaoLogin()·localStorage 플래그·blur) 전부 제거, `/privacy` 카카오 문구 스위치와 함께 노출. Codex 2회(경쟁조건 픽스 반영). tsc·build 통과, 결과지 실렌더(블러 0·잠금문구 0) 확인. **push 전 필수: ① 사업주가 RLS anon-차단 확인 쿼리 3종 결과 확인 ② push 승인.** ⚠️ 별도 발견: 서버비 안전장치 부재(아래).

**(직전) 카카오 서버사이드 OAuth "로그인 엔진"(Phase A) 구현 완료 — push·배포·스모크까지 완료(2026-07-21).** 사업주가 콘솔·env·SQL 완료 후 실제 로그인 스모크 통과(`/api/auth/me`=loggedIn:true). 프로덕션 `/api/auth/kakao/start`가 카카오 인증으로 302, 전 체인 정상. `lib/userAuth.ts`(유저 세션 쿠키, 관리자 인증과 완전분리) + `lib/kakaoAuth.ts`(인가코드→토큰교환→user/me→users upsert, access_token 미저장) + `/api/auth/{kakao/start,kakao/callback,me,logout}` + `lib/brand.ts`(서비스명 상수) + `lib/loginGate.ts`(로그인 요구지점 설정만). **Codex 검수 통과**(state CSRF·오픈리다이렉트·세션위조/만료·service_role·토큰로그 전부 확인). tsc·build 통과, userAuth 토큰 issue/verify/tamper 단위검증 통과, 라우트 스모크(me=loggedIn:false / start=503 / logout POST=ok·GET=405) 통과. **기존 가짜 게이트는 제거 안 하고 공존(Phase B 미착수 — 로그인 요구지점 ② 사업주 미정).** 남은 사업주 조치: 카카오 콘솔 설정 + users SQL 실행 + env 등록(아래 세션 기록).

**(직전) 셀카 정책 문구 확정 + SEO·OG 정비 + Sentry(에러 모니터링) 도입 3종 — push·배포·프로덕션 검증까지 완료(2026-07-21).**
① 셀카 즉시파기 문구 확정(`c21e63d`) ② SEO·공유 메타 정비(`425e9d6`) ③ @sentry/nextjs 설치·초기화(DSN 미설정 시 no-op, `55d1c9e`). Codex 2회 검수 반영. `f561eb6..b1263b9` push, Vercel 프로덕션 배포 확인. **라이브 검증**: `/privacy` `확정 필요` 0건·즉시파기 문구 노출, `/style/upload` 국외이전+안심문구, `/hair-quiz`·`/items` og:image=og-default.png(200), `POST /api/admin/debug-sentry` 무인증 401(관리자 게이트 정상), 주요 경로 7종 200. **남은 사업주 결정: Sentry DSN 활성화 전 `/privacy`에 Sentry 수탁·국외이전 고지 추가(활성화=에러 데이터 국외이전 개시).** 상세는 아래 세션 기록.

**(직전) 원본 셀카(합성 전 얼굴) 서버 영구 보관 제거 완료·커밋됨(`370ec63`) — push 대기(2026-07-21).** ① submit-diagnosis 아카이브 업로드 제거(셀카 미저장, 답변만 Sheets) ② hair-transform은 합성 직후 finally에서 pathname 기반 즉시삭제. Codex 6회 검수 반영. 계정 기반 결과이미지 영속화는 카카오 서버 OAuth 완성 이후 단계(현재 카카오 로그인은 클라 SDK뿐, 서버가 유저 식별 못 함). **남은 사업주 결정: 셀카 파기 durable 백스톱(주기적 `diagnosis/` 정리)을 둘지 + 기존 적재분 처리.**

**(직전) ROADMAP P0 코드 잔여 3건(가독성 / 결과지 CTA / 개인정보 문구) 완료 — push·배포·프로덕션 검증까지 끝남(2026-07-21).** 커밋 `567b7fe`, `9d4298b`, `4496099`, `594e862`. **P0의 나머지는 전부 사업주 게이트**(faceswap 승인, 상품 20~30개 등재, E2E 완주, 셀카 보유기간 확정)라 **코드로 넘길 수 있는 P0 항목이 0건이다. 다음 세션은 P1(B-1~B-4 운영 안전망, D-2 OG 실이미지)로 넘어갈 차례.**

**(직전) 퍼널 이벤트 `/hair-quiz` 확장 + `report_view` 분리 — push 완료(`ea0b8cf..f940ffb`).** C-1(이미지 미러링) + C-3(퍼널 대시보드) 포함 이전 커밋도 전부 origin/main 반영됨. 사업주 조치 2건 여전히 대기: ① `supabase/events_funnel_index_migration.sql` 실행 ② Vercel에 `BLOB_READ_WRITE_TOKEN` 등록 확인.

**(이전) 퍼널 트래킹 5종 + UTM 태깅 — push·배포·migration SQL 실행까지 전부 완료(2026-07-19).** trackEvent 이원화(console fallback vs Supabase)를 단일 코어로 통합: `lib/trackEvent.ts`가 `lib/eventTracking.ts`를 re-export → 기존 문자열 이벤트 호출부까지 전부 Supabase `events` 적재. 핵심 `/style` 진단(랜딩/시작/답변/완료)과 커머스(노출/클릭/구매)를 전 구간 계측해 `조회수→유입→진단완료→상품클릭→구매전환` 퍼널 완성. first-touch UTM(source/utm_medium/utm_campaign)을 모든 이벤트에 자동 동승. 스키마 외 임의 키는 `meta`(jsonb, sanitize 가드)로 분리. `events_attribution_migration.sql` 실행 완료 → events insert 정상 적재 중.

데이터 파이프라인(이전): 소싱→draft 저장, 관리자 인증 게이트, `/admin/products` 매칭/추천 입력, 공개 `/items`+`/items/[id]`까지 코드 연결 완료. `hair-dna.vercel.app` 라이브.

## 미커밋 변경 (커밋 대기)

- **미추적(커밋·push 안 됨, 로컬만)**: `docs/DESIGN_bulk_tagging.md`(일괄 태깅 설계), `references_pilot_*`(v1~v6·modelcmp 등 파일럿 폴더 다수) + `public/references/**` 신규 이미지, `scripts/gen_references.py`·`scripts/README_생성기_사용법.md`, `_export_for_pm.md`, `sourcing/inbox/새 텍스트 문서.txt`, `scripts/__pycache__/`. — 필요 시 커밋 대상 선별 필요.
- `references_pilot_v6/`(untracked): v6 파일럿 15장 + preview.html + _pilot_report.json — **검수 대기**(통과분만 `public/references/` 승격, 그 전엔 커밋 안 함). 생성 스크립트 `scripts/generate-references.mjs`는 커밋됨(`8294056`).
- (직전) step5 #1·#2·#3 **push·배포·검증 완료**(`fabf600..39e3a36`). 라이브: 무인증 `POST /api/hair-transform` = **401 `login_required`**, 주요 경로 5종 200. **남은 사업주 조치: `hair_usage_schema.sql` 실행(전엔 #2 fail-open 비활성) + Replicate spend limit.**

## 이번 세션 (2026-07-21) — hair-transform 서버측 남용 방지 (step5 #1·#2·#3)

로그인 게이트가 클라 흐름만 막고 `/api/hair-transform` 엔드포인트 자체는 무인증·무제한이던 구멍을 막음(로그인 우회 직접 호출 = 서버비 남용).

### #1 서버 로그인 검사 — `cc78276`(커밋됨)
POST 최상단에서 `abeauty_session` 쿠키를 `verifyUserToken`으로 검증, 미로그인 401 `login_required`. 본문 파싱·Blob·Replicate보다 먼저 차단. `isLoginRequiredBeforeSynthesis()`(앞문과 동일 `KAKAO_LOGIN_ENABLED` 기준)로 게이트. Codex 통과, 무인증 POST=401 실측.

### #2 서버 일일 호출 제한 (사업주 승인·N=5)
- `supabase/hair_usage_schema.sql`(**실행 금지 초안**): `hair_usage(user_id,day,count)` + 원자적 RPC `bump_hair_usage(user_id,max)`(한도 미만이면 +1, 아니면 -1). RLS anon deny-all + **RPC EXECUTE를 PUBLIC/anon/authenticated에서 회수하고 service_role만 GRANT** + `search_path=''`·`public.*` 스키마 한정(Codex 반영).
- 라우트: 로그인 통과 후 `supabaseAdmin.rpc("bump_hair_usage",{userId,p_max:SERVER_DAILY_MAX=5})` → `-1`이면 **429 `daily_limit`**(message 포함). **RPC 오류 시 fail-open**(제한만 미적용, 로그인 게이트는 유지) — SQL 실행 전엔 제한 비활성, 실행하면 자동 활성.
- `SERVER_DAILY_MAX=5`(클라 표시 3보다 여유). 상수 1개로 조정.

### #3 클라 응답 처리
- `/style/loading`: **401→재로그인 리다이렉트**(결과지 안 감, 즉시 return), **429→`STYLE_LIMIT_KEY` 저장 후 결과지**. 합성 시작 시 `STYLE_GENERATED_KEY`도 초기화(과거 이미지가 429/실패를 가리지 않게, Codex 반영). 결과지 이동은 각 분기 명시(finally 제거).
- `/style/result`: `STYLE_LIMIT_KEY` 있으면 빨간 에러 대신 **친절 한도 카드**("오늘 무료 합성을 모두 사용했어요 / 내일 다시 만나요"). 실렌더로 한도카드 노출·빨간에러 미노출 확인.

### 검증
- Codex 2회(#1 별도 1회 통과 + #2·#3 1차 '수정 필요'→SECURITY DEFINER PUBLIC EXECUTE·과거이미지 가림 2건 반영→2차 통과). tsc·build 통과. 무인증 POST=401, 결과지 한도카드 실렌더 확인.
- ⚠️ **실제 429(로그인+한도초과) 왕복은 미검증** — 로컬 supabase 미설정이라 RPC fail-open. 배포+SQL 실행 후 확인 필요.

### 🔴 사업주 조치
1. **`supabase/hair_usage_schema.sql` 실행**(SQL Editor) — 실행 전엔 일일제한 비활성(fail-open). 실행하면 자동 활성.
2. **push 승인** = 서버 로그인 검사 라이브(#1·#3은 SQL 없이도 즉시 동작, #2는 SQL 실행 후 동작).
3. (권장) Replicate 대시보드 spend limit도 병행(B-4).

## 이번 세션 (2026-07-21) — 카카오 로그인 Phase B (가짜 게이트 → 실제 로그인 교체)

스모크 통과(사업주 실제 로그인 → `/api/auth/me`=loggedIn:true) 확인 후 착수. 확정안대로 로그인을 "결과(변환 이미지) 보기 직전 = AI 합성 시작 전"에 요구.

### 만든 것
- `lib/loginGate.ts`: `KAKAO_LOGIN_ENABLED=true`, `LOGIN_REQUIREMENT_POINT="before_ai_synthesis"`, `isLoginRequiredBeforeSynthesis()` 헬퍼. **로그인 on/off·요구지점은 이 파일 상수로만 제어.**
- `app/style/loading`: 합성 시작 전 `/api/auth/me` 확인. 미로그인 → `/api/auth/kakao/start?return_to=/style/loading`로 이동, 로그인 후 복귀해 재개(셀카·답변 sessionStorage 유지). 입력·게이트 검증을 try/finally 밖으로 빼 결과지 이동과 경쟁 제거.
- `app/style/result`: 가짜 게이트 완전 제거 — `KakaoLockModal`·`kakaoLogin()`·`isKakaoLoggedIn`/`markKakaoLoggedIn`·`locked` blur·하단 "카카오 로그인하고 결과 보기" CTA. 저장 모달은 `SaveDiaryModal`로 개칭(로그인 불필요, 즉시 저장). 미사용 import·SDK 정리.
- `app/style/constants.ts`: `KAKAO_LOGGED_IN_KEY` 제거(실제 세션은 서버 쿠키 `abeauty_session`).
- `/privacy`: `KAKAO_LOGIN_ENABLED=true`라 카카오 개인정보 문구가 이제 손님에게 노출(스위치 연동).

### 검증
- **Codex 2회**: 1차 '수정 필요' — loading의 `finally`가 로그인/업로드 리다이렉트와 **경쟁**해 미로그인 유저가 `/style/result`로 샐 수 있음(선재+신규 결함) → `analyze()`를 `run()`으로 재구성, 결과지 이동은 합성 경로 finally에서만. 2차 **통과**.
- tsc·`next build` 통과. 결과지 실렌더(seed): before/after 노출, **blur 0·잠금문구 0**, 저장 CTA 정상. `/privacy` 카카오 문구 노출 확인.

### Phase B 미구현 — 의도적 결정
- **"로그인 도는 동안 백그라운드 합성" 미구현.** 풀페이지 OAuth 리다이렉트는 페이지를 떠나 클라 합성이 살아남지 못한다. 진짜 오버랩은 (a) 팝업 OAuth(모바일 30~50대 타깃에 UX 나쁨·차단 잦음) 또는 (b) 서버 잡 스토어(신규 인프라, 배포 전 지양) 필요 → **순차(로그인→합성)로 구현**. 첫 로그인만 1회 리다이렉트, 이후 재방문은 리다이렉트 없이 바로 합성. 필요 시 후속 검토.

### 🔴 사업주 조치 / 결정 대기
1. **RLS anon 차단 확인**(push 전) — users/profiles/diagnoses에 anon 정책 0개(deny-all)인지 확인 쿼리 3종 결과 확인. 스모크로 테이블·쓰기·세션은 검증됨, RLS만 남음.
2. **push 승인** = 로그인 강제 라이브(배포 즉시 손님이 결과 보려면 카카오 로그인 필요).
3. 🔴 **서버비 안전장치 부재(중요·별도 후속)** — `/api/hair-transform`는 **서버 인증·호출 제한이 전혀 없다**(maxDuration 60s 타임아웃뿐). `lib/dailyLimit.ts`(3회/일)는 **클라 localStorage뿐**이라 시크릿창/기기변경/직접 API 호출로 우회된다. **로그인 게이트는 클라 흐름(loading)만 막지 `/api/hair-transform` 엔드포인트 자체는 무인증 호출 가능** → Replicate 비용 남용 리스크. 서버측 대책 필요: ① Replicate 대시보드 spend limit(B-4, 사업주) ② hair-transform 라우트에 세션/IP 기반 서버 rate-limit(별도 구현). 이번 범위 밖이라 미구현·보고만.

## 이번 세션 (2026-07-21) — 카카오 서버사이드 OAuth "로그인 엔진"(Phase A)

조사·설계 보고(직전)의 Phase A를 실제 구현. **로그인 엔진만** 만들고 기존 가짜 게이트 교체(Phase B)는 착수 안 함.

### 확정 결정(사업주 지시)
- ① 리프레시 토큰 **미저장**. access_token은 서버에서 회원번호(user/me) 조회에만 쓰고 폐기. 카카오 회원번호(kakao_user_id)만 users에 저장(알림 명단).
- ② 로그인 **요구 지점 미정**(AI 합성 전 vs 상세 앞) → 엔진만 완성, Phase B 착수 금지. `lib/loginGate.ts`의 `LOGIN_REQUIREMENT_POINT`(현재 `"none"`) 상수 한 곳으로 나중에 켠다.
- ③ 익명 이벤트 **소급연결 안 함**. 로그인 후부터 user_id 부여(anonymous_id는 계속 적재).
- ④ `/privacy`에 카카오 수집항목(회원번호/닉네임)·목적·보유기간 **초안 작성**. 단 로그인 기능이 꺼진 지금 손님에게 노출되면 실동작과 어긋나므로 **`KAKAO_LOGIN_ENABLED`(현재 false)에 조건부 연동 — 기능 켜질 때 함께 노출**. 손님 화면에 내부 표시(`[사업주 검토]`) 노출 0 확인(flip 검증 완료).
- ⑤ `lib/brand.ts` 신설(서비스명 "어뷰티" 임시). 신규 OAuth 표면만 상수 사용, 기존 ~50파일 하드코딩 치환은 **백로그**.

### 만든 것
- `lib/userAuth.ts` — 유저 세션 쿠키(`abeauty_session`, HMAC `userId.exp.sig`, TTL 30일). **관리자(`abeauty_admin`/`ADMIN_SECRET`)와 시크릿·쿠키·모듈 완전 분리**(CLAUDE.md 8번). 서명키 `USER_SESSION_SECRET`.
- `lib/kakaoAuth.ts` — `getKakaoEnv`/`buildKakaoAuthorizeUrl`/`exchangeKakaoCode`/`fetchKakaoProfile`/`upsertUserByKakaoId`(service_role 경유, 닉네임/프로필은 있을 때만 갱신) + `sanitizeReturnTo`(오픈리다이렉트 차단). 공급자 응답 본문은 로그 미기록(상태코드만).
- `app/api/auth/kakao/start` — state(CSRF)+return_to를 httpOnly 쿠키에 담고 카카오 authorize로 302. env 미설정 시 503 안내.
- `app/api/auth/kakao/callback` — state 대조 → 토큰교환 → user/me → users upsert → 세션 발급 → return_to로 302. 실패 시 `?login=failed`로 복귀.
- `app/api/auth/me`(세션 확인, 내부 uuid만 반환) · `app/api/auth/logout`(POST만, 쿠키 삭제).
- `lib/brand.ts` · `lib/loginGate.ts`(설정 상수).
- `supabase/users_auth_schema.sql` — users/profiles/diagnoses 초안(**실행 금지**, RLS anon deny-all).
- `/privacy` 카카오 수집항목 초안 · `.env.local.example` 카카오/세션 자리.

### 검증
- Codex 검수 **통과**(state CSRF·오픈리다이렉트·세션위조/만료·service_role 미노출·토큰 로그 미노출·관리자 분리 확인). 비차단 권고(공급자 응답 본문 로그) 반영.
- tsc·`next build` 통과(4 라우트 컴파일). `lib/userAuth` 실모듈 issue/verify/tamper/만료/형식 단위검증 6/6. 라우트 스모크: `/api/auth/me`=`{loggedIn:false}`, `/api/auth/kakao/start`(env 없음)=503, `/api/auth/logout` POST=`{ok:true}`·GET=405.
- ⚠️ **실제 카카오 왕복(토큰교환·user/me·users upsert)은 미검증** — 카카오 콘솔 설정·env·SQL 실행이 사업주 조치라 로컬 불가. 배포 후 사업주 설정 완료 시 1회 확인 필요.

### 🔴 사업주 조치 대기 (로그인 켜기 전)
1. **users SQL 실행** — `supabase/users_auth_schema.sql`을 Supabase SQL Editor에서 직접 실행(users/profiles/diagnoses, RLS anon 차단). 되돌리기 어려움 → 사업주 승인.
2. **카카오 developers 콘솔**: 카카오 로그인 ON / **Redirect URI 등록**(`https://hair-dna.vercel.app/api/auth/kakao/callback` + 로컬 `http://localhost:3000/api/auth/kakao/callback`) / Client Secret 발급·사용 / REST API 키 확인 / 앱 이름(동의창 서비스명, 브랜드 확정 시 함께 변경) / 동의항목(식별용 회원번호는 기본, 닉네임은 선택동의).
3. **환경변수 등록**(로컬+Vercel): `KAKAO_REST_API_KEY`·`KAKAO_CLIENT_SECRET`·`KAKAO_REDIRECT_URI`·`USER_SESSION_SECRET`(ADMIN_SECRET과 다른 긴 랜덤).
4. **`/privacy` 카카오 문안 확정 후 노출** — 지금은 `KAKAO_LOGIN_ENABLED=false`라 카카오 문구가 손님에게 안 보인다(엔진만 존재, 실동작과 정합). 문안 확정 + 로그인 활성화 시 `lib/loginGate.ts`의 `KAKAO_LOGIN_ENABLED`를 true로 바꾸면 /privacy 카카오 문구가 함께 노출된다.
5. **② 로그인 요구 지점 결정** → 정해지면 Phase B(가짜 게이트 교체 + `KAKAO_LOGIN_ENABLED`/`LOGIN_REQUIREMENT_POINT` 켜기) 착수.

## 이번 세션 (2026-07-21) — 셀카 문구 확정 + SEO·OG + Sentry 3파트

### 파트 1. 셀카 즉시파기 정책 문구 확정 — `c21e63d`

정책은 이미 코드로 확정·배포됨(submit-diagnosis 셀카 미저장 + hair-transform 합성 직후 즉시삭제). 이번엔 **문구를 실동작과 100% 대조·정정**:
- `/privacy` 보유기간: 셀카 `[ 즉시파기/N일 — 확정 필요 ]` 플레이스홀더 → **"합성 완료 즉시 파기"** 확정. 진단답변·이벤트의 `확정 필요` TODO도 "목적 달성 시까지" 표준 문구로 교체(유저 노출 내부 TODO 제거). 국외이전 항목에 이전방법 명시 + 보유기간 즉시파기로 정합.
- `/style/upload`: 안심 문구(따뜻·담담, 겁주기 없음) + **미국 Replicate 국외이전 고지 블록** 추가. stale 문구("업로드·보관"→"즉시 파기"), 동의 항목에 국외이전 포함.
- `/style`·`/style/upload`의 stale 주석("업로드·보관"·"즉시파기 쓰지 말 것")을 즉시삭제 실동작 기준으로 정정.
- 회사명·연락처·보호책임자·시행일은 `[사업주 기재 필요]` 유지. 법률 자문 아님.
- 검증: `/privacy`·`/style/upload` 실렌더 대조(get_page_text) — `확정 필요` 0건, 즉시파기·국외이전 정상 노출.

### 파트 2. SEO·공유 메타 정비 — `425e9d6`

- **미커버 공개 페이지 3종 layout metadata 신설**: `/hair-quiz`·`/diagnosis`·`/consulting`(sitemap 공개 엔트리인데 root 기본값만 쓰던 페이지). title/desc/OG/twitter 부여.
- **og:image 상속 안 됨 발견·픽스**: Next는 세그먼트별 `openGraph`를 통째로 교체(deep-merge 아님) → `/items`·`/style` 포함 상속 페이지들이 **og:image 누락 상태**였다(선재 버그). 모든 상속 페이지에 `og-default.png` 명시.
- `/style`: bangs-og.png(앞머리 전용 아트) 재사용 제거 → 브랜드 기본 OG 상속.
- **`public/og-default.png`(1200×630) 임시 플레이스홀더 추가** — 기존 404 참조 해소(순수 Node PNG 생성, 크림+골드 얼굴가이드 모티프). 최종 디자인은 **[사업주 승인]** 대상, 같은 파일명 덮어쓰면 코드 변경 없이 반영.
- robots(`/admin`·`/api` 차단)·sitemap(7 공개 엔트리) 기존 구조 검증. 프론트 전용 → Codex 생략.

### 파트 3. Sentry 에러 모니터링 도입 (B-1) — 커밋 예정

- `@sentry/nextjs@10.67.0` 설치. `instrumentation.ts`(런타임별 init) + client/server/edge config + `global-error.tsx`(렌더 에러 경계). `next.config.mjs`를 `withSentryConfig`로 래핑, `experimental.instrumentationHook` 활성.
- **DSN은 `[사업주 환경변수]`(NEXT_PUBLIC_SENTRY_DSN)** — 미설정 시 세 런타임 모두 `enabled:false` **완전 no-op**. 배포 후 Vercel에 DSN만 넣으면 동작. 알림(이메일)은 Sentry 대시보드에서 설정(코드 아님).
- 테스트 발화기: `/admin/debug-sentry`(페이지·클라 캡처) + `POST /api/admin/debug-sentry`(서버 throw) — **둘 다 관리자 게이트 뒤**(공개 시 봇이 이벤트 할당량 소진 가능). 연동 확인 후 삭제 가능.
- PII 최소화: `tracesSampleRate:0`, `sendDefaultPii:false`, `beforeSend=scrubEvent`(URL 쿼리·쿠키·인증헤더 제거, `lib/sentryScrub.ts`).
- 검증: tsc·`next build` 통과, 서버 라우트가 `wrapRouteHandlerWithSentry`로 래핑됨을 dev 로그로 확인.

**Codex 검수 2회(app/api·config 변경이라 필수) — 지적 전부 반영:**
1차: lockfile 미스테이징 / 공개 테스트 라우트 남용 / 중복 캡처 / tracesSampleRate·beforeSend 부재 / 국외이전 고지.
2차: 클라 테스트 페이지도 공개라 자동화 남용 가능 → `/admin/` 아래로 이동 / 서버 GET 부작용(SameSite=Lax CSRF) → **POST로 변경**. → 반영 완료.

### 🟡 Sentry — 고지 배포 완료(984c19a) → DSN 켜기 대기 (2026-08-01 갱신)

**진행 상황: 개인정보처리방침 Sentry 고지가 프로덕션에 배포 완료됐다. 이제 사업주가 DSN만 켜면 순서가 맞는다.**

- ✅ **[완료] `/privacy` Sentry 고지 배포** — 커밋 `984c19a`, `vercel --prod`로 프로덕션 배포·검증 완료. 4항 처리위탁 표(Sentry 행) + 5항 국외이전(Replicate와 동일 **6항목 불릿**: 이전받는 자=Functional Software, Inc. dba Sentry / 이전 국가=**미국(US 확정)** / 이전 항목·목적·일시방법 / 보유기간 최대 90일). `SENTRY_ENABLED = Boolean(NEXT_PUBLIC_SENTRY_DSN)`로 게이팅 — DSN 미설정인 지금은 문구가 **안 뜨는 게 정상**(프로덕션 실측 확인). 한계 고지("스택 내용까지 완전제거 보장 못함") 유지.
- ⬜ **[대기] 사업주 조치 — DSN 켜기 (아래 순서 준수)**:
  1. Sentry에서 프로젝트/DSN 발급 시 **US 리전 선택**(고지가 US로 확정돼 있음 — EU로 만들면 고지와 어긋남). 필요 시 DPA.
  2. Vercel 프로젝트 env에 `NEXT_PUBLIC_SENTRY_DSN` 등록 후 **재배포** → 그 순간 고지 자동 노출 + 에러 데이터 국외이전 개시.
  3. Sentry 대시보드에서 이메일 알림 채널 지정(`beclassyhairs@gmail.com`).
  4. (선택) 소스맵 업로드용 `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` — 없어도 에러 수집은 정상.
- 코드 no-op 재확인(2026-08-01): client/server/edge config 3개 모두 `enabled:Boolean(DSN)`, `sendDefaultPii:false`, `tracesSampleRate:0`, replay 0, `beforeSend:scrubEvent`. 앱 코드에 Sentry로 셀카·카카오 회원번호를 싣는 `setUser/setContext/setExtra` 호출 없음. 현재 `.env.local`에 DSN 키 없음 → 완전 no-op.

### ✅ 배포 검증 (2026-07-21, 프로덕션 실측)

`hair-dna.vercel.app` 신코드 배포 확인:
- **submit-diagnosis 아카이브 제거 라이브** — 셀카(`photoDataUrl`) 없이 `answers`만으로 **200 `{ok:true}`**(구코드는 400 요구). 응답에 `photoUrl` 필드 **사라짐**(내부 노출 제거)
- 주요 경로 7종(`/style`, `/style/upload`, `/bangs`, `/damage-check`, `/hair-quiz`, `/items`, `/home`) 전부 200
- ⚠️ **hair-transform 즉시삭제 실동작은 미검증** — 실제 Replicate 합성(토큰 필요) 1회 후 Vercel Blob `diagnosis/`에 원본이 안 남는지 배포 후 확인 필요. tsc·build·lint·Codex 6회까지만 확인됨.

## 이번 세션 (2026-07-21) — 원본 셀카 서버 영구 보관 제거 — `370ec63`

목표(사업주 지시): 카카오 로그인 유저가 결과 이미지를 계정에 저장해 기기 바꿔도 보게 한다 + 원본 셀카는 서버 영구 보관 안 함. **단 카카오 서버 로그인 미완성이라 지금은 "구조 조사 + 원본 셀카 즉시삭제"까지만**, 계정 저장은 카카오 OAuth 이후로.

### 조사 결론 (셀카 흐름)

- **셀카 영구 저장 지점이 2곳이었다** — 둘 다 공개 Blob, 삭제 로직 없음:
  1. `submit-diagnosis` → Blob 아카이브(Sheets에 URL만 기록, 아무도 재조회 안 함)
  2. `hair-transform` → Blob(Replicate `input_image` URL 확보용, 기능 필수)
- **카카오 로그인은 사실상 흉내** — `app/style/result/page.tsx` 인라인 클라 SDK뿐. 서버 OAuth 라우트 없음, 카카오 ID/토큰 안 받고 실패해도 통과, `profiles`/`users` 테이블 없음. → **서버가 유저 식별 불가 = 계정 저장 지금 불가능**(카카오 OAuth 선행 필요). 미루는 판단 근거.
- **결과 이미지(합성물)는 localStorage에 Replicate CDN URL 원본으로만** 저장 → CDN 만료 시 깨지고 폰 바꾸면 소실. 서버 영구 저장 안 됨(미래 계정저장 대상). 즉시삭제 대상 아님.
- dead route `app/api/analyze-face`(GPT-4o Vision)는 호출부 없음 + 우리 Blob 저장 안 함 → 범위 밖.

### 구현

1. **submit-diagnosis** — 아카이브 업로드 제거. 답변만 Sheets 기록(photoUrl=""). `photoDataUrl`은 구버전 호환 수신만·무시. 응답에서 `photoUrl` 제거(읽는 클라 없음 확인). 클라(`/style/loading`·dead `/upload`)도 셀카 미전송(데이터 최소화).
2. **hair-transform** — 합성 직후 finally 즉시삭제.
   - 예산: 요청 시작 기준 `hardDeadline≈52s`(업로드·초기fetch·폴링 공유) + `deleteDeadline≈59.5s` → `maxDuration=60s` 내 finally 보장(우리 타임아웃이 플랫폼 강제종료보다 먼저 터짐)
   - **orphan 방지**: 호출부가 `randomUUID` pathname을 먼저 정하고 `addRandomSuffix:false`로 업로드 → finally에서 URL 아닌 **pathname으로 삭제**(업로드 abort로 URL 못 받아도 회수). 업로드+합성 전체를 단일 try/finally로 감쌈.
   - `starting`도 폴링(워커 미시작 중 삭제로 합성 깨짐 방지)
3. **lib/storage.ts** — `uploadPhotoToBlob`(pathname 지원, 정적 import) + `deletePhotoFromBlob`(재시도 2회·각 2.5s 상한·절대 reject 안 함).

### Codex 검수 6회 (반복 지적 전부 반영)

`starting` 폴링 누락 → finally 예산 미보장(maxDuration 초과) → try/finally 범위(업로드 직후부터) → **업로드-abort 후 URL 미확보 orphan**(가장 중요, pathname 삭제로 해결) → 예산 경계 캡처 → del 정적 import. 최종 남은 지적(삭제 최종실패·late-commit 경쟁조건 회수)은 **주기적 정리(cron)의 영역**으로, Codex도 "이번 범위 밖 사업주 결정, 지금 필수 아님"으로 확인.

### ⚠️ 검증 공백

- **실제 Replicate 합성 + 삭제 실동작 미확인** — 로컬에 `REPLICATE_API_TOKEN`·`BLOB_READ_WRITE_TOKEN` 없어 tsc·build·lint까지만. **배포 후 1회 확인 필요**: /style 합성 성공 후 Vercel Blob `diagnosis/`에 원본이 남지 않는지.

### 🔴 사업주 결정 대기 (셀카 파기 durable 백스톱)

즉시삭제는 정상 케이스를 덮지만, **삭제 최종실패(재시도 2회 후)** 와 **업로드-abort 후 서버가 del보다 늦게 커밋하는 극단 경쟁조건**은 원본이 잔존할 수 있다. 완전히 닫으려면 **주기적 `diagnosis/` prefix 정리(오래된 orphan을 list+del)**가 필요 — 이건 cron 자동화라 ROADMAP상 배포 전 유보 대상이자 "기존 적재분 파기"와 같은 결정 묶음. 선택: ① 지금 경량 sweep 도입 승인 ② 배포 후로 유보(현 즉시삭제로 tail 리스크 감수). **+ 기존에 쌓인 Blob 셀카·Sheets 행 파기 여부**(되돌릴 수 없어 직접 실행).

### ✅ 배포 검증 (2026-07-21, 프로덕션 실측)

`hair-dna.vercel.app`에서 직접 확인:
- **법적 문구 정정 라이브** — `/style`·`/bangs`·`/damage-check`·`/style/upload` 4개 화면에서 "개인정보 미저장"·"즉시 안전하게 파기" **0건**, 정정 문구 정상 노출
- 주요 경로 10종(`/`, `/style`, `/bangs`, `/damage-check`, `/hair-quiz`, `/items`, `/my-diary`, `/privacy`, `/terms`, `/home`) **전부 200**
- 가독성 정비 번들 반영 확인
- ⚠️ **`/privacy`에 `확정 필요` 플레이스홀더가 유저에게 그대로 노출 중** — 법적 문서 안에 내부 TODO가 살아 있다. 보유기간 확정 전까지 해소 불가(사업주 조치 1번)

## 이번 세션 (2026-07-20) — P0 잔여 UI·법적 3건

### 1. 가독성 정비 — `567b7fe`

40~50대 타깃 기준으로 유저 대면 26개 파일을 일괄 상향. 관리자 화면·`/mbti`·dead code(`app/result`)·dev 디버그 패널은 제외.

- 본문/버튼 `text-sm`(14px)·`text-xs`(12px) → **15px**, 보조 문구 10~11px → **13px**
- 섹션 제목 이터 10px → 12px, 브랜드 장식 라벨 10px → 11px
- 저대비 색 상향: `#9C9482`→`#6B6355`, `#9AA0A6`→`#5F6368`, BottomNav `gray-400`→`gray-500`(11→12px, 전 페이지 영향)
- `/my-diary`(다크 배경) 텍스트 알파 **0.35~0.6 → 0.68~0.85** — 전 페이지 중 대비가 가장 나빴다
- `/items`·`/items/[id]` 추천 이유·사용법·주의사항 13/12px → 15/14px, 주의사항 색 `#9A7B43`→`#7A5F2E`

검증: tsc·build 통과. 모바일 375px 실측에서 **가로 스크롤 0, 컨트롤 텍스트 넘침 0건**(`/style`, `/hair-quiz` computed style).

### 2. 결과지 CTA 우선순위 정리 — `9d4298b`

하단 고정 CTA(가장 값진 자리)를 결과지 4종 모두 **① 저장·프로필 누적**으로 통일. 교차 진단·재진단은 본문으로 강등.

- `/damage-check/result`·`/hair-quiz`: 하단 고정이 **교차 진단(/style)**이었다 → 저장으로 교체
- `/bangs/result`: 동작은 이미 저장이었으나 라벨이 "헤어홈으로 이동"이라 저장으로 안 읽혔다 → 라벨 명확화 + `saved` 상태 반영
- `/style/result`: 하단 고정은 이미 저장. 공유(③)를 재진단(④) 앞으로 배치

> 📌 **ROADMAP의 "하단 고정 '알림 신청' CTA 교체" 전제는 실제 코드와 불일치했다** — 결과지에 알림 신청 CTA는 없고 `Header.tsx`의 장식용 종 아이콘뿐이었다.

⚠️ **결과지 실렌더 미확인** — Browser pane `visibilityState: hidden`으로 마운트 애니메이션 정지(기존 기록된 환경 한계, 앱 버그 아님). `<main>`이 빈 채로 렌더되는 것까지 확인했다. 변경은 JSX 재배치이고 참조 스코프는 tsc로 확인.

### 3. 개인정보 문구 vs 실동작 충돌 정정 — `4496099`

**확인된 사실**: `/style` 플로우는 `app/style/loading` → `/api/submit-diagnosis`로 셀카(base64)를 **Vercel Blob에 업로드**하고 답변을 **Google Sheets에 기록**한다. **파기 로직은 코드 어디에도 없다.** `/bangs`·`/damage-check`는 셀카는 없으나 문항 답변이 `answer_selected` 이벤트로 Supabase `events`에 적재된다.

| 위치 | 기존 문구 | 판정 | 변경 |
|---|---|---|---|
| `/style` 랜딩 | 개인정보 미저장 | ❌ 거짓 | 사진은 결과 생성에 사용돼요 |
| `/style/upload` | AI 분석 즉시 안전하게 파기됩니다 | ❌ 거짓 | 서버에 업로드·보관됩니다 + 처리방침 링크 |
| `/bangs` | 개인정보 미저장 | △ 부정확 | 사진 촬영 없음 |
| `/damage-check` | 개인정보 미저장 | △ 부정확 | 사진 촬영 없음 |

되돌림 방지용 경고 주석을 4곳에 남겼다. 검증: 4개 화면 실렌더에서 거짓 표기 0건.

**Codex 반론(교차검증, 수용)**: 문구 수정만으로는 위법 가능성이 제거되지 않는다 — 적법근거 없는 보관·미파기·국외이전·위탁관리가 본질이고, **문구 수정과 셀카 자동삭제(TTL)는 같은 긴급 변경으로 묶여야 하며 faceswap 승인 대기가 원본 셀카의 무기한 저장을 정당화하지 않는다.** 추가 지적: 기존 적재분은 새 문구로 소급 적법화되지 않음 / "익명 id"도 결합 시 식별 가능하면 개인정보 / 이용자 열람·삭제 요청 대응 체계 부재 / 처리방침에 수탁자·보유기간이 실제로 반영돼야 형식적 링크를 면함.

→ 저장 로직 변경과 기존 데이터 파기는 **되돌릴 수 없어 사업주 승인 대상**으로 올림(아래 조치 대기 참고).

## 이번 세션 (2026-07-20) — P0 이벤트 5종 + UTM 전 구간 재점검 — `58fc2a0`

ROADMAP P0 "이벤트 5종 + UTM 태깅"은 [x]로 표시돼 있었으나 **커버 범위가 `/style`+`/items`뿐**이라 실제 코드와 대조했다. 코어 인프라(first-touch UTM 자동 동승, meta jsonb 분리, 루트 `AttributionCapture`)는 완성 상태여서 **재구현하지 않았고**, 갭 2개만 채웠다.

### 채운 갭

1. **`/hair-quiz` 계측 전무** — 랜딩 4종 중 유일하게 `trackEvent` 호출 0건이었다. 5종 전부 신설.
2. **"리포트 열람"이 별도 이벤트로 없었음** — 기존 `diagnosis_complete`가 **결과지 mount에서** 발화해, 이름은 "완료"인데 실제 의미는 "리포트 열람"이었다. 진짜 설문 제출 시점이 미계측이라 그 사이 이탈이 안 보였다.
   - `diagnosis_complete` → 마지막 문항 제출 시점(survey)
   - `report_view`(신규) → 결과지 열람 시점(result)
   - **`/style`에서 특히 중요**: 두 이벤트 사이에 upload → AI 합성 loading이 끼어 있어 **격차가 곧 합성 대기 이탈률**이다. 지금까지 안 보이던 구간.
3. (부수) `/bangs`·`/damage-check`가 payload로 넘기던 `source: getUtmSource()` 제거 — 어트리뷰션이 자동 동승하므로 `meta`에 중복 적재만 되던 값이고 `/style`과 스키마가 어긋나 있었다.

> 📌 `/mbti`는 "방치" 정책대로 **손대지 않았다** — 이벤트 의미가 본진과 어긋난 채 남아 있다(결과지 mount = `diagnosis_complete`).

### SQL — 불필요 (사업주 조치 0건)

`events.event_name`이 `schema.sql:29`에서 `text not null`이고 **CHECK 제약이 없어** `report_view`는 컬럼 추가 없이 적재된다. UTM 3종도 기존 컬럼 재사용. **실행할 마이그레이션 없음.**

### Codex 검수 4회 (최종 통과)

`/hair-quiz`에서 **선재 버그**를 잡았다 — 다른 설문에 다 있는 `pending` 연타 가드가 이 페이지엔 없어서, 이벤트 중복뿐 아니라 **문항 건너뛰기**까지 가능했다.
1. 연타 잠금 부재 → `useRef` 동기 잠금 추가
2. 잠금 해제가 너무 이름 — `AnimatePresence mode="wait"` 퇴장 0.35s 동안 이전 문항 버튼이 살아 있음 → 타이머 해제로 변경
3. **인트로 퇴장은 0.45s** — 420ms 잠금으로 부족 → `TRANSITION_LOCK_MS = 520`
4. 통과 (데드락 경로 없음, 어드민 퍼널 집계 비파괴 확인)

### ⚠️ 검증 공백

- **설문 클릭 통과 미검증** — Browser pane framer-motion 정지 한계(아래 "검증 환경 한계" 참고) 그대로. **실기기 스모크 1회 필요**: `/hair-quiz` 완주 시 5종이 순서대로 적재되는지.
- 브라우저 실측으로 확인한 것: `/hair-quiz?utm_source=...` 진입 시 `landing_view` 발화 + UTM first-touch 저장. (로컬 insert 실패는 `.env.local`에 Supabase 값 부재 탓, 코드 무관)

### 🟡 다음 세션 결정 대기

- **`report_view`를 어드민 퍼널 단계에 넣을지** — 지금은 `EVENT_LABELS`에 라벨만 추가했고 `FUNNEL_STAGES`·`/api/admin/funnel`·`lib/funnelAggregate.ts`는 손대지 않았다(C-3 영역이라 스코프 제외). **현재 데이터는 쌓이되 "완료 → 리포트열람" 이탈률은 화면에 안 보인다.** 넣으면 5단계 → 6단계.
- **`diagnosis_complete` 의미 변경으로 배포 전후 수치가 불연속** — 완료 시점이 결과지 열람에서 설문 제출로 앞당겨져 완료율이 상승한다. Codex 확인상 집계 구조는 안 깨지고 고유 유저 기준이라 왜곡은 없으나, 기간 비교 시 주의.

## 이번 세션 (2026-07-20) — 체크리스트 C-1 + C-3

### C-1. 상품 이미지 자체 스토리지 복사 (미러링) — `f4aef57`

공급사(도매꾹 등) 이미지 핫링크는 공급사가 원본을 내리는 순간 상품 카드가 깨진다. 관리자 게이트 안쪽에서 서버가 원본을 받아 Vercel Blob에 올리고 자체 URL을 반환하는 경로를 신설했다.

- `lib/imageMirror.ts` (서버 전용) — SSRF 방어 + 다운로드 검증. https 스킴만 · 호스트 allowlist(10개, `IMAGE_MIRROR_EXTRA_HOSTS`로 확장·형식 검증) · 리다이렉트 미추종 · **node:https `lookup` 훅으로 연결 시점 사설/루프백 IP 차단**(사전 조회는 DNS 리바인딩 창이 생겨 폐기) · IPv6 16바이트 정규화 후 범위 판정 · 스트리밍 10MB 상한 · 무활동 15초/전체 30초 타임아웃 · Content-Type allowlist + 매직바이트 검증
- `POST /api/admin/products/mirror-image` — 자체 URL 반환. 저장은 하지 않는다(관리자가 "저장"을 눌러야 반영)
- `ProductManager` — 공급사 이미지면 경고 + "자체 저장소로 복사" 버튼, 목록에 "공급사 이미지 · 복사 필요" 뱃지(**기존 등록분 식별용** — 컨퓸 미스트 등은 수정 → 복사 → 저장 3단계로 옮긴다)
- `lib/products.ts`에 `isSelfHostedImageUrl` (클라이언트/서버 공용)

**Codex 검수 4회** — 1차 '수정 필요'(arrayBuffer 무제한 적재, DNS 리바인딩) → 2차 '수정 필요'(**IPv6 표기 우회**: `::ffff:a00:1`·`0:0:0:0:0:ffff:10.0.0.1` 등이 사설 IP로 연결됨, setTimeout이 무활동 상한) → 3차 '수정 필요'(`::` 문법 위반 승인, NAT64 판정이 /32) → **4차 통과**. 방어 로직 단위 검증 73건 통과.

📌 **PSL(Public Suffix List) 전수 검증은 의도적으로 도입하지 않았다.** `IMAGE_MIRROR_EXTRA_HOSTS`는 외부 입력이 아니라 사업주가 Vercel에서 직접 넣는 값이고, 잘못 넣어도 내부망 접근은 연결 시점 IP 검증이 따로 막는다. 이유를 코드 주석에 남겼고 Codex도 "수용 가능한 위험 판단"으로 동의. 관리자가 여럿이 되면 재검토.

### C-3. 어드민 퍼널 대시보드 확장 — `ee499c1`

- `GET /api/admin/funnel?range=today|7d|30d` — 5단계 퍼널 고유 유저 수 + 단계/전체 전환율, utm_source·utm_campaign별 분해, **조회수 1만당 구매 계수**. 집계는 전부 서버에서 수행하고 숫자만 반환(원본 행·anonymous_id 미노출)
- `lib/funnelAggregate.ts` — 집계 수식을 순수 함수로 분리(합성 데이터로 검증 가능하게). 단위 검증 21건 통과
- `FunnelPanel` — 기간 필터 + 핵심 계수 카드 3종 + 퍼널 표 + UTM 분해 표 2종. `AdminDashboard` 상단에 마운트(기존 섹션 유지)

**Codex 검수 4회** — 지적 6건 전부 반영 후 통과:
1. offset 페이지네이션 중복·누락 → **`(event_time, id)` keyset 커서로 교체**. `event_time`이 **클라이언트 생성값**이라 조회 중 도착한 과거 시각 행이 앞 페이지에 끼어들면 뒤 페이지가 밀린다
2. `truncated` 경계값 오탐 → 커서 다음 1건 probe
3. `'오늘'`이 서버 시간대 의존(Vercel=UTC) → `kstTodayStart()` KST 자정 기준
4. probe 오류 무시 → 500 반환
5. `event_time` 인덱스 부재 → 마이그레이션 SQL 작성
6. `asOf`가 스냅샷 미보장 → **상한을 DB 발급 `id`로 고정** + `Number.isSafeInteger` 검증

### ⚠️ 이번 세션 검증 공백 (배포 후 확인 필요)

- **관리자 화면 실행 검증 미수행** — 로컬 `.env.local`에 `ADMIN_SECRET`이 없어 게이트가 fail-closed 500이라 `/admin` 진입 불가. 빌드·타입체크·로직 단위 검증까지만 했다. **/admin 화면 실렌더는 배포 후 사업주 확인 필요.**
- **이미지 복사 실동작 미확인** — 실제 공급사 이미지로 복사되는지는 배포 후 1회 눌러봐야 확정. `BLOB_READ_WRITE_TOKEN`이 Vercel Production에 있어야 하고, 도매꾹 실제 이미지 도메인이 allowlist와 맞는지 확인 필요(다르면 `IMAGE_MIRROR_EXTRA_HOSTS`에 추가)
- **스트리밍 10MB 상한** — 로컬 https 인증서 제약으로 실행 검증 못 함(코드 리뷰로만 확인)
- **keyset 쿼리 실제 응답 미확인** — PostgREST 문법은 Codex가 공식 문서로 확인해줬고 URL 직렬화도 확인했으나, 실제 응답은 못 봤다. **이벤트 1,000건 이하면 커서 경로를 안 타므로 데이터가 쌓인 뒤 대시보드를 한 번 확인할 것.**

### 🔴 사업주 조치 대기

1. **🆕 셀카 보유기간 확정 + 파기 로직 도입 여부 (법적 최우선)** — 현재 `/style` 셀카가 Vercel Blob에 **무기한 보관**되고 파기 로직이 없다. 문구는 사실에 맞게 정정했으나(`4496099`) Codex 지적대로 그것만으로 위법 가능성이 사라지지 않는다. 결정 필요: ① 보유기간(합성 직후 즉시 삭제 / N일 TTL) ② **기존에 쌓인 Blob 셀카·Sheets 행을 파기할지** — 파기는 되돌릴 수 없어 반드시 사업주가 직접 결정·실행 ③ `/privacy`의 `[ 확정 필요 ]` 플레이스홀더를 채울 실제 문구
2. **`supabase/events_funnel_index_migration.sql` 실행** (SQL Editor) — `events`에 `event_time` 인덱스가 없어 기간 필터·정렬이 순차 스캔. 지금은 데이터가 적어 체감 안 되지만 쌓이면 대시보드가 느려진다
3. **Vercel `BLOB_READ_WRITE_TOKEN` 등록 확인** — 없으면 이미지 복사 API가 503을 반환한다
4. ~~push 승인~~ → **완료(2026-07-21)**. `f940ffb..594e862` 배포·프로덕션 검증까지 끝남

## 이번 세션 가벼운 픽스 (2026-07-19)

- [x] **결과/전 페이지 확대 금지 제거** — `app/layout.tsx` viewport에서 `maximumScale:1`·`userScalable:false` 삭제. 핀치 줌 허용(40~50대 접근성). 브라우저 검증: viewport=`width=device-width, initial-scale=1`. UI 전용(Codex 생략) — `fix: 확대 금지 제거` (dec5e77)
- [x] **/home 가짜 날씨 개인화 문구 제거** — `app/home/page.tsx`의 고정 문구 "오늘은 습도가 높아..."(실시간 개인화처럼 보임)를 진단 기반 문구로 교체. 브라우저 렌더 검증. UI 전용 — `fix: /home 가짜 날씨 개인화 문구 제거` (eb920c8)
- [x] **alert/confirm → 토스트** — `lib/toast.ts`(모듈 pub/sub) + `app/components/Toaster.tsx`(하단 중앙, 2.5초 자동 해제) 신설, layout에 마운트. 유저 대면 alert 3곳(result 링크복사·mbti 링크복사·my-diary 다운로드 실패) → `toast()` 교체. admin 삭제 confirm 2곳은 차단형이라 유지. 브라우저 검증(위치/스타일/컴파일). UI 전용 — 커밋 예정
- (문서) `docs/ROADMAP.md` 추적 시작 + CLAUDE.md 규칙 0(ROADMAP 병행 읽기)·14(연속 진행 모드) 추가 (60d3d84, 3be5d09)

- [x] **/style/loading 15초 강제 대기 제거** — 최소 15초 광고 대기 타이머(`Promise.allSettled`)를 걷어내고 hair-transform API 완료 즉시 `/style/result`로 라우팅. AdSense 정책 리스크 + 초반 이탈 원인 제거. 광고는 합성 대기 시간에만 자연 노출 — `fix: /style/loading 15초 강제 대기 제거` (eb7dd0f, push 완료)
- [x] **/my-diary 기장 라벨** — 확인 결과 **이미 정상**. `A_LABELS.q11_length`가 `app/style/surveyData.ts`의 `LENGTH_LABEL_MAP`(SSOT)을 import해 쓰고 있어 `bob=단발` 등 정확히 렌더됨(과거 하드코딩 `bob=숏단발` 오표기는 이미 리팩터로 제거됨, 코드 주석에 기록). 다이어리는 style 플로우만 저장하므로 style 서베이가 올바른 기준이며 별도 수정 불필요. (참고: diagnosis 서베이의 `shoulder=어깨선`은 다른 플로우로 다이어리에 저장되지 않음)

## 이번 세션 배포전 정비 4종 (2026-07-19, 게이트 없음 · 전부 커밋 · next build 통과 · push 대기)

- [x] **공통 푸터 + 사업자 표시(전자상거래법)** — `lib/business.ts`(상호/대표자/사업자등록번호/통신판매업신고번호/주소/이메일 6항목) + `app/components/SiteFooter.tsx`(루트 마운트, `/admin` 제외, /privacy·/terms 링크). 사업자 표시 블록은 `isBusinessInfoReady()`로 **6항목 실값이 모두 채워졌을 때만 렌더**(플레이스홀더 노출 방지, 값 채우면 자동 표시). 법적 링크·저작권은 항상 표시. `feat: 공통 푸터…` (a51c525) + 조건부 렌더 후속.
  - 📌 **메모**: 사업자 표시 실값은 현 사업자(아내 명의) 기준으로 2일 내 입력 예정. 2027-01-01 법인 전환 시 `lib/business.ts` 값만 교체하면 됨.
- [x] **/privacy·/terms 초안** — 수집(진단답변/셀카/이벤트로그)·목적·보유기간·처리위탁(Supabase/Vercel/Replicate/Google)·국외이전(Replicate 미국·얼굴이미지)·이용자권리·보호책임자(placeholder)·만14세 미만 미수집. 상단 "초안" 배너 + noindex. 검증 완료. `feat: /privacy /terms…` (6822395)
- [x] **관리자 매칭 미리보기 시뮬레이터** — `/admin/matching-preview`: curl/thickness/density 조합 → /items에서 보게 될 목록·순서 미리보기. **데이터는 /items와 동일 `/api/items`, 매칭은 `lib/itemsMatch.productMatchesCoreKey` 그대로 재사용(별도구현 없음)**. 타입 어휘를 `lib/hairTypeOptions.ts`로 추출해 ProductManager와 단일 출처 공유. 사이드바 링크 추가. (admin 인증 뒤라 UI 실행검증은 미수행 — tsc+build+로직 재사용으로 확인) `feat(admin): 매칭 미리보기…` (8a6d69f)
- [x] **SEO 기본 정비** — `app/robots.ts`(admin·api 차단) + `app/sitemap.ts`(공개 엔트리) + 루트 metadata(title/desc/OG/twitter, OG이미지=`/og-default.png` 플레이스홀더) + `app/items/layout.tsx`. 기존 랜딩 metadata는 유지. robots/sitemap/title 브라우저 검증. `feat: SEO 기본 정비…` (63eb9d0)
  - ⚠️ 시도했던 `app/opengraph-image.tsx`(ImageResponse 생성형 OG)는 `@vercel/og` Invalid URL로 **빌드 실패** → 제거하고 정적 플레이스홀더 경로 참조로 전환. `public/OG_PLACEHOLDER_README.md` 참고.

## 이번 세션 랜딩 P0 픽스 6종 (2026-07-20, 프론트만 · 백엔드 세션과 병행 진행 · 전부 커밋 · 개별 커밋 분리)

> 근거 자료: `docs/landing_diagnosis_audit.md`(랜딩 4종 구조 조사 보고서). 백엔드(관리자 인증/`app/api`/`lib/supabase*`/`middleware.ts`/`supabase/`)는 건드리지 않음 — 다른 세션 작업 중이라 스코프 제외.

- [x] **디버그 패널 프로덕션 차단** — style `DiagnosisDebugPanel` + bangs `?debug=1` 박스를 `NODE_ENV==="development"`일 때만 렌더링. `fix: 진단 로직 디버그 패널 프로덕션 노출 차단` (bfcbacf)
- [x] **style 저장에 kind:"style" 명시** — 기존 암묵(kind 없음=style) 규칙 대신 명시적 저장. `classifyKind()`는 로직 변경 없이 그대로 하위호환. `fix: style 저장 항목에 kind:"style" 명시` (27d6780)
- [x] **hair-quiz 저장 연동** — `lib/beautyProfile.ts`에 이미 준비돼 있던 kind:"hairquiz" 구조를 실제 연결(`appendDiaryEntry`+`refreshBeautyUserProfileFromDiary`+저장 버튼). 채점 미반영이던 Q6(가장 큰 불만) 답변을 concernTags(#볼륨처짐/#부스스/#스타일유지어려움)로 살려서 저장. `feat: hair-quiz 결과 저장 연동 + Q6 죽은 입력값 활용` (5e2b3f1)
- [x] **damage-check 탈색 하드 필터** — `chem_bleach` 선택 시 점수 계산과 무관하게 Level 하한 강제(최소 Lv3, 물리 손상 신호(snap/stretch) 동반 시 Lv4). 기존 점수 로직 유지, 후처리 필터로 추가. `feat: damage-check 탈색 경험 Level 하드 필터 추가` (2afcafe)
- [x] **damage-check Lv4 정직 처방** — 극손상모 결과지에 "홈케어보다 커트가 우선" 처방 + 압착식 케라틴류 주의 문구 추가(담담한 톤, 공포 조장 없음). `feat: damage-check Lv4(극손상모) 결과지 정직 처방 추가` (de21e3c)
- [x] **교차 진단 CTA 3종** — style(시술 7회 이상만)→damage-check, damage-check→hair-quiz(+기존 /style 유지), hair-quiz→damage-check(+기존 /style 유지). 텍스트 링크만 추가, 신규 컴포넌트 없음. `feat: 랜딩 3종 교차 진단 CTA 추가` (7e1182e)
- [x] ~~⚠️ 빌드 검증 이슈(ENOENT/EINVAL)~~ → **해소됨(2026-07-20)**: `npm run build` 재실행 시 재현되지 않고 정상 통과. OneDrive 실시간 동기화의 일시적 파일 잠금이 맞았고 코드 문제 아니었음. 별도 조치 불필요.

## 이번 세션 검증 + 회귀픽스 (2026-07-20)

랜딩 P0 6종을 빌드·화면 검증까지 완주. 검증 방법과 결과:

- [x] **빌드** — `npm run build` 통과(수정 전/후 각각). 타입체크(`npx tsc --noEmit`)도 클린.
- [x] **디버그 패널 차단 검증** — 프로덕션 번들 문자열 grep으로 확정. style의 `"진단 로직"`, bangs의 `"왜 이 앞머리가 추천됐나요"`가 `.next/static/`에서 제거됨(같은 청크의 일반 문구는 잔존 → grep 자체는 유효). dev 번들에는 정상 노출.
- [x] **탈색 하드 필터 실측 3케이스** — ①최건강 응답+탈색 → **Lv3**(필터 없으면 Lv1) ②snap+탈색 → **Lv4**+처방 블록 ③최건강, 탈색 없음 → **Lv1**, 처방 없음(대조군). 의도대로 동작.
- [x] **Lv4 정직 처방** — 노출/미노출 조건 정확. 톤 담담함 확인.
- [x] **교차 CTA** — style 결과지에서 `count_7plus`일 때만 "정밀 손상 진단 받아보기" 노출, `count_1_2`면 사라짐까지 확인. damage-check 결과지의 hair-quiz·/style CTA 2종 라이브 확인.
- [x] **🐛 회귀 발견·수정** — hair-quiz 저장 연동(5e2b3f1)이 `/my-diary`를 깨뜨림. `/my-diary`는 damage/bangs만 분기하고 나머지를 전부 style 카드로 흘려보내는데, 이 커밋 전엔 hairquiz 엔트리가 없어 드러나지 않던 경로. 실제 저장 시 **"STYLE 1" 라벨 + 제목 빈칸 + 엉뚱한 제품 추천**으로 렌더됐음. 기존 damage 카드 패턴대로 `HairQuizDiaryEntry` 타입 + `isHairQuizEntry` 가드 + `HairQuizDiaryCard` 추가 → 3종(style/hairquiz/damage) 동시 저장 실측으로 분기 정상 확인. `fix: /my-diary hairquiz 엔트리 전용 카드 분기 추가` (2340ba9)
- (문서) `docs/landing_diagnosis_audit.md` 커밋 (507b6a6)

### ⚠️ 검증 환경 한계 (앱 버그 아님)

Browser pane 탭이 `visibilityState: hidden`(requestAnimationFrame 0프레임)이라 **framer-motion 애니메이션이 전부 정지**한다. `AnimatePresence mode="wait"` 구간이 멈춰서 설문 클릭 진행·모달 오픈이 불가. 이번엔 sessionStorage/localStorage를 직접 시딩해 결과지를 렌더하는 방식으로 우회했다. 다음에도 같은 증상이 보이면 앱 버그로 오진하지 말 것.

이 한계 때문에 **코드 확인까지만 하고 실렌더 미확인**인 항목(실기기 스모크 1회로 덮을 범위):
- hair-quiz 결과지의 교차 CTA 2종 (코드상 `href="/damage-check"`, `router.push("/style")` 존재)
- style 저장 버튼 → localStorage 기록 (핸들러가 카카오 모달 내부에 있음)
- `/result` 페이지 렌더 (진입 게이트에 막힘 — `/upload` ← `/diagnosis/quick` 경유 필요)

## 이번 세션 파트너스 고지 제거 (2026-07-20)

확정 정책(**본진에 파트너스 링크·고지 금지, 파트너스는 미끼 랜딩 전용**)에 따라 본진 화면에서 외부 제휴 흔적 제거. 제품 노출은 자체 커머스(`/items`)로만 유도. `fix: 본진에서 쿠팡 파트너스 링크·고지 제거` (f0c4eb8)

- `/my-diary`: 고지 문구 삭제 + 제품 카드 실링크 4종 → 카테고리 힌트 + 발견템 CTA로 교체(damage 카드 외부 링크도 동일 처리). 실측: coupang 링크 0개, `/items` 링크 2개, 고지 문구 없음.
- `/result`: 제품 보기 버튼의 플레이스홀더 제휴 링크(`XXXXXXX`) → `/items`
- `app/result/masterData.ts`, `app/style/recommend.ts`: 미사용 `coupangUrl` 필드 제거(후자는 완전 dead code였음)
- `app/damage-check/damageRecommend.ts`, `lib/analytics.ts`: 정책과 모순되던 주석 정리
- **최종 검증**: 프로덕션 번들 전수 grep 결과 `link.coupang.com`·고지 문구가 **`/mbti/result` 청크에만** 잔존 → 의도대로.

> 📌 **`/mbti`는 이번 범위에서 의도적으로 제외** — 실제 파트너스 링크 16개 + 고지 문구가 붙은 실수익 페이지인데 sitemap에 `/style`·`/bangs`와 나란히 **본진 도메인 공개 엔트리**로 등록돼 있어 정책상 충돌한다. 수익 직결이라 사용자 결정 대기. 아래 백로그 참고.

## 다음 작업 순서

### 🎯 8월 배포 우선순위 (확정)

1. [~] **faceswap 복원 + 84 레퍼런스 + 일일 제한 + 품질 승인** — **복원 초안 완료(브랜치 `feature/faceswap-restore`, 미push). main 반영·배포는 셀카 품질 테스트 사업주 승인 후에만.** 남은 것: ① 레퍼런스 실이미지 채우기(84폴더+default) ② 셀카 품질 테스트→승인 ③ 개인정보 문구 값 확정 ④ 서버측 일일제한 도입 여부 ⑤ face-swap version hash 유효성. 상세: `docs/faceswap_restore_notes.md`. (dailyLimit은 클라이언트에 이미 연결됨 — 서버 강제만 미도입)
2. [ ] **상품 20~30개 엄선 등재(반자동)** — 소싱→draft→관리자 승인 흐름으로 20~30개 상품 엄선 등재. 완전 자동화 아님(반자동, 사람 검수 유지).
3. [ ] **셀카 파기 로직** — 위 사업주 조치 1번 결정 후 착수. 결정만 나면 코드 작업 자체는 작다.

> ⚠️ **P0에서 코드로 넘길 수 있는 항목은 현재 0건이다.** 가독성 정비·결과지 CTA·개인정보 문구 3건을 마지막으로, 남은 P0는 전부 사업주 승인/수동 작업(faceswap 품질 승인, 상품 등재, **실물 수령 검증 게이트**, 셀카 파기 정책)에 막혀 있다. 다음 세션에서 "이어서 진행해"가 오면 **P1(운영 안전망 B-1~B-4, D-2 OG 이미지)**로 넘어가는 것이 순서다.

> ~~이벤트 5종 + UTM 태깅~~ → **완료**. 1차 2026-07-19(완료 이력 17번, `/style`+`/items`), 2차 2026-07-20에 `/hair-quiz` 확장 + `report_view` 분리로 전 구간 마감(`58fc2a0`). 배포 순서: migration SQL 먼저 → 코드 push. (2차는 SQL 불필요)

### 참고사항 (8월 배포 전제)

- **광고 수익모델 완전 제거 확정** — AdSense 등 광고 기반 수익모델 폐기. 수익 핵심은 커머스.
- **본진(hair-dna 본 서비스)에 쿠팡 파트너스 링크 금지** — 쿠팡 파트너스는 미끼 랜딩 전용으로만 사용, 본진 유입에는 넣지 않음.
- **배포 초기 구매 버튼은 외부 링크 허용(과도기)** — PG 연동 완료 후 폐쇄 루프(자체 결제)로 전환. 외부 링크는 한시적.
- **배포 전 신규 자동화 공장 건설 금지** — 배포 전까지는 새 자동화 파이프라인/시스템 구축 중단, 위 3개 우선순위에 집중.

### 완료 이력

1. [x] `supabase/products_schema.sql` 커밋 — `chore: harden products discovery schema migration` (4fc0061)
2. [x] 관리자 products GET/POST/PUT 필드 제한 — 7개 필드만 명시. Codex 재검수 통과 — `fix: restrict admin products API responses to explicit fields` (3e8ec61)
3. [x] ~~Supabase 읽기 전용 사전점검~~ → 사용자 직접 실행, `products` 테이블 미존재 확인됨. 계획 변경 트리거
4. [x] `products_schema.sql` 빈 DB 최초 생성용 재작성 + 커밋 — `2f275b9`, `fd0addf`
5. [x] Supabase SQL Editor에 전문 1회 실행 — **성공. Table Editor에서 products 테이블+전체 컬럼 생성 확인, 0 records**
6. [x] 실행 후 확인 — 테이블/컬럼 생성 확인됨 (제약/인덱스/트리거는 스키마 스크립트에 포함, 개별 재확인은 필요 시)
7. [x] `/api/admin/products` GET/POST/PUT 신규 필드 확장 — 이미지/소싱 필드 노출·저장, `ADMIN_PRODUCT_FIELDS` 상수화. PUT은 `!== undefined` 가드로 기존 폼 저장 시 신규 필드 미삭제. Codex 검수: diff 자체 결함 없음(인증 부재만 지적 — 백로그 항목). `feat:` 커밋 예정
8. [x] `/admin/products` UI 확장 — 공개 상태(status) 셀렉트 + 이미지 검수 블록(image_status/image_source/image_alt/image_note) + 리스트 status·image_status 뱃지. image_source 미설정은 undefined로 전송(빈 문자열 CHECK 위반 방지). 폼 렌더 dev 서버 검증 — `feat: add status and image-review controls to admin product form` (b91ad62)
9. [x] **관리자 최소 인증 게이트** — `middleware.ts` + `lib/adminAuth.ts`(HMAC 세션 토큰 `exp.sig`, 만료 강제) + `/api/admin/login`·`/logout` + `/admin/login` + 사이드바 로그아웃. Codex 1차 '수정 필요'(세션 만료 미검증) → 만료시각 서명 포함으로 수정 → 재검수 통과. 로컬 검증(위조/만료 토큰 거부 포함) — `feat: add minimal admin auth gate before public deploy` (e7947bf)
10. [x] **배포 완료(2026-07-19)** — main push → Vercel 프로덕션 배포(`hair-dna.vercel.app`). 빌드 1차 실패(`/admin/login` useSearchParams Suspense 누락) → 수정 후 재배포 성공(`9f8a529`). `ADMIN_SECRET` Vercel Production 등록 + 재배포 후 게이트 라이브 검증 완료: 무인증 API=401, 무인증 페이지=307→login, 틀린/빈 비번=401, 사용자 실제 비번 로그인 성공. 공개 사이트 정상.
11. [x] `/admin/sourcing` keep → draft 저장 — 신규 `POST /api/admin/sourcing/import`(인증 게이트 뒤, status='draft'/image_status='needs_review' 서버 강제, 필드 allowlist, 배치 상한 200) + SourcingReview 명시적 버튼(keep 클릭만으론 저장 안 함, savedKeys 재클릭 중복 방지). Codex 1차 수정필요(중복 저장·오류 원문 노출) → 수정 → 재검수 통과 — `feat: save sourced keep candidates to products as draft` (a0d940e)
12. [x] `/items` 공개 조회 API 신설 — `GET /api/items`(공개, 인증 게이트 밖), status='approved' AND image_status='approved'만, `PUBLIC_PRODUCT_FIELDS` allowlist(내부필드 미노출), supabaseAdmin 서버 경유(anon RLS 안 엶). Codex 통과 — `feat: public /api/items ...` (cf33726)
13. [x] `/items` DB 연동 + 매칭 — 하드코딩 제거, `/api/items` 연동. 매칭은 유저 coreKey(최신 /style answers의 curl__thickness__density) ↔ 상품 fit/avoid_hair_types(무작위 아님). 구매 링크(buy_link) 연결. 매칭 로직 유닛테스트 9/9. (hairTags는 한글 고민어휘라 미사용) — 같은 커밋
14. [x] `/admin/products` 매칭/추천 입력 UI — fit/avoid_hair_types를 curl/thickness/density 선택 조합으로 추가·삭제(자유입력 금지, 오타 방지), solves_concern·recommend_reason·usage_guide·caution_note 입력. 빈 값 undefined. 프론트 전용(API는 기존에 이미 수용) — `feat: add matching + copy fields to admin product form` (091367d)
15. [x] `/items/[id]` 상세페이지 + 공개 상세 API — `lib/publicProducts.ts`(서버전용 공용 조회), `GET /api/items/[id]`(approved만·allowlist만·없는id 404), `/items/[id]` 서버컴포넌트(notFound 실제 404) + 구매버튼 trackEvent, 카드→상세 이동. Codex 통과 — `feat: /items/[id] detail page + public detail API` (730d74b)
16. [ ] **[게이트] 자동/반자동 등록 상품 실물 수령 검증** (2026-07-25 결정으로 기존 "상품 1개 수동 엔드투엔드 완주" 게이트를 대체) — 자동/반자동으로 등록한 상품 **최소 1개(권장 2개)** 를 사업주가 **실제로 사서 받고** 수령 체크리스트를 통과해야 함. 통과 전까지 **`sourcing_candidates` 자동 투입 및 정기 스케줄(cron) 착수 절대 금지.** 코드 흐름(소싱→draft→approve(status+image_status=approved, fit_hair_types 설정)→매칭 유저 /items 노출→상세→buy_link)은 검증 대상이되, 게이트 통과 기준은 **실물 도착 + 체크리스트**다. ← **남은 단계(사업주 실물 구매·수령)**
18. [~] **faceswap 복원 초안 (브랜치, 2026-07-19)** — `feature/faceswap-restore`(미push). route.ts를 flux→codeplugtech/face-swap 복원(히스토리 9e6eb04 기반), `getReferenceCandidateDirs`(84-밖 폴백 규칙 초안), 144조합 폴더 매핑 매니페스트·개인정보 문구 초안·복원 노트 작성. Codex 검수: 1차 '수정 필요'(SSRF·셀카URL 로그노출)→반영→재검수 통과. tsc 통과. **배포 안 함 — 승인 게이트 대기.** 커밋 `1403a30`(브랜치).
17. [x] **이벤트 5종 + UTM 태깅 전 구간 (2026-07-19 완료)** — trackEvent 단일 코어 통합, 5종 퍼널(landing_view/diagnosis_start·complete/product_clicked/purchase_click) + 보조(answer_selected/product_viewed) 계측, /style·/items 전 구간 채움, first-touch UTM 3종 모든 이벤트 동승, meta jsonb 분리+가드. Codex 2회 검수(1차 수정필요→반영→통과). **push·Vercel 배포·Supabase `events_attribution_migration.sql` 실행까지 전부 완료 → events insert 정상.**

## 확정된 결정사항

- 관리자 전체 인증은 지금 안 만든다. GET/POST/PUT 필드 제한(최소 방어)만 하고 진행. 전체 인증은 백로그.
- ~~**감수 리스크(2026-07-18): 무인증 admin GET에 내부 필드 노출.**~~ → **해소됨(2026-07-19): 배포 직전 최소 인증 게이트(9번) 신설로 `/admin/*`·`/api/admin/*` 전체가 `ADMIN_SECRET` 뒤로 잠김.** Codex가 배포 반론에서 이 노출을 '배포 불가'로 지적 → 게이트 구현으로 차단.
- `products` 테이블이 Supabase에 아예 없었음이 확인됨(2026-07-18) — "확장 블록만 BEGIN/COMMIT 실행" 계획은 폐기. 대신 `products_schema.sql` 파일 전체(테이블 생성+RLS+확장)를 BEGIN/COMMIT으로 감싸 한 번에 실행하는 방식으로 변경.
- product_verification_logs 같은 감사 테이블은 지금 안 만들고 운영에서 필요해지면 추가.
- 커밋 히스토리 참고: 28a2f1e(sourcing 도구), 45cf3ea(스키마 1차), 4fc0061(스키마 확장 1차), 3e8ec61(GET/POST/PUT 필드 제한)는 이미 존재.

## 백로그 (차단 아님, 기록)

- **`/mbti` 파트너스 정책 충돌 (결정 필요)** — `/mbti/result`에 실제 쿠팡 파트너스 링크 16개 + 법적 고지가 있는데, `/mbti`가 `app/sitemap.ts`에 본진 도메인 공개 엔트리(priority 0.8)로 등록돼 있어 "본진 파트너스 금지" 정책과 충돌. 선택지: ①본진에서도 제거하고 발견템 유도로 교체(결과지 하단이 비어 대체 CTA 필요) ②sitemap에서 빼고 미끼 랜딩으로 명확히 분리 ③별도 도메인 분리. 수익 직결이라 사업 판단 필요.

- **랜딩 4종(style/bangs/damage-check/hair-quiz) 구조 조사 보고서 작성 완료(2026-07-19)** — `docs/landing_diagnosis_audit.md`. 진단 알고리즘 재설계(전문가 규칙 기반 2층 구조) 착수 전 기초 자료. 코드 수정 없음(읽기 전용 조사). 핵심 관찰: damage-check의 Level/Type 축 분리 설계가 4개 중 가장 확장 친화적이라 2층 구조 참고 모델로 적합. hair-quiz는 저장 미연동(`lib/beautyProfile.ts`는 이미 kind:"hairquiz" 준비됨, 연결 작업만 남음).


- **관리자 전체 인증** — 최소 게이트(방안 A: 공유 비밀번호+서명 쿠키, 2026-07-19 구현)로 1차 방어됨. 남은 개선(백로그): 로그인 rate limit(서버리스 KV 필요), 계정별 인증(방안 B: Supabase Auth+allowlist), `ADMIN_SESSION_SECRET` 분리. 발견템 파이프라인 트래픽 붙기 전 검토.
- 공개 상품 API `/api/products` 분리 신설
- **sourcing→draft 저장 DB 멱등성** — 현재 중복 방지는 브라우저 메모리(savedKeys) 단위라 새로고침/재붙여넣기 후 같은 후보 재저장 가능. DB 수준 멱등성(예: buy_link 유니크 제약 또는 upsert) 필요 시 도입.
- **/items 진단 전 노출 정책** — coreKey 없는(진단 전) 방문자에겐 approved 전체를 최신순 노출 중. "진단 전엔 범용(fit 비어있음) 상품만" 또는 "진단 유도 CTA만" 정책으로 바꿀지 결정 필요.
- **/items 고민 기반 매칭 보강** — 현재 매칭은 모발타입(coreKey↔fit_hair_types)만. hairTags(한글 고민어휘) ↔ solves_concern 매칭을 추가하면 정밀도 향상 가능(현재 solves_concern은 노출만 하고 매칭엔 미사용).
- **events anon INSERT 무결성 강화** — RLS `with check(true)`라 anon key 보유자가 임의 event_name/위조 user_id/대용량 payload를 직접 insert 가능(선재 조건, 이번 변경 아님). Codex 확인상 SELECT/UPDATE/DELETE 우회·service_role 노출은 없음. 트래픽/스팸 리스크 붙기 전 DB 제약(허용 event_name·JSON 크기·필수필드)이나 서버 API 경유 insert로 보강 검토.
- **랜딩별 커머스 귀속** — /items·/items/[id] 이벤트엔 landing_id가 없어(커머스는 진단 랜딩과 분리된 면) 랜딩별 퍼널의 제품클릭/구매는 0으로 집계됨. **집계(랜딩 무관) 퍼널은 정상**. 랜딩별 귀속하려면 session_id 기반 스티칭 필요.
- **PRODUCT_VIEWED 퍼널 단계** — 이벤트는 수집되나 AdminDashboard FUNNEL_STAGES엔 미포함. 노출→클릭 전환율 화면 표시하려면 추가.
- `sourcing_candidates` 테이블 — 리서치 에이전트가 API로 직접 후보 등록하는 구조. 관리자 인증 이후
- lib/sourcing.ts fit_hair_types 매핑 불일치 (bangs_babyhair, damaged_hair_high_history)
- 해외 플랫폼 변형(AliExpress US 등) sales_type=null 처리 개선
- CSV 파서: 닫히지 않은 따옴표 오류 미보고
- /home dead CTA 2개 (진단 다시보기, items 이유보기), mainConcern 하드코딩 문구
- ~~/hair-quiz 저장 미연결 (kind는 준비됨)~~ → **해소됨(2026-07-20)**, 랜딩 P0 픽스 6종 참고 (+ 이로 인한 /my-diary 회귀도 같은 날 수정)
- /api/hair-transform의 pickReferenceUrl/getBaseUrl dead code + public/references 폴더 비어있음 — 의도 확인 필요
- lib/dailyLimit.ts가 hair-transform 라우트에 미적용 — 실제 호출 제한 여부 확인 필요

## 인프라/도구 체계

- 창구: Windows Claude Code (구현 + 이 파일 갱신 담당)
- 검수: Codex CLI — CLAUDE.md 3번 규칙에 따라 백엔드 변경 시 자동 호출
- 리서치: Ubuntu Claude(서치) → `sourcing/inbox/*.tsv` → git push
- PM/판단: Claude 채팅 (큰 결정만 세컨드 오피니언 교차 확인)
- 오픈클로: 파이프라인 완성 후 정기 운영 작업(URL 생존/이미지 체크)에 도입 예정
