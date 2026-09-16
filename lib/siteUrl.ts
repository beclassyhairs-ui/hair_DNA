// ─── 사이트 기준 URL 단일 출처(SSOT) ─────────────────────────────────────────────
// 손님이 보는 사이트 절대주소. 카노니컬·OG·트위터카드·공유링크·sitemap·robots 가 이 값을 참조한다.
// 값은 Vercel env `NEXT_PUBLIC_SITE_URL` 로 주입되며(NEXT_PUBLIC_* 은 빌드타임 인라인 → 값 변경 후
//   재배포 필수), 미설정 시 프로덕션 도메인으로 폴백한다. 항상 끝 슬래시 없는 origin 형태.
//
// ⚠️ 이 값은 "손님이 보는 사이트 주소"다. app/api/hair-transform 의 레퍼런스 자산 fetch origin
//   (`getAssetBaseUrl`/`PUBLIC_ASSET_ORIGIN`)과는 의미가 다르다 — 그쪽은 배포보호 302 없이 항상 200
//   을 주는 origin 이어야 하므로 이 상수로 갈아끼우지 말 것(과거 faceswap 302 회귀 방지).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mialtip.kr"
).replace(/\/+$/, "");
