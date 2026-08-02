-- ============================================================================
-- 어뷰티 — 동의 기록 (user_consents)  [append-only 감사 로그 · 초안 v2]
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. Supabase SQL Editor에서 사업주가 직접 실행한다.
--   users_auth_schema.sql(profiles/diagnoses 영속화)과 **같은 마이그레이션 라운드에 함께**
--   실행한다. 비가역 변경을 두 번 하지 않는다(PROJECT_STATE 단계 2 묶음).
--
-- 설계 원칙:
--   - append-only: 동의/철회를 덮어쓰지 않고 매 건 새 행으로 쌓는다. UPDATE/DELETE 없음.
--     철회는 기존 행 수정이 아니라 granted=false 새 이벤트로 기록.
--   - 한 유저의 "현재 동의 상태"는 (user_id, consent_type, policy_version)별 최신 granted_at
--     행이 granted=true인지로 도출.
--   - RLS deny-all + service_role 전용. ❌ anon 정책 절대 금지.
--
-- 🔒 §11 Codex 반론검증(2026-08-02) 반영:
--   A. IP 미저장 — user_id+policy_version+granted+granted_at+user_agent로 입증 구성.
--      (IP 원문/해시 모두 과잉수집·재식별 위험 대비 입증가치 낮음.)
--   B. users 최신상태 캐시 컬럼 두지 않음 — 이중저장 불일치 방지. 아래 인덱스로 조회
--      (성능 문제가 실측될 때만 파생 캐시 재검토).
--   C. 멱등성 UNIQUE(user_id, submission_id, consent_type) + append-only 트리거(UPDATE/DELETE 차단),
--      users 삭제 CASCADE 회피(감사기록 보존 — 탈퇴 시 처리는 단계3에서 별도 결정).
--   D. 게이트는 '현재 방침버전 유효 동의 보유'까지 서버가 확인(코드 단계에서 /api/auth/me 확장).
--   E. 이 스키마 선적용→삽입/조회 검증 후 코드 일괄배포. insert 실패 시 fail-CLOSED.
--   🔴 치명적: consent_type/policy_version/granted를 클라 값 그대로 신뢰 금지 —
--      서버가 세션 user_id·현재 정책버전·허용 동의유형을 권위로 결정해 기록한다.
--
-- 🔵 사업주 결정 필요(아래 보고 참조):
--   (C-1) 방침버전 원장 테이블 신설 vs 코드 상수(CONSENT_POLICY_VERSION)+git 이력으로 대체.
--         이번 라운드 초안은 '코드 상수' 경량안(원장 테이블은 후속 옵션).
--   (C-2) users 삭제 정책: 아래는 no-CASCADE(감사 보존). 회원탈퇴/삭제권은 단계3.
-- ============================================================================

create table if not exists user_consents (
  id             uuid primary key default gen_random_uuid(),
  -- CASCADE 없음: 유저 삭제 시 동의 감사기록을 자동 파기하지 않는다(입증 보존).
  user_id        uuid not null references users(id),
  consent_type   text not null
                   check (consent_type in ('privacy','terms','overseas_transfer','marketing')),
  granted        boolean not null,       -- 철회 = granted=false 새 이벤트(append-only)
  policy_version text not null,          -- 동의 시점의 방침/약관 버전(서버 상수에서 주입)
  submission_id  uuid not null,          -- 한 번의 동의화면 제출 묶음 id
  user_agent     text,                   -- 수집 정황(입증 보강). IP는 저장하지 않음.
  granted_at     timestamptz not null default now(),
  -- 멱등성: 같은 유저의 같은 제출이 재시도돼도 동의유형별 1행만.
  -- ⚠️ user_id를 키에 포함한다 — 없으면 다른 유저가 같은 submission_id를 쓸 때 ON CONFLICT
  --    DO NOTHING으로 그 유저의 기록이 조용히 누락되어 입증공백이 생긴다(Codex 검수 반영).
  unique (user_id, submission_id, consent_type)
);

-- 설문 게이트: "이 유저가 이 동의유형의 현재 방침버전에 대해 최근 granted=true인가".
create index if not exists idx_user_consents_lookup
  on user_consents (user_id, consent_type, policy_version, granted_at desc);

-- RLS: anon 완전 차단(정책 미생성 = deny-all). service_role(서버 API)만 접근(RLS 우회).
alter table user_consents enable row level security;

-- append-only 불변성 DB 강제(Codex 검수 반영): service_role은 RLS를 우회하므로
-- 애플리케이션 규율만으로는 부족하다. UPDATE/DELETE를 트리거로 원천 차단한다.
-- (정상 기록은 INSERT ... ON CONFLICT DO NOTHING이라 이 트리거에 걸리지 않는다.
--  철회도 새 INSERT(granted=false)로 하므로 UPDATE/DELETE가 필요 없다.)
create or replace function user_consents_block_mutation() returns trigger
  language plpgsql as $$
begin
  raise exception 'user_consents is append-only (UPDATE/DELETE 금지)';
end;
$$;
drop trigger if exists trg_user_consents_no_mutation on user_consents;
create trigger trg_user_consents_no_mutation
  before update or delete on user_consents
  for each row execute function user_consents_block_mutation();
