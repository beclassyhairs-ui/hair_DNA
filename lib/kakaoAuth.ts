// ============================================================================
// lib/kakaoAuth.ts — 카카오 OAuth 서버 로직 (server-only)
//
// 인가코드 흐름: /start(authorize 리다이렉트) → 카카오 동의 → /callback(토큰 교환 +
// 회원정보 조회 + users upsert + 세션 발급). access_token은 회원번호 조회에만 쓰고
// 저장하지 않는다(확정 결정 ①). 리프레시 토큰 미저장.
//
// ⚠️ 환경변수 값은 전부 [사업주 등록] 자리다 — 여기선 참조만 한다.
// ============================================================================
import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

const KAKAO_AUTHORIZE = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_ME = "https://kapi.kakao.com/v2/user/me";

// /start에서 발급하고 /callback에서 검증하는 임시 쿠키(state + return_to).
export const OAUTH_STATE_COOKIE = "abeauty_oauth";
export const OAUTH_STATE_TTL_S = 10 * 60; // 10분

/**
 * 로그인 후 돌아갈 경로를 오픈 리다이렉트로부터 안전하게 정규화한다.
 * 반드시 단일 슬래시로 시작하는 같은 사이트 경로만 허용(`//`·스킴·역슬래시 거부).
 * 부적합하면 "/"로 폴백.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/";
  // 스킴/프로토콜 상대 URL 차단
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.includes("\\")) return "/";
  return raw;
}

export interface KakaoEnv {
  restApiKey: string;
  clientSecret: string | undefined;
  redirectUri: string;
}

/**
 * 카카오 OAuth 환경변수를 읽어 검증한다. 미설정이면 null(호출부가 503/설정안내 응답).
 * redirectUri는 KAKAO_REDIRECT_URI를 우선하고, 없으면 NEXT_PUBLIC_SITE_URL로 조립한다.
 * (콘솔에 등록한 Redirect URI와 반드시 정확히 일치해야 한다.)
 */
export function getKakaoEnv(): KakaoEnv | null {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) return null;

  let redirectUri = process.env.KAKAO_REDIRECT_URI;
  if (!redirectUri) {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) return null;
    redirectUri = `${site.replace(/\/$/, "")}/api/auth/kakao/callback`;
  }

  return {
    restApiKey,
    clientSecret: process.env.KAKAO_CLIENT_SECRET || undefined,
    redirectUri,
  };
}

/** 카카오 인가 URL을 조립한다(state는 CSRF 방어용 랜덤값). */
export function buildKakaoAuthorizeUrl(env: KakaoEnv, state: string): string {
  const p = new URLSearchParams({
    client_id: env.restApiKey,
    redirect_uri: env.redirectUri,
    response_type: "code",
    state,
  });
  return `${KAKAO_AUTHORIZE}?${p.toString()}`;
}

/** 인가코드 → access_token 교환. 실패 시 예외. */
export async function exchangeKakaoCode(env: KakaoEnv, code: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.restApiKey,
    redirect_uri: env.redirectUri,
    code,
  });
  if (env.clientSecret) body.set("client_secret", env.clientSecret);

  const res = await fetch(KAKAO_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // 공급자 응답 본문은 로그에 남기지 않는다(민감정보 유출 방지) — 상태 코드만.
    throw new Error(`kakao token exchange failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("kakao token response missing access_token");
  return data.access_token;
}

export interface KakaoProfile {
  kakaoUserId: string;
  nickname: string | null;
  profileImage: string | null;
}

/** access_token → 카카오 회원번호(+동의 시 닉네임/프로필). */
export async function fetchKakaoProfile(accessToken: string): Promise<KakaoProfile> {
  const res = await fetch(KAKAO_USER_ME, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // 공급자 응답 본문은 로그에 남기지 않는다(민감정보 유출 방지) — 상태 코드만.
    throw new Error(`kakao user/me failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    id?: number | string;
    properties?: { nickname?: string; profile_image?: string };
    kakao_account?: { profile?: { nickname?: string; profile_image_url?: string } };
  };
  if (data.id === undefined || data.id === null) {
    throw new Error("kakao user/me response missing id");
  }
  const profile = data.kakao_account?.profile;
  return {
    kakaoUserId: String(data.id),
    nickname: profile?.nickname ?? data.properties?.nickname ?? null,
    profileImage: profile?.profile_image_url ?? data.properties?.profile_image ?? null,
  };
}

/**
 * 카카오 회원번호로 users를 upsert하고 내부 uuid를 돌려준다(service_role 경유, RLS 우회).
 * 닉네임/프로필은 값이 있을 때만 payload에 넣어 기존 값을 null로 덮어쓰지 않는다.
 * @throws upsert 실패 시 예외(호출부가 로그인 실패로 처리)
 */
export async function upsertUserByKakaoId(profile: KakaoProfile): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    kakao_user_id: profile.kakaoUserId,
    last_login_at: new Date().toISOString(),
  };
  if (profile.nickname) payload.nickname = profile.nickname;
  if (profile.profileImage) payload.profile_image = profile.profileImage;

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(payload, { onConflict: "kakao_user_id" })
    .select("id")
    .single();

  if (error) throw new Error(`users upsert failed: ${error.message}`);
  if (!data?.id) throw new Error("users upsert returned no id");
  return { id: String(data.id) };
}
