# UTM 규칙 — 미알팁 유입 추적

> 작성 2026-09-16. 목적: 콘텐츠·채널별 유입을 **일관된 규칙**으로 태깅해, 어디서 온 손님이 진단/클릭까지 가는지 데이터로 본다.
> 계측 구현: `lib/eventTracking.ts` (`captureAttribution` first-touch 저장 + 모든 이벤트 동승). 이 문서는 **링크를 만드는 규칙**이다.

---

## 0. 계측이 실제로 하는 일 (바꾸지 말 것)

- 손님이 **처음** 들어온 URL의 `utm_source` · `utm_medium` · `utm_campaign` 을 **first-touch**로 localStorage에 고정한다.
- 이후 앱 안에서 이동해 URL에서 utm이 사라져도, 그 손님의 **모든 이벤트**에 최초 유입값이 그대로 실려간다.
- 이 세 값은 events 테이블의 **전용 컬럼**(`source` / `utm_medium` / `utm_campaign`)으로 적재된다. (meta 아님 → 집계·필터가 쉽다.)
- **first-touch**라 이미 값이 있으면 덮어쓰지 않는다. 같은 손님이 나중에 다른 콘텐츠로 재유입해도 최초 출처가 유지된다.

> ⚠️ 캡처되는 파라미터는 **`utm_source` · `utm_medium` · `utm_campaign` 딱 3개**다. `utm_content` · `utm_term` 은 저장되지 않는다(붙여도 무시됨).

---

## 1. 링크를 붙이는 위치 (중요)

- **반드시 진입 페이지에 직접 붙인다: `/style` · `/damage-check` · `/home`.**
- **루트 `/` 에는 붙이지 말 것.** `/` 는 `/style` 로 서버 리다이렉트되는데, 리다이렉트는 쿼리(`?utm_...`)를 물고 가지 않아 **유입값이 통째로 유실**된다.
- 결과지 공유 버튼은 코드가 이미 `utm_source=kakao_share` / `copy_share` 를 자동으로 붙인다 → 이 두 값은 **내부 예약어**이니 마케팅 링크에 수동으로 쓰지 말 것.

---

## 2. 값 규칙 (전부 소문자·공백 금지·하이픈으로 단어 구분)

### 2-1. `utm_source` — 어디 채널에서 왔나
| 값 | 채널 |
|---|---|
| `instagram` | 인스타그램 |
| `youtube` | 유튜브 |
| `kakao` | 카카오(채널 메시지·톡 등) |
| `blog` | 블로그(네이버/티스토리 등) |

새 채널이 생기면 소문자 한 단어로 추가한다(예: `threads`, `tiktok`).

### 2-2. `utm_medium` — 그 채널 안 어떤 형식인가
| 값 | 형식 |
|---|---|
| `video` | 영상(릴스·쇼츠·유튜브 본편) |
| `profile` | 프로필/바이오 링크 |
| `story` | 스토리 |
| `post` | 피드 글·블로그 본문 링크 |

### 2-3. `utm_campaign` — 어떤 콘텐츠였나 (식별자)
- 콘텐츠를 식별하는 **소문자-하이픈 슬러그**. 캠페인/영상 하나당 하나씩 고정한다.
- 예: `hair-transform-reel` · `damage-quiz-story` · `styling-tutorial` · `bio-link`.
- 날짜가 필요하면 뒤에 붙인다: `damage-guide-2609`.

---

## 3. 예시 링크 10개 (복붙용)

1. 인스타 릴스 → AI 변신 랜딩
   `https://mialtip.kr/style?utm_source=instagram&utm_medium=video&utm_campaign=hair-transform-reel`
2. 인스타 프로필(바이오) → 홈
   `https://mialtip.kr/home?utm_source=instagram&utm_medium=profile&utm_campaign=bio-link`
3. 인스타 스토리 → 손상도 자가진단
   `https://mialtip.kr/damage-check?utm_source=instagram&utm_medium=story&utm_campaign=damage-quiz-story`
4. 유튜브 본편 더보기란 → AI 변신 랜딩
   `https://mialtip.kr/style?utm_source=youtube&utm_medium=video&utm_campaign=styling-tutorial`
5. 유튜브 쇼츠 → 손상도 자가진단
   `https://mialtip.kr/damage-check?utm_source=youtube&utm_medium=video&utm_campaign=damage-shorts`
6. 유튜브 채널 프로필 링크 → 홈
   `https://mialtip.kr/home?utm_source=youtube&utm_medium=profile&utm_campaign=channel-link`
7. 카카오 채널 메시지 → AI 변신 랜딩
   `https://mialtip.kr/style?utm_source=kakao&utm_medium=post&utm_campaign=channel-broadcast`
8. 카카오 채널 메시지 → 손상도 자가진단
   `https://mialtip.kr/damage-check?utm_source=kakao&utm_medium=post&utm_campaign=gray-notice`
9. 블로그 본문 링크 → 손상도 자가진단
   `https://mialtip.kr/damage-check?utm_source=blog&utm_medium=post&utm_campaign=damage-guide`
10. 블로그 본문 링크 → AI 변신 랜딩
    `https://mialtip.kr/style?utm_source=blog&utm_medium=post&utm_campaign=hair-mbti`

---

## 4. 집계 볼 때

- events 테이블에서 `source` · `utm_medium` · `utm_campaign` 컬럼으로 필터/그룹핑한다.
- 한 손님(세션)의 모든 이벤트에 같은 3값이 실리므로, "instagram/video/hair-transform-reel 로 온 손님 중 몇 %가 report_view/product_clicked 까지 갔나"를 그대로 뽑을 수 있다.
- 내부 공유 재유입은 `source=kakao_share` / `copy_share` 로 구분된다(마케팅 유입과 섞이지 않게).
