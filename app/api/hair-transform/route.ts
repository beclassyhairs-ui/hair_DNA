// ============================================================================
// POST /api/hair-transform
// 유저 셀카(input_image) + 마스터 프롬프트 → flux-kontext-pro 헤어 전이
//
// 모델: black-forest-labs/flux-kontext-pro
//   - 엔드포인트: /v1/models/black-forest-labs/flux-kontext-pro/predictions
//     (공식 모델 엔드포인트 — version hash 불필요, 항상 최신 버전)
//   - 비용: $0.04/run | 속도: 6~10초
//
// 파라미터:
//   input_image → 유저 셀카 (Vercel Blob 공개 URL)
//   prompt      → 4차원 마스터 프롬프트 (연령·기장·레이어드·웨이브 + 얼굴 보존 강제)
//
// 환경변수:
//   REPLICATE_API_TOKEN   — 필수
//   BLOB_READ_WRITE_TOKEN — 필수 (유저 셀카 Blob 업로드용)
// ============================================================================

export const maxDuration = 60; // Node.js 런타임 고정 (fs 사용)

import { access } from "fs/promises";
import { join }   from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getStyleDirectoryPath,
  buildHairStylePrompt,
  DEFAULT_REFERENCE_PATH,
  MAX_IMG,
} from "@/lib/styleReference";
import type { StyleAnswers } from "@/app/style/surveyData";
import { uploadPhotoToBlob, deletePhotoFromBlob } from "@/lib/storage";
import { USER_COOKIE, verifyUserToken } from "@/lib/userAuth";
import { isLoginRequiredBeforeSynthesis } from "@/lib/loginGate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// 서버측 일일 호출 제한(유저당). 클라 표시(3회)보다 여유를 둬 정상 재시도를 막지 않는다.
// 조정은 이 상수 하나로. 실제 강제는 Supabase RPC bump_hair_usage가 원자적으로 수행한다.
const SERVER_DAILY_MAX = 5;

// ─── 모델 설정 ────────────────────────────────────────────────────────────────
// /v1/models/{owner}/{name}/predictions 엔드포인트 → version hash 불필요
const REPLICATE_ENDPOINT =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions";

// ─── 공개 절대 URL 판별 ───────────────────────────────────────────────────────
function isPublicHttpsUrl(url: string): boolean {
  return (
    url.startsWith("https://") &&
    !url.includes("localhost") &&
    !url.includes("127.0.0.1")
  );
}

// ─── 절대 base URL 조립 ───────────────────────────────────────────────────────
// 우선순위: NEXT_PUBLIC_SITE_URL → VERCEL_URL → 요청 헤더
function getBaseUrl(req: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host  = req.headers.get("x-forwarded-host")
    ?? req.headers.get("host")
    ?? "localhost:3000";
  return `${proto}://${host}`;
}

