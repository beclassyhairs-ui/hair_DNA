"use client";

// ============================================================================
// /admin/debug-sentry — Sentry 연동 테스트 (관리자 게이트 뒤)
//
// ⚠️ /admin/* 는 middleware(ADMIN_SECRET)로 보호되고 robots.txt로 색인 차단된다.
//   공개 페이지에 두면 버튼을 무제한 클릭·자동화해 Sentry 할당량을 소진할 수 있어
//   관리자 인증 뒤로 옮겼다(Codex 2차 지적 반영).
//
// 용도: 배포 후 사업주가 Vercel에 NEXT_PUBLIC_SENTRY_DSN을 넣은 뒤,
//   ① "클라이언트 에러 보고" → 브라우저 에러가 Sentry에 뜨는지
//   ② "서버 에러 호출" → /api/admin/debug-sentry(POST) 서버 에러가 뜨는지 확인.
//   DSN 미설정이면 Sentry는 no-op이라 아무것도 전송되지 않는다.
//   서버 라우트는 부작용 방지를 위해 POST만 받는다(외부 링크발 GET 유발 차단).
//   연동 확인이 끝나면 이 폴더와 /api/admin/debug-sentry는 삭제해도 된다.
// ============================================================================
import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function AdminDebugSentryPage() {
  const [clientResult, setClientResult] = useState<string>("");
  const [serverResult, setServerResult] = useState<string>("");

  function reportClientError() {
    const id = Sentry.captureException(
      new Error("[debug-sentry] 클라이언트 테스트 에러 — Sentry 연동 확인용"),
    );
    setClientResult(`보고 완료 (event id: ${id}). DSN 설정 시 대시보드에서 확인하세요.`);
  }

  async function callServer() {
    setServerResult("호출 중…");
    try {
      const res = await fetch("/api/admin/debug-sentry", { method: "POST" });
      const hint =
        res.status >= 500
          ? " — 500(에러 throw 정상). Sentry 대시보드 확인."
          : res.status === 401
            ? " — 401: 관리자 세션이 필요합니다."
            : "";
      setServerResult(`서버 응답: ${res.status}${hint}`);
    } catch (e) {
      setServerResult(`요청 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-lg font-bold text-cream">Sentry 연동 테스트</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-cream/70">
        DSN(NEXT_PUBLIC_SENTRY_DSN) 설정 후, 아래 버튼으로 프론트/서버 에러가 Sentry
        대시보드에 잡히는지 확인하세요. DSN이 없으면 아무것도 전송되지 않습니다.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={reportClientError}
          className="h-12 rounded-full bg-cream px-6 text-[15px] font-semibold text-charcoal transition-transform active:scale-[0.98]"
        >
          클라이언트 에러 보고
        </button>
        {clientResult && <p className="text-[13px] text-cream/70">{clientResult}</p>}

        <button
          onClick={callServer}
          className="h-12 rounded-full border border-gold-light/40 bg-transparent px-6 text-[15px] font-semibold text-gold-light transition-transform active:scale-[0.98]"
        >
          서버 에러 호출 (POST /api/admin/debug-sentry)
        </button>
        {serverResult && <p className="text-[13px] text-cream/70">{serverResult}</p>}
      </div>
    </div>
  );
}
