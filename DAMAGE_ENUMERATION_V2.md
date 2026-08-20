# DAMAGE_ENUMERATION_V2.md — 결과지 V2 damage 전수 덤프 (실함수 호출)

> 생성기: `copy-drafts/enumerate/run.ts` (`npm run dump:v2`) — 손으로 쓴 문서가 아니라
> `diagnoseDamage()` 실호출 결과를 `resolveDamage()`가 블록으로 조립한 값이다.
> 기존 `DAMAGE_ENUMERATION.md`와 동일 방법론(실함수 호출)이며, 생성 스크립트를 레포에 둬
> 재현 가능하게 만든 점만 다르다.
> 환경: `development` (draft 카피까지 보이는 검수용 — §7-1). seed: `20260819`.

## 실행 규모 (§7-3 "실행 개수·생성 방식" 명시)

| 항목 | 값 |
|---|---|
| 제약 없는 순수 Cartesian | 1,128,960 |
| **유효 입력공간 실행 수** | **151,200** |
| 생성 방식 | 설문이 강제하는 하위질문 규칙을 적용한 완전 열거(표본 추출 아님) |

제외한 조합은 설문 UI가 만들 수 없는 것들이다: 탈색 슬롯 없이 `h_bleach_2plus`,
뿌리염색 슬롯 없이 `h_root_gray`/`h_root_interval`/`h_root_over6m`,
염색 계열 없이 `h_self_dye`. → **유효 입력공간에 대해서는 전수**이며, 제약 없는
Cartesian 전체에 대한 전수가 아니다.

## ① copy entry 커버리지

| 항목 | 값 |
|---|---|
| damage 도달 가능 id | 63 |
| 실행에서 실제 도달 | 63 (100.0%) |
| 미도달 | 0 |

## ② resolver state 커버리지

| 상태축 | 관측된 값 | 개수 |
|---|---|---|
| resultCode | L1_DRY, L1_HEALTHY, L1_RIGID, L2_DRY, L2_RIGID, L3_DRY, L3_RIGID, L4_DRY, L4_RIGID | 9 |
| level | 1, 2, 3, 4 | 4 |
| grayFlag | false, true | 2 |
| 예언 entry(riskId) | — | 39 |

**riskFamily: 미구현.** V2 지시서에서 riskFamily 태깅은 Phase 1.5 flag(스키마만)로 유보됐고
Phase 1.0은 첫 매칭 1개만 노출한다. 따라서 이 축은 **커버리지 100%를 주장하지 않는다.**

## ③ unique rendered signature

| 항목 | 값 |
|---|---|
| 고유 signature 수 | **11,639** |
| signature 정의 | `resultCode + 도달한 copy id 순서열` |

## 해석 issue

없음 (151,200회 실행에서 0건).

## 블록별 도달 id

### cause

- `damage.cause.bleach`
- `damage.cause.dye`
- `damage.cause.heat_perm`
- `damage.cause.none`
- `damage.cause.normal_perm`
- `damage.cause.root_dye`
- `damage.cause.straight_perm`

### drying

- `damage.drying.fast`
- `damage.drying.normal`
- `damage.drying.slow`

### elasticity

- `damage.elasticity.elastic`
- `damage.elasticity.firm`
- `damage.elasticity.firm_after_bleach`
- `damage.elasticity.firm_after_magic`
- `damage.elasticity.firm_heavy_history`
- `damage.elasticity.snap`
- `damage.elasticity.stretch`
- `damage.elasticity.unsure`

### friction

- `damage.friction.brush_tip`
- `damage.friction.loosens`
- `damage.friction.smooth`
- `damage.friction.tangled`
- `damage.friction.unsure`

### gray

- `damage.gray.story`

### risk

- `damage.risk.p01_aha`
- `damage.risk.p01_door`
- `damage.risk.p01_tip`
- `damage.risk.p02_aha`
- `damage.risk.p02_door`
- `damage.risk.p02_tip`
- `damage.risk.p03_aha`
- `damage.risk.p03_door`
- `damage.risk.p03_tip`
- `damage.risk.p04_aha`
- `damage.risk.p04_door`
- `damage.risk.p04_tip`
- `damage.risk.p05_aha`
- `damage.risk.p05_door`
- `damage.risk.p05_tip`
- `damage.risk.p06_aha`
- `damage.risk.p06_door`
- `damage.risk.p06_tip`
- `damage.risk.p07_aha`
- `damage.risk.p07_door`
- `damage.risk.p07_tip`
- `damage.risk.p09_aha`
- `damage.risk.p09_door`
- `damage.risk.p09_tip`
- `damage.risk.p10_aha`
- `damage.risk.p10_door`
- `damage.risk.p10_tip`
- `damage.risk.p11_aha`
- `damage.risk.p11_door`
- `damage.risk.p11_tip`
- `damage.risk.p12_aha`
- `damage.risk.p12_door`
- `damage.risk.p12_tip`
- `damage.risk.p13_aha`
- `damage.risk.p13_door`
- `damage.risk.p13_tip`
- `damage.risk.p14_aha`
- `damage.risk.p14_door`
- `damage.risk.p14_tip`
