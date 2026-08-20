# RESULT_ENUMERATION_V2.md — 결과지 V2 style 전수 덤프 (실함수 호출)

> 생성기: `copy-drafts/enumerate/run.ts` (`npm run dump:v2`) — `resolveCrossBranch()`·
> `evaluateStyleGate()` 실호출 결과를 `resolveStyle()`이 블록으로 조립한 값이다.
> 환경: `development`. seed: `20260819`.

## 실행 규모 (§7-3 "실행 개수·생성 방식·seed" 명시)

| 항목 | 값 |
|---|---|
| 모질·희망 축 전수 | 4,320 (age 6 × curl 4 × thickness 3 × density 3 × length 5 × design 4) |
| 시술이력 축 유효 조합 | 231 (recent 7 × prev 7 × more 3 × 하위체크) |
| 순수 곱 | 997,920 |
| **실제 실행 수** | **69,120** |
| 시술이력 등가류 대표 | 16 |

### 시술이력 축을 줄인 근거 (표본 추출이 아니라 등가류 축약)

resolver가 시술이력 키에서 실제로 읽는 값은 네 가지뿐이다 —
`gateLevel` · `usedRootDye` · `usedPerm` · `q8_root_gray`.
갈래 발동 조건(`crossBranch.ts:67-78`)은 모질 축만 읽고, `deriveBranches`의 탐침은
시술이력을 비운다. 따라서 같은 4-튜플을 만드는 시술이력 조합은 resolver 관점에서 구별되지
않는다. 그 4-튜플별로 대표 1개만 실행했다.

**이 등가성을 코드 독해로만 주장하지 않고 실측했다:**

| 항목 | 값 |
|---|---|
| seed | `20260819` (mulberry32) |
| 무작위 표본 검증 수 | 3,000 |
| 대표와 결과 불일치 | **0** |

→ 표본 전건에서 대표 입력과 전체 입력의 도달 id가 동일했다. 축약이 결과를 바꾸지 않는다.

## ① copy entry 커버리지

| 항목 | 값 |
|---|---|
| style 도달 가능 id | 76 |
| 실행에서 실제 도달 | 76 (100.0%) |
| 미도달 | 0 |

## ② resolver branch·state 커버리지

| 상태축 | 관측된 값 | 개수 |
|---|---|---|
| primary(대표 갈래) | (차단), b1, b10, b2, b3, b4, b5, b6, b7, b8 | 10 |
| fired(발동 갈래 전체) | b1, b10, b2, b3, b4, b5, b6, b7, b8 | 9 |
| gateLevel | block, caution, pass | 3 |
| volumeState | BALANCED, ISSUE | 2 |
| scalpRoutineCard | false, true | 2 |

## ③ unique rendered signature

| 항목 | 값 |
|---|---|
| 고유 signature 수 | **102** |
| signature 정의 | `gateLevel + primary + volumeState + 도달한 copy id 순서열` |

## 해석 issue

없음 (69,120회 실행에서 0건).
