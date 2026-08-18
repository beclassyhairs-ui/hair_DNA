# 출시 D-2 전체 재검수 보고서

> 감사일: 2026-08-16 · 감사 방식: Claude Code Opus + 병렬 서브에이전트 7건(■1~■6 + ■F 적대검수)
> 감사 본문은 읽기 전용(코드 수정 0건). **라운드1 수정 반영: 2026-08-16 아래 4건 커밋·배포됨.**

## 한 줄 총평

**확정사항 대부분 반영됨, 치명 보안 취약점 0건.** 🔴 2건(라이선스 재확인 필요·결과지 직접진입 가짜진단) · 🟡 11건 · ⚪ 다수. 미push 커밋 0건(라이브 = 로컬 HEAD).

| 등급 | 개수 | 상태 |
|---|---|---|
| 🔴 즉시 조치 / 사업주 재확인 | 2 | 🔴-02 ✅수정완료 · 🔴-01 사업판단 대기 |
| 🟡 런칭 전 권장 | 11 | 🟡-01·02·03·05·08·09·10·11 ✅수정완료 · 3건 남음(🟡-04·06·07) |
| ⚪ 코스메틱 / 백로그 | 다수 | — |

### ✅ 라운드1 수정 완료 (2026-08-16 배포, `497d53f..ae5d09b`, Codex 3라운드 검수 통과)

| 항목 | 커밋 |
|---|---|
| 🔴-02 결과지 직접진입 가짜진단 차단 | `feedba5` |
| 🟡-09·10 폴백 강제우회 차단 + quota 선차감 순서 | `b2d2e05` |
| 🟡-08 warmup 다중인스턴스 burst 방어(전역 원자적 쿨다운) | `ae5d09b` |

- 🟡-08은 코드 배포 완료이나 **사업주가 `supabase/warmup_global_cooldown_schema.sql`을 SQL Editor에서 직접 실행해야 발동**(미실행 시 기존 인스턴스별 쿨다운으로 fail-open — 회귀 없음).
- **잔여 리스크(hair_jobs 원장 도입 시 근본 해결)**: primaryAttestation 무제한 재사용(원본당 폴백 1회 미보장, 매 요청 quota로만 상한) / 폴백 자격검증 GET의 quota 없는 반복호출 / warmup RPC fail-open. 전부 로그인 필요·읽기전용·일일한도 완충으로 심각도 낮음.

### ✅ 라운드2(UI/UX) 수정 완료 (2026-08-16 배포, `de9e5da..23a6e98`, next dev 컴파일 검증)

| 항목 | 커밋 |
|---|---|
| 🟡-01 버튼 어포던스(저장/공유/재진단·헤더공유 테두리) | `7777373` |
| 🟡-03 전문가 연차·직함 통일(25년 원장→20년차 디자이너) | `c08cc3a` |
| 🟡-11 실패 사유별 안내 문구 분리(5종+일일한도) | `cc1a39a` |
| 🟡-05 모질 배지 줄바꿈/깨짐 방지 | `c2732e4` |
| 🟡-02 로딩 대기 진행감(경과 표시+구간별 점진 문구) | `6326e6a` |
| ⑥ 나의 헤어 아이콘 사람→결과지(FileText) 통일 | `23a6e98` |

- 4개 편집 페이지(loading·style/result·damage/result·home) dev 서버 200·에러 0 확인.
- **남은 🟡 3건**: 🟡-04 결과지 폰트 이원화(전역 토큰 상향 패스에서 통일) / 🟡-06 미커밋 삭제 88건(사업주 의도 확인) / 🟡-07 debug-sentry 라우트 잔존(연동 확인 후 삭제).
- **폰트 실측(🟡-04 관련, 수정 대기)**: 설문 옵션 라벨 14px·설명 12px, 업로드 보조라벨 10px가 결과지(17px)보다 작음 — 전역 토큰/공통 컴포넌트라 전 페이지 영향, 별도 패스 승인 대기.

---

## ■0. 배포 상태 지도

| 구분 | 커밋 |
|---|---|
| 로컬 HEAD | `497d53f` |
| origin/main | `497d53f` |
| Vercel 프로덕션 | 동일 (PROJECT_STATE.md "라이브 스모크 통과" 기록, push 완료) |

**미push 로컬 커밋: 0건.** 지금 손님이 보는 코드 = 로컬 HEAD.

### 런칭 UX 5커밋 push 확인

| 커밋 | 제목 | push |
|---|---|---|
| `d57b4e0` | 결과지 버튼 계단식 | ✅ |
| `4178ef8` | 로딩 순차공개+문구정합 | ✅ |
| `0f3052c` | 세션핑 90초 | ✅ |
| `a11dd72` | 루카타코 폴백+킬스위치 | ✅ |
| `0fdfe2f` | 문서 갱신 | ✅ |

### 워킹 트리 현황

