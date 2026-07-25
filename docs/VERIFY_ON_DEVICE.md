# 사업주 실기기 검증 순서 — DB 3건(①core_key ②last_login ③이벤트 계정연결)

> 대상: 2026-07-25 배포분(커밋 `19de662`·`29257cf`·`1aa3451`). 프로덕션 `hair-dna.vercel.app`.
> SQL은 **사업주가 Supabase SQL Editor에서 직접 실행**한다(Claude는 SQL 실행 안 함).

---

## ① core_key 자동 채움 — 판정: **로그인 방문만으로 채워짐** ✅

**조건 충족 확인됨**: 서버 `diagnoses` 테이블에 **style 진단 16건**이 있다. core_key는 이 style
진단에서 재계산되므로, 서버에 style 행이 있다는 전제가 이미 성립한다.

**메커니즘**: 로그인 상태로 아무 페이지나 이동 → 루트 `ProfileSync`가 매 route change마다
`syncWithServer` 실행 → `pushToServer`가 프로필 전송 → `/api/me/sync`가 그 계정의 서버
`diagnoses`(kind='style') 전체에서 `curl__thickness__density`를 재계산해 `profiles.core_key`에 저장.
파생값이 null이면(코어 3답 없는 랜딩 단독) 기존값을 지우지 않는다.

→ **/style 재완주는 불필요.** 로그인해서 사이트 몇 페이지 돌면 채워진다.
→ **/style 재완주는 예비 단계**로만 둔다: 아래 2단계에서 **방문 후에도 core_key가 계속 null이면**
   그때만 /style을 1회 완주한다(새 진단은 id가 있어 확실히 동기화됨).

---

## ② last_login_at — 쿠키 자동로그인도 반영(24h 스로틀)

전엔 카카오 OAuth 콜백에서만 갱신돼 첫 로그인 시각(07-22)에 고정됐다. 이제 `/api/auth/me`가
세션 확인 시 24h 스로틀로 갱신한다(브라우저 쿠키 `abeauty_seen`로 하루 1회만 DB를 침).

## ③ 이벤트 계정 연결 — user_id=계정 uuid, kakao_user_id=null

서버 OAuth 전환 후 끊겼던 로그인↔트래킹 다리를 복구. 로그인 확인 시 `setAccountId(내부 uuid)`가
불려 이후 이벤트의 `user_id`가 계정 uuid로 붙는다. `kakao_user_id` 컬럼은 "카카오 회원번호" 전용
계약이라 계속 null로 둔다. 익명→로그인 소급연결은 하지 않는다(정책).

---

## 📱 검증 순서

### 0단계 — 현재 상태 스냅샷 (SQL)
```sql
select user_id, core_key, updated_at from profiles;
select kind, count(*) from diagnoses group by kind;   -- style 16건 확인용
select id, last_login_at from users;
```

### 1단계 — 폰에서 로그인 + 사이트 한 바퀴
1. 폰 브라우저로 `hair-dna.vercel.app` 접속 → 카카오 로그인.
2. 로그인 후 `/home` → `/items` → `/style` 랜딩 등 **2~3페이지 이동**(ProfileSync가 돌 시간을 줌).
3. 페이지 몇 곳에서 **버튼/링크를 눌러 이벤트를 발생**시킨다(③ 확인용).

### 2단계 — 결과 확인 (SQL 재실행)
```sql
-- ① core_key 채워졌는지 (곱슬__굵기__숱 형태, 예: wavy_hair__medium_thickness__thick_density)
select user_id, core_key, updated_at from profiles;

-- ③ 로그인 후 이벤트의 user_id=계정 uuid, kakao_user_id=null 인지
select user_id, kakao_user_id, count(*) from events
where event_time > now() - interval '1 hour'
group by user_id, kakao_user_id;

-- ② last_login_at 이 오늘로 갱신됐는지
select id, last_login_at from users;
```

**판정 기준**
- **① 성공**: `core_key`가 `곱슬__굵기__숱` 형태로 채워짐. (계속 null이면 → 아래 예비 단계)
- **② 성공**: `last_login_at`이 오늘 시각으로 갱신(전엔 07-22 고정).
- **③ 성공**: 로그인 후 이벤트의 `user_id`가 계정 uuid(익명 id 아님), `kakao_user_id`는 null.

### (예비) core_key가 방문 후에도 null일 때만
- 그 계정의 style 진단이 서버에 없거나(옛 id 없는 엔트리) 매칭 조건 미달인 경우다.
- 폰에서 **/style 진단을 1회 완주** → 결과 후 `/home` 이동 → 2단계 SQL 재확인.

### 3단계 — /items 추천 동작 확인
- core_key가 채워지면 `/items`가 그 계정 모발타입 기반으로 매칭(fit_hair_types 지정 상품이 있을 때 체감).

---

## 참고: 백필 SQL (선택)
`supabase/backfill_profiles_core_key.sql` — 기존 모든 계정의 core_key를 diagnoses에서 한 번에
채운다(미리보기 SELECT → UPDATE, `core_key IS NULL`만, 멱등). **실행 금지 헤더 유지, 실행은 사업주.**
단 이 백필도 서버 `diagnoses`의 style 행을 읽으므로, style 행이 없는 계정은 여기서도 안 채워진다.
