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
//   ★ 2026-08-16 개정(D-2 감사 ④): quota 예약은 "검증을 통과한 요청"에만 건다 — 요청 파싱·로그인·
//   동의·⑤ 폴백 자격검증까지 전부 통과한 뒤에 bump_hair_usage 를 호출한다(예전엔 파싱보다도 먼저
//   호출해, 자격 불일치 폴백 요청(originalId/token 오타·새로고침 stale 값)도 무료횟수를 태웠다).
//   "생성 상한" 역할은 그대로 유지된다 — 실제로 비용이 드는 레퍼런스 fetch·Replicate 호출 "전"에
//   여전히 예약이 걸린다.
//
// 소유권 바인딩: (predictionId, userId) HMAC 토큰을 함께 반환한다. status·cancel 은 세션 userId 로
//   토큰을 재계산해 일치할 때만 처리 → 임의 id 조회(IDOR) 차단. (lib/hairJobToken.ts)
//
// 입력 순서 고정: swap_image=손님 셀카(넣을 얼굴) / target_image=레퍼런스 헤어(장면). (lucataco 스키마)
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
import { issueJobToken, issuePrimaryAttestation, verifyPrimaryAttestation } from "@/lib/hairJobToken";
import {
  REPLICATE_PREDICTIONS_ENDPOINT,
  replicatePredictionUrl,
  selectModel,
  HAIRSYNTH_FALLBACK_ENABLED,
} from "@/lib/hairSynthModel";

// 서버측 일일 호출 제한(유저당). 클라 표시(3회)보다 여유를 둔다.
// 2026-08-12: 환불 전면 폐지(멱등/DoS 구멍 소거)의 보상으로 5→7 상향 — 실패로 1회 손해봐도
//   6회가 남아 손님이 아프지 않게 한다(상수만 변경, SQL 불필요).
const SERVER_DAILY_MAX = 7;

// 셀카 바이트 상한(과대 입력 차단).
const MAX_SELFIE_BYTES = 20_000_000;

// 로그인 게이트가 꺼져 있을 때(개발/비활성) 토큰 바인딩에 쓸 대체 userId.
const ANON_BIND = "anon";

// ⑤ 폴백 자격: 원본(ddvinh1) job 이 실제로 "콜드미스"인지 서버가 Replicate에서 직접 확인한다.
//   클라의 fallback:true 자기신고만으로는 허용하지 않는다(2026-08-16 D-2 감사 ② — 콜드미스가
//   아닌데도 fallback:true 만 던져 상시-warm 인 lucataco(미화 모델)로 즉시 우회하는 사업정책 회피를
//   서버가 직접 막는다). 로딩 페이지의 실제 폴백 트리거는 8분(POLL_BUDGET_MS) 예산 소진 후이므로,
//   그보다 살짝 짧은 문턱(7분)을 두면 정상 클라는 항상 통과하고 즉시-우회 시도만 차단된다.
//   ★ Codex 라운드1 반영: failed/canceled 를 경과시간 없이 즉시 허용하면, 공격자가 kickoff 직후
//   /cancel 을 스스로 호출해 "종결 상태"를 인위로 만들고 곧장 폴백을 요청하는 우회가 가능했다
//   (로딩 페이지의 진짜 취소도 8분 예산을 다 쓴 뒤에만 일어나므로, "취소됨" 자체는 경과시간의
//   대체 증거가 못 된다). → 상태와 무관하게 "생성 후 충분한 시간이 지났는가" 하나로 통일한다.
//   ★ Codex 라운드2 반영: "충분한 시간"을 now()-created_at 으로만 재면, 공격자가 즉시 cancel 한
//   뒤 그냥 7분을 흘려보내고 재요청해도 통과했다(취소 자체는 즉시 됐지만 "그때부터 기다린 시간"이
//   문턱을 넘기면 속아 넘어감). → 이미 종결(failed/canceled)된 job 은 "생성부터 지금까지"가 아니라
//   "생성부터 실제로 종결되기까지 걸린 시간"(completed_at - created_at)을 봐야 한다. 즉시 취소는
//   이 값이 거의 0이라 시간이 아무리 지나도 영원히 자격을 얻지 못한다(진짜 콜드미스만 이 값이 크다).
const FALLBACK_MIN_ELAPSED_MS = 7 * 60 * 1000;

