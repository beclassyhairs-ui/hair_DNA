"use client";

// ============================================================================
// DeleteAccountSection — '내 정보 삭제' 진입(로그인된 손님만 노출). /my-diary 하단에서 사용.
//
//   · 마운트 시 /api/auth/me 로 로그인 확인 → 미로그인이면 아무것도 렌더 안 함.
//   · 버튼 → 확인 모달(취소 / 삭제하기). 삭제하기 → POST /api/me/delete.
//   · 성공 시: 로컬스토리지 abeauty* 키 전부 삭제 + /style 로 이동(전체 리로드).
//   · 삭제는 서버(세션 user_id)만 대상 — 클라가 대상 지정 불가. 연타는 busyRef 로 1회 강제.
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
    /* private mode 등 — 무시(서버 삭제가 본체) */
  }
}

export default function DeleteAccountSection() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.loggedIn === true) setLoggedIn(true); })
      .catch(() => { /* 조회 실패 = 미로그인 취급 → 버튼 숨김 */ });
    return () => { alive = false; };
  }, []);

  async function onConfirmDelete() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/me/delete", { method: "POST" });
      if (res.status === 401) {
        // 세션이 이미 없음 — 로컬만 정리하고 랜딩으로.
        clearLocalAbeautyKeys();
        window.location.assign("/style");
        return;
      }
      if (!res.ok) {
        busyRef.current = false;
        setBusy(false);
        return; // 실패 — 모달 유지(재시도 가능)
      }
      clearLocalAbeautyKeys();
      window.location.assign("/style"); // 전체 리로드로 인메모리 상태까지 초기화
    } catch {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!loggedIn) return null;

  return (
    <div className="pt-8">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex min-h-11 items-center text-aux font-medium text-sub underline underline-offset-4 transition-colors active:text-ink"
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
