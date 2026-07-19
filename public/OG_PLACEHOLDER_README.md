# OG 이미지 플레이스홀더 안내

기본 소셜 미리보기 이미지는 `public/og-default.png`(1200×630)로 참조된다
(`app/layout.tsx`의 `metadata.openGraph.images` / `twitter.images`).

**아직 실제 파일은 없다(플레이스홀더).** 디자인 확정 후 아래처럼 채운다.

- `public/og-default.png` — 사이트 공통 기본 OG 이미지 (미설정 페이지용)
- 개별 랜딩(/style·/mbti·/bangs·/damage-check)은 각 `layout.tsx`에서 자체 OG
  이미지를 지정하고 있으니 그쪽 이미지도 별도 확인
  (`public/images/bangs-og.png`, `public/hair-mbti-og.png` 등)

파일을 추가하면 코드 변경 없이 즉시 반영된다.
