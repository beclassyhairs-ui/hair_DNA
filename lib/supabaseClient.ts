// ============================================================================
// Supabase 클라이언트 — 브라우저에서 사용하는 공개(anon) 클라이언트
//
// anon key는 브라우저 번들에 그대로 노출된다. supabase/schema.sql의 RLS 정책상
// 이 클라이언트로는 events 테이블에 INSERT만 가능하고 SELECT는 막혀있다.
// 어드민 대시보드처럼 전체 데이터를 읽어야 하는 경우 이 클라이언트를 쓰지 말고
// lib/supabaseAdmin.ts(서버 전용, service_role 키)를 거친 API 라우트를 사용할 것.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 빌드/개발 초기 단계에서 흔히 발생 — 앱을 죽이지 않고 경고만 남긴다.
  // eslint-disable-next-line no-console
  console.error(
    "[supabaseClient] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. .env.local을 확인하세요.",
  );
}

// createClient()는 빈 문자열/잘못된 URL을 넘기면 "즉시" 예외를 던진다(모듈 로드 시점에 앱 전체가 죽음).
// 값이 없을 땐 문법적으로 유효한 placeholder URL을 넣어 생성만 성공시키고, 실제 실패는
// trackEvent()의 try/catch에서 네트워크 에러로 잡아 그때 콘솔에 로그를 남기도록 한다.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
