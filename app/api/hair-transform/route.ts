// ============================================================================
// POST /api/hair-transform  —  비동기 합성 "착수(kickoff)" 라우트
// 손님 셀카 + 레퍼런스 헤어사진 → Replicate faceswap 예측을 "생성만" 하고 즉시 반환한다.
// 결과 대기는 클라가 /api/hair-transform/status 를 폴링해서 받는다.
//
// (2026-08-12 개정: GPU 콜드스타트 큐가 3~4.5분이라 동기대기(Prefer:wait, maxDuration 60s)로는
//  식은 날 첫 요청이 100% 타임아웃 실패했다. → 동기대기 폐기, "예측 생성→클라 폴링" 비동기 구조로
//  전환. 서버 함수는 예측 생성까지만(수 초) 열려 있어 Vercel 실행시간 상한과 무관해진다.)
//
// 과금(예약, 환불 없음): 여기서 bump_hair_usage 로 "예약(선차감)"한다 — 원자적 예약이라 생성 상한
//   역할을 하고, kickoff 당 1회 차감이다. ★ 2026-08-12 결정: 환불을 전면 폐지한다. status·cancel·
//   POST 어디서도 환불하지 않는다. 근거: 비동기에선 터미널 상태를 클라만 관측 → 어떤 환불도 클라가
//   토큰으로 반복 트리거 가능(멱등 불가·무한 재사용 악용). 환불을 없애면 그 구멍이 원천 소거된다.
//   ⚠️ 잔여 리스크(알려진·수용): kickoff 응답 유실·탭 종료 등으로 클라가 id 를 못 받으면 재시도 시
//   또 한 번 차감될 수 있다(서버 idempotency key/원장이 없어 "시도당 정확히 1회"는 보장 못 함).
//   방향이 "손님이 1회 더 소모"(자기 불리·악용 아님)라 심각도 낮고, 일일 한도 7회 상향으로 완충.
//   정확한 멱등(청구·환불)은 손님 유입·결제 붙일 때 hair_jobs 원장으로 도입한다.
//
// 소유권 바인딩: (predictionId, userId) HMAC 토큰을 함께 반환한다. status·cancel 은 세션 userId 로
//   토큰을 재계산해 일치할 때만 처리 → 임의 id 조회(IDOR) 차단. (lib/hairJobToken.ts)
//
// 입력 순서 고정: swap_image=손님 셀카(넣을 얼굴) / input_image=레퍼런스 헤어(장면).
//   ★ 뒤바뀌면 엉뚱한 결과. 셀카는 우리 서버/Blob 에 저장하지 않고 예측 생성 요청에 data URI 로만 실어 보낸다.
// ============================================================================

export const maxDuration = 30; // 예측 "생성"까지만(레퍼런스 fetch + create). 결과 대기는 클라 폴링.

import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_REFERENCE_PATH } from "@/lib/styleReference";
import { resolveReference, buildReferenceUrl } from "@/lib/referencePick";
import type { StyleAnswers } from "@/app/style/surveyData";
import { USER_COOKIE, verifyUserToken } from "@/lib/userAuth";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { hasCurrentOverseasConsent } from "@/lib/consentServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { issueJobToken } from "@/lib/hairJobToken";
import {
  HAIRSYNTH_MODEL,
  HAIRSYNTH_MODEL_VERSION,
  HAIRSYNTH_ENHANCE,
  REPLICATE_PREDICTIONS_ENDPOINT,
} from "@/lib/hairSynthModel";

// 서버측 일일 호출 제한(유저당). 클라 표시(3회)보다 여유를 둔다.
// 2026-08-12: 환불 전면 폐지(멱등/DoS 구멍 소거)의 보상으로 5→7 상향 — 실패로 1회 손해봐도
//   6회가 남아 손님이 아프지 않게 한다(상수만 변경, SQL 불필요).
const SERVER_DAILY_MAX = 7;

