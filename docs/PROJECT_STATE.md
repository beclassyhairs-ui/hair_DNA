# PROJECT_STATE.md — A-Beauty 현재 상태

> 이 파일이 프로젝트 상태의 단일 출처다. Claude Code는 매 세션 시작 시 이 파일을 읽고, 종료 시 갱신한다.
> 최종 갱신: 2026-07-18

## 현재 상태 한 줄

**중요 발견(2026-07-18): Supabase public 스키마에 `products` 테이블이 아예 존재하지 않음** (실존 테이블은 `events` 하나뿐 — 사전점검 쿼리에서 `relation "public.products" does not exist` 확인). 기존 "확장 블록만 실행" 계획은 폐기하고, `supabase/products_schema.sql` 전체를 빈 DB 대상 최초 생성 스크립트(BEGIN/COMMIT 원자적 실행, `public.` 스키마 명시)로 재작성 → Codex 검수 통과. 다음은 사용자가 SQL 전문을 Supabase SQL Editor에 붙여넣어 1회 실행.

## 미커밋 변경

- `supabase/products_schema.sql` (빈 DB 최초 생성용으로 재구성 — public. 프리픽스 추가 + BEGIN/COMMIT 래핑, Codex 검수 통과, 커밋 대기)

## 다음 작업 순서

1. [x] `supabase/products_schema.sql` 커밋 — `chore: harden products discovery schema migration` (4fc0061)
2. [x] 관리자 products GET/POST/PUT 필드 제한 — `app/api/admin/products/route.ts`, `[id]/route.ts` 7개 필드만 명시. Codex 최초 검수에서 POST/PUT 노출 문제 지적 → 수정 → 재검수 통과 — `fix: restrict admin products API responses to explicit fields` (3e8ec61)
3. [x] ~~Supabase 읽기 전용 사전점검~~ → 사용자가 직접 실행, `products` 테이블 미존재 확인됨. 계획 변경 트리거
4. [ ] `supabase/products_schema.sql` (최초 생성용 재작성본) 커밋 — Codex 검수 통과 완료, 커밋만 남음
5. [ ] 사용자가 Supabase SQL Editor에 파일 전문을 붙여넣어 1회 실행 (테이블 생성 + RLS + 확장 필드 + 제약 + 인덱스 + 트리거, 전부 BEGIN/COMMIT 트랜잭션 안)
6. [ ] 실행 후 확인 — 테이블/컬럼/제약/인덱스/트리거 생성 여부, 기존 `/admin/products` 정상 작동(제품 0건 상태에서 신규 등록 테스트)
7. [ ] `/api/admin/products` GET/POST/PUT 신규 필드 확장
8. [ ] `/admin/products` UI 확장 (status 컨트롤, 이미지 검수 필드)
9. [ ] `/admin/sourcing` keep → draft 저장 버튼 연결
10. [ ] `/items` 공개 조회 API 신설 (approved + image approved 필터, 필드 allowlist)
11. [ ] `/items` DB 연동 + hairTags 매칭
12. [ ] `/items/[id]` 상세페이지

## 확정된 결정사항

- 관리자 전체 인증은 지금 안 만든다. GET/POST/PUT 필드 제한(최소 방어)만 하고 진행. 전체 인증은 백로그.
- `products` 테이블이 Supabase에 아예 없었음이 확인됨(2026-07-18) — "확장 블록만 BEGIN/COMMIT 실행" 계획은 폐기. 대신 `products_schema.sql` 파일 전체(테이블 생성+RLS+확장)를 BEGIN/COMMIT으로 감싸 한 번에 실행하는 방식으로 변경.
- product_verification_logs 같은 감사 테이블은 지금 안 만들고 운영에서 필요해지면 추가.
- 커밋 히스토리 참고: 28a2f1e(sourcing 도구), 45cf3ea(스키마 1차), 4fc0061(스키마 확장 1차), 3e8ec61(GET/POST/PUT 필드 제한)는 이미 존재.

## 백로그 (차단 아님, 기록)

- **관리자 전체 인증** — /admin* 및 /api/admin/* 무인증 상태. 방안 A(비밀번호+서명 쿠키) vs B(Supabase Auth+allowlist) 미결정. 발견템 파이프라인 연결 전후로 필수 검토
- 공개 상품 API `/api/products` 분리 신설 (9번 작업에서 처리)
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
