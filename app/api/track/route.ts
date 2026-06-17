// ============================================================================
// 동안비법 — 서버사이드 이벤트 로깅 엔드포인트
// POST /api/track
//
// 현재: 콘솔 로그 (개발/검증용)
// 확장 시: Supabase / PlanetScale / Amplitude 서버 API 호출로 교체
//
// edge runtime → Vercel Edge Functions로 배포 (전 세계 저지연, 무한 확장)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface TrackPayload {
  event: string;
  params?: Record<string, string | number | boolean>;
  timestamp?: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: TrackPayload;
  try {
    body = (await req.json()) as TrackPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { event, params, timestamp } = body;
  if (!event) {
    return NextResponse.json({ error: "event required" }, { status: 400 });
  }

  // ── 이벤트 로그 (추후 DB INSERT / 외부 API 호출로 교체) ──────────────────
  const logEntry = {
    event,
    params: params ?? {},
    ref: params?.ref ?? null,          // 레퍼럴 ID (수익 귀속 추적)
    ua: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    at: timestamp
      ? new Date(timestamp).toISOString()
      : new Date().toISOString(),
  };

  console.log("[analytics]", JSON.stringify(logEntry));

  // ── 쿠팡 파트너스 전환 이벤트는 별도 플래그 ────────────────────────────
  // 추후 여기서 Coupang Partners API (purchase webhook) 확인 가능
  if (event === "product_click") {
    console.log("[coupang-partners] click logged:", logEntry.params);
  }

  return NextResponse.json({ ok: true });
}
