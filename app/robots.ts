import type { MetadataRoute } from "next";

import { SITE_URL as BASE_URL } from "@/lib/siteUrl";

// /robots.txt 생성. 관리자·API는 색인 차단, 사이트맵 위치 안내.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
