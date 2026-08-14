// ============================================================================
// POST /api/hair-transform/status  —  비동기 합성 결과 폴링
// body: { id: string, token: string }  (토큰 URL 노출 방지 위해 GET 대신 POST 본문)
//
// 클라(로딩페이지)가 2.5초 간격으로 호출한다. 서버는 세션+토큰을 검증하고 Replicate 예측을 1회
// 조회해 상태를 돌려준다:
//   - processing/starting  → { ok:false, status:"processing" }         (계속 폴링)
//   - succeeded            → { ok:true, imageUrl }  (결과 바이트를 data URI 로 반환)
//   - failed/canceled/기타 → { ok:false, reason }   (손님에게 재시도 안내)
//
// ★ 2026-08-12 결정: 환불 전면 폐지. 여기서는 어떤 경우에도 환불하지 않는다(멱등/DoS 구멍 소거).
//   청구는 kickoff 의 원자적 예약 1회로 끝났고, 성공이든 실패든 여기서 usage 를 건드리지 않는다.
//   (실패 시 손님 1회 소모의 완충은 일일 한도 7회 상향. 정확한 멱등 환불은 추후 hair_jobs 원장.)
//
// 소유권: (id, 세션 userId) 로 토큰을 재계산해 일치할 때만 조회 → 임의 id 조회(IDOR) 차단.
// 보안: 결과 URL 은 Replicate 호스트 화이트리스트 + redirect 거부(SSRF). 손님 응답엔 원문 오류를
//   싣지 않고 안정된 reason 코드만 준다(원문은 서버 로그에만 — 셀카 파편 유출 차단).
// ============================================================================

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE, verifyUserToken } from "@/lib/userAuth";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { verifyJobToken } from "@/lib/hairJobToken";
import { replicatePredictionUrl, isAllowedReplicateOutputUrl } from "@/lib/hairSynthModel";

// 결과 원본 바이트 상한(data URI 는 ≈1.33배 → Vercel 응답 한도 ~4.5MB 아래로 묶는다).
const MAX_OUTPUT_BYTES = 3_000_000;

const ANON_BIND = "anon";

// 실패 사유 분류(손님 안내용 코드로 좁힌다. 개인정보 미포함).
function classifyReplicateError(errText: string | null): "content_flagged" | "api_error" {
  const t = (errText ?? "").toLowerCase();
  if (
    t.includes("face") || t.includes("no face") || t.includes("detect") ||
    t.includes("nsfw") || t.includes("safety") || t.includes("flagged")
  ) {
    return "content_flagged";
  }
  return "api_error";
}

