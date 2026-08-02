// ============================================================================
// POST /api/consents — 동의 기록(append-only, user_consents)
//
// §6 서버 권위 경계(클라 값 신뢰 금지):
//   - user_id        : 서버(세션 쿠키에서만). 본문 값 무시.
//   - policy_version : 서버(CONSENT_POLICY_VERSION 상수).
//   - granted_at     : 서버(DB now() 기본값).
//   - consent_type   : 서버 화이트리스트 검증(미등록 → 400).
//   - granted(필수)  : 서버 — 필수(REQUIRED)가 전부 포함되지 않으면 요청 거부. 통과 시 true 고정.
//   클라는 "어떤 항목에 동의했는가"의 목록(agreed)만 보낸다.
//
// 멱등: (user_id, submission_id, consent_type) UNIQUE. 같은 유저의 재시도 제출도 유형별 1행.
// fail-closed: insert 실패 → 500. 호출측(동의화면)이 로그인/업로드 진입을 막는다.
//
// 보안: RLS deny-all 위에서 service_role(supabaseAdmin)로만 기록. 이 라우트 밖 사용 금지.
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUserId } from "@/lib/userSession";
import {
  CONSENT_POLICY_VERSION,
  REQUIRED_CONSENT_TYPES,
  isConsentType,
  type ConsentType,
} from "@/lib/consent";

// 본문 폭주 방지(작은 JSON만 허용).
const MAX_BODY_BYTES = 4_000;
// submission_id 형식 가드(uuid v4 정도의 형태만 허용 — 임의 문자열로 인덱스 오염 방지).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  // 1) 신원: 세션 쿠키에서만. 미로그인이면 기록 불가(동의는 계정에 묶인다).
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  // 2) 본문 파싱(크기 상한).
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "payload_too_large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const submissionId = (body as { submissionId?: unknown })?.submissionId;
  const agreedRaw = (body as { agreed?: unknown })?.agreed;

  if (typeof submissionId !== "string" || !UUID_RE.test(submissionId)) {
    return NextResponse.json({ ok: false, reason: "invalid_submission_id" }, { status: 400 });
  }
  if (!Array.isArray(agreedRaw)) {
    return NextResponse.json({ ok: false, reason: "invalid_agreed" }, { status: 400 });
  }

  // 3) 화이트리스트 검증 + 중복 제거. 미등록 유형이 하나라도 있으면 거부.
  const agreedSet = new Set<ConsentType>();
  for (const v of agreedRaw) {
    if (!isConsentType(v)) {
      return NextResponse.json({ ok: false, reason: "unknown_consent_type" }, { status: 400 });
    }
    agreedSet.add(v);
  }

  // 4) 필수 충족 판정(서버). 필수가 전부 포함되지 않으면 요청 자체를 거부.
  const missing = REQUIRED_CONSENT_TYPES.filter((t) => !agreedSet.has(t));
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, reason: "required_consents_missing", missing },
      { status: 400 },
    );
  }

  // 5) 서버 권위 필드로 행 구성(granted=true 고정). 정황: user-agent(IP는 저장 안 함).
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 1000) || null;
  const rows = Array.from(agreedSet).map((consent_type) => ({
    user_id: userId,
    consent_type,
    granted: true,
    policy_version: CONSENT_POLICY_VERSION,
    submission_id: submissionId,
    user_agent: userAgent,
  }));

  // 6) 멱등 기록. (submission_id, consent_type) 충돌은 무시(재시도 안전).
  try {
    const { error } = await supabaseAdmin
      .from("user_consents")
      // onConflict는 UNIQUE(user_id, submission_id, consent_type)와 일치해야 한다 —
      // user_id를 빼면 타 유저의 같은 submission_id 재사용 시 기록이 조용히 누락된다(Codex).
      .upsert(rows, { onConflict: "user_id,submission_id,consent_type", ignoreDuplicates: true });
    if (error) throw error;
  } catch (err) {
    // fail-closed: 기록 실패는 동의 성립으로 처리하지 않는다.
    console.error("[/api/consents] insert 실패:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, policyVersion: CONSENT_POLICY_VERSION });
}
