# PROJECT_STATE.md — A-Beauty 현재 상태

> 이 파일이 프로젝트 상태의 단일 출처다. Claude Code는 매 세션 시작 시 이 파일을 읽고, 종료 시 갱신한다.
> 최종 갱신: 2026-07-19

## 현재 상태 한 줄

**데이터 파이프라인 코드 완성(2026-07-19) — `hair-dna.vercel.app` 라이브.** 소싱→draft 저장, 관리자 인증 게이트, `/admin/products` 매칭/추천 입력 UI, 공개 `/items` 목록(coreKey 매칭) + `/items/[id]` 상세까지 전 구간 코드 연결. 관리자가 fit_hair_types를 UI로 넣을 수 있고, 승인 상품이 매칭 유저의 목록·상세·구매까지 이어짐. 남은 건 실제 상품 1건으로 수동 E2E 완주(16번, 승인은 규칙4상 사용자 수동). 관리자 게이트 라이브 검증됨. products 스키마 Supabase 적용 완료(현재 0 records).

## 미커밋 변경

- (없음 — 아래 커밋 완료)

## 이번 세션 가벼운 픽스 (2026-07-19)

- [x] **/style/loading 15초 강제 대기 제거** — 최소 15초 광고 대기 타이머(`Promise.allSettled`)를 걷어내고 hair-transform API 완료 즉시 `/style/result`로 라우팅. AdSense 정책 리스크 + 초반 이탈 원인 제거. 광고는 합성 대기 시간에만 자연 노출 — `fix: /style/loading 15초 강제 대기 제거` (eb7dd0f, push 완료)
- [x] **/my-diary 기장 라벨** — 확인 결과 **이미 정상**. `A_LABELS.q11_length`가 `app/style/surveyData.ts`의 `LENGTH_LABEL_MAP`(SSOT)을 import해 쓰고 있어 `bob=단발` 등 정확히 렌더됨(과거 하드코딩 `bob=숏단발` 오표기는 이미 리팩터로 제거됨, 코드 주석에 기록). 다이어리는 style 플로우만 저장하므로 style 서베이가 올바른 기준이며 별도 수정 불필요. (참고: diagnosis 서베이의 `shoulder=어깨선`은 다른 플로우로 다이어리에 저장되지 않음)

## 다음 작업 순서

### 🎯 8월 배포 우선순위 (확정)

1. [ ] **faceswap 복원 + 84 레퍼런스 + 일일 제한 + 품질 승인** — faceswap 합성 파이프라인 복원, 레퍼런스 84종 구성, `lib/dailyLimit.ts`를 hair-transform 라우트에 실제 적용(현재 미적용, 백로그 확인 필요), 합성 결과 품질 승인 게이트.
2. [ ] **이벤트 5종 + UTM 태깅 전 구간** — 핵심 이벤트 5종 정의·계측, UTM 파라미터 태깅을 유입~전환 전 구간에 일관 적용.
3. [ ] **상품 20~30개 엄선 등재(반자동)** — 소싱→draft→관리자 승인 흐름으로 20~30개 상품 엄선 등재. 완전 자동화 아님(반자동, 사람 검수 유지).

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

## 확정된 결정사항

- 관리자 전체 인증은 지금 안 만든다. GET/POST/PUT 필드 제한(최소 방어)만 하고 진행. 전체 인증은 백로그.
- ~~**감수 리스크(2026-07-18): 무인증 admin GET에 내부 필드 노출.**~~ → **해소됨(2026-07-19): 배포 직전 최소 인증 게이트(9번) 신설로 `/admin/*`·`/api/admin/*` 전체가 `ADMIN_SECRET` 뒤로 잠김.** Codex가 배포 반론에서 이 노출을 '배포 불가'로 지적 → 게이트 구현으로 차단.
- `products` 테이블이 Supabase에 아예 없었음이 확인됨(2026-07-18) — "확장 블록만 BEGIN/COMMIT 실행" 계획은 폐기. 대신 `products_schema.sql` 파일 전체(테이블 생성+RLS+확장)를 BEGIN/COMMIT으로 감싸 한 번에 실행하는 방식으로 변경.
- product_verification_logs 같은 감사 테이블은 지금 안 만들고 운영에서 필요해지면 추가.
- 커밋 히스토리 참고: 28a2f1e(sourcing 도구), 45cf3ea(스키마 1차), 4fc0061(스키마 확장 1차), 3e8ec61(GET/POST/PUT 필드 제한)는 이미 존재.

## 백로그 (차단 아님, 기록)

- **관리자 전체 인증** — 최소 게이트(방안 A: 공유 비밀번호+서명 쿠키, 2026-07-19 구현)로 1차 방어됨. 남은 개선(백로그): 로그인 rate limit(서버리스 KV 필요), 계정별 인증(방안 B: Supabase Auth+allowlist), `ADMIN_SESSION_SECRET` 분리. 발견템 파이프라인 트래픽 붙기 전 검토.
- 공개 상품 API `/api/products` 분리 신설
- **sourcing→draft 저장 DB 멱등성** — 현재 중복 방지는 브라우저 메모리(savedKeys) 단위라 새로고침/재붙여넣기 후 같은 후보 재저장 가능. DB 수준 멱등성(예: buy_link 유니크 제약 또는 upsert) 필요 시 도입.
- **/items 진단 전 노출 정책** — coreKey 없는(진단 전) 방문자에겐 approved 전체를 최신순 노출 중. "진단 전엔 범용(fit 비어있음) 상품만" 또는 "진단 유도 CTA만" 정책으로 바꿀지 결정 필요.
- **/items 고민 기반 매칭 보강** — 현재 매칭은 모발타입(coreKey↔fit_hair_types)만. hairTags(한글 고민어휘) ↔ solves_concern 매칭을 추가하면 정밀도 향상 가능(현재 solves_concern은 노출만 하고 매칭엔 미사용).
- `sourcing_candidates` 테이블 — 리서치 에이전트가 API로 직접 후보 등록하는 구조. 관리자 인증 이후
- lib/sourcing.ts fit_hair_types 매핑 불일치 (bangs_babyhair, damaged_hair_high_history)
- 해외 플랫폼 변형(AliExpress US 등) sales_type=null 처리 개선
- CSV 파서: 닫히지 않은 따옴표 오류 미보고
- /home dead CTA 2개 (진단 다시보기, items 이유보기), mainConcern 하드코딩 문구
- /hair-quiz 저장 미연결 (kind는 준비됨)
- /api/hair-transform의 pickReferenceUrl/getBaseUrl dead code + public/references 폴더 비어있음 — 의도 확인 필요
- lib/dailyLimit.ts가 hair-transform 라우트에 미적용 — 실제 호출 제한 여부 확인 필요

## 인프라/도구 체계

- 창구: Windows Claude Code (구현 + 이 파일 갱신 담당)
- 검수: Codex CLI — CLAUDE.md 3번 규칙에 따라 백엔드 변경 시 자동 호출
- 리서치: Ubuntu Claude(서치) → `sourcing/inbox/*.tsv` → git push
- PM/판단: Claude 채팅 (큰 결정만 세컨드 오피니언 교차 확인)
- 오픈클로: 파이프라인 완성 후 정기 운영 작업(URL 생존/이미지 체크)에 도입 예정
