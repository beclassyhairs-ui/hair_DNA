"use client";

// ============================================================================
// 관리자 로그인 화면
// ADMIN_SECRET(공유 비밀번호)을 입력해 세션 쿠키를 발급받는다. 성공 시 원래
// 가려던 페이지(next)로 이동한다. admin layout의 사이드바를 fixed 카드로 덮는다.
//
// useSearchParams()는 정적 프리렌더 시 <Suspense> 경계 안에 있어야 하므로
// (Next.js App Router 요구사항) 폼 본체를 Suspense로 감싼다.
// ============================================================================

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // open-redirect 방지: /admin 하위 경로만 허용
  const rawNext = params.get("next") ?? "/admin";
  const next = rawNext.startsWith("/admin") ? rawNext : "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      // 쿠키가 적용된 상태로 middleware를 다시 통과하도록 내비게이션
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-7"
    >
      <p className="font-serif text-xl font-bold text-cream">어뷰티 관리자</p>
      <p className="mt-1 text-sm text-cream/40">관리자 비밀번호를 입력하세요.</p>

      <label className="mt-6 block">
        <span className="text-xs font-medium text-cream/50">비밀번호</span>
        <input
          type="password"
          autoFocus
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="••••••••"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
        />
      </label>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl border border-gold/30 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/25 disabled:opacity-50"
      >
        {loading ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal px-5">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
