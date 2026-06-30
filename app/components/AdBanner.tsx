"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdBanner({ slot }: { slot?: string }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense 초기화 실패 무시
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", minHeight: "250px" }}
      data-ad-client="ca-pub-3733126974731035"
      data-ad-slot={slot || "4013466421"}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