async function verifyFallbackEligibility(originalId: string, replicateKey: string): Promise<boolean> {
  try {
    const pr = await fetch(replicatePredictionUrl(originalId), {
      headers: { Authorization: `Bearer ${replicateKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!pr.ok) return false; // 원본 조회 실패 → 자격 불확실, fail-closed
    const pred = (await pr.json()) as { status?: string; created_at?: string; completed_at?: string };
    if (pred.status === "succeeded") return false; // 이미 성공한 원본을 폴백으로 재시도하는 건 허용 안 함

    const createdMs = pred.created_at ? Date.parse(pred.created_at) : NaN;
    if (!Number.isFinite(createdMs)) return false;

    if (pred.status === "failed" || pred.status === "canceled") {
      // 종결된 job — "생성→종결" 실제 소요시간으로 판정(즉시 cancel 우회 차단).
      const completedMs = pred.completed_at ? Date.parse(pred.completed_at) : NaN;
      if (!Number.isFinite(completedMs)) return false; // completed_at 없으면 판정 불가 → fail-closed
      return completedMs - createdMs >= FALLBACK_MIN_ELAPSED_MS;
    }
    // starting/processing — 아직 진행 중이므로 "생성→지금"으로 판정(진짜 콜드미스만 통과).
    return Date.now() - createdMs >= FALLBACK_MIN_ELAPSED_MS;
  } catch {
    return false; // 네트워크 오류 등 → fail-closed
  }
}

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

  // 0. 요청 파싱 — body 스트림은 1회만 읽을 수 있어 최상단에서 한 번에 끝낸다(④: quota 예약보다
  //    먼저 파싱해야 폴백 자격검증도 quota 앞으로 옮길 수 있다).
  let userPhoto: string;
  let answers: StyleAnswers;
  let fallback = false;            // ⑤ true 면 폴백 모델(lucataco)로 착수 — 클라가 8분 콜드 미스 후에만 보낸다.
  let originalId = "";             // 폴백 자격 증표: 같은 유저의 원본(ddvinh1) kickoff prediction id
  let originalAttestation = "";    //                그 원본이 "진짜 원본(primary)"이었다는 증표(HMAC)
  try {
    const body = await req.json();
    userPhoto = body.userPhoto as string;
    answers = (body.answers ?? {}) as StyleAnswers;
    fallback = body.fallback === true;
    originalId = typeof body.originalId === "string" ? body.originalId : "";
    originalAttestation = typeof body.originalAttestation === "string" ? body.originalAttestation : "";
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  // 1. API 토큰 + 세션 시크릿 하드 체크(둘 다 fail-closed, quota 이전 — 인프라 미설정에 손님
  //    무료횟수를 태우지 않는다).
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) {
    console.error("[hair-transform] REPLICATE_API_TOKEN 미설정");
    return NextResponse.json({ ok: false, reason: "no_token" }, { status: 500 });
  }
  const sessionSecret = process.env.USER_SESSION_SECRET;
  if (!sessionSecret) {
    console.error("[hair-transform] USER_SESSION_SECRET 미설정 — fail-closed");
    return NextResponse.json({ ok: false, reason: "exception" }, { status: 500 });
  }

  // 2. 서버측 로그인 게이트 + 동의 게이트(quota 이전, 기존과 동일 조건).
  if (isLoginRequiredBeforeSynthesis()) {
    const sessionToken = req.cookies.get(USER_COOKIE)?.value ?? "";
    const session = await verifyUserToken(sessionSecret, sessionToken);
    if (!session) {
      return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
    }
    bindUserId = session.userId;

    // 동의 게이트(§13, fail-CLOSED) — 얼굴 국외이전 前, 현재 방침버전 동의 보유 재검증.
    const overseasOk = await hasCurrentOverseasConsent(session.userId);
    if (!overseasOk) {
      return NextResponse.json({ ok: false, reason: "consent_required" }, { status: 403 });
    }
  }

  // 3. ⑤ 폴백 자격 검증(서버) — 클라가 보낸 fallback:true 를 그대로 신뢰하지 않는다:
  //   ① 킬스위치가 꺼져 있으면 폴백 무시 → ddvinh1 로만 착수(미화 재노출 즉시 차단 가능).
  //   ② 켜져 있어도 "같은 유저 소유의 진짜 원본(primary) kickoff 증표"가 있어야만 폴백 허용
  //      (issuePrimaryAttestation/verifyPrimaryAttestation — 별도 서명 네임스페이스라, 폴백 job
  //      자신의 일반 토큰을 재사용해 "원본"인 척 할 수 없다 = 폴백→폴백 체이닝 구조적 차단).
  //   ③ 원본이 실제로 콜드미스 상태인지 Replicate 에서 직접 재확인 — 정상 진행 중(성공 임박)이거나,
  //      공격자가 스스로 /cancel 을 불러 "종결 상태"를 인위로 만든 원본을 즉시 재요청해 미화 모델로
  //      우회하는 것을 막는다(verifyFallbackEligibility 가 상태 무관 경과시간으로 통일 판정).
  //   quota 예약보다 먼저 검증한다(④) — 자격 불일치 요청이 무료횟수를 태우지 않는다.
  let useFallback = false;
  if (fallback && HAIRSYNTH_FALLBACK_ENABLED) {
    const originalOk = await verifyPrimaryAttestation(sessionSecret, originalId, bindUserId, originalAttestation);
    if (!originalOk) {
      console.warn("[hair-transform] ⑤ 폴백 자격 검증 실패 — 원본(primary) 증표 불일치(폴백 체이닝 시도 가능성 포함)");
      return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
    }
    const eligible = await verifyFallbackEligibility(originalId, key);
    if (!eligible) {
      console.warn("[hair-transform] ⑤ 폴백 자격 검증 실패 — 원본이 아직 콜드미스 상태가 아님(즉시 우회 시도로 간주)");
      return NextResponse.json({ ok: false, reason: "fallback_not_eligible" }, { status: 400 });
    }
    useFallback = true;
  }

  // 4. 서버측 일일 호출 제한 — userId 기준, 원자적 RPC(bump_hair_usage). 검증을 모두 통과한
  //    요청만 여기서 예약한다(이 예약이 곧 이후 단계의 생성 상한이다).
  if (isLoginRequiredBeforeSynthesis()) {
    try {
      const { data, error } = await supabaseAdmin.rpc("bump_hair_usage", {
        p_user_id: bindUserId,
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
    // 모델 선택은 단일출처(selectModel)에서만 — 라우트엔 버전 해시·입력 스키마를 두지 않는다.
    const model = selectModel(useFallback);
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

    console.log(`[hair-transform] → ${model.slug}${useFallback ? " (⑤ 폴백)" : ""} | ref ${reference.slot}${reference.isFallback ? "(폴백)" : ""}${reference.isDefault ? "(default)" : ""}`);

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
          version: model.version,
          // 입력 스키마는 모델 단일출처의 빌더가 흡수(ddvinh1=input_image+enhance / lucataco=target_image).
          input: model.buildInput(selfieDataUri, refDataUri),
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
    //   ★ fallbackUsed: 실제로 폴백(lucataco)으로 착수했는지를 클라에 알린다(Codex 반영). 킬스위치가
    //     꺼져 fallback 요청이 ddvinh1 로 처리된 경우 false → 클라는 이를 보고 폴링 예산(8분)·안내·
    //     job 영속 상태를 정한다(폴백 예산 2분으로 콜드 ddvinh1 을 조기취소하는 회귀 방지).
    //   ★ primaryAttestation: 이번 kickoff 가 "진짜 원본"(useFallback=false)일 때만 발급한다.
    //     폴백 job 은 이 증표를 절대 받지 못하므로, 나중에 이 job 을 "원본"으로 내세워 또 다른
    //     폴백을 체이닝하는 시도가 서버에서 구조적으로 막힌다(lib/hairJobToken.ts 참고).
    const token = await issueJobToken(sessionSecret, predId, bindUserId);
    const primaryAttestation = useFallback ? undefined : await issuePrimaryAttestation(sessionSecret, predId, bindUserId);
    console.log(`[hair-transform] ✅ 예측 생성: ${predId} (status=${pred.status}, fallbackUsed=${useFallback}) — 클라 폴링 대기`);
    return NextResponse.json({ ok: true, id: predId, token, primaryAttestation, fallbackUsed: useFallback });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const reason = e instanceof Error && e.name === "TimeoutError" ? "poll_timeout" : "exception";
    console.error("[hair-transform] 예외:", reason, msg);
    return NextResponse.json({ ok: false, reason });
  }
}