- 수정된 추적 파일(M): **0건**
- 미커밋 삭제(D): **88건** — `public/references/` 하위 `.gitkeep` 84개 + mature/short_bob PNG 4장. 전부 의도적 미스테이징(CLAUDE.md "references 삭제분 커밋 금지" 방침).
- 미추적 파일(??): **~40 항목**(디렉토리 기준) — 파일럿 레퍼런스 7종(~110MB), 셀카 테스트 파일, 코드 덤프, ENUMERATION 2건 등 전부 실험/검수용 잔재.

---

## ■1. faceswap 파이프라인 대조

### 🔴-01. inswapper 라이선스 리스크 — 사업주 재확인 필요

| 항목 | 내용 |
|---|---|
| 확정 내용 | PROJECT_STATE.md:99 "사업주 판정: lucataco 기각 · 상업 불가" / :102 "ddvinh1: inswapper라 법적 문제" / :112 "상업 오픈 전 반드시 교체" |
| 실코드 | `lib/hairSynthModel.ts:26` ddvinh1 라이브 + `:49-58` lucataco 폴백으로 재도입 |
| 판정 | **조사 결론과 배치** |
| 라이브 | ✅ 양쪽 모두 라이브 |

라이선스 조사(2026-08-14)에서 "상업 오픈 전 반드시 교체"로 결론 낸 inswapper 계열(ddvinh1+lucataco) 모두 코드 수정 없이 라이브. 유입 0 상태로 법적 리스크는 당장 낮으나, **D-2 런칭이면 사업주가 이 상태를 인지하고 수용하는지 재확인 필요.** 코드 변경은 아닌 사업 결정 사안.

### 1-1. 모델/버전 상수화 + 해시 보존

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| ddvinh1, enhance=false, 단일출처·롤백스위치 | `lib/hairSynthModel.ts:26-33` MODEL/VERSION/ENHANCE + `:78-86` selectModel() | **반영됨** | ✅ |
| lucataco/cdingram 해시 docs 보존 | lucataco: 코드 `:57-58` + PROJECT_STATE:129 / cdingram: PROJECT_STATE:130 | **반영됨** | ✅ |

### 1-2. flux 잔존

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| flux(텍스트생성) 함수적 참조 0 | `lib/styleReference.ts:11` 폐기 주석 1건뿐, import/호출 없음 | **반영됨** | ✅ |

### 1-3. 비동기 폴링 + IDOR 차단

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| kickoff → {id,token} 즉시반환, Prefer:wait 잔재 0 | `route.ts:253` 주석 "★ Prefer:wait 제거", `:290` 즉시반환 | **반영됨** | ✅ |
| status/cancel 라우트 존재 | `status/route.ts`, `cancel/route.ts` 존재 | **반영됨** | ✅ |
| HMAC 소유권 토큰 | `lib/hairJobToken.ts:42-60` (predictionId,userId) HMAC-SHA256, 상수시간 비교 | **반영됨** | ✅ |
| 클라 2.5초 폴링 | `loading/page.tsx:91` POLL_INTERVAL_MS=2500 | **반영됨** | ✅ |

### 1-4. 폴링 예산 8분 = 문구 상한

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 두 값 단일 상수, 문구 "보통 몇 초…최대 8분" | `loading/page.tsx:95-96` POLL_BUDGET_MS=480000, POLL_BUDGET_MIN 파생. `:490` 문구 일치 | **반영됨** | ✅ |
| 토큰 만료 ≥ 8분 | 토큰은 무상태(만료 없음=무제한). 8분 초과 충족하나 "만료" 개념 자체가 부재 | **반영됨**(방식 상이) | ✅ |

### 1-5. 환불 전면 폐지 + 일일한도 7

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 환불 코드 잔재 0 | TS 코드에서 `refund_hair_usage` 호출 0건. SQL 파일(`hair_usage_refund.sql`) 잔존하나 미실행 | **반영됨** | ✅ |
| 일일한도 7 | `route.ts:46` SERVER_DAILY_MAX=7 | **반영됨** | ✅ |

### 1-6. 예열 B안 → 세션핑 교체

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 옛 prewarm.ts 삭제, StyleSessionPing.tsx로 교체 | `prewarm.ts` 부재 확인, `StyleSessionPing.tsx` + `layout.tsx:30` 마운트 | **반영됨** | ✅ |
| 서버 90초 쿨다운 | `warmup/route.ts:53-54` WARM_COOLDOWN_MS=90000 | **반영됨** | ✅ |
| warmup_usage 5000/일 상한 | `warmup/route.ts:50` WARMUP_DAILY_MAX=5000 | **반영됨** | ✅ |
| 일일한도 미차감 | `warmup/route.ts`에 `bump_hair_usage` 호출 없음 | **반영됨** | ✅ |
| 실패 → 204 | 모든 경로에서 `noContent()` 반환 | **반영됨** | ✅ |
| default_style.jpg 페이로드 | `warmup/route.ts:46` WARM_IMAGE 참조 | **반영됨** | ✅ |

