-- ============================================================================
-- 어뷰티 — 카카오 로그인 유저 스키마 (users / profiles / diagnoses)
--
-- ⚠️⚠️ 실행 금지 — 사업주 SQL 승인 관문. 사업주가 Supabase SQL Editor에서 직접 실행한다.
--   (조사 보고의 초안을 확정한 파일. 실행 전 최종 검토 필요.)
--
-- 설계 원칙:
--   - kakao_user_id(카카오 회원번호)를 UNIQUE 키로 내부 uuid(id)를 부여한다.
--   - anon 완전 차단: RLS enable + 정책 미생성 = deny-all. 모든 접근은 서버 API 라우트가
--     service_role(RLS 우회)로만 수행한다(events/products와 동일 아키텍처).
--     ❌ anon SELECT/INSERT/UPDATE/DELETE 정책 절대 추가 금지.
--   - 유저 인증과 관리자 인증은 완전 별개(users는 관리자 게이트와 무관).
-- ============================================================================

-- 내부 유저 신원 (카카오 회원번호 기준)
create table if not exists users (
  id                uuid primary key default gen_random_uuid(),
  kakao_user_id     text not null unique,          -- 카카오 회원번호(문자열)
  nickname          text,                          -- 동의 시에만 저장
  profile_image     text,                          -- 동의 시에만 저장
  marketing_consent boolean not null default false,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz not null default now()
);

-- 통합 모발 프로필(1인 1행) — /home 대시보드가 읽는 abeauty_user_profile의 서버 대응물
create table if not exists profiles (
  user_id     uuid primary key references users(id) on delete cascade,
  hair_tags   jsonb,        -- 통합 프로필 태그
  core_key    text,         -- curl__thickness__density
  -- B-2: 클라 BeautyUserProfile 전체(name/요약/treatmentHistory 등)를 그대로 보관.
  -- 개별 컬럼으로 쪼개지 않는 이유 — 프로필 스키마가 아직 자주 바뀌는 단계라
  -- 컬럼 마이그레이션 비용이 더 크다. 서버 매칭에 쓸 값(hair_tags·core_key)만 승격해 둔다.
  profile     jsonb,
  updated_at  timestamptz not null default now()
);

-- 진단 자산(localStorage abeauty:diaryEntries의 서버 대응물)
create table if not exists diagnoses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  -- B-2: 클라가 만든 엔트리 id. 같은 진단을 여러 기기에서 올려도 중복 적재되지 않도록
  -- (user_id, client_id) 유니크로 멱등성을 보장한다. 없으면 재방문마다 행이 불어난다.
  client_id   text not null,
  kind        text not null,      -- style / hairquiz / damage / bangs
  answers     jsonb,
  result      jsonb,              -- 클라 다이어리 엔트리 원본(styleName, flags, hairTags 등)
  created_at  timestamptz not null default now()
);
create index if not exists idx_diagnoses_user on diagnoses (user_id, created_at desc);
-- (user_id, client_id) 유니크 인덱스는 아래 마이그레이션 구간에서 만든다 —
-- 예전 버전을 이미 실행한 DB에는 client_id 컬럼이 없어서 여기서 만들면 실패한다.

-- ── 기존 DB 대비 마이그레이션 (create table if not exists는 컬럼을 추가하지 않는다) ──
-- 이 파일의 예전 버전을 이미 실행한 적이 있으면 위 create 문들이 통째로 건너뛰어져
-- profile/client_id 컬럼이 안 생긴다. 그러면 /api/me/* 가 "column does not exist"로 실패한다.
-- 아래 문장들은 새 DB에서도 기존 DB에서도 안전하게(idempotent) 동작한다.
alter table profiles  add column if not exists profile   jsonb;
alter table diagnoses add column if not exists client_id text;

-- client_id backfill 후 NOT NULL 승격 — 기존 행이 있어도 실패하지 않게 3단계로 나눈다.
update diagnoses set client_id = id::text where client_id is null;
alter table diagnoses alter column client_id set not null;

create unique index if not exists idx_diagnoses_user_client on diagnoses (user_id, client_id);

-- RLS: anon 완전 차단(정책 미생성 = deny-all). service_role만 접근(RLS 우회).
alter table users     enable row level security;
alter table profiles  enable row level security;
alter table diagnoses enable row level security;
