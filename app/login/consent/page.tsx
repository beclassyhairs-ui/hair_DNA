"use client";

// ============================================================================
// /login/consent — 카카오 로그인 전 개인정보 수집·이용 동의 화면 (A-6)
//
// 이 화면이 동의의 단일 관문이다(설문 게이트·업로드 가드가 전부 여기로 보낸다).
// 필수 3종(개인정보 수집·이용 / 이용약관 / 국외이전) 동의해야 진행. 선택(닉네임·프로필)은
// 카카오 동의창이 자체 기록하므로 서버 저장 안 함. 마케팅은 서버저장(1b) 이후 재추가.
//
// 🔴 동의 기록은 user_id가 필요한데 user_id는 카카오 로그인 후에만 생긴다. 그래서:
//   · 로그인 상태면 → 즉시 POST /api/consents 기록 → 성공 시 return_to로.
//   · 미로그인이면 → 동의 의사를 sessionStorage에 담고 카카오 로그인으로. 카카오는
//     이 화면으로 되돌아오고(return_to=/login/consent?...), 로그인된 채 재마운트되면
//     담아둔 의사를 서버에 기록(플러시)한 뒤 최종 목적지로 보낸다.
//   · fail-closed: 기록(POST) 실패 시 절대 진행시키지 않는다(§9). 재시도 UI 노출.
//
// 서버 권위(§6): granted/policy_version/시각/user_id/필수판정은 전부 서버(/api/consents)가
// 정한다. 클라는 '어떤 유형에 동의했는가' 목록만 보낸다.
//
// ⓘ 실서비스 배포본(2026-08-02). "초안" 배너 제거 — 실제 구속력 있는 동의를 기록하므로.
//   /privacy 본문 마감(보호책임자 실값·noindex 해제)은 별도 트랙이며, 완료 시 CONSENT_POLICY_VERSION을
//   올려 유저 1회 재동의로 반영한다(policy_version 설계). noindex·스위치·env·auth 라우트 미변경.
// ============================================================================

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "../../../lib/trackEvent";
import { CONSENT_POLICY_VERSION } from "../../../lib/consent";

const DEFAULT_RETURN = "/style/upload";
const INTENT_KEY = "abeauty:consentIntent";
// 필수 동의 유형(서버 REQUIRED_CONSENT_TYPES와 일치). 화면 체크 → 이 목록을 서버에 보낸다.
const REQUIRED_AGREED = ["privacy", "terms", "overseas_transfer"] as const;

// 내부 경로만 허용(오픈 리다이렉트 차단). 서버 sanitizeReturnTo가 2차 방어.
function safeReturnTo(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return DEFAULT_RETURN;
  return v;
}

type MeResponse = {
  loggedIn?: boolean;
  consent?: { overseas_transfer?: boolean; policy_version?: string };
};

// 현재 방침버전의 국외이전 동의를 이미 보유했는가.
function hasCurrentConsent(me: MeResponse | null): boolean {
  return Boolean(
    me?.loggedIn &&
      me.consent?.overseas_transfer === true &&
      me.consent?.policy_version === CONSENT_POLICY_VERSION,
  );
}

async function fetchMe(): Promise<MeResponse | null> {
  try {
    return (await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json())) as MeResponse;
  } catch {
    return null;
  }
}

