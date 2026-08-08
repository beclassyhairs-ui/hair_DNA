// ============================================================================
// POST /api/hair-transform
// 손님 셀카 + 레퍼런스 헤어사진 → Replicate faceswap으로 "얼굴 유지 + 머리만 교체"
//
// (2026-08-07 개정: OpenAI gpt-image 폐기 → Replicate ddvinh1/face-swap-gpu(enhance=false).
//  모델·버전·파라미터는 lib/hairSynthModel.ts 단일출처. faceswap은 프롬프트를 받지 않으며
//  레퍼런스 헤어 픽셀이 그대로 반영된다. ★ 셀카를 우리 인프라(Vercel Blob)에 저장하지 않고,
//  요청에 data URI로만 실어 Replicate로 전송한다 → "서버 미저장" 유지, orphan 갭 없음.)
//
// 입력 순서 고정: swap_image=손님 셀카(넣을 얼굴) / input_image=레퍼런스 헤어(장면).
//   ★ swap_image=얼굴, input_image=장면. 뒤바뀌면 엉뚱한 결과가 나온다.
//
// 환경변수:
//   REPLICATE_API_TOKEN   — 필수
//   NEXT_PUBLIC_SITE_URL  — 선택(레퍼런스 자산 origin 오버라이드)
// ============================================================================

export const maxDuration = 60; // Node.js 런타임

import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_REFERENCE_PATH } from "@/lib/styleReference";
import { resolveReference, buildReferenceUrl } from "@/lib/referencePick";
import type { StyleAnswers } from "@/app/style/surveyData";
import { USER_COOKIE, verifyUserToken } from "@/lib/userAuth";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { hasCurrentOverseasConsent } from "@/lib/consentServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HAIRSYNTH_MODEL,
  HAIRSYNTH_MODEL_VERSION,
  HAIRSYNTH_ENHANCE,
  REPLICATE_PREDICTIONS_ENDPOINT,
} from "@/lib/hairSynthModel";

// 서버측 일일 호출 제한(유저당). 클라 표시(3회)보다 여유를 둬 정상 재시도를 막지 않는다.
// 조정은 이 상수 하나로. 실제 강제는 Supabase RPC bump_hair_usage가 원자적으로 수행한다.
const SERVER_DAILY_MAX = 5;

// 셀카 바이트 상한(과대 입력 차단). 클라 캡처 셀카는 수백 KB라 넉넉한 상한.
const MAX_SELFIE_BYTES = 20_000_000;

// 결과 이미지 원본 바이트 상한. data URI(≈1.33배)로 응답하므로 Vercel 응답 한도(~4.5MB) 아래로 묶는다.
const MAX_OUTPUT_BYTES = 3_000_000;

// ─── 레퍼런스(공개 자산) 절대 URL의 origin ────────────────────────────────────
// 레퍼런스는 우리 도메인의 공개 이미지를 서버가 fetch해 Replicate에 data URI로 넘긴다. 배포환경
// 에서는 배포보호(SSO) 걸린 배포도메인 대신 공개 alias를 고정 origin으로 쓴다(과거 302 장애 재발방지).
const PUBLIC_ASSET_ORIGIN = "https://hair-dna.vercel.app"; // 공개 alias(배포보호 없음). 비밀 아님.

