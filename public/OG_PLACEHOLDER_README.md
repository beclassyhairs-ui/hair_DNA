# OG 이미지 플레이스홀더 안내

기본 소셜 미리보기 이미지는 `public/og-default.png`(1200×630)로 참조된다
(`app/layout.tsx`의 `metadata.openGraph.images` / `twitter.images`).

**현재 `og-default.png`는 임시 브랜드 플레이스홀더다.** (크림 배경 + 골드 얼굴 가이드 모티프,
순수 Node로 생성. 공유 카드가 404로 깨지지 않게 하는 임시 대체물일 뿐, 디자인 확정본이 아니다.)

## 사업주 승인 후 교체할 것

- `public/og-default.png` — 사이트 공통 기본 OG 이미지 (미설정·허브 페이지용).
  **[사업주 승인] 대상.** 같은 파일명(1200×630 PNG)으로 덮어쓰면 코드 변경 없이 즉시 반영된다.
- 전용 OG 아트를 줄 랜딩(예: `/style`)은 각 `layout.tsx`의 `openGraph.images`로 지정.
  (현재 `/style`은 og-default.png를 상속 — 전용 아트 확정 시 지정)

## 페이지별 OG 현황

- 상속(og-default.png): `/style`, `/hair-quiz`, `/diagnosis`, `/consulting`, `/items`, root
- 자체 OG 아트 보유: `/bangs`(`images/bangs-og.png`), `/mbti`(`hair-mbti-og.png`)
- noindex(공유 카드 무관): `/privacy`, `/terms`, `/mbti` 계열(검색 색인만 차단)

파일을 추가/교체하면 코드 변경 없이 즉시 반영된다.
