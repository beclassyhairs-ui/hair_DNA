# copy-drafts — 카피 레지스트리 (지시서 §7)

결과지 V2 블록 조립의 카피 단일 출처. **각 블록 카피를 코드에 하드코딩하지 않고 여기서 참조한다**(§7-1).

> 현재 상태: **구조 수립 완료 · 카피 미작성**. 블록 11개와 타입·게이트는 서 있고 entry는 0건이다.
> 카피 채우기(Q1 5값·Q2/Q3·h_recent 6종·Primary Insight·absorbed)는 다음 단계다.

---

## 1. 저장 구조 (§7-1)

```
copy-drafts/
  style/   volume · hair-structure · curl-fit · cut · safety
  damage/  elasticity · friction · drying · cause · gray · risk

  types.ts         copy entry 타입 (필수 메타데이터)
  env.ts           환경별 렌더 게이트
  registry.ts      블록 집계 · 조회 · 통계
  guard.ts         production 승인 게이트
  evidenceKeys.ts  evidenceKeys 유효성 단일 출처
  check.ts         구조 검사 CLI (npm run copy:check)
```

## 2. copy entry (§7-1)

```ts
{
  id:           "damage.cause.bleach",       // <domain>.<block>.<slug>
  text:         "…",                          // 카피 본문
  status:       "draft" | "owner_reviewed" | "approved",
  sourceGrade:  "재배치" | "파생" | "신규",
  sourceRef:    "b10-aha" | "확정124" | "예언8" | …,
  evidenceKeys: ["q7_thickness", "q8_density"],
}
```

- **`id` 형식은 §7이 규정하지 않았다.** `<domain>.<block>.<slug>`를 이 저장소 규약으로 고정한다. 전역 고유이며 `check`가 중복을 잡는다.
- **`text`도 §7 목록에 없다.** §7-1이 나열한 것은 "필수 메타데이터"이고, 그 메타데이터가 수식하는 대상이 본문이므로 payload로 함께 둔다.
- `evidenceKeys`는 **실존하는 설문 답 키**여야 한다. damage는 `DamageSurveyAnswers` 인터페이스와 컴파일타임 결속, style은 `STYLE_SURVEY` 질문 id와 런타임 대조(`StyleAnswers`가 `Record<string,string>`이라 타입 결속이 불가능하다). 빈 배열 = 설문 답에 의존하지 않는 무조건 노출.

## 3. sourceGrade — 검수 부담 등급 (§7-2)

| 등급 | 뜻 | 검수 |
|---|---|---|
| **재배치** | 원문 판단 그대로, 위치·분량만 재편 | 부담 최소 |
| **파생** | 원문 논리를 다른 조합에 적용한 확장 | 논리 확인 |
| **신규** | 원문 어디에도 없는 전문 판단 | **최우선 정독** · `V2_NEW_COPY_REVIEW.md` 상단 배치 |

## 4. 환경별 렌더 게이트 (§7-1)

| 환경 | 렌더 가능 status |
|---|---|
| development · preview | draft · owner_reviewed · approved |
| **production** | **approved 만** |

→ 사장님 검수 전 화면은 볼 수 있되, 실수로 라이브에는 못 나간다.

환경 판정(`env.ts`)은 `NEXT_PUBLIC_VERCEL_ENV` → `VERCEL_ENV` → `NODE_ENV` 순으로 본다. 결과지는 클라이언트 컴포넌트라 서버 전용 `VERCEL_ENV`만으로는 부족해 `NEXT_PUBLIC_` 쪽을 1순위로 둔다. 판정 불가 시 production으로 fail-closed.

## 5. production 빌드 FAIL 게이트 (§7-1) — ⚠️ 아직 미발동

> "production build 시 reachable copyRef 중 status≠approved가 1건이라도 있으면 build/test FAIL 처리."

`guard.assertProductionCopyReady(reachableIds)`가 이 규정을 구현하고 있고 자체 검증도 통과한다. **다만 아직 빌드에 물려 있지 않다.**

이유: `reachable`은 resolver가 결정하는데 resolver가 아직 배선 전이라 도달 집합을 계산할 수 없다. 빈 집합으로 통과시키면 "검증했다"는 거짓 신호가 되므로(§7-3의 미커버 명시 원칙), `check`는 이 항목을 **미검증으로 표기**하고 통과로 세지 않는다.

**resolver 배선 시 활성화 방법** (2곳):

1. `check.ts`의 `RESOLVER_WIRED = true`로 바꾸고 `findUnapprovedReachable(<도달 집합>)`에 실제 집합을 넘긴다.
2. `package.json`의 `prebuild`에 `npm run copy:check`를 체인한다 →
   `"prebuild": "node scripts/gen-references-manifest.mjs && npm run copy:check"`

## 6. 검수 게이트 — 전수 덤프 (§7-3)

배포 전 `RESULT_ENUMERATION_V2.md` / `DAMAGE_ENUMERATION_V2.md`를 기존 ENUMERATION 방식(실함수 호출)으로 생성해 제출한다. **"전수"의 정의**:

1. copy registry의 모든 copy entry 100% → `registry.allEntries()`가 모수를 제공한다
2. 모든 resolver branch·state·riskFamily·grayFlag·volumeState 100%
3. 유효 입력공간 실행으로 발생한 unique rendered signature 전량

전체 Cartesian 실행이 비현실적이면 **exhaustive라고 표기하지 말고** 실행 개수·생성 방식·seed·미커버 상태를 명시한다.

## 7. 명령

```bash
npm run copy:check      # 구조·evidenceKeys·게이트 검사
npm run test:invariant  # §8 엔진 판정 불변 확인 (8/8)
```

## 8. 하지 않은 것 (경계)

- **resolver·렌더 배선 없음.** 타입은 하류가 쓸 형태로 설계했으나 실제 소비자는 붙이지 않았다.
- **엔진 무수정.** `damageRecommend.ts`·`crossBranch.ts`·`branchCopy.ts` 미변경. `styleGate.ts`는 Phase 1.0 동결(§8-6·§10-10) — 구조 변경이 필요해지면 작업을 멈추고 보고한다.
- **설문 스키마·DB 불변.**