### 1-7. 세션핑 남용 방어

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| same-origin 게이트 | `warmup/route.ts:62-73` sameOrigin() | **반영됨** | ✅ |
| 세션핑 → 본 합성 미트리거 (비용 0) | fireWarmup()은 /warmup만 호출, /hair-transform 경로 없음 | **반영됨** | ✅ |

⚠️ 알려진 한계(의도적 보류): Origin 위조 스크립트로 우회 가능, 쿨다운은 인스턴스별(서버리스). → Vercel Firewall IP rate-limit 권장(코드 주석 31행에도 명시).

### 1-8. 루카타코 폴백 안전성

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 원본 토큰 검증 | `route.ts:184-198` verifyJobToken | **반영됨** | ✅ |
| 킬스위치 즉시 반영 | `hairSynthModel.ts:64` HAIRSYNTH_FALLBACK_ENABLED=true. TS 상수 → 재배포 시 즉시 반영(런타임 토글은 아님) | **반영됨**(방식 상이) | ✅ |
| 폴백에도 일일한도 적용 | `route.ts:126-147` bump가 body 파싱 전에 실행 → 폴백 포함 | **반영됨** | ✅ |

⚠️ 알려진 한계: 토큰 무상태로 replay 가능(일일한도 7로만 제한). "8분 콜드미스 전용" 서버 강제 없음.

### 1-9. 보안 수정 유지

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| debugError 손님 응답 0 | 서버 응답에 debugError 필드 0건 | **반영됨** | ✅ |
| output fetch redirect:"manual" + 화이트리스트 | `status/route.ts:143`, `hairSynthModel.ts:106-121` | **반영됨** | ✅ |
| 시크릿 fail-closed | route/status/cancel 3곳 모두 SECRET 없으면 500 | **반영됨** | ✅ |
| 3MB 상한 | `status/route.ts:29` MAX_OUTPUT_BYTES=3000000, 이중 검사 | **반영됨** | ✅ |

### 1-10. default_style.jpg + 미커밋 삭제 + 버전 고정

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| default_style.jpg 로컬 존재 | 36,685 bytes 확인 | **반영됨** | ✅ |
| 삭제분 미커밋 | 88건 unstaged 삭제 유지(의도대로) | **반영됨** | ✅ |
| REPLICATE_VERSION env 고정 | env 변수 부재 — TS 상수로 고정(`hairSynthModel.ts:28`). 설계 문서와 구현 방식 상이(env→상수) | **방식 변경**(기능적 동등) | ✅ |

### 1-11. Replicate 호출 지점 전수

| 지점 | 파일 | 비용 발생 |
|---|---|---|
| kickoff | `route.ts:248` | ✅ 과금 |
| warmup | `warmup/route.ts:101` | ✅ 과금(warmup 별도 상한) |
| fallback | kickoff 재사용 | ✅ 과금 |
| status | `status/route.ts:92` GET | ❌ 조회만 |
| cancel | `cancel/route.ts:61` POST | ❌ 취소 |

**그 외 비용 경로 없음 확인.**

---

## ■2. UI 구조 대조

### 2-1. 하단 탭 3개 + 배너 제거

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 홈·발견템·나의 헤어 3탭 | `BottomNav.tsx:21-25` NAV_ITEMS 3개 | **반영됨** | ✅ |
| 오늘케어루틴·퀵진단 배너 소멸 | `home/page.tsx` 코드 자체 부재 | **반영됨** | ✅ |

### 2-2. CONSULT_CHANNEL 플래그

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| enabled && href 둘 다 있어야 렌더 | `home/page.tsx:27-30` enabled=false, href="" + `:244` 조건 | **반영됨** | ✅ |

### 2-3. 진단 허브 2장 + 제외 페이지 라이브 링크 0

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| bangs·퀵진단 숨김, 2종만 | `diagnosis/page.tsx:32-48` style·damage만 | **반영됨** | ✅ |
| SHOW_HAIRQUIZ=false | `damage-check/result/page.tsx:78` | **반영됨** | ✅ |
| VISIBLE_DIAGNOSIS_KINDS=['style','damage'] | `InlineCompletion.tsx:38`, `CompletionGauge.tsx:23` | **반영됨** | ✅ |
| /bangs·/hair-quiz·/mbti·/diagnosis/quick·/consulting 라이브 링크 0 | 런칭 페이지 전수 grep — 전부 플래그 차단 또는 죽은 코드 | **반영됨** | ✅ |

참고: `sitemap.ts`에 /bangs·/hair-quiz·/consulting 남아있음 — 미끼 랜딩 의도적 보류.

### 2-4. '나의 헤어' 명칭 통일

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 사용자 대면 '다이어리·마이헤어' 0건 | grep 결과 전부 코드 주석/변수명/마이그레이션 방어 | **반영됨** | ✅ |

### 2-5. my-diary 가로스크롤 / items 재시도 / style 교차링크

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| my-diary min-w-0 수정 | `my-diary/page.tsx` 7곳 적용 | **반영됨**(375px 실측은 확인불가) | ✅ |
| /items 재시도 버튼 | `items/page.tsx:149-159` "다시 시도 ↻" | **반영됨** | ✅ |
| /style 교차 보조링크 | `style/page.tsx:138-144` "머리 상태부터 볼까요?" | **반영됨** | ✅ |