export async function POST(req: NextRequest) {
  // 1. 세션 시크릿 — ⑧ fail-closed: 없으면 공개상수 서명 없이 기능을 끈다.
  const sessionSecret = process.env.USER_SESSION_SECRET;
  if (!sessionSecret) {
    console.error("[hair-transform/status] USER_SESSION_SECRET 미설정 — fail-closed");
    return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
  }

  // 2. 세션 검증(로그인 게이트 켜져 있으면 필수) + 토큰 바인딩용 userId 확정.
  let bindUserId = ANON_BIND;
  if (isLoginRequiredBeforeSynthesis()) {
    const sessionToken = req.cookies.get(USER_COOKIE)?.value ?? "";
    const session = await verifyUserToken(sessionSecret, sessionToken);
    if (!session) {
      return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
    }
    bindUserId = session.userId;
  }

  // 3. 입력 파싱.
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

  // 4. 소유권 토큰 검증(IDOR 차단).
  const tokenOk = await verifyJobToken(sessionSecret, id, bindUserId, token);
  if (!tokenOk) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 403 });
  }

  // 5. Replicate 예측 1회 조회.
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) {
    return NextResponse.json({ ok: false, reason: "no_token" }, { status: 500 });
  }

  let pred: { status?: string; output?: unknown; error?: unknown };
  try {
    const pr = await fetch(replicatePredictionUrl(id), {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    // ★ pr.ok 검사(회귀 방지): 401/429/500 JSON 이 status="" 로 해석돼 5분 헛폴링하는 것을 막는다.
    //   4xx(404 포함)는 조회 대상이 없거나 인증 문제 → 손님에겐 일시 실패로 안내(폴링 종료).
    if (!pr.ok) {
      const body = await pr.text().catch(() => "");
      console.error("[hair-transform/status] Replicate 조회 HTTP 오류:", pr.status, body.slice(0, 200));
      // 5xx·429 는 일시적 → 계속 폴링, 그 외(401/403/404 등)는 종료(api_error).
      if (pr.status >= 500 || pr.status === 429) {
        return NextResponse.json({ ok: false, status: "processing" });
      }
      return NextResponse.json({ ok: false, reason: "api_error" });
    }
    pred = await pr.json();
  } catch (e) {
    // 네트워크/타임아웃은 일시적 → 계속 폴링(클라 예산 내 재시도).
    console.error("[hair-transform/status] Replicate 조회 예외:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, status: "processing" });
  }

  const status = pred.status ?? "";

  // 5-a. 아직 진행 중 → 계속 폴링.
  if (!["succeeded", "failed", "canceled"].includes(status)) {
    return NextResponse.json({ ok: false, status: "processing" });
  }

  // 5-b. 실패/취소 → 손님에게 재시도 안내(환불 없음).
  if (status !== "succeeded") {
    const errText = pred.error ? (typeof pred.error === "string" ? pred.error : JSON.stringify(pred.error)) : `status=${status}`;
    const reason = classifyReplicateError(errText);
    console.error("[hair-transform/status] Replicate 실패:", status, errText.slice(0, 200));
    return NextResponse.json({ ok: false, reason });
  }

  // 5-c. 성공 → 결과 바이트를 받아 data URI 로 반환(서버 미저장).
  const outputUrl = Array.isArray(pred.output) ? (pred.output[0] as string | undefined) : (pred.output as string | undefined);
  if (!outputUrl || typeof outputUrl !== "string") {
    // ③ output 누락 = 명확한 실패로 손님에게 재시도 안내.
    console.error("[hair-transform/status] 성공인데 output 누락:", JSON.stringify(pred.output).slice(0, 200));
    return NextResponse.json({ ok: false, reason: "no_output" });
  }
  if (!isAllowedReplicateOutputUrl(outputUrl)) {
    console.error("[hair-transform/status] 허용되지 않은 출력 호스트:", outputUrl.slice(0, 120));
    return NextResponse.json({ ok: false, reason: "no_output" });
  }
  try {
    // ⑦ redirect:"manual" — 화이트리스트 통과한 URL 이 타 호스트로 302 우회하는 SSRF 차단.
    const outRes = await fetch(outputUrl, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15_000) });
    if (outRes.status >= 300 && outRes.status < 400) {
      console.error("[hair-transform/status] 출력 URL redirect 거부:", outRes.status);
      return NextResponse.json({ ok: false, reason: "no_output" });
    }
    if (!outRes.ok) {
      // ③ 4xx(404/410/401/403 등 영구)는 재폴링해도 안 바뀌므로 즉시 실패 종료(5분 헛폴링 방지).
      //   5xx·429(일시)만 "processing" 으로 재시도 유도.
      console.error("[hair-transform/status] 출력 fetch HTTP 오류:", outRes.status);
      if (outRes.status >= 500 || outRes.status === 429) {
        return NextResponse.json({ ok: false, status: "processing" });
      }
      return NextResponse.json({ ok: false, reason: "no_output" });
    }
    const outMime = outRes.headers.get("content-type") ?? (outputUrl.endsWith(".png") ? "image/png" : "image/jpeg");
    if (!outMime.startsWith("image/")) {
      console.error("[hair-transform/status] 출력 content-type 비이미지:", outMime.slice(0, 60));
      return NextResponse.json({ ok: false, reason: "no_output" });
    }
    // 다운로드 전 Content-Length 사전 체크(있을 때) — 과대 응답을 바디 읽기 전에 컷.
    const clen = Number(outRes.headers.get("content-length") ?? "");
    if (Number.isFinite(clen) && clen > MAX_OUTPUT_BYTES) {
      console.error("[hair-transform/status] 결과 이미지 과대(content-length):", clen);
      return NextResponse.json({ ok: false, reason: "no_output" });
    }
    const outAb = await outRes.arrayBuffer();
    if (outAb.byteLength > MAX_OUTPUT_BYTES) {
      // ③ 3MB 초과 = 명확한 실패로 손님에게 재시도 안내(응답 한도 보호).
      console.error("[hair-transform/status] 결과 이미지 과대:", outAb.byteLength);
      return NextResponse.json({ ok: false, reason: "no_output" });
    }
    const imageUrl = `data:${outMime};base64,${Buffer.from(outAb).toString("base64")}`;
    console.log("[hair-transform/status] ✅ 결과 반환");
    return NextResponse.json({ ok: true, imageUrl });
  } catch (e) {
    // 네트워크/타임아웃 등 일시적 수신 실패 → "processing" 으로 재폴링 유도(출력 URL 은 그대로라 다음
    //   폴에서 성공 가능). 끝내 회수 못 하면 클라 8분 타임아웃이 마무리한다.
    console.error("[hair-transform/status] 결과 수신 예외(재폴링 유도):", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, status: "processing" });
  }
}
