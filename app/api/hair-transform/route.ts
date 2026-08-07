// ============================================================================
// POST /api/hair-transform
// 손님 셀카 + 레퍼런스 헤어사진 → OpenAI 이미지 편집으로 "얼굴 유지 + 머리만 교체"
//
// (2026-08-07: Replicate faceswap 전면 폐기 → OpenAI gpt-image-1-mini. 모델·등급·프롬프트는
//  lib/hairSynthModel.ts 단일출처. ★ 셀카를 우리 인프라(Vercel Blob)에 저장하지 않고, 요청에
//  바이트로만 실어 OpenAI로 전송한다 → "서버 미저장"이 가드레일의 목적을 더 확실히 달성하고
//  삭제 재시도 실패 시 잔존하던 orphan 갭도 원천 소멸한다.)
//
// 입력 순서 고정: image[0]=손님 셀카(바이트) / image[1]=레퍼런스 헤어(공개 URL에서 fetch한 바이트).
//   ★ 첫 이미지=얼굴 유지 대상(셀카), 두 번째=헤어 참조. 뒤바뀌면 엉뚱한 결과가 나온다.
//
// 환경변수:
//   OPENAI_API_KEY        — 필수
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
  HAIRSYNTH_QUALITY,
  HAIRSYNTH_SIZE,
  HAIRSYNTH_OUTPUT_FORMAT,
  HAIRSYNTH_PROMPT,
  OPENAI_EDIT_ENDPOINT,
} from "@/lib/hairSynthModel";

// 서버측 일일 호출 제한(유저당). 클라 표시(3회)보다 여유를 둬 정상 재시도를 막지 않는다.
// 조정은 이 상수 하나로. 실제 강제는 Supabase RPC bump_hair_usage가 원자적으로 수행한다.
const SERVER_DAILY_MAX = 5;

// 셀카 바이트 상한(과대 입력 차단). 클라 캡처 셀카는 수백 KB라 넉넉한 상한.
const MAX_SELFIE_BYTES = 20_000_000;

// ─── 레퍼런스(공개 자산) 절대 URL의 origin ────────────────────────────────────
// 레퍼런스는 우리 도메인의 공개 이미지를 서버가 fetch해 OpenAI에 바이트로 넘긴다. 배포환경에서는
// 배포보호(SSO) 걸린 배포도메인 대신 공개 alias를 고정 origin으로 쓴다(과거 302 장애 재발방지).
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

// ─── base64 Data URI 정규화 → 바이트 ──────────────────────────────────────────
function normalizeBase64(raw: string): string {
  if (raw.startsWith("data:image/") && raw.includes(";base64,")) return raw;
  if (raw.startsWith("data:")) {
    const b64 = raw.includes(",") ? raw.split(",")[1]! : raw.replace(/^data:[^,]*,?/, "");
    return `data:image/jpeg;base64,${b64}`;
  }
  return `data:image/jpeg;base64,${raw}`;
}
function dataUriToBytes(dataUri: string): { bytes: Uint8Array<ArrayBuffer>; mime: string } {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUri);
  const mime = m ? m[1]! : "image/jpeg";
  const b64 = m ? m[2]! : dataUri;
  const buf = Buffer.from(b64, "base64");
  const bytes = new Uint8Array(buf.byteLength); // 명시적 ArrayBuffer-backed(BlobPart 호환)
  bytes.set(buf);
  return { bytes, mime };
}