### 2-6. max-w-[430px] 통일 / 저대비 토큰

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 전 라이브 페이지 430px | AppShell.tsx:14 공용 + 독립 페이지 개별 적용 확인 | **반영됨** | ✅ |
| --sub:#6e665b 저대비 토큰 | `globals.css:16` --sub + `:23` --ink-2=var(--sub) | **반영됨** | ✅ |

예외: /terms, /privacy는 max-w-[720px] — 약관 문서라 의도적 차이.

---

## ■3. 로그인·동의·개인정보 대조

### 3-1. 공용 authGate

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 스타일 3중(upload 동의→loading 로그인→서버 401) | upload:165-175, loading:189-195, route.ts:111-117 | **반영됨** | ✅ |
| 데미지 마운트 가드(authOk 전 미렌더) | `damage-check/result/page.tsx:104-113, 205-206` | **반영됨** | ✅ |
| report_view도 인증 통과 후만 | `:137-138` ready && authOk 조건 | **반영됨** | ✅ |

### 3-2. 동의 fail-closed + 정책 버전 + 국외이전 표기

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 미동의 서버 403 | `route.ts:120-124`, `consentServer.ts:29-33` 조회 실패도 false | **반영됨** | ✅ |
| CONSENT_POLICY_VERSION | `lib/consent.ts:15` "2026-08-08" | **반영됨** | ✅ |
| "국외 이전"(띄어쓰기) 0건 | 전부 "국외이전"(붙여쓰기) | **반영됨** | ✅ |
| 업로드 안심문구 A안 | `upload/page.tsx:106` "서버에는 저장하지 않아요" | **반영됨** | ✅ |

### 3-3. 셀카 서버 미저장

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| Blob 업로드 없음, data URI만 전송 | `route.ts:211-218` 요청 안에서만 사용, import blob 없음 | **반영됨** | ✅ |

### 3-4. events RLS

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| RLS 활성 + anon INSERT 1 + SELECT 0 | `supabase/schema.sql:63-70` | **반영됨**(파일 기준) | DB 실적용은 사업주 SQL 실행 대기 |

**사업주 실행용 검증 SQL(읽기 전용)**:

```sql
-- (5) events RLS 활성화 확인
select relname, relrowsecurity, relforcerowsecurity
from pg_class where relname = 'events';
-- 기대: relrowsecurity = true
```

```sql
-- (6) events 정책 전체 나열
select polname, polcmd, polroles::regrole[], polqual, polwithcheck
from pg_policy where polrelid = 'public.events'::regclass;
-- 기대: INSERT 정책 1행만, SELECT('r') 0행
```

### 3-5. 의도적 보류 (미반영 플래그 안 함)

- 로그아웃 버튼 없음 — 의도적
- 탈퇴 UI 없음(이메일 접수) — 의도적
- hair_jobs 원장 없음 — 결제 단계 이연
- 데미지 게이트 클라 표시 전용 — 의도적(서버 합성/비용 없음)

---

## ■4. 커머스·결과지·알고리즘 대조

### 4-1. 쿠팡 21종 카드

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| COUPANG_CARDS_LIVE 게이트 | `coupangCards.ts:27` **현재 true(ON)** — false 시 양쪽 pick 함수 [] 반환 | **반영됨** | ✅ |
| 텍스트 카드(이미지 0) | `CoupangCardList.tsx:49` emoji만 렌더, img 없음 | **반영됨** | ✅ |
| 상위 최대 4개 | `coupangCards.ts:35` COUPANG_MAX_CARDS=4 | **반영됨** | ✅ |
| 가격 미표시 | CoupangCard 인터페이스에 price 필드 자체 없음 | **반영됨** | ✅ |
| 대가성 문구 13px + rel=sponsored | `CoupangCardList.tsx:67` text-[13px], `:36` rel="sponsored" | **반영됨** | ✅ |

### 4-2. G13/G21/G05

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| G13 데미지 하드 차단 | DAMAGE_CARDS에 G13 없음(STYLE_CARDS에만) | **반영됨** | ✅ |
| G21 비활성 | `coupangCards.ts:114-117` parked:true | **반영됨** | ✅ |
| G05 전원 노출 | 양쪽 모두 match:()=>true | **반영됨** | ✅ |

### 4-3. 저장=첫 표시 / topUp 최소 3 / 웨이브→컬 우선

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 저장 제품 = damageCards[0] | `damage-check/result/page.tsx:129-135` FIX-A | **반영됨** | ✅ |
| topUp 최소 3개 | `coupangCards.ts:38` COUPANG_MIN_CARDS=3, topUp() 구현 | **반영됨** | ✅ |
| wantWave → 컬 제품 우선 | `coupangCards.ts:200-204` G17/G18 앞으로 | **반영됨** | ✅ |

