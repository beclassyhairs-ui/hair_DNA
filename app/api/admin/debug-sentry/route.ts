// ============================================================================
// POST /api/admin/debug-sentry — Sentry 서버 연동 테스트용 에러 발화기
//
// ⚠️ 관리자 게이트 뒤에 둔다(middleware가 /api/admin/* 를 ADMIN_SECRET로 보호).
//   공개 엔드포인트로 두면 봇/제3자가 반복 호출해 Sentry 이벤트 할당량 소진·경보
//   폭주를 일으킬 수 있어 인증 뒤로 옮겼다(Codex 지적 반영).
//
// 용도: 배포 후 사업주가 Vercel에 NEXT_PUBLIC_SENTRY_DSN을 넣고, /admin 로그인 상태에서
//   /admin/debug-sentry의 버튼으로 이 라우트를 호출하면 Sentry 대시보드에 서버 에러가
//   뜨는지 확인한다. (DSN 미설정이면 Sentry는 no-op이라 500만 반환되고 수집되지 않는다.)
//   자동 계측(wrapRouteHandlerWithSentry)이 예외를 잡으므로 명시 캡처 없이 throw만 한다.
//
// ⚠️ POST만 받는다 — 부작용(에러 발화)이 있는 요청이라, 외부 링크발 top-level GET으로
//   로그인한 관리자를 겨냥해 유발되는 것을 막는다(SameSite=Lax 쿠키 CSRF 방어, Codex 지적).
//   연동 확인이 끝나면 이 파일은 삭제해도 된다.
// ============================================================================
export const dynamic = "force-dynamic";

export function POST() {
  throw new Error("[debug-sentry] 서버 테스트 에러 — Sentry 연동 확인용");
}