// ─── [요구사항 2] 레퍼런스 이미지 랜덤 픽 + Fallback ──────────────────────────
// 1. 설문 결과로 조합된 폴더에서 1~MAX_IMG(5) 중 랜덤 시작 인덱스로 순환 탐색
// 2. 파일 존재 확인(fs.access) → 확정
// 3. 폴더 전체 비어있으면 /references/default_style.jpg 로 안전 폴백
async function pickReferenceUrl(
  answers: StyleAnswers,
  baseUrl: string,
): Promise<{ url: string; isDefault: boolean }> {
  const dir    = getStyleDirectoryPath(answers);      // e.g. "/references/group_2040/bob/c_curl/soft/"
  const relDir = dir.replace(/^\//, "");              // "references/group_2040/bob/c_curl/soft/"

  const startIdx = Math.floor(Math.random() * MAX_IMG) + 1; // 랜덤 시작 (1~5)

  for (let i = 0; i < MAX_IMG; i++) {
    const idx     = ((startIdx - 1 + i) % MAX_IMG) + 1;
    const relPath = `${relDir}${idx}.jpg`;
    const absPath = join(process.cwd(), "public", relPath);
    try {
      await access(absPath);
      const url = `${baseUrl}/${relPath}`;
      console.log(`[hair-transform] ✅ 레퍼런스 픽: ${relPath} → ${url}`);
      return { url, isDefault: false };
    } catch { /* 파일 없음 → 다음 인덱스 */ }
  }

  const url = `${baseUrl}${DEFAULT_REFERENCE_PATH}`;
  console.warn(`[hair-transform] ⚠️ 빈 폴더(${dir}) → default_style.jpg 폴백`);
  return { url, isDefault: true };
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

// ─── Replicate 입력 빌더 ─────────────────────────────────────────────────────
// 모델: black-forest-labs/flux-kontext-pro
function buildReplicateInput(inputImage: string, prompt: string) {
  return {
    input_image:       inputImage,
    prompt,
    guidance:          3.0,
    output_quality:    90,
    prompt_upsampling: false,
  };
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // ── 서버측 로그인 게이트 + 일일 호출 제한 (앞문 /style/loading 게이트와 동일 기준) ──
  // 클라 흐름을 우회한 무인증/과다 직접 호출을 서버에서 차단 → 로그인 없이·무제한으로 합성이
  // 도는 것을 막아 Replicate 서버비 남용을 방지한다. KAKAO_LOGIN_ENABLED를 끄면 함께 꺼진다.
  if (isLoginRequiredBeforeSynthesis()) {
    const sessionSecret = process.env.USER_SESSION_SECRET;
    const sessionToken  = req.cookies.get(USER_COOKIE)?.value ?? "";
    const session = sessionSecret ? await verifyUserToken(sessionSecret, sessionToken) : null;
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: "login_required", debugError: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 서버측 일일 호출 제한 — userId 기준, 원자적 RPC(bump_hair_usage). 클라 우회 불가.
    // ⚠️ 함수 미생성/RPC 오류 시 fail-open(제한만 미적용, 로그인 게이트는 유지) — SQL 실행 전엔
    //    제한이 비활성이고, 배포 후 사업주가 hair_usage_schema.sql을 실행하면 자동 활성화된다.
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
      }
    } catch (e) {
      console.error("[hair-transform] 일일제한 예외(제한 미적용):", e instanceof Error ? e.message : String(e));
    }
  }

  // ── 실행 예산 ────────────────────────────────────────────────────────────────
  // 원본 셀카 즉시삭제(finally)가 maxDuration(60s) 안에서 반드시 돌도록, 요청 시작 시각
  // 기준으로 삭제+응답 여유(8s)를 뺀 hardDeadline을 잡는다. 업로드·Replicate 초기 호출·
  // 폴링·삭제가 전부 이 예산을 공유해, 우리 타임아웃이 플랫폼 강제종료보다 먼저 터진다.
  const HANDLER_START   = Date.now();
  const DELETE_SAFETY_MS = 8_000;
  const hardDeadline    = HANDLER_START + (maxDuration * 1_000 - DELETE_SAFETY_MS); // ≈ 52s
  const budgetLeft = () => hardDeadline - Date.now();
  // 삭제 전용 마감시각 — finally의 원본 삭제가 maxDuration 직전까지 쓸 수 있는 절대 상한.
  // (hardDeadline 이후 ~7.5s 창. 플랫폼 강제종료(60s) 0.5s 전에 멈춘다.)
  const deleteDeadline  = HANDLER_START + (maxDuration * 1_000 - 500);

  // 1. API 키 하드 체크
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    const msg = "REPLICATE_API_TOKEN이 환경변수에 없습니다. Vercel 대시보드 또는 .env.local을 확인하세요.";
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "no_token", debugError: msg },
      { status: 500 },
    );
  }

  // 2. 요청 파싱
  let userPhoto: string;
  let answers: StyleAnswers;
  try {
    const body = await req.json();
    userPhoto = body.userPhoto as string;
    answers   = (body.answers ?? {}) as StyleAnswers;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad_request", debugError: "요청 JSON 파싱 실패" },
      { status: 400 },
    );
  }
  if (!userPhoto) {
    return NextResponse.json(
      { ok: false, reason: "missing_photo", debugError: "userPhoto 필드가 비어 있습니다" },
      { status: 400 },
    );
  }

  // 3. 유저 사진 포맷 검증 + 정규화
  if (userPhoto.startsWith("blob:") || userPhoto.startsWith("http:")) {
    const msg = `userPhoto 포맷 오류 — blob:/http: URL은 Replicate 처리 불가. 받은 값: "${userPhoto.slice(0, 80)}"`;
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "invalid_photo_format", debugError: msg },
      { status: 400 },
    );
  }
  const normalizedPhoto = normalizeBase64(userPhoto);
  console.log(`[hair-transform] 유저 사진: ${normalizedPhoto.slice(0, 30)}... (${normalizedPhoto.length}chars)`);

  // 유저 셀카는 Replicate가 input_image를 https URL로 가져가야 해서 잠깐 Blob에 올린다
  // (data: URI 직접 전달은 이 모델에서 불안정). 합성 직후 아래 finally에서 즉시 삭제한다.
  // 업로드 전 예산 소진 검사 — 여기서 예산이 없으면 아직 Blob이 없으니 삭제할 것도 없다.
  if (budgetLeft() <= 1_000) {
    return NextResponse.json({
      ok: false,
      reason: "budget_exhausted",
      debugError: "요청 파싱 단계에서 실행 예산 소진 — 합성을 시작하지 않음(원본 미저장)",
    });
  }

  // 원본 셀카 신원을 호출부가 먼저 정한다(랜덤 UUID pathname). 업로드가 abort돼 URL을
  // 못 받아도 이 pathname으로 삭제할 수 있어 "저장됐지만 참조 불가한 orphan"이 생기지 않는다.
  const blobPath = `diagnosis/${randomUUID()}.jpg`;

  // ── 4~6. Replicate 합성 (업로드 포함) ────────────────────────────────────────
  // ★ 원본 셀카 즉시삭제 보장: 업로드 시도 시점부터 전체를 하나의 try/finally로 감싼다.
  //   업로드 실패·프롬프트 예외·합성 타임아웃 등 어떤 경로로 빠져나가도 finally가
  //   pathname으로 원본을 지운다(URL 미확보 케이스까지 회수).
  try {
    // 3-1. 유저 셀카 → Vercel Blob 공개 URL (Replicate input_image는 https URL 필요)
    let swapImageUrl: string;
    try {
      // 업로드도 예산을 소비·공유한다(hang 시 남은 예산 내에서 끊어 finally 도달 보장).
      // 위 가드로 budgetLeft() > 1s가 보장되므로 그대로 캡처해 전달한다.
      const uploadBudget = budgetLeft();
      swapImageUrl = await uploadPhotoToBlob(normalizedPhoto, {
        pathname:    blobPath,
        abortSignal: AbortSignal.timeout(uploadBudget),
      });
      if (!swapImageUrl) {
        const msg = "BLOB_READ_WRITE_TOKEN이 환경변수에 없습니다. Vercel 대시보드 → Storage에서 Blob을 연결하세요.";
        console.error("[hair-transform]", msg);
        return NextResponse.json(
          { ok: false, reason: "blob_token_missing", debugError: msg },
          { status: 500 },
        );
      }
      console.log("[hair-transform] ✅ Blob 업로드 완료:", swapImageUrl);
    } catch (blobErr) {
      const msg = blobErr instanceof Error ? blobErr.message : String(blobErr);
      console.error("[hair-transform] ❌ Blob 업로드 실패:", msg);
      return NextResponse.json(
        { ok: false, reason: "blob_upload_failed", debugError: `Vercel Blob 업로드 실패: ${msg}` },
        { status: 500 },
      );
    }

    // 4. 마스터 프롬프트 생성 (4차원 변수 → 헤어 전이 지시문 + 얼굴 보존 강제)
    const prompt = buildHairStylePrompt(answers);

    // 5. Payload 로그
    console.log("[hair-transform] → flux-kontext-pro payload:", JSON.stringify({
      model:       "black-forest-labs/flux-kontext-pro",
      input_image: swapImageUrl,
      prompt:      prompt.slice(0, 120) + "...",
    }));

    // 6. Replicate API 호출 (/v1/models/ 엔드포인트 — version hash 불필요)
    // 잔여 예산을 한 번 캡처. 없으면 호출하지 않고 즉시 타임아웃 처리(→ finally에서 원본 삭제).
    const fetchBudget = budgetLeft();
    if (fetchBudget <= 1_000) {
      return NextResponse.json({
        ok: false,
        reason: "poll_timeout",
        debugError: "Replicate 호출 전 실행 예산 소진(업로드 지연) — 원본은 삭제됨",
      });
    }
    const waitSec = Math.max(1, Math.min(45, Math.floor(fetchBudget / 1_000) - 2));
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         `wait=${waitSec}`,
      },
      body: JSON.stringify({
        input: buildReplicateInput(swapImageUrl, prompt),
      }),
      signal: AbortSignal.timeout(fetchBudget),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      const debugError = `Replicate HTTP ${res.status}: ${errText.slice(0, 500)}`;
      console.error("[hair-transform] Replicate 에러:", res.status, errText.slice(0, 300));
      return NextResponse.json({ ok: false, reason: "api_error", debugError });
    }

    const data = await res.json() as {
      output?: string | string[];
      error?:  string;
      status?: string;
      urls?:   { get?: string };
    };

    // starting/processing → 완료까지 폴링.
    // ⚠️ starting을 빼먹으면(워커 미시작 상태) no_output으로 반환한 뒤 finally에서
    //    원본을 지워, 이후 워커가 input_image를 가져오려 할 때 합성이 깨진다.
    if ((data.status === "starting" || data.status === "processing") && data.urls?.get) {
      const pollResult = await pollUntilDone(data.urls.get, token, hardDeadline);
      if (!pollResult) {
        return NextResponse.json({
          ok: false,
          reason: "poll_timeout",
          debugError: "Replicate 폴링 타임아웃: 제한 시간 내에 이미지 생성 완료되지 않음",
        });
      }
      return NextResponse.json({ ok: true, imageUrl: pollResult });
    }

    if (data.error) {
      const debugError = `Replicate prediction error: ${data.error}`;
      console.error("[hair-transform] Prediction error:", data.error);
      return NextResponse.json({ ok: false, reason: "prediction_error", debugError });
    }

    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imageUrl) {
      const debugError = `output 없음. 응답 전체: ${JSON.stringify(data).slice(0, 400)}`;
      console.error("[hair-transform] No output:", data);
      return NextResponse.json({ ok: false, reason: "no_output", debugError });
    }

    console.log("[hair-transform] ✅ 합성 완료:", imageUrl);
    return NextResponse.json({ ok: true, imageUrl });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hair-transform] 예외:", msg);
    return NextResponse.json({
      ok: false,
      reason: "exception",
      debugError: `예외 발생: ${msg}`,
    });
  } finally {
    // ★ 원본 셀카 즉시삭제 — 합성 성공/실패/타임아웃/업로드 abort 무관하게 지운다.
    // URL(swapImageUrl)이 아니라 pathname(blobPath)으로 지운다 → 업로드가 abort돼
    // URL을 못 받았지만 서버엔 저장된 케이스까지 회수한다.
    // 이 시점(응답 확정)엔 Replicate가 이미 input_image를 가져갔으므로 원본은 불필요.
    // await로 응답 반환 전에 삭제를 끝내고(서버리스가 얼기 전), deleteDeadline을 공유해
    // 삭제 재시도가 maxDuration을 넘기지 않도록 한다.
    await deletePhotoFromBlob(blobPath, { deadline: deleteDeadline });
  }
}

