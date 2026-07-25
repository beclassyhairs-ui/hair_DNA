// ============================================================================
// GET /api/health — 가동감시(uptime)용 헬스체크. 인증 불요, 공개.
//
// DB(Supabase)에 가벼운 존재 확인 쿼리를 던져 연결이 살아 있는지 본다.
//   - 정상: 200 { status: "ok" }
//   - DB 실패/타임아웃/예외: 503 { status: "error" }
//
// ⚠️ 응답 본문에는 상태만 담는다. DB 오류 메시지·연결정보·스키마명·스택은 절대 노출하지 않는다
//    (공개 엔드포인트라 정보 노출 = 정찰 단서). 에러는 서버 로그에만, 그것도 메시지 최소화.
// ============================================================================
export const dynamic = "force-dynamic"; // 정적 캐시 금지 — 매 호출 실측
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DB_TIMEOUT_MS = 2500; // DB가 느려도 헬스체크가 오래 매달리지 않게

// no-store 헤더를 실어 캐시(브라우저·CDN·감시 프록시)에 걸리지 않게 한다.
function json(status: "ok" | "error", httpStatus: number) {
  return NextResponse.json(
    { status },
    { status: httpStatus, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function GET() {
  try {
    // 가장 가벼운 존재 확인: head 요청(행 미반환)으로 테이블/연결 생존만 본다.
    const { error } = await supabaseAdmin
      .from("users")
      .select("id", { head: true })
      .limit(1)
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));

    if (error) {
      // 상세는 서버 로그에만(메시지 코드 정도), 응답에는 비노출.
      console.error("[/api/health] db check failed");
      return json("error", 503);
    }
    return json("ok", 200);
  } catch {
    // 네트워크/타임아웃/예상 밖 예외 — 마찬가지로 상태만.
    console.error("[/api/health] db check threw");
    return json("error", 503);
  }
}
