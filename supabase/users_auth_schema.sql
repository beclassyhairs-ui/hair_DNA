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
  updated_at  timestamptz not null default now()
);

-- 진단 자산(localStorage abeauty:diaryEntries의 서버 이전 대상 — P2 후속, 로그인만 먼저면 생략 가능)
create table if not exists diagnoses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null,      -- style / hairquiz / damage / bangs
  answers     jsonb,
  result      jsonb,              -- styleName, generatedImageUrl, flags 등
  created_at  timestamptz not null default now()
);
create index if not exists idx_diagnoses_user on diagnoses (user_id, created_at desc);

-- RLS: anon 완전 차단(정책 미생성 = deny-all). service_role만 접근(RLS 우회).
alter table users     enable row level security;
alter table profiles  enable row level security;
alter table diagnoses enable row level security;