// ─── Replicate 폴링 ───────────────────────────────────────────────────────────

async function pollUntilDone(
  pollUrl:  string,
  token:    string,
  deadline: number, // 절대 마감시각(ms). 호출부 hardDeadline과 공유해 maxDuration 초과를 막는다.
): Promise<string | null> {
  // 폴 한 사이클(sleep + fetch)에 최소한 이만큼은 남아 있어야 시도한다. 그보다 적으면
  // 마감을 넘기거나 무의미하므로 중단한다(500ms 강제 부여로 deadline을 넘기지 않도록).
  const MIN_CYCLE_MS = 1_500;
  while (deadline - Date.now() >= MIN_CYCLE_MS) {
    const sleepMs = Math.min(2_500, deadline - Date.now() - 800); // fetch 몫 800ms 확보
    if (sleepMs > 0) await new Promise(r => setTimeout(r, sleepMs));
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
    try {
      const res  = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${token}` },
        // poll fetch 자체도 마감을 넘겨 hang하지 않도록 잔여 예산으로 중단
        signal: AbortSignal.timeout(remaining),
      });
      const data = await res.json() as {
        status?: string;
        output?: string | string[];
        error?:  string;
      };
      if (data.status === "succeeded") {
        return Array.isArray(data.output) ? (data.output[0] ?? null) : (data.output ?? null);
      }
      if (data.status === "failed" || data.error) {
        console.error("[hair-transform] 폴링 실패:", data.error ?? data.status);
        return null;
      }
    } catch { return null; }
  }
  return null;
}
