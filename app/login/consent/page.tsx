"use client";

// ============================================================================
// /login/consent — 카카오 로그인 전 개인정보 수집·이용 동의 화면 (A-6, 단계 1)
//
// 로그인은 이미 서버사이드 OAuth로 라이브 강제 중이나(loginGate ON), 로그인 시점의
// 앱 자체 동의 UI가 없어 이 화면을 삽입한다. /style/loading의 로그인 트리거가
// /api/auth/kakao/start 로 직행하던 것을 이 화면을 경유하도록 바꾼다.
//   · 필수 2종(개인정보 수집·이용 / 이용약관) 동의해야만 "카카오로 계속하기" 활성.
//   · 선택 2종(닉네임·프로필 제공 / 마케팅)은 미동의여도 진행 가능.
//   · 동의 후 원래 return_to를 그대로 물고 /api/auth/kakao/start 로 이동.
//
// ⚠️ 범위(이번 패스): 프론트 게이트만. 동의 값의 서버 영속화(marketing_consent 등)와
//    서버측 강제는 auth 콜백·DB 변경(§3 Codex·§4 사업주 SQL)이 필요한 후속(1b)이다.
// ⚠️ 법적 문구는 초안 — 사업주/법률 검토 전. 실서비스 오픈 전 확정 필요.
// ============================================================================

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "../../../lib/trackEvent";

const DEFAULT_RETURN = "/style/loading";

// 내부 경로만 허용(오픈 리다이렉트 차단). 서버 sanitizeReturnTo가 2차 방어.
function safeReturnTo(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return DEFAULT_RETURN;
  return v;
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
          <span className={required ? "font-semibold" : ""}>
            {required ? "(필수) " : "(선택) "}
          </span>
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

function ConsentInner() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("return_to"));

  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [profileOptional, setProfileOptional] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    trackEvent("login_consent_view", { source: "kakao_login_gate" });
  }, []);

  const allChecked = privacy && terms && profileOptional && marketing;
  const canProceed = privacy && terms; // 필수 2종

  const toggleAll = () => {
    const next = !allChecked;
    setPrivacy(next);
    setTerms(next);
    setProfileOptional(next);
    setMarketing(next);
  };

  const proceed = () => {
    if (!canProceed) return;
    // 동의 표식(선택 포함) — 서버 영속화는 후속(1b). 지금은 게이트 목적.
    try {
      sessionStorage.setItem(
        "abeauty:consent",
        JSON.stringify({ privacy, terms, profileOptional, marketing, at: Date.now() }),
      );
    } catch {
      /**/
    }
    trackEvent("login_consent_agree", { profileOptional, marketing });
    window.location.href = `/api/auth/kakao/start?return_to=${encodeURIComponent(returnTo)}`;
  };

  return (
    <main className="mx-auto min-h-screen max-w-[430px] px-page py-8">
      <div className="rounded-btn border border-line bg-soft px-4 py-3 text-aux font-medium text-sub">
        초안 — 사업주·법률 검토 전입니다. 동의 문안은 확정 후 반영됩니다.
      </div>

      <h1 className="mt-7 font-serif text-h1 text-ink">로그인 전, 동의가 필요해요</h1>
      <p className="mt-3 text-body leading-relaxed text-sub">
        카카오 로그인으로 진단 결과를 내 계정에 안전하게 보관하고, 다른 기기에서도 이어서
        볼 수 있어요. 아래 항목을 확인하고 동의해 주세요.
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
          checked={profileOptional}
          onToggle={() => setProfileOptional((v) => !v)}
          label="닉네임·프로필 이미지 제공"
          detail="개인화 표시(예: 화면에 닉네임)에만 이용해요. 동의하지 않아도 로그인·진단은 그대로 이용할 수 있어요."
        />
        <ConsentRow
          checked={marketing}
          onToggle={() => setMarketing((v) => !v)}
          label="마케팅 정보 수신"
          detail="새 기능·혜택 소식을 받아볼 수 있어요. 언제든 해지할 수 있어요."
        />
      </div>

      <button
        type="button"
        onClick={proceed}
        disabled={!canProceed}
        className="btn-primary mt-7 w-full disabled:opacity-40"
      >
        카카오로 계속하기
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
