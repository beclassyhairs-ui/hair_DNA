"use client";

// ============================================================================
// NotifySignup — 출시 알림 신청(마케팅 동의) 블록. 현재는 데미지 결과지 '새치 축'에서 사용.
//
//   · 누르는 행위가 곧 동의(사전 체크박스 없음 — 광고성 정보 수신은 선택 동의).
//   · 누르면 /api/consents(선택 동의 경로)로 marketing=granted:true 를 append-only 기록하고
//     notify_signup 이벤트(meta: landing, gray)를 남긴다. "신청되었습니다"로 전환, 취소 가능.
//   · 취소는 granted:false 새 이벤트(철회)로 남긴다.
//   · 미로그인이면 기존 로그인 게이트(ensureLoggedInOrRedirect)로 보낸다(결과지는 이미 게이트라
//     정상 흐름에선 이미 로그인 상태지만, 방어적으로 한 번 더 확인).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { EVENT_NAMES, trackEvent } from "@/lib/eventTracking";
import { ensureLoggedInOrRedirect } from "@/lib/authGate";

/** 새 제출 묶음 id — 매 신청/취소마다 새로 발급(append-only 새 행 보장). 서버 UUID 검증과 형식 일치. */
function newSubmissionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* secure context 아님 등 → 폴백 */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function NotifySignup({ landing, gray }: { landing: string; gray: boolean }) {
  const [signedUp, setSignedUp] = useState(false);
  const [busy, setBusy] = useState(false);
  // 동기 잠금 — busy(state)는 리렌더 전이라 연타 시 두 핸들러가 통과할 수 있다(Codex 지적).
  //   ref 는 즉시 반영되므로 실제 in-flight 요청을 1개로 강제한다.
  const busyRef = useRef(false);

  // 마운트 시 현재 신청 상태를 반영(새로고침 후에도 "신청됨" 유지).
  useEffect(() => {
    let alive = true;
    fetch("/api/consents?type=marketing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.marketing === true) setSignedUp(true); })
      .catch(() => { /* 조회 실패는 '미신청'으로 두고 재신청은 멱등 */ });
    return () => { alive = false; };
  }, []);

  async function postMarketing(granted: boolean): Promise<Response> {
    return fetch("/api/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: newSubmissionId(),
        agreed: ["marketing"],
        optionalOnly: true,
        granted,
      }),
    });
  }

  async function onSignup() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const ok = await ensureLoggedInOrRedirect("/damage-check/result");
      if (!ok) return; // 게이트가 /login/consent 로 리다이렉트함
      const res = await postMarketing(true);
      if (res.status === 401) { await ensureLoggedInOrRedirect("/damage-check/result"); return; }
      if (!res.ok) return; // 조용히 실패 — 재시도 가능
      trackEvent(EVENT_NAMES.NOTIFY_SIGNUP, { landing, gray });
      setSignedUp(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onCancel() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await postMarketing(false);
      if (res.ok) setSignedUp(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (signedUp) {
    return (
      <div className="rounded-2xl bg-soft p-4">
        <p className="text-emphasis font-bold text-ink">신청되었습니다</p>
        <p className="mt-1 text-aux leading-snug text-sub">제품이 나오면 카카오톡으로 알려드릴게요.</p>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="mt-3 inline-flex min-h-[44px] items-center rounded-pill border border-line px-5 py-2.5 text-aux font-semibold text-sub active:opacity-80 disabled:opacity-50"
        >
          신청 취소
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-soft p-4">
      <button
        type="button"
        onClick={onSignup}
        disabled={busy}
        className="inline-flex min-h-[48px] items-center rounded-pill bg-ink px-6 py-3 text-body font-semibold text-white active:opacity-80 disabled:opacity-50"
      >
        제품 나오면 알려드릴까요?
      </button>
      <p className="mt-2.5 text-aux leading-snug text-sub">
        제품 출시 소식을 카카오톡으로 보내드립니다. 언제든 수신 거부할 수 있어요.
      </p>
    </div>
  );
}
