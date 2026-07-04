// ============================================================================
// Supabase 클라이언트 — 서버 전용(service_role 키, RLS 우회)
//
// ⚠️ 이 파일은 절대 "use client" 컴포넌트나 브라우저에서 실행되는 코드에서
// import하면 안 된다. service_role 키가 클라이언트 번들에 섞여 들어가면
// 누구나 전체 DB를 읽고 쓸 수 있게 되는 심각한 보안 사고다.
// Next.js Route Handler(app/api/**/route.ts) 등 서버에서만 사용할 것.
// ============================================================================

import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  // eslint-disable-next-line no-console
  console.error(
    "[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. (.env.local에 NEXT_PUBLIC_ 접두어 없이 저장)",
  );
}

// createClient()는 빈 문자열/잘못된 URL을 넘기면 즉시 예외를 던진다 — 값이 없을 때도
// 모듈 자체는 로드되게 placeholder를 넣고, 실제 쿼리 실패는 호출부(API 라우트)의
// try/catch에서 잡아 { ok: false, error } 형태로 정직하게 응답하도록 한다.
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  serviceRoleKey || "placeholder-service-role-key",
  { auth: { persistSession: false } },
);
