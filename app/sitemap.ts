import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://hair-dna.vercel.app").replace(/\/$/, "");

// 공개·색인 대상 엔트리 페이지만 포함한다.
// 제외: /admin·/api(robots 차단), 결과/업로드/로딩 등 전이 화면, 개인화면(/home·/myhair),
//       /privacy·/terms(초안 noindex), 동적 상세(/items/[id]),
//       /mbti 계열(미끼 랜딩 분리 정책 — 파트너스 링크 유지 + noindex, app/mbti/layout.tsx 참고).
const PUBLIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/style", priority: 1.0 },        // 플래그십(루트 리다이렉트 대상)
  { path: "/bangs", priority: 0.7 },
  { path: "/damage-check", priority: 0.7 },
  { path: "/hair-quiz", priority: 0.7 },
  { path: "/diagnosis", priority: 0.7 },
  { path: "/items", priority: 0.7 },
  { path: "/consulting", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