### 4-4. 예언 14종

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 첫 매칭 1개만 | `damageRecommend.ts:218` find() | **반영됨** | ✅ |
| 1~10 미매칭 → 11~14 폴백(마지막 시술 기준) | `:220-227` last 매핑 | **반영됨** | ✅ |
| #1 열펌+일반펌 모두 매칭("펌" 표기) | `:124,137-142` c.perm = heat_perm \|\| normal_perm | **반영됨** | ✅ |
| 시술 전무 → 예언 숨김 | last 매핑 없으면 null → 미노출 | **반영됨** | ✅ |

### 4-5. 새치 분리

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 예언 1·2 = 뿌리염색만(새치체크 무관) | `:142` c.rootDye, `:147` c.rootDye — h_root_gray 미참조 | **반영됨** | ✅ |
| 흰머리 원고 = 새치체크만 | `:320` h_root_gray ? GRAY_HAIR_STORY : null | **반영됨** | ✅ |

### 4-6. 의도적 보류

- **예언 6번**: 감사 전제("dormant")와 달리 **실제로 활성화됨** — `h_self_dye` 구현 완료(2026-08-14), match: c.selfDye && c.anyDye. 미반영 아님, 사실 정정만 기록.
- 예언 8번: match:()=>false 유지(길이 문항 부재). 카피 보존됨.
- 관리 팁: 예언별로 각각 다른 문구 사용 중. 카피 보존 확인.

### 4-7. 데미지체크 개편

| 확정 | 실코드 | 판정 | 라이브 |
|---|---|---|---|
| 건조 문항 반전(slow=손상) | `damageRecommend.ts:70` DRY_ADJ: slow:1, fast:0 | **반영됨** | ✅ |
| 유형 2종 단순화(DRY/RIGID, ENV/MIXED 폐기) | `:281-288` pickType(), ENV/MIXED grep 0건 | **반영됨** | ✅ |
| 새치 하위체크 | `survey/page.tsx:118` 뿌리염색 시만 노출 | **반영됨** | ✅ |

---

## ■5. UI/UX 실사

### 🔴-02. 결과지 직접 URL 진입 시 가짜 기본 진단 노출

| 항목 | 내용 |
|---|---|
| 문제 | `/style/result` 또는 `/damage-check/result`에 설문 없이 직접 진입하면, 빈 answers에서 기본값 스타일/레벨을 계산해 **실제 진단받은 것처럼 보이는 화면**을 보여줌 |
| 증거 | `style/result/page.tsx:437-462` photo=null, answers={} → `recommend.ts:72-76` 기본값 bob/medium/straight 노출. `damage-check/result/page.tsx:115-122` DEFAULT_ANSWERS → diagnoseDamage() 정상 실행 |
| 영향 | 사용자가 진단을 안 했는데 진단 결과가 보임 → 서비스 신뢰도 훼손 |
| 권장 | `Object.keys(answers).length === 0`이면 설문 페이지로 리다이렉트 가드 추가 |
| 난이도 | 낮음 (if 1줄 + redirect) |

### 🟡-01. style/result "사진 다운받기" 저장 버튼 — 버튼으로 안 보임

| 항목 | 내용 |
|---|---|
| 위치 | `style/result/page.tsx:627-630` |
| 현재 | 배경색·테두리 없이 볼드 텍스트만 — 같은 페이지의 CTA 버튼①②(bg-btn-bg border)와 시각적 격차 |
| 영향 | 수익 직결 전환 지점(저장 → 다이어리) |
| 권장 | 최소한 border 또는 bg-surface 추가 |

### 🟡-02. 로딩 20초~8분 구간 — 화면 변화 전무

| 항목 | 내용 |
|---|---|
| 증거 | `loading/page.tsx:153-157, 480-491` longWait(20초) 전환 후 남은 최대 7분 40초간 고정 문구 |
| 영향 | "멈춘 화면" 인지 → 이탈 |
| 권장 | 1분/3분/5분 경과 시 중간 체크포인트 문구(예: "거의 다 됐어요") |

### 🟡-03. "20년차 디자이너" vs "25년 경력 원장" 연차·직함 불일치

| 위치 | 문구 |
|---|---|
| `style/result/page.tsx:547` | "20년차 디자이너의 내 진단 결과 보기" |
| `style/loading/page.tsx:83` | "20년차 디자이너가…" |
| `damage-check/result/page.tsx:320` | "25년 경력 원장의 판단 기준을…" |

같은 서비스에서 두 진단이 서로 다른 연차·직함을 사용 — 카피 통일 필요.

### 🟡-04. style/result vs damage-check/result 폰트 체계 이원화

| 페이지 | 헤드라인 | 본문 |
|---|---|---|
| style/result | 26px 하드코딩 | 17px 하드코딩 |
| damage-check/result | text-h1(22px) 토큰 | text-body(16px) 토큰 |

같은 "결과지" 카테고리인데 크기가 다름. 전역 토큰 대비 상향은 이미 이월 확정이므로 그때 통일 권장.

