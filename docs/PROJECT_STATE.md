# PROJECT_STATE.md — A-Beauty 현재 상태

> 이 파일이 프로젝트 상태의 단일 출처다. Claude Code는 매 세션 시작 시 이 파일을 읽고, 종료 시 갱신한다.
> 최종 갱신: 2026-07-18

## 현재 상태 한 줄

경로 오타 수정(`doce/` → `docs/`) 완료. products 확장 SQL 파일 최종안 완료·미커밋, 관리자 GET 필드 제한도 코드 반영 완료·미커밋(둘 다 Codex 검수 전). 다음은 두 변경 Codex 검수 → 커밋 → 읽기 전용 사전점검 → 확장 블록 실행.

## 미커밋 변경

- `supabase/products_schema.sql` (확장 마이그레이션 최종안, 195+/44-)
- `app/api/admin/products/route.ts` (GET `select("*")` → 7개 필드 명시, 이미 구현됨 — Codex 검수 전)
- `CLAUDE.md` (신규, untracked)

## 다음 작업 순서

1. [ ] `supabase/products_schema.sql` — Codex 검수 → 커밋 — `chore: harden products discovery schema migration`
2. [ ] `app/api/admin/products/route.ts` GET 필드 제한 — 이미 코드 반영됨, Codex 검수 → 커밋 (POST/PUT/DELETE/UI/스키마는 변경 없음 확인)
3. [ ] Supabase 읽기 전용 사전점검 — 사용자가 직접 SQL Editor에서 실행: (a) 기존 CHECK/인덱스/트리거 이름+정의 확인 쿼리 (b) column_presence CTE 방식 값 분포 쿼리
4. [ ] 사전점검 정상 시 확장 블록만 실행 — `-- 1) 신규 컬럼 추가`부터 `execute function public.set_products_updated_at();`까지 `BEGIN; ... COMMIT;`으로. 에러 시 ROLLBACK
5. [ ] 실행 후 확인 — 컬럼/제약/기존 /admin/products 정상 작동
6. [ ] `/api/admin/products` GET/POST/PUT 신규 필드 확장
7. [ ] `/admin/products` UI 확장 (status 컨트롤, 이미지 검수 필드)
8. [ ] `/admin/sourcing` keep → draft 저장 버튼 연결
9. [ ] `/items` 공개 조회 API 신설 (approved + image approved 필터, 필드 allowlist)
10. [ ] `/items` DB 연동 + hairTags 매칭
11. [ ] `/items/[id]` 상세페이지

## 확정된 결정사항

- 관리자 전체 인증은 지금 안 만든다. GET 필드 제한(최소 방어)만 하고 진행. 전체 인증은 백로그.
- SQL은 파일 전체가 아니라 확장 블록만, BEGIN/COMMIT으로 실행한다.
- 사전점검 쿼리는 column_presence CTE 개선판을 쓴다 (컬럼 미존재 시 오집계 방지).
- product_verification_logs 같은 감사 테이블은 지금 안 만들고 운영에서 필요해지면 추가.
- 커밋 히스토리 참고: 28a2f1e(sourcing 도구), 45cf3ea(스키마 1차)는 이미 존재.

## 백로그 (차단 아님, 기록)

- **관리자 전체 인증** — /admin* 및 /api/admin/* 무인증 상태. 방안 A(비밀번호+서명 쿠키) vs B(Supabase Auth+allowlist) 미결정. 발견템 파이프라인 연결 전후로 필수 검토
- 공개 상품 API `/api/products` 분리 신설 (9번 작업에서 처리)
- `sourcing_candidates` 테이블 — 리서치 에이전트가 API로 직접 후보 등록하는 구조. 관리자 인증 이후
- lib/sourcing.ts fit_hair_types 매핑 불일치 (bangs_babyhair, damaged_hair_high_history)
- 해외 플랫폼 변형(AliExpress US 등) sales_type=null 처리 개선
- CSV 파서: 닫히지 않은 따옴표 오류 미보고
- products_schema.sql 상단 기본 블록 `public.` 스키마명 미명시
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