function getAssetBaseUrl(req: NextRequest): string {
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
// data URI의 base64 부분 바이트 길이(대략) — 과대 입력 차단용.
function base64ByteLength(dataUri: string): number {
  const m = /^data:[^;]+;base64,([\s\S]*)$/.exec(dataUri);
  const b64 = m ? m[1]! : dataUri;
  return Math.floor((b64.length * 3) / 4);
}

// ─── Replicate 실패 사유 분류 (손님 안내용 코드로 좁힌다. 개인정보는 안 싣는다.) ──
//   content_flagged — 얼굴 미검출·안전필터(NSFW) 등 "다른 사진으로" 안내가 맞는 경우
//   api_error       — 그 외(레이트리밋·서버오류 등) → "잠시 후 다시"
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

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 실행 예산 ── ★ 핸들러 첫 줄에서 잡는다(로그인·동의조회·bump 지연까지 포함해 maxDuration을
  //   넘기지 않게 — Codex 지적). 응답 여유(5s)만 남기고 나머지를 레퍼런스 fetch·Replicate 호출이 공유.
  const HANDLER_START = Date.now();
  const hardDeadline = HANDLER_START + (maxDuration * 1_000 - 5_000); // ≈ 55s
  const budgetLeft = () => hardDeadline - Date.now();

  // ── C-2: 실패 시 미차감 (예약→성공확정/실패환불) ────────────────────────────
  let chargedUserId: string | null = null;
  let succeeded = false;

  // ── 서버측 로그인 게이트 + 일일 호출 제한 (앞문 /style/loading 게이트와 동일 기준) ──
  // 클라 흐름을 우회한 무인증/과다 직접 호출을 서버에서 차단. KAKAO_LOGIN_ENABLED를 끄면 함께 꺼진다.
  if (isLoginRequiredBeforeSynthesis()) {
    const sessionSecret = process.env.USER_SESSION_SECRET;
    const sessionToken = req.cookies.get(USER_COOKIE)?.value ?? "";
    const session = sessionSecret ? await verifyUserToken(sessionSecret, sessionToken) : null;
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: "login_required", debugError: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // ── 동의 게이트(§13, fail-CLOSED) — 로그인 확인 뒤, 비용(일일한도) 발생 前 ──
    // 얼굴 사진의 국외이전(미국 Replicate) 처리 前, 현재 방침버전 국외이전 동의 보유를 서버에서 재검증.
    // 미동의는 물론, 동의 조회 자체가 실패해도 403(조회 실패를 통과로 처리하면 그게 우회로가 된다).
    const overseasOk = await hasCurrentOverseasConsent(session.userId);
    if (!overseasOk) {
      return NextResponse.json(
        { ok: false, reason: "consent_required", debugError: "국외이전 동의가 필요합니다." },
        { status: 403 },
      );
    }

    // 서버측 일일 호출 제한 — userId 기준, 원자적 RPC(bump_hair_usage). 클라 우회 불가.
    // 함수 미생성/RPC 오류 시 fail-open(제한만 미적용, 로그인 게이트는 유지).
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
            debugError: "daily limit exceeded",
          },
          { status: 429 },
        );
      } else if (typeof data === "number" && data > 0) {
        chargedUserId = session.userId; // 실제 증가(1..max)일 때만 선차감 인정(실패 시 환불).
      }
    } catch (e) {
      console.error("[hair-transform] 일일제한 예외(제한 미적용):", e instanceof Error ? e.message : String(e));
    }
  }

  // ★ 차감(bump) 이후의 모든 경로를 하나의 try/finally로 감싼다 → 키누락·파싱실패·포맷오류·예외 등
  //   어떤 실패로 빠져나가도 finally가 환불한다(Codex 지적: 차감 후 환불 누락 경로 제거).
  try {
    // 1. API 토큰 하드 체크
    const key = process.env.REPLICATE_API_TOKEN;
    if (!key) {
      const msg = "REPLICATE_API_TOKEN이 환경변수에 없습니다. Vercel 대시보드 또는 .env.local을 확인하세요.";
      console.error("[hair-transform]", msg);
      return NextResponse.json({ ok: false, reason: "no_token", debugError: msg }, { status: 500 });
    }

    // 2. 요청 파싱
    let userPhoto: string;
    let answers: StyleAnswers;
    try {
      const body = await req.json();
      userPhoto = body.userPhoto as string;
      answers = (body.answers ?? {}) as StyleAnswers;
    } catch {
      return NextResponse.json({ ok: false, reason: "bad_request", debugError: "요청 JSON 파싱 실패" }, { status: 400 });
    }
    if (!userPhoto) {
      return NextResponse.json({ ok: false, reason: "missing_photo", debugError: "userPhoto 필드가 비어 있습니다" }, { status: 400 });
    }
    if (userPhoto.startsWith("blob:") || userPhoto.startsWith("http:")) {
      const msg = `userPhoto 포맷 오류 — blob:/http: URL은 처리 불가. 받은 값: "${userPhoto.slice(0, 80)}"`;
      console.error("[hair-transform]", msg);
      return NextResponse.json({ ok: false, reason: "invalid_photo_format", debugError: msg }, { status: 400 });
    }

    // ★ 셀카는 우리 서버/Blob에 저장하지 않는다. data URI로 정규화해 이 요청 안에서만 Replicate로 보낸다.
    const selfieDataUri = normalizeBase64(userPhoto);
    const selfieBytes = base64ByteLength(selfieDataUri);
    if (selfieBytes === 0 || selfieBytes > MAX_SELFIE_BYTES) {
      return NextResponse.json(
        { ok: false, reason: "invalid_photo_format", debugError: `셀카 크기 이상: ${selfieBytes}B` },
        { status: 400 },
      );
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
      const msg = refErr instanceof Error ? refErr.message : String(refErr);
      console.error("[hair-transform] ❌ 레퍼런스 가져오기 실패:", reference.url, msg);
      return NextResponse.json({ ok: false, reason: "reference_fetch_failed", debugError: `레퍼런스 가져오기 실패: ${msg}` });
    }

    console.log(`[hair-transform] → ${HAIRSYNTH_MODEL} · enhance=${HAIRSYNTH_ENHANCE} | ref ${reference.slot}${reference.isFallback ? "(폴백)" : ""}${reference.isDefault ? "(default)" : ""}`);

    // 4. Replicate faceswap 호출 (예측 생성 + 결과 대기)
    //    입력 순서 고정: swap_image=셀카(얼굴), input_image=레퍼런스(장면).
    if (budgetLeft() <= 3_000) {
      return NextResponse.json({ ok: false, reason: "poll_timeout", debugError: "Replicate 호출 전 실행 예산 소진(레퍼런스 지연) — 셀카는 서버 미저장" });
    }

    // Prefer:wait로 동기 대기(모델 ~0.4s). 혹시 비동기로 떨어지면 아래 폴링이 이어받는다.
    let pred: { id?: string; status?: string; output?: unknown; error?: unknown; urls?: { get?: string } };
    try {
      const createRes = await fetch(REPLICATE_PREDICTIONS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "wait", // 동기 대기(최대 60s) — 완료된 예측을 한 번에 반환
        },
        body: JSON.stringify({
          version: HAIRSYNTH_MODEL_VERSION,
          input: { swap_image: selfieDataUri, input_image: refDataUri, enhance: HAIRSYNTH_ENHANCE },
        }),
        signal: AbortSignal.timeout(Math.max(1_000, budgetLeft())),
      });
      if (createRes.status === 401 || createRes.status === 403) {
        const t = await createRes.text().catch(() => createRes.status.toString());
        console.error("[hair-transform] Replicate 인증 오류:", createRes.status, t.slice(0, 200));
        return NextResponse.json({ ok: false, reason: "no_token", debugError: `Replicate ${createRes.status}: ${t.slice(0, 200)}` });
      }
      pred = await createRes.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const reason = e instanceof Error && e.name === "TimeoutError" ? "poll_timeout" : "api_error";
      console.error("[hair-transform] Replicate 생성 실패:", reason, msg);
      return NextResponse.json({ ok: false, reason, debugError: `Replicate 생성 실패: ${msg}` });
    }

    // Prefer:wait가 완료를 못 주면(processing/starting) 예산 내에서 폴링.
    const getUrl = pred.urls?.get;
    while (pred.status && !["succeeded", "failed", "canceled"].includes(pred.status)) {
      if (budgetLeft() <= 2_000 || !getUrl) {
        return NextResponse.json({ ok: false, reason: "poll_timeout", debugError: `Replicate 대기 예산 소진(status=${pred.status})` });
      }
      await new Promise((r) => setTimeout(r, 700));
      try {
        const pr = await fetch(getUrl, {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(Math.max(1_000, Math.min(10_000, budgetLeft()))),
        });
        pred = await pr.json();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const reason = e instanceof Error && e.name === "TimeoutError" ? "poll_timeout" : "api_error";
        return NextResponse.json({ ok: false, reason, debugError: `Replicate 폴링 실패: ${msg}` });
      }
    }

    if (pred.status !== "succeeded") {
      const errText = pred.error ? (typeof pred.error === "string" ? pred.error : JSON.stringify(pred.error)) : `status=${pred.status}`;
      const reason = classifyReplicateError(errText);
      console.error("[hair-transform] Replicate 실패:", pred.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, reason, debugError: `Replicate ${pred.status}: ${errText.slice(0, 400)}` });
    }

    // 출력은 결과 이미지 URI(문자열). 바이트를 받아 data URI로 클라에 반환 → 결과도 우리 서버/Blob에
    // 저장하지 않고 손님 브라우저에만 남는다.
    const outputUrl = Array.isArray(pred.output) ? (pred.output[0] as string | undefined) : (pred.output as string | undefined);
    if (!outputUrl || typeof outputUrl !== "string") {
      return NextResponse.json({ ok: false, reason: "no_output", debugError: `이미지 출력 없음: ${JSON.stringify(pred.output).slice(0, 300)}` });
    }
    let imageUrl: string;
    try {
      const outRes = await fetch(outputUrl, { signal: AbortSignal.timeout(Math.max(1_000, budgetLeft())) });
      if (!outRes.ok) throw new Error(`output HTTP ${outRes.status}`);
      const outAb = await outRes.arrayBuffer();
      // ★ 응답 크기 가드(Codex 지적): 결과를 data URI로 실어 보내므로, 원본이 과대하면(예: 대형 PNG)
      //   Vercel 서버리스 응답 한도(~4.5MB)를 넘길 수 있다. data URI는 원본의 ≈1.33배 → 원본 3MB로 제한.
      //   (face-swap-gpu는 통상 JPEG ~수백KB라 정상 트리거 안 됨. 안전장치.)
      if (outAb.byteLength > MAX_OUTPUT_BYTES) {
        return NextResponse.json({ ok: false, reason: "no_output", debugError: `결과 이미지 과대(${outAb.byteLength}B > ${MAX_OUTPUT_BYTES}B)` });
      }
      const outMime = outRes.headers.get("content-type") ?? (outputUrl.endsWith(".png") ? "image/png" : "image/jpeg");
      imageUrl = `data:${outMime};base64,${Buffer.from(outAb).toString("base64")}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, reason: "no_output", debugError: `결과 이미지 수신 실패: ${msg}` });
    }

    // ★ 성공 표시는 응답 객체를 만든 "뒤"에 한다(Codex 지적): json() 직렬화가 실패하면 succeeded가
    //   false로 남아 finally가 환불한다(성공 표시를 먼저 하면 실패해도 환불 누락).
    const okResp = NextResponse.json({ ok: true, imageUrl });
    console.log("[hair-transform] ✅ 합성 완료(Replicate faceswap)");
    succeeded = true;
    return okResp;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const reason = e instanceof Error && e.name === "TimeoutError" ? "poll_timeout" : "exception";
    console.error("[hair-transform] 예외:", reason, msg);
    return NextResponse.json({ ok: false, reason, debugError: `예외 발생: ${msg}` });
  } finally {
    // C-2: 선차감했는데 성공 못 하면 1회 환불(우리 잘못으로 손님 횟수가 깎이지 않게).
    // (셀카 Blob 삭제 로직은 A안으로 제거됨 — 애초에 저장하지 않으므로 지울 대상이 없다.)
    // rpc는 오류를 throw하지 않고 {error}로 준다 → error 명시 검사(미배포/권한오류 안전 degrade).
    if (chargedUserId && !succeeded) {
      try {
        const { error: refundErr } = await supabaseAdmin.rpc("refund_hair_usage", { p_user_id: chargedUserId });
        if (refundErr) console.error("[hair-transform] 환불 RPC 오류(무시·degrade):", refundErr.message);
        else console.log("[hair-transform] 실패로 일일횟수 1회 환불");
      } catch (e) {
        console.error("[hair-transform] 환불 예외(무시):", e instanceof Error ? e.message : String(e));
      }
    }
  }
}
