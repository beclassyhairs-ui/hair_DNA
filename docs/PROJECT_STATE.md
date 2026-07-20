# PROJECT_STATE.md — A-Beauty 현재 상태

> 이 파일이 프로젝트 상태의 단일 출처다. Claude Code는 매 세션 시작 시 이 파일을 읽고, 종료 시 갱신한다.
> 최종 갱신: 2026-07-20

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

## 현재 상태 한 줄

**퍼널 이벤트 `/hair-quiz` 확장 + `report_view` 단계 분리 완료·커밋됨(`58fc2a0`) — push 대기(2026-07-20).** 앞선 C-1(이미지 미러링) + C-3(퍼널 대시보드)도 커밋 완료·push 대기. 사업주 조치 2건 대기: ① `supabase/events_funnel_index_migration.sql` 실행 ② Vercel에 `BLOB_READ_WRITE_TOKEN` 등록 확인. **이번 이벤트 작업은 SQL 조치 없음(스키마 변경 불필요).**

**(이전) 퍼널 트래킹 5종 + UTM 태깅 — push·배포·migration SQL 실행까지 전부 완료(2026-07-19).** trackEvent 이원화(console fallback vs Supabase)를 단일 코어로 통합: `lib/trackEvent.ts`가 `lib/eventTracking.ts`를 re-export → 기존 문자열 이벤트 호출부까지 전부 Supabase `events` 적재. 핵심 `/style` 진단(랜딩/시작/답변/완료)과 커머스(노출/클릭/구매)를 전 구간 계측해 `조회수→유입→진단완료→상품클릭→구매전환` 퍼널 완성. first-touch UTM(source/utm_medium/utm_campaign)을 모든 이벤트에 자동 동승. 스키마 외 임의 키는 `meta`(jsonb, sanitize 가드)로 분리. `events_attribution_migration.sql` 실행 완료 → events insert 정상 적재 중.

데이터 파이프라인(이전): 소싱→draft 저장, 관리자 인증 게이트, `/admin/products` 매칭/추천 입력, 공개 `/items`+`/items/[id]`까지 코드 연결 완료. `hair-dna.vercel.app` 라이브.

## 미커밋 변경 (커밋 대기)

- (없음 — 전부 커밋 완료. **단 push는 안 했다**: `f4aef57`, `ee499c1`, `58fc2a0` 미push)

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

1. **`supabase/events_funnel_index_migration.sql` 실행** (SQL Editor) — `events`에 `event_time` 인덱스가 없어 기간 필터·정렬이 순차 스캔. 지금은 데이터가 적어 체감 안 되지만 쌓이면 대시보드가 느려진다
2. **Vercel `BLOB_READ_WRITE_TOKEN` 등록 확인** — 없으면 이미지 복사 API가 503을 반환한다
3. **push 승인** — `f4aef57`, `ee499c1` 2커밋 대기 중

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
16. [ ] **수동 E2E 완주**: 상품 1건 소싱→draft 저장→관리자 approve(status+image_status=approved, fit_hair_types 설정)→매칭 유저의 /items 노출→상세→buy_link 확인 ← **남은 단계(사용자 수동)**
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
