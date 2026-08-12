// ============================================================================
// lib/hairJobToken.ts — 비동기 헤어 합성 작업 소유권 바인딩 토큰
//
// 문제: 합성을 비동기(예측 생성 → 클라 폴링)로 바꾸면 status/cancel 엔드포인트가 임의
//   prediction id 로 호출될 수 있다(IDOR — 타인 결과 열람). 그래서 예측 생성(POST) 시
//   서버가 (predictionId, userId) 를 USER_SESSION_SECRET 으로 HMAC 서명한 토큰을 함께 내려주고,
//   status/cancel 은 "세션 userId + id 로 토큰을 재계산해 상수시간 비교"가 맞을 때만 처리한다.
//   → 세션 쿠키(userId) 없이는 위조 불가, 다른 유저의 id 를 넣어도 통과 못 함.
//
// ⚠️ 저장하지 않는다(무상태). 토큰은 만료·폐기·단일사용이 없는 capability 이므로, 세션 쿠키가
//    함께 있어야만 의미가 있다(쿠키 없으면 status/cancel 자체가 401). 관리자 시크릿 재사용 금지.
//
// Edge/Node 양쪽 동작을 위해 Web Crypto(subtle)만 사용한다.
// ============================================================================

const JOB_PAYLOAD = "abeauty-hairjob-v1";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 타이밍 공격을 피하기 위한 상수시간 문자열 비교(userAuth.safeEqual 과 동일 구현, 의존 최소화). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** 예측 생성 시 발급: (predictionId, userId) 바인딩 토큰(hex HMAC). */
export async function issueJobToken(
  secret: string,
  predictionId: string,
  userId: string,
): Promise<string> {
  return hmacHex(secret, `${JOB_PAYLOAD}:${predictionId}:${userId}`);
}

/** status/cancel 에서 검증: 세션 userId + id 로 재계산해 상수시간 비교. */
export async function verifyJobToken(
  secret: string,
  predictionId: string,
  userId: string,
  token: string,
): Promise<boolean> {
  if (!predictionId || !userId || !token) return false;
  const expected = await hmacHex(secret, `${JOB_PAYLOAD}:${predictionId}:${userId}`);
  return safeEqual(token, expected);
}