// 셀카 바이트 상한(과대 입력 차단).
const MAX_SELFIE_BYTES = 20_000_000;

// 로그인 게이트가 꺼져 있을 때(개발/비활성) 토큰 바인딩에 쓸 대체 userId.
const ANON_BIND = "anon";

// ─── 레퍼런스(공개 자산) 절대 URL의 origin ────────────────────────────────────
const PUBLIC_ASSET_ORIGIN = "https://hair-dna.vercel.app"; // 공개 alias(배포보호 없음). 비밀 아님. NEXT_PUBLIC_SITE_URL 미설정 시 폴백.

function getAssetBaseUrl(req: NextRequest): string {
  // 레퍼런스 자산은 공개 alias origin에서 서버가 fetch한다. ★ VERCEL_URL(자동 배포도메인)은 배포보호(SSO)
  //   302가 걸려 자산 fetch가 깨질 수 있어 절대 쓰지 않는다. 공개 alias를 NEXT_PUBLIC_SITE_URL로
  //   오버라이드(권장), 미설정 시 고정 공개 alias로 폴백.
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (publicSite) return publicSite;
  if (process.env.VERCEL) return PUBLIC_ASSET_ORIGIN;
  return req.nextUrl.origin; // 로컬 개발
}

// ─── 레퍼런스 이미지 픽 + 폴백 (빌드타임 manifest 기반, 런타임 fs 없음) ──────────
function pickReferenceUrl(
  answers: StyleAnswers,
  baseUrl: string,
): { url: string; isDefault: boolean; slot: string; isFallback: boolean } {
  const res = resolveReference(answers);
  if (!res) {
    const url = `${baseUrl.replace(/\/$/, "")}${DEFAULT_REFERENCE_PATH}`;
    console.warn("[hair-transform] ⚠️ 매칭 슬롯·폴백 모두 없음 → default_style.jpg 폴백");
    return { url, isDefault: true, slot: "", isFallback: true };
  }
  const file = res.files[Math.floor(Math.random() * res.files.length)]!;
  const url = buildReferenceUrl(baseUrl, res.slot, file);
  console.log(`[hair-transform] ✅ 레퍼런스 픽: ${res.slot}/${file}${res.isFallback ? " (폴백)" : ""}`);
  return { url, isDefault: false, slot: res.slot, isFallback: res.isFallback };
}

