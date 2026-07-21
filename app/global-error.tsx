"use client";

// ============================================================================
// App Router 최상위 렌더 에러 경계 — 렌더 중 발생한 예외를 Sentry로 보고한다.
// (이 파일이 있으면 root layout까지 무너지는 에러도 Sentry가 잡는다.)
// DSN 미설정 시 Sentry는 no-op이므로 화면 폴백만 동작한다.
// ============================================================================
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#FBF9F4",
          color: "#2F2A22",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "17px", fontWeight: 700 }}>잠시 문제가 발생했어요</p>
        <p style={{ fontSize: "14px", color: "#6B6355", lineHeight: 1.6 }}>
          불편을 드려 죄송해요. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            height: "48px",
            padding: "0 1.75rem",
            borderRadius: "9999px",
            background: "#2F2A22",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          다시 시도하기
        </button>
      </body>
    </html>
  );
}
