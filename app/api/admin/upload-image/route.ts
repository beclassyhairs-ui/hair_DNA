// ============================================================================
// POST /api/admin/upload-image — 제품 이미지 파일을 Vercel Blob에 업로드
// 요청 바디: { dataUrl: string } (base64 data URL)
// ============================================================================

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

import { NextResponse } from "next/server";
import { uploadProductImageToBlob } from "../../../../lib/storage";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { dataUrl?: string } | null;

  if (!body?.dataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ ok: false, error: "유효한 이미지 데이터가 아닙니다." }, { status: 400 });
  }

  try {
    const url = await uploadProductImageToBlob(body.dataUrl);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/admin/upload-image] 업로드 실패:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