### 🟡-05. 모질 배지 줄바꿈 위험 (320px)

`style/result/page.tsx:274-278` — readableHairLabel()이 "손상 모발 · 볼륨 처짐" 같은 긴 문자열을 반환할 수 있으나 max-width/truncate 미지정. 320px 화면에서 pill 깨질 위험.

### 5-4. 에러/엣지 화면

| 사유 | 화면 | 판정 |
|---|---|---|
| 얼굴 미검출 | "다시 찍기" 버튼 + 안내 | ✅ 양호 |
| 일일 한도 초과 | 별도 친절 카드 | ✅ 양호 |
| 폴링 8분 소진 | "다시 눌러주시면" + 재시도 | ✅ 양호 |
| 네트워크 끊김(폴링 중) | 무한 재시도, 안내 없음 | 🟡 뭉뚱그림 |
| kickoff 실패 | "붐볐어요" 일반 문구 | ⚪ 사유 세분화 없음 |

### 5-7. 폰트 크기 인벤토리

| 영역 | 크기 |
|---|---|
| 설문 질문 제목 | 20-24px |
| 설문 옵션 라벨 | 14px (text-sm) |
| 설문 옵션 설명 | 12px (text-xs) |
| 업로드 안내 | 16px (text-body) |
| 홈 프로필 헤드라인 | 18px (text-h2) |
| 홈 카드 설명 | 16px (text-body) |
| 로딩 진단 공개 | 16px |
| 로딩 소요시간 | 13px |
| style/result CTA | 17px |
| style/result 스타일명 | 26px |
| damage-check/result 본문 | 16px |

설문 옵션 14px가 결과지 17px보다 작음 — 50·60 타겟 관점에서 재검토 여지(전역 토큰 통일 패스에서 함께 처리 권장).

---

## ■6. 잡동사니

### 6-1. 임시 파일 잔존

총 미추적 파일 **~277개**(실파일 기준). 주요 항목:

| 파일/폴더 | 정체 | 크기 | 위험도 |
|---|---|---|---|
| `_canary_tmp.mjs` | Replicate URL 검증 스크립트 | 4KB | ⚪ |
| `1.jpg`, `2.jpg` | 셀카 테스트 | 5.6MB | ⚪ |
| `selfie1~4.webp` | 셀카 테스트 | ~20KB | ⚪ |
| `ref50.png`, `ref_new.png` | 레퍼런스 후보 | 4.8MB | ⚪ |
| `references_pilot*` 7종 | 파일럿 실험 | ~110MB | ⚪ |
| `RESULT_ENUMERATION.md` | 스타일 카피 전수 덤프(검수용) | 69KB | ⚪ |
| `DAMAGE_ENUMERATION.md` | 데미지 카피 전수 덤프(검수용) | 79KB | ⚪ |

축적 원인: 레퍼런스 이미지 확정까지 파일럿 7회 반복 + 셀카 테스트 + 카피 검수 산출물.

### 🟡-06. 미커밋 삭제 88건 — mature PNG 4장 포함

`.gitkeep` 84개(죽은 스캐폴드) + **실제 이미지 4장** 삭제가 미커밋. 의도적 미스테이징이나 4장의 삭제 의도(교체? 실수?) 사업주 확인 필요.

### 6-2. 디버그/우회 파라미터

| 항목 | 결과 |
|---|---|
| 쿼리 기반 ?debug= ?test= ?bypass= | **0건** |
| console.log in API routes | 12건 — 전부 [태그] 형식 운영 로그, 시크릿/PII 없음 |
| TODO/FIXME in production code | 소수 — 향후 확장 주석, 기능 결손 아님 |
| 하드코딩 테스트 값 | **0건** |

### 🟡-07. debug-sentry 라우트 잔존

`app/api/admin/debug-sentry/route.ts` — Sentry 연동 확인용 `throw new Error`. ADMIN_SECRET 게이트 뒤라 위험 낮으나, 연동 확인 끝났으면 삭제 권장.

### 도달 불가 코드 참고

`app/result/page.tsx`에 Mock 결제·가짜 카카오 버튼 존재하나, `next.config.mjs` 리다이렉트로 도달 불가 확인됨 — 기능적 위험 없음. 정리 백로그행.

---

## ■F. Codex 적대 검수 (4대 공격표면)

### ① 세션핑 (warmup)

| 공격 시나리오 | 결과 | 심각도 | 이전 판정과 비교 |
|---|---|---|---|
| Origin 위조로 same-origin 우회 | **CONFIRMED(기지)** — 스크립트에서 헤더 위조 가능 | 🟡 | 일치(이미 인지) |
| burst 동시요청으로 5000/일 상한 즉시 소진 → 정상 손님 예열 차단 | **CONFIRMED(신규 구체화)** — 쿨다운이 인스턴스별이라 동시성 앞에서 무력, DB 카운터만 방어선 | 🟡 | 신규 — 이전 감사가 "쿨다운이 인스턴스별"만 지적하고 **burst 시나리오를 구체화하지 않음** |
| RPC fail-open | **CONFIRMED** — 에러 시 상한 미적용, 다만 현재 SQL 배포 완료라 발동 확률 낮음 | ⚪ | 일치 |
| warmup → hair_usage 과금 전이 | **REFUTED** — bump_hair_usage 호출 없음 | — | 일치 |

