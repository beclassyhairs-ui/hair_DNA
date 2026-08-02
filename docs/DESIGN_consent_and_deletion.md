# 동의 기록(user_consents) + 탈퇴 설계 — 확정본

> 2026-08-02. PM방 판정본 v2(§11 Codex 반론검증 반영) 기준. 코드/스키마의 근거 문서.

## 1. 목적

국외이전(얼굴 사진) 동의가 이전엔 `app/style/upload`의 `useState(agreed)`뿐이라 **어디에도 기록되지 않았다**(매번 묻고 한 번도 안 적음 → 분쟁 시 입증력 0). 이번 작업의 본체는 "순서 바꾸기"가 아니라 **"한 번 묻고 영구히 적는 구조"**다. 순서 변경(로그인·동의를 사진 前으로)은 부산물.

## 2. 동의 기록 스키마 — `supabase/user_consents_schema.sql` (append-only)

- append-only 감사 로그. 덮어쓰지 않고 쌓는다. **철회 = `granted=false` 새 이벤트**(UPDATE/DELETE 없음).
- 현재 상태 = `(user_id, consent_type, policy_version)`별 최신 `granted_at` 행의 `granted`.
- 멱등: `UNIQUE(user_id, submission_id, consent_type)` — 재시도 중복삽입 방지(user_id 포함: 타 유저 같은 submission_id 충돌로 인한 기록 누락 방지).
- append-only 불변성은 DB 트리거로 강제(service_role의 UPDATE/DELETE 차단).
- RLS deny-all + service_role 전용. anon 정책 금지.
- **IP 미저장**(Codex A): `user_id + policy_version + granted + granted_at + user_agent`로 입증 구성. IP는 과잉수집.
- **캐시 컬럼 없음**(Codex B): `users`에 최신상태 이중저장 안 함. 위 인덱스로 조회.

## 3. 서버 권위 경계 (§6) — `app/api/consents`

| 값 | 결정 주체 |
|---|---|
| user_id | 서버(세션 쿠키). 본문 값 무시 |
| policy_version | 서버(`CONSENT_POLICY_VERSION`) |
| granted_at | 서버(DB now()) |
| consent_type | 서버 화이트리스트(미등록 → 400) |
| granted(필수) | 서버 — 필수 전부 미충족 시 요청 거부, 통과 시 true 고정 |
| granted(선택: 마케팅) | 클라 값 수용(선택동의는 클라 의사표시가 본질) — 단 이번 라운드는 마케팅 화면 제외 |

클라는 "어떤 유형에 동의했는가" 목록(`agreed`)만 보낸다.

## 4. 게이트 규칙 (§8) — 로그인여부만으로 스킵 금지

| 상태 | 동작 |
|---|---|
| 미로그인 | `/login/consent?return_to=/style/upload` |
| 로그인 + 현재버전 국외이전 동의 보유 | 동의화면 스킵 → `/style/upload` |
| 로그인 + 동의기록 없음(기존 유저) | 동의화면 1회 노출 후 통과 |
| 로그인 + 구버전 동의만 보유 | 동의화면 재노출 |

`/api/auth/me`가 `consent:{overseas_transfer, policy_version}` 필드를 **추가**로 반환(기존 필드 불변 → `loading` 백스톱 무영향, §5). 게이트는 `lib/consentGate.ts`가 판정.

## 5. 실행/배포 순서 (§9) · fail-closed

1. 코드 구현 → 2. Codex 검수 → 3. **사업주가 Supabase에서 스키마 선적용** → 4. 삽입/조회 검증 → 5. 코드 일괄 배포(부분배포 금지).
- **fail-closed**: `user_consents` insert 실패 시 동의 성립으로 처리하지 않는다 → 로그인/업로드 진입 불허.

## 6. 버전 문자열 (§7)

- 포맷: 시행일 기반 `YYYY-MM-DD`. 최초값 `2026-08-02`.
- `CONSENT_POLICY_VERSION` 변경 시 **반드시 `/privacy`·`/terms` 방침 시행일 변경과 같은 커밋**에서. 코드 상수와 화면 문구가 어긋나면 경량안(원장 테이블 대신 상수+git 이력) 전제가 무너진다.

## 7. 🔴 탈퇴 설계 방향 (§4) — 단계 3에서 반드시 지킬 것

`user_consents.user_id`는 `references users(id)` **이고 `ON DELETE CASCADE`가 없다**. 이는 버그가 아니라 **안전장치**다: 동의 감사기록이 있는 한 `users` 행을 hard delete 할 수 없다(FK 기본 NO ACTION). 무심코 감사기록이 날아가는 사고를 강제로 막는다.

**따라서 회원 탈퇴는 users 행 hard delete가 아니라 soft delete로 간다:**
- `users`에 `deleted_at` 표시 + 개인식별정보(`kakao_user_id` 등) 파기(비식별화).
- **행 자체는 유지** → FK가 깨지지 않으면서 파기 의무와 감사보존이 동시에 성립.

> 이 문장을 지우지 말 것. 단계 3에서 "왜 유저가 안 지워지지"로 시간을 태우게 된다.

## 8. 건드리지 말 것 (§11)

- `LOGIN_REQUIREMENT_POINT` 상수 조작(게이트가 이동이 아니라 꺼진다).
- `app/api/hair-transform/route.ts:130` 서버 비용 게이트.
- `app/style/loading` 백스톱 게이트 제거.
- `/api/auth/me` 기존 응답 구조 변경(필드 추가만).
- 탈퇴 시 users hard delete.