// 동의 기록(서버 권위·멱등). 성공 true / 실패 false(호출측 fail-closed).
async function recordConsent(intent: { submissionId: string; agreed: string[] }): Promise<boolean> {
  try {
    const res = await fetch("/api/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intent),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── 동의 체크 행 (터치 타깃 ≥44px) ──────────────────────────────────────────
function ConsentRow({
  checked,
  onToggle,
  required,
  label,
  detail,
  linkHref,
  linkLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
  label: string;
  detail?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        aria-label={label}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center"
      >
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] transition-colors ${
            checked ? "border-ink bg-ink" : "border-line bg-transparent"
          }`}
        >
          {checked && (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} className="h-3 w-3 text-bg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      <button type="button" onClick={onToggle} className="min-w-0 flex-1 py-1.5 text-left">
        <p className="text-body leading-snug text-ink">
          <span className={required ? "font-semibold" : ""}>{required ? "(필수) " : "(선택) "}</span>
          {label}
        </p>
        {detail && <p className="mt-0.5 text-aux leading-relaxed text-sub">{detail}</p>}
      </button>

      {linkHref && (
        <Link
          href={linkHref}
          className="shrink-0 self-center whitespace-nowrap text-aux text-sub underline underline-offset-2 active:text-ink"
        >
          {linkLabel ?? "보기"}
        </Link>
      )}
    </div>
  );
}

type Phase = "checking" | "form" | "recording" | "error";

function ConsentInner() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("return_to"));

  const [phase, setPhase] = useState<Phase>("checking");
  const [loggedIn, setLoggedIn] = useState(false);

  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [overseas, setOverseas] = useState(false);
  const [profileOptional, setProfileOptional] = useState(false);

  const startedRef = useRef(false);

  const goReturnTo = useCallback(() => {
    window.location.href = returnTo;
  }, [returnTo]);

  // 담아둔 동의 의사를 서버에 기록(플러시). 성공 시 목적지로, 실패 시 error(fail-closed).
  const flushIntent = useCallback(
    async (intent: { submissionId: string; agreed: string[] }) => {
      setPhase("recording");
      const ok = await recordConsent(intent);
      if (ok) {
        try {
          sessionStorage.removeItem(INTENT_KEY);
        } catch {
          /**/
        }
        goReturnTo();
      } else {
        setPhase("error");
      }
    },
    [goReturnTo],
  );

  // 마운트: 로그인/동의 상태로 분기.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("login_consent_view", { source: "kakao_login_gate" });

    (async () => {
      const me = await fetchMe();
      const authed = Boolean(me?.loggedIn);
      setLoggedIn(authed);

      // 이미 현재버전 동의 보유 → 바로 목적지(할 일 없음).
      if (hasCurrentConsent(me)) {
        goReturnTo();
        return;
      }

      // 카카오 왕복 후 복귀: 로그인됐고 담아둔 의사가 있으면 서버 기록(플러시).
      if (authed) {
        let pending: { submissionId: string; agreed: string[] } | null = null;
        try {
          const raw = sessionStorage.getItem(INTENT_KEY);
          if (raw) pending = JSON.parse(raw);
        } catch {
          pending = null;
        }
        if (pending?.submissionId && Array.isArray(pending.agreed)) {
          await flushIntent(pending);
          return;
        }
      }

      // 그 외(미로그인 / 로그인했지만 새 동의 필요) → 폼 노출.
      setPhase("form");
    })();
  }, [flushIntent, goReturnTo]);

  const allChecked = privacy && terms && overseas && profileOptional;
  const canProceed = privacy && terms && overseas; // 필수 3종

  const toggleAll = () => {
    const next = !allChecked;
    setPrivacy(next);
    setTerms(next);
    setOverseas(next);
    setProfileOptional(next);
  };

  const proceed = () => {
    if (!canProceed || phase === "recording") return;
    const intent = { submissionId: crypto.randomUUID(), agreed: [...REQUIRED_AGREED] };
    try {
      sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
    } catch {
      /**/
    }
    trackEvent("login_consent_agree", { profileOptional });

    if (loggedIn) {
      // 이미 로그인 → 즉시 기록.
      void flushIntent(intent);
    } else {
      // 미로그인 → 카카오로. 로그인 후 이 화면으로 복귀해 플러시한다.
      const back = `/login/consent?return_to=${encodeURIComponent(returnTo)}`;
      window.location.href = `/api/auth/kakao/start?return_to=${encodeURIComponent(back)}`;
    }
  };

  const retryFlush = () => {
    let pending: { submissionId: string; agreed: string[] } | null = null;
    try {
      const raw = sessionStorage.getItem(INTENT_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch {
      pending = null;
    }
    if (pending?.submissionId) void flushIntent(pending);
    else setPhase("form");
  };

  // ── 로딩/기록 중 ──
  if (phase === "checking" || phase === "recording") {
    return (
      <main className="mx-auto flex min-h-screen max-w-[430px] items-center justify-center px-page">
        <p className="text-body text-sub">
          {phase === "recording" ? "동의 내용을 안전하게 기록하고 있어요…" : "확인 중이에요…"}
        </p>
      </main>
    );
  }

  // ── fail-closed 에러 ──
  if (phase === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center gap-5 px-page text-center">
        <div>
          <h1 className="font-serif text-h2 text-ink">잠시 문제가 생겼어요</h1>
          <p className="mt-2 text-body leading-relaxed text-sub">
            동의 내용을 기록하지 못했어요. 잠시 후 다시 시도해 주세요.
            <br />
            (기록이 확인되기 전에는 다음 단계로 넘어가지 않아요.)
          </p>
        </div>
        <button type="button" onClick={retryFlush} className="btn-primary w-full max-w-[320px]">
          다시 시도
        </button>
      </main>
    );
  }

  // ── 동의 폼 ──
  return (
    <main className="mx-auto min-h-screen max-w-[430px] px-page py-8">
      <h1 className="font-serif text-h1 text-ink">로그인 전, 동의가 필요해요</h1>
      <p className="mt-3 text-body leading-relaxed text-sub">
        카카오 로그인으로 진단 결과를 내 계정에 안전하게 보관하고, 다른 기기에서도 이어서 볼 수
        있어요. AI 헤어 합성을 위해 사진이 해외(미국) 서버에서 처리되므로, 아래 항목을 확인하고
        동의해 주세요.
      </p>

      {/* 전체 동의 */}
      <button
        type="button"
        onClick={toggleAll}
        aria-pressed={allChecked}
        className="mt-6 flex min-h-[44px] w-full items-center gap-3 rounded-btn border border-line bg-card px-4 py-3 text-left shadow-soft"
      >
        <span
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
            allChecked ? "border-ink bg-ink" : "border-line bg-transparent"
          }`}
        >
          {allChecked && (
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} className="h-3 w-3 text-bg">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-body font-semibold text-ink">전체 동의</span>
      </button>

      {/* 항목별 동의 */}
      <div className="mt-3">
        <ConsentRow
          required
          checked={privacy}
          onToggle={() => setPrivacy((v) => !v)}
          label="개인정보 수집·이용 동의"
          detail="카카오 회원번호 — 회원 식별·로그인 유지, 진단 결과의 계정 저장·연동에 이용."
          linkHref="/privacy"
          linkLabel="전문 보기"
        />
        <ConsentRow
          required
          checked={terms}
          onToggle={() => setTerms((v) => !v)}
          label="서비스 이용약관 동의"
          linkHref="/terms"
          linkLabel="전문 보기"
        />
        <ConsentRow
          required
          checked={overseas}
          onToggle={() => setOverseas((v) => !v)}
          label="사진의 국외이전에 동의"
          detail="AI 헤어 합성을 위해 사진이 미국(OpenAI) 서버로 이전·처리돼요. 원본 사진은 우리 서버에 저장하지 않고, OpenAI에서는 오·남용 점검을 위해 최대 30일 뒤 삭제됩니다."
          linkHref="/privacy"
          linkLabel="전문 보기"
        />
        <ConsentRow
          checked={profileOptional}
          onToggle={() => setProfileOptional((v) => !v)}
          label="닉네임·프로필 이미지 제공"
          detail="개인화 표시에만 이용해요. 동의하지 않아도 로그인·진단은 그대로 이용할 수 있어요."
        />
        {/* 마케팅 수신 동의는 서버 영속화(1b) 붙을 때 재추가 — lib/consent 주석 참고 */}
      </div>

      <button
        type="button"
        onClick={proceed}
        disabled={!canProceed}
        className="btn-primary mt-7 w-full disabled:opacity-40"
      >
        {loggedIn ? "동의하고 계속하기" : "카카오로 계속하기"}
      </button>
      <Link
        href="/"
        className="mt-3 flex min-h-[44px] items-center justify-center text-aux text-sub active:text-ink"
      >
        취소하고 돌아가기
      </Link>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-screen max-w-[430px] px-page py-8" />}>
      <ConsentInner />
    </Suspense>
  );
}