**Codex 의견**: 실질 방어선이 DB 원자적 카운터 하나뿐이라는 점은 이전 감사 판정("인스턴스별 쿨다운 한계, 의도적 보류")을 넘어서는 **구체적 공격 경로**다. Vercel Firewall IP rate-limit이 코드 주석(31행)에 이미 권고돼 있으나 미조치 상태 — D-2 전이 아니더라도 유입 시작 전까지는 적용 권장.

### ② 폴백 (fallback:true)

| 공격 시나리오 | 결과 | 심각도 | 이전 판정과 비교 |
|---|---|---|---|
| 원본 토큰 replay로 폴백 반복 | **CONFIRMED(기지)** — 무상태 토큰, 일일한도 7로만 제한 | ⚪ | 일치(문서화됨) |
| **quota 차감이 폴백 검증보다 선행** — 잘못된 fallback 요청도 무료횟수 소모 | **CONFIRMED(신규 세부)** — `route.ts:126-147` bump → `:173-198` 검증 순서 | 🟡 | **신규** — 이전 감사 미발견 |
| 콜드미스 없이도 fallback:true로 lucataco 강제 사용 | **PLAUSIBLE(사업정책 우회)** — 서버가 "8분 경과 여부" 미검증 | 🟡 | 부분 일치(이전 감사가 "replay 한계"로 뭉뚱그림, **사업정책 우회 각도는 신규**) |
| HMAC 위조·타이밍 공격 | **REFUTED** — SHA-256 hex 64자 고정, 상수시간 비교 | — | 일치 |

**Codex 의견**: "quota 선차감" 패턴은 보안 취약점이라기보다 **UX 결함**이다 — 클라이언트 버그(새로고침 후 stale originalId)로 손님이 이유 없이 무료횟수를 잃을 수 있다. 순서를 바꿔 검증 후 차감하면 해결되지만, 실패한 요청에서 "예약만 하고 환불"이 없는 현 구조(환불 전면 폐기)와 충돌 — **hair_jobs 원장 도입 시 함께 재설계 권장.**

### ③ 로그인 게이트

| 공격 시나리오 | 결과 | 심각도 | 이전 판정과 비교 |
|---|---|---|---|
| /api/auth/me 스푸핑 | **REFUTED** — httpOnly+secure+sameSite:lax 쿠키, HMAC 검증 | — | 일치 |
| /api/hair-transform 직접 호출(401 우회) | **REFUTED** — 서버가 쿠키 직접 재검증, 견고 | — | 일치 |
| Lax+POST 2분 창 CSRF로 quota 1개 소모 | **PLAUSIBLE(신규)** — hair-transform에 Origin 검사 없음, 다만 실행조건 까다롭고 피해 quota 1개뿐 | ⚪ | **신규** — 이전 감사 미발견 |
| 데미지 결과 페이지 client fetch 위조로 로그인 없이 결과 열람 | **CONFIRMED(의도된 설계)** — 서버 강제 부재, 설계 주석이 스스로 인정 | 🟡(정책) / ⚪(보안) | 일치 |

**Codex 의견**: hair-transform 라우트에 Origin/Referer 검사가 없는 점은 warmup(있음)과 불일치. SameSite=Lax가 대부분 막지만 Lax+POST 임시완화 창이 있어 이론적 위험 존재. 단 실질 피해가 quota 1개라 ⚪ — hair_jobs 원장 도입 시 CSRF 토큰도 함께 고려.

### ④ 데미지 게이트 (answers 조작)

| 공격 시나리오 | 결과 | 심각도 | 이전 판정과 비교 |
|---|---|---|---|
| sessionStorage 조작으로 원하는 진단 결과 | **CONFIRMED이나 무해** — 서버 미저장, 본인에게만 영향 | ⚪ | 일치 |
| 조작 결과가 서버 DB에 전파 | **REFUTED** — 저장 경로 전부 localStorage | — | 일치(신규 확인: localStorage까지 추적) |

**Codex 의견**: 이전 감사 결론 정확. 추가로 확인한 것: `appendDiaryEntry`가 전부 localStorage I/O라 서버 오염 가능성 자체가 없다.

---

## 🔴 목록

| # | 무엇 | 왜 | 증거 | 조치 | 난이도 |
|---|---|---|---|---|---|
| 🔴-01 | inswapper 라이선스 미해결 상태에서 런칭 | 조사 결론 "상업 오픈 전 교체" 후 교체 없이 라이브 | PROJECT_STATE:99,102,112 vs hairSynthModel.ts:26,49 | 사업주 재확인: 리스크 수용 vs 교체 우선 | 코드 아닌 사업 결정 |
| ~~🔴-02~~ ✅ | 결과지 직접 URL 진입 → 가짜 기본 진단 | 빈 answers에서 기본값으로 실제 진단처럼 보이는 화면 | style/result:437-462, recommend.ts:72-76 | **수정완료 `feedba5`** — answers 빈값 가드 + 리다이렉트 + 세션조작 방어 | 완료 |

