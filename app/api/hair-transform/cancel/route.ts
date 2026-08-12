// ============================================================================
// POST /api/hair-transform/cancel  —  초장기 콜드스타트 타임아웃 시 비용 중단
// body: { id: string, token: string }
//
// 클라가 5분 폴링 예산을 소진했는데도 예측이 안 끝나면 호출한다. 서버는 세션+토큰을 검증하고
// Replicate 예측을 취소해 방치된 GPU 작업 비용만 막는다.
//
// ★ 2026-08-12 결정: 환불하지 않는다(멱등/DoS 구멍 소거). 취소는 순수하게 "비용 중단" 목적이며,
//   취소가 실패해도 앱은 정상 진행한다(best-effort). 손님은 결과지에서 "다시 눌러주세요" 안내를 받는다.
// ============================================================================

export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE, verifyUserToken } from "@/lib/userAuth";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { verifyJobToken } from "@/lib/hairJobToken";
import { replicateCancelUrl } from "@/lib/hairSynthModel";

const ANON_BIND = "anon";

export async function POST(req: NextRequest) {
  // ⑧ fail-closed: 시크릿 없으면 공개상수 서명 없이 기능을 끈다.
  const sessionSecret = process.env.USER_SESSION_SECRET;
  if (!sessionSecret) {
    return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
  }

  let bindUserId = ANON_BIND;
  if (isLoginRequiredBeforeSynthesis()) {
    const sessionToken = req.cookies.get(USER_COOKIE)?.value ?? "";
    const session = await verifyUserToken(sessionSecret, sessionToken);
    if (!session) {
      return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
    }
    bindUserId = session.userId;
  }

  let id: string;
  let token: string;
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    token = String(body.token ?? "");
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!id || !token) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const tokenOk = await verifyJobToken(sessionSecret, id, bindUserId, token);
  if (!tokenOk) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 403 });
  }

  // 예측 취소(best-effort). 실패해도 무시하고 ok — 환불은 하지 않는다.
  const key = process.env.REPLICATE_API_TOKEN;
  if (key) {
    try {
      const res = await fetch(replicateCancelUrl(id), {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) console.log("[hair-transform/cancel] 타임아웃 예측 취소 요청 성공");
      else console.error("[hair-transform/cancel] 취소 응답 비정상(무시):", res.status);
    } catch (e) {
      console.error("[hair-transform/cancel] 취소 요청 실패(무시):", e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({ ok: true });
}