// ─── base64 Data URI 정규화 ───────────────────────────────────────────────────
function normalizeBase64(raw: string): string {
  if (raw.startsWith("data:image/") && raw.includes(";base64,")) return raw;
  if (raw.startsWith("data:")) {
    const b64 = raw.includes(",") ? raw.split(",")[1]! : raw.replace(/^data:[^,]*,?/, "");
    return `data:image/jpeg;base64,${b64}`;
  }
  return `data:image/jpeg;base64,${raw}`;
}
function base64ByteLength(dataUri: string): number {
  const m = /^data:[^;]+;base64,([\s\S]*)$/.exec(dataUri);
  const b64 = m ? m[1]! : dataUri;
  return Math.floor((b64.length * 3) / 4);
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 실행 예산 ── 예측 "생성"까지만 쓰므로 여유가 크다(레퍼런스 fetch + create). 결과 대기는 클라 폴링.
  const HANDLER_START = Date.now();
  const hardDeadline = HANDLER_START + (maxDuration * 1_000 - 4_000);
  const budgetLeft = () => hardDeadline - Date.now();

  // ── 토큰 바인딩용 userId(로그인 시 실제 uuid). 환불은 하지 않으므로 예약 상태 추적 변수는 없다. ──
  let bindUserId = ANON_BIND;

  // ── 서버측 로그인 게이트 + 동의 게이트 + 일일 호출 제한 ──
  if (isLoginRequiredBeforeSynthesis()) {
    const sessionSecret = process.env.USER_SESSION_SECRET;
    const sessionToken = req.cookies.get(USER_COOKIE)?.value ?? "";
    const session = sessionSecret ? await verifyUserToken(sessionSecret, sessionToken) : null;
    if (!session) {
      return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
    }
    bindUserId = session.userId;

    // 동의 게이트(§13, fail-CLOSED) — 얼굴 국외이전 前, 현재 방침버전 동의 보유 재검증.
    const overseasOk = await hasCurrentOverseasConsent(session.userId);
    if (!overseasOk) {
      return NextResponse.json({ ok: false, reason: "consent_required" }, { status: 403 });
    }

    // 서버측 일일 호출 제한 — userId 기준, 원자적 RPC(bump_hair_usage). 이 예약이 곧 생성 상한이다.
    try {
      const { data, error } = await supabaseAdmin.rpc("bump_hair_usage", {
        p_user_id: session.userId,
        p_max: SERVER_DAILY_MAX,
      });
      if (error) {
        console.error("[hair-transform] 일일제한 RPC 오류(제한 미적용):", error.message);
      } else if (data === -1) {
        return NextResponse.json(
          {
            ok: false,
            reason: "daily_limit",
            message: `오늘 무료 ${SERVER_DAILY_MAX}회를 모두 사용했어요. 내일 다시 만나요.`,
          },
          { status: 429 },
        );
      }
      // data>0(정상 증가)은 예약 성공 — 별도 상태 추적 불필요(환불 없음).
    } catch (e) {
      console.error("[hair-transform] 일일제한 예외(제한 미적용):", e instanceof Error ? e.message : String(e));
    }
  }

  // 환불이 없으므로 finally-환불 래퍼도 없다. 일반 try/catch 로 예외만 안전 처리한다.
  try {
    // 1. API 토큰 하드 체크
    const key = process.env.REPLICATE_API_TOKEN;
    if (!key) {
      console.error("[hair-transform] REPLICATE_API_TOKEN 미설정");
      return NextResponse.json({ ok: false, reason: "no_token" }, { status: 500 });
    }

    // 세션 시크릿(토큰 서명용) — ⑧ fail-closed: 없으면 "no-secret" 공개상수로 서명하지 않고 기능을 끈다.
    //   (게이트 on/off 무관 필수. 공개상수 서명은 누구나 토큰 위조 가능 → 임의 id status/cancel 허용.)
    const sessionSecret = process.env.USER_SESSION_SECRET;
    if (!sessionSecret) {
      console.error("[hair-transform] USER_SESSION_SECRET 미설정 — fail-closed");
      return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
    }

    // 2. 요청 파싱
    let userPhoto: string;
    let answers: StyleAnswers;
    try {
      const body = await req.json();
      userPhoto = body.userPhoto as string;
      answers = (body.answers ?? {}) as StyleAnswers;
    } catch {
      return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
    }
    if (!userPhoto) {
      return NextResponse.json({ ok: false, reason: "missing_photo" }, { status: 400 });
    }
    if (userPhoto.startsWith("blob:") || userPhoto.startsWith("http:")) {
      // 원문(받은 값)은 서버 로그에만. 손님 응답엔 reason 만.
      console.error("[hair-transform] userPhoto 포맷 오류(blob:/http:):", userPhoto.slice(0, 80));
      return NextResponse.json({ ok: false, reason: "invalid_photo_format" }, { status: 400 });
    }

    // ★ 셀카는 서버/Blob 에 저장하지 않는다. data URI 로 정규화해 이 요청 안에서만 Replicate 로 보낸다.
    const selfieDataUri = normalizeBase64(userPhoto);
    const selfieBytes = base64ByteLength(selfieDataUri);
    if (selfieBytes === 0 || selfieBytes > MAX_SELFIE_BYTES) {
      console.error("[hair-transform] 셀카 크기 이상:", selfieBytes);
      return NextResponse.json({ ok: false, reason: "invalid_photo_format" }, { status: 400 });
    }
    console.log(`[hair-transform] 셀카 수신(${selfieBytes}B) — 서버 미저장, 이 요청에만 사용`);

    // 3. 레퍼런스 헤어 이미지 → data URI (공개 URL에서 fetch)
    const baseUrl = getAssetBaseUrl(req);
    const reference = pickReferenceUrl(answers, baseUrl);
    let refDataUri: string;
    try {
      const rr = await fetch(reference.url, {
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(15_000, budgetLeft()))),
      });
      if (!rr.ok) throw new Error(`ref HTTP ${rr.status}`);
      const refAb = await rr.arrayBuffer();
      const refMime = rr.headers.get("content-type") ?? (reference.url.endsWith(".png") ? "image/png" : "image/jpeg");
      refDataUri = `data:${refMime};base64,${Buffer.from(refAb).toString("base64")}`;
    } catch (refErr) {
      // ⑥ 원문(URL·원격 응답)은 서버 로그에만. 손님 응답엔 안정된 reason 코드만.
      const msg = refErr instanceof Error ? refErr.message : String(refErr);
      console.error("[hair-transform] ❌ 레퍼런스 가져오기 실패:", reference.url, msg);
      return NextResponse.json({ ok: false, reason: "reference_fetch_failed" });
    }

    console.log(`[hair-transform] → ${HAIRSYNTH_MODEL} · enhance=${HAIRSYNTH_ENHANCE} | ref ${reference.slot}${reference.isFallback ? "(폴백)" : ""}${reference.isDefault ? "(default)" : ""}`);

    // 4. Replicate 예측 "생성"만 한다(Prefer:wait 없음). 완료 대기는 클라가 status 폴링.
    if (budgetLeft() <= 2_000) {
      return NextResponse.json({ ok: false, reason: "poll_timeout" });
    }

    let pred: { id?: string; status?: string; error?: unknown };
    try {
      const createRes = await fetch(REPLICATE_PREDICTIONS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          // ★ Prefer:wait 제거 — 즉시 예측 객체(status=starting)를 받고 반환한다.
        },
        body: JSON.stringify({
          version: HAIRSYNTH_MODEL_VERSION,
          input: { swap_image: selfieDataUri, input_image: refDataUri, enhance: HAIRSYNTH_ENHANCE },
        }),
        signal: AbortSignal.timeout(Math.max(1_000, budgetLeft())),
      });
      if (!createRes.ok) {
        // ⑥ 원격 응답 본문(입력 파라미터·data URI 일부를 되돌려줄 수 있음)은 손님에게 보내지 않는다.
        const t = await createRes.text().catch(() => "");
        console.error("[hair-transform] Replicate 생성 HTTP 오류:", createRes.status, t.slice(0, 300));
        const reason = createRes.status === 401 || createRes.status === 403 ? "no_token" : "api_error";
        return NextResponse.json({ ok: false, reason });
      }
      pred = await createRes.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const reason = e instanceof Error && e.name === "TimeoutError" ? "poll_timeout" : "api_error";
      console.error("[hair-transform] Replicate 생성 실패:", reason, msg);
      return NextResponse.json({ ok: false, reason });
    }

    const predId = pred.id;
    if (!predId || typeof predId !== "string") {
      const errText = pred.error ? JSON.stringify(pred.error) : `status=${pred.status}`;
      console.error("[hair-transform] 예측 id 없음:", errText.slice(0, 300));
      return NextResponse.json({ ok: false, reason: "api_error" });
    }

    // 5. 소유권 바인딩 토큰 발급 후 즉시 반환(예약 유지, 환불 없음).
    const token = await issueJobToken(sessionSecret, predId, bindUserId);
    console.log(`[hair-transform] ✅ 예측 생성: ${predId} (status=${pred.status}) — 클라 폴링 대기`);
    return NextResponse.json({ ok: true, id: predId, token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const reason = e instanceof Error && e.name === "TimeoutError" ? "poll_timeout" : "exception";
    console.error("[hair-transform] 예외:", reason, msg);
    return NextResponse.json({ ok: false, reason });
  }
}
