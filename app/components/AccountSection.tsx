"use client";

// ============================================================================
// AccountSection — 마이헤어(/my-diary) 하단 계정 메뉴. 로그인 상태별로 갈린다.
//
//   · 로그인 손님: [로그아웃](일반 톤) + [내 정보 삭제](위험·빨강 톤, 확인 모달).
//   · 비로그인 손님: [카카오로 로그인](결과지 게이트와 같은 경로 = /login/consent 재사용).
//   · 확인 전(checking): 아무것도 렌더 안 함(깜빡임 방지).
//
//   로그아웃: POST /api/auth/logout(기존 라우트)로 세션 쿠키 만료 → 로컬 abeauty* 클리어 → /home.
//   삭제:     POST /api/me/delete → 로컬 abeauty* 클리어 → /style. (대상은 서버가 세션에서만 결정.)
//   로그인 여부는 /api/auth/me(삭제계정 deleted_at 처리 포함)로 판단.
//   연타는 busyRef 동기 잠금으로 1회 강제.
// ============================================================================

import { useEffect, useRef, useState } from "react";

function clearLocalAbeautyKeys() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^abeauty[:_]/.test(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* private mode 등 — 무시(서버 처리가 본체) */
  }
}

type Status = "checking" | "in" | "out";

export default function AccountSection() {
  const [status, setStatus] = useState<Status>("checking");
  const [open, setOpen] = useState(false);   // 삭제 확인 모달
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) setStatus(d?.loggedIn === true ? "in" : "out"); })
      .catch(() => { if (alive) setStatus("out"); }); // 조회 실패 = 미로그인 취급
    return () => { alive = false; };
  }, []);

  function onLogin() {
    // 결과지 게이트와 동일 경로 재사용: /login/consent → (미로그인) 카카오 OAuth.
    window.location.href = `/login/consent?return_to=${encodeURIComponent("/my-diary")}`;
  }

  async function onLogout() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) { busyRef.current = false; setBusy(false); return; } // 실패 → 재시도 가능
      clearLocalAbeautyKeys();
      window.location.assign("/home"); // 전체 리로드로 인메모리 상태까지 초기화
    } catch {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onConfirmDelete() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/me/delete", { method: "POST" });
      if (res.status === 401) {
        clearLocalAbeautyKeys();
        window.location.assign("/style");
        return;
      }
      if (!res.ok) { busyRef.current = false; setBusy(false); return; } // 실패 → 모달 유지
      clearLocalAbeautyKeys();
      window.location.assign("/style");
    } catch {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "out") {
    return (
      <div className="flex justify-center pt-8">
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex min-h-12 items-center justify-center rounded-pill bg-ink px-6 py-3 text-body font-semibold text-white active:opacity-80"
        >
          카카오로 로그인
        </button>
      </div>
    );
  }

  // status === "in"
  return (
    <div className="flex flex-col items-center gap-3 pt-8">
      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        className="inline-flex min-h-12 items-center justify-center rounded-pill border border-line px-6 py-3 text-body font-semibold text-sub active:opacity-80 disabled:opacity-50"
      >
        로그아웃
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="mt-1 flex min-h-11 items-center text-aux font-medium underline underline-offset-4 transition-opacity active:opacity-70 disabled:opacity-50"
        style={{ color: "#b23b34" }}
      >
        내 정보 삭제
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
          onClick={() => { if (!busy) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-emphasis font-bold text-ink">내 정보 삭제</p>
            <p className="mt-2 text-body leading-relaxed text-sub">
              진단 기록과 계정 정보가 모두 삭제됩니다. 복구되지 않아요.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 inline-flex min-h-12 items-center justify-center rounded-pill border border-line px-4 text-body font-semibold text-sub active:opacity-80 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={busy}
                className="flex-1 inline-flex min-h-12 items-center justify-center rounded-pill px-4 text-body font-semibold text-white active:opacity-80 disabled:opacity-60"
                style={{ background: "#b23b34" }}
              >
                {busy ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
