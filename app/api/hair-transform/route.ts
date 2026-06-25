// ============================================================================
// POST /api/hair-transform
// 유저 셀카(swap_image) + 레퍼런스 헤어 사진(target_image) → Face Swap 합성
//
// 모델: codeplugtech/face-swap
//   - 엔드포인트: /v1/predictions  (커뮤니티 모델 → version hash 필수)
//   - 버전 해시:  278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34
//   - 출처: https://replicate.com/codeplugtech/face-swap/versions (Latest 확인)
//   - 1.6M 실행, CPU 동작, 평균 64초
//
// 파라미터:
//   target_image → 레퍼런스 헤어 사진 (얼굴이 교체될 캔버스, 공개 https URL)
//   swap_image   → 유저 셀카 (삽입할 얼굴, Base64 data URI 또는 공개 URL)
//
// 환경변수:
//   REPLICATE_API_TOKEN  — 필수
//   NEXT_PUBLIC_SITE_URL — 프로덕션 절대 URL (예: https://your-domain.com)
// ============================================================================

export const maxDuration = 60; // Node.js 런타임 고정 (fs 사용)

import { access } from "fs/promises";
import { join }   from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getStyleDirectoryPath,
  buildHairStylePrompt,
  DEFAULT_REFERENCE_PATH,
  MAX_IMG,
} from "@/lib/styleReference";
import type { StyleAnswers } from "@/app/style/surveyData";

// ─── 모델 설정 ────────────────────────────────────────────────────────────────
// 커뮤니티 모델 → /v1/predictions + version hash 방식 (NOT /v1/models/ 엔드포인트)
const REPLICATE_VERSION =
  process.env.REPLICATE_VERSION ??
  "9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d";
const REPLICATE_ENDPOINT = "https://api.replicate.com/v1/predictions";

// 로컬 개발 전용 레퍼런스 폴백 URL
// Replicate 서버는 localhost URL에 접근 불가 → 공개 도메인 초상화로 대체
// 프로덕션(Vercel)에서는 절대 사용되지 않음
const LOCAL_DEV_REFERENCE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/" +
  "Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/" +
  "402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg";

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

// ─── [요구사항 3] Replicate 입력 빌더 ────────────────────────────────────────
// 모델: codeplugtech/face-swap
// 스키마: target_image(캔버스) + swap_image(삽입할 얼굴)
//
// 비즈니스 로직:
//   target_image = 레퍼런스 헤어 사진 → 이 사진의 얼굴이 유저 얼굴로 교체됨
//   swap_image   = 유저 셀카           → 이 얼굴이 레퍼런스 사진에 합성됨
//   결과:         유저 얼굴 + 레퍼런스 헤어 스타일 = 변신 미리보기
//
// ⚠️ 이 스키마에 없는 파라미터 포함 시 HTTP 422 발생
function buildReplicateInput(
  swapImage:   string, // 유저 셀카 (Base64 data URI)
  targetImage: string, // 레퍼런스 헤어 사진 (공개 https URL)
) {
  return {
    target_image: targetImage, // 레퍼런스 헤어 사진 (얼굴이 교체될 캔버스)
    swap_image:   swapImage,   // 유저 셀카 (삽입할 얼굴)
  };
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

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

  // 4. [요구사항 2] 레퍼런스 이미지 URL 확정 (랜덤 픽 + Fallback)
  const baseUrl = getBaseUrl(req);
  let targetImageUrl: string;

  if (!isPublicHttpsUrl(baseUrl)) {
    // [요구사항 3] 로컬 환경: Replicate 서버가 localhost에 접근 불가
    // → 외부 접근 가능한 공개 URL 폴백 사용 (로컬 테스트 전용)
    targetImageUrl = LOCAL_DEV_REFERENCE_URL;
    console.warn(
      `[hair-transform] ⚠️ 로컬 환경(${baseUrl}) — ` +
      `레퍼런스 이미지를 LOCAL_DEV_REFERENCE_URL로 대체합니다. ` +
      `NEXT_PUBLIC_SITE_URL을 프로덕션 URL로 설정하면 실제 레퍼런스 사용 가능.`,
    );
  } else {
    // 프로덕션: 설문 결과 기반 랜덤 픽 + fallback
    const { url, isDefault } = await pickReferenceUrl(answers, baseUrl);

    // 2차 방어: URL이 공개 https인지 재확인
    if (!isPublicHttpsUrl(url)) {
      console.error("[hair-transform] ❌ 레퍼런스 URL이 공개 HTTPS 아님:", url);
      targetImageUrl = LOCAL_DEV_REFERENCE_URL; // 최후 안전망
    } else {
      targetImageUrl = url;
    }
    console.log(`[hair-transform] target_image: ${isDefault ? "[DEFAULT]" : ""} ${targetImageUrl}`);
  }

  // 5. 프롬프트 생성 (로그용, face-swap 모델은 프롬프트 미사용)
  const prompt = buildHairStylePrompt(answers);
  console.log(`[hair-transform] 스타일 프롬프트(참고): ${prompt}`);

  // 6. Payload 로그
  console.log("[hair-transform] → Replicate payload:", JSON.stringify({
    version:      REPLICATE_VERSION.slice(0, 8) + "...",
    target_image: targetImageUrl,
    swap_image:   `[base64 ${normalizedPhoto.length}chars]`,
  }));

  // 7. Replicate API 호출 (/v1/predictions + version hash)
  try {
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=55",
      },
      body: JSON.stringify({
        version: REPLICATE_VERSION,
        input:   buildReplicateInput(normalizedPhoto, targetImageUrl),
      }),
      signal: AbortSignal.timeout(60_000),
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

    // processing 상태 → polling
    if (data.status === "processing" && data.urls?.get) {
      const pollResult = await pollUntilDone(data.urls.get, token);
      if (!pollResult) {
        return NextResponse.json({
          ok: false,
          reason: "poll_timeout",
          debugError: "Replicate 폴링 타임아웃: 50초 내에 이미지 생성 완료되지 않음",
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
  }
}

// ─── Replicate 폴링 ───────────────────────────────────────────────────────────

async function pollUntilDone(
  pollUrl: string,
  token:   string,
  maxMs  = 50_000,
): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2_500));
    try {
      const res  = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } });
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