## 🟡 목록

| # | 무엇 | 왜 | 증거 | 조치 | 난이도 |
|---|---|---|---|---|---|
| ~~🟡-01~~ ✅ | 저장하기 버튼 어포던스 부족 | 배경·테두리 없어 텍스트처럼 보임 | style/result:627-630 | **수정완료 `7777373`** — 저장 아웃라인·공유/재진단 테두리·damage헤더 pill | 완료 |
| ~~🟡-02~~ ✅ | 로딩 20초~8분 고정 문구 | 7분40초간 화면 변화 전무 → 이탈 | loading:153-157 | **수정완료 `6326e6a`** — 매초 경과 표시 + 구간별 4단계 점진 문구 | 완료 |
| ~~🟡-03~~ ✅ | 20년차/25년 연차·직함 불일치 | 같은 서비스 두 진단이 다른 페르소나 | style/result:547, damage-check/result:320 | **수정완료 `c08cc3a`** — 전부 "20년차 디자이너" 통일 | 완료 |
| 🟡-04 | 결과지 폰트 체계 이원화 | style 26/17px vs damage 22/16px | 코드 비교 | 전역 토큰 통일 패스에서 처리(실측 목록 보고됨, 승인 대기) | 중간 |
| ~~🟡-05~~ ✅ | 모질 배지 줄바꿈 위험 | max-width/truncate 미지정 | style/result:274-278 | **수정완료 `c2732e4`** — nowrap+max-w+truncate | 완료 |
| 🟡-06 | 미커밋 삭제 88건 (mature PNG 4장) | 의도 불명확 | git status | 사업주 확인 후 별도 커밋 또는 restore | 낮음 |
| 🟡-07 | debug-sentry 라우트 잔존 | 프로덕션에 throw Error 라우트 | api/admin/debug-sentry/route.ts | 삭제 | 낮음 |
| ~~🟡-08~~ ✅ | warmup burst DoS | 5000/일 상한을 동시요청으로 즉시 소진 가능 | warmup/route.ts:50-54 | **수정완료 `ae5d09b`** — 전역 원자적 쿨다운(★SQL 실행 필요) | 완료 |
| ~~🟡-09~~ ✅ | quota 선차감→후검증 | 잘못된 폴백 요청도 무료횟수 소모 | route.ts:126-147 vs :173-198 | **수정완료 `b2d2e05`** — 검증 후 차감으로 순서 변경 | 완료 |
| ~~🟡-10~~ ✅ | 폴백 사업정책 우회 가능 | 콜드미스 없이도 lucataco(미화) 강제 가능 | 서버가 8분 경과 미검증 | **수정완료 `b2d2e05`** — primaryAttestation + completed_at 경과검증 | 완료 |
| ~~🟡-11~~ ✅ | 네트워크 끊김 사유별 문구 없음 | network/api_error 등 10여 사유가 "붐볐어요"로 뭉뚱그림 | style/result:175-204 | **수정완료 `cc1a39a`** — 5종 사유별 다음행동 분리 | 완료 |

### ⑥ 나의 헤어 아이콘 교체 (라운드2 추가, 감사 목록 외 사업주 지시)

| 항목 | 내용 |
|---|---|
| 문제 | 하단탭 '나의 헤어'가 사람(User) 아이콘 → 아래 랜딩 사진(얼굴·헤어)과 겹쳐 헷갈림 |
| 수정 | **`23a6e98`** — 결과지 카드(lucide FileText)로 교체, 홈 '지난 진단 기록 보기' 링크에도 동일 아이콘("내 결과지" 시각 통일) |
| 참고 | 코드 전수 확인 결과 사람 아이콘은 BottomNav '나의 헤어' 탭 하나뿐(홈 헤더=텍스트, 프로필=헤어 사진). "홈 상단"과 위치 다르면 사업주 재확인 |

---

## 확인 못 함 목록

| 항목 | 이유 |
|---|---|
| events RLS 실 DB 적용 | CLAUDE.md §4 SQL 실행 금지 — 사업주 위 SQL(5)(6) 직접 실행으로만 확인 가능 |
| my-diary 375px 가로스크롤 0 실측 | 브라우저 렌더 실측 필요 (코드상 min-w-0 적용은 확인) |
| Vercel 프로덕션 정확한 커밋 해시 | Vercel 대시보드 접근 불가 (git 기준 HEAD=origin/main 동일) |
| Replicate 잔액 상태 | 외부 서비스 — 사업주 직접 확인 |
| iOS Safari Web Share 경로 실동작 | 실기기 필요 |

---

> **감사 완료 — 코드 수정 0건.** 이 파일(`docs/LAUNCH_AUDIT_2026-08-16.md`)만 신규 생성.