// ─── OpenAI 실패 사유 분류 (손님 안내용 코드로 좁힌다. 개인정보는 안 싣는다.) ──
//   content_flagged — 안전필터(moderation) 차단 → "다른 사진으로" 안내
//   api_error       — 그 외(레이트리밋·서버오류 등) → "잠시 후 다시"
function classifyOpenAIError(err: { message?: string; code?: string; type?: string } | null): "content_flagged" | "api_error" {
  const t = `${err?.code ?? ""} ${err?.type ?? ""} ${err?.message ?? ""}`.toLowerCase();
  if (t.includes("moderation") || t.includes("safety") || t.includes("content_policy") || t.includes("flagged")) {
    return "content_flagged";
  }
  return "api_error";
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 실행 예산 ── ★ 핸들러 첫 줄에서 잡는다(로그인·동의조회·bump 지연까지 포함해 maxDuration을
  //   넘기지 않게 — Codex 지적). 응답 여유(5s)만 남기고 나머지를 레퍼런스 fetch·OpenAI 호출이 공유.
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
    // 얼굴 사진의 국외이전(미국 OpenAI) 처리 前, 현재 방침버전 국외이전 동의 보유를 서버에서 재검증.
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
    // 1. API 키 하드 체크
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      const msg = "OPENAI_API_KEY가 환경변수에 없습니다. Vercel 대시보드 또는 .env.local을 확인하세요.";
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

    // ★ 셀카는 우리 서버/Blob에 저장하지 않는다. 바이트로 변환해 이 요청 안에서만 OpenAI로 보낸다.
    const selfie = dataUriToBytes(normalizeBase64(userPhoto));
    if (selfie.bytes.length === 0 || selfie.bytes.length > MAX_SELFIE_BYTES) {
      return NextResponse.json(
        { ok: false, reason: "invalid_photo_format", debugError: `셀카 크기 이상: ${selfie.bytes.length}B` },
        { status: 400 },
      );
    }
    console.log(`[hair-transform] 셀카 수신(${selfie.bytes.length}B) — 서버 미저장, 이 요청에만 사용`);

    // 3. 레퍼런스 헤어 이미지 → 바이트 (공개 URL에서 fetch)
    const baseUrl = getAssetBaseUrl(req);
    const reference = pickReferenceUrl(answers, baseUrl);
    let refAb: ArrayBuffer;
    let refMime: string;
    try {
      const rr = await fetch(reference.url, {
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(15_000, budgetLeft()))),
      });
      if (!rr.ok) throw new Error(`ref HTTP ${rr.status}`);
      refAb = await rr.arrayBuffer();
      refMime = rr.headers.get("content-type") ?? (reference.url.endsWith(".png") ? "image/png" : "image/jpeg");
    } catch (refErr) {
      const msg = refErr instanceof Error ? refErr.message : String(refErr);
      console.error("[hair-transform] ❌ 레퍼런스 가져오기 실패:", reference.url, msg);
      return NextResponse.json({ ok: false, reason: "reference_fetch_failed", debugError: `레퍼런스 가져오기 실패: ${msg}` });
    }

    console.log(`[hair-transform] → ${HAIRSYNTH_MODEL} · ${HAIRSYNTH_QUALITY} | ref ${reference.slot}${reference.isFallback ? "(폴백)" : ""}${reference.isDefault ? "(default)" : ""}`);

    // 4. OpenAI 이미지 편집 호출 (multipart: image[0]=셀카, image[1]=레퍼런스)
    if (budgetLeft() <= 2_000) {
      return NextResponse.json({ ok: false, reason: "poll_timeout", debugError: "OpenAI 호출 전 실행 예산 소진(레퍼런스 지연) — 셀카는 서버 미저장" });
    }
    const fd = new FormData();
    fd.append("model", HAIRSYNTH_MODEL);
    fd.append("prompt", HAIRSYNTH_PROMPT);
    fd.append("quality", HAIRSYNTH_QUALITY);
    fd.append("size", HAIRSYNTH_SIZE);
    fd.append("output_format", HAIRSYNTH_OUTPUT_FORMAT); // jpeg — data URI 응답 크기 축소
    fd.append("image[]", new Blob([selfie.bytes], { type: selfie.mime }), "selfie.jpg"); // [0] 셀카(얼굴 유지)
    fd.append("image[]", new Blob([refAb], { type: refMime }), "reference");             // [1] 레퍼런스(헤어)

    const res = await fetch(OPENAI_EDIT_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      signal: AbortSignal.timeout(Math.max(1_000, budgetLeft())),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      let errObj: { message?: string; code?: string; type?: string } | null = null;
      try { errObj = JSON.parse(errText).error ?? null; } catch { /* 원문 유지 */ }
      const reason = classifyOpenAIError(errObj);
      const debugError = `OpenAI HTTP ${res.status}: ${errText.slice(0, 400)}`;
      console.error("[hair-transform] OpenAI 에러:", res.status, errText.slice(0, 200));
      return NextResponse.json({ ok: false, reason, debugError });
    }

    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ ok: false, reason: "no_output", debugError: `이미지 출력 없음: ${JSON.stringify(data).slice(0, 300)}` });
    }
    // 결과는 data URI로 클라에 반환 → 결과 이미지도 우리 서버/Blob에 저장하지 않고 손님 브라우저에만 남는다.
    const imageUrl = `data:image/jpeg;base64,${b64}`;
    console.log("[hair-transform] ✅ 합성 완료(OpenAI)");
    succeeded = true;
    return NextResponse.json({ ok: true, imageUrl });
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
