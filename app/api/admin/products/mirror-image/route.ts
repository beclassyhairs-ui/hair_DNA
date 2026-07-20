// ============================================================================
// POST /api/admin/products/mirror-image — 공급사 이미지를 자체 스토리지로 복사
//
// body: { image_url: string }
// 200:  { ok: true, url: string, bytes: number, content_type: string }
//
// 공급사(도매꾹 등) 이미지를 핫링크한 채로 두면 공급사가 이미지를 내리는 순간 상품
// 카드가 깨진다. 이 라우트는 서버가 원본을 직접 받아 Vercel Blob에 올리고 자체 URL을
// 돌려준다. 반환된 URL을 products.image_url에 저장하는 것은 호출한 관리자 화면의 몫.
//
// 보안: middleware.ts의 /api/admin/:path* 매처로 ADMIN_SECRET 인증 게이트 뒤에 있다.
//       fetch 대상 검증(스킴/도메인 allowlist/사설IP/리다이렉트/MIME/용량)은 전부
//       lib/imageMirror.ts에서 수행한다 — SSRF 방어 상세는 그 파일 주석 참고.
// ============================================================================

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { assertSafeImageUrl, fetchImage, ImageMirrorError } from "../../../../../lib/imageMirror";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { image_url?: unknown } | null;
  const rawUrl = typeof body?.image_url === "string" ? body.image_url.trim() : "";

  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "image_url이 필요합니다." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "서버에 BLOB_READ_WRITE_TOKEN이 설정되지 않아 자체 저장소로 복사할 수 없습니다." },
      { status: 503 },
    );
  }

  try {
    const safeUrl = assertSafeImageUrl(rawUrl);
    const { buffer, contentType, ext } = await fetchImage(safeUrl);

    const { put } = await import("@vercel/blob");
    const { url } = await put(`products/${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true, // 같은 초에 두 건 복사해도 덮어쓰지 않도록
    });

    return NextResponse.json({
      ok: true,
      url,
      bytes: buffer.byteLength,
      content_type: contentType,
    });
  } catch (e) {
    if (e instanceof ImageMirrorError) {
      // ImageMirrorError의 메시지는 관리자에게 보여줘도 되는 문구만 담기로 약속돼 있다.
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    // 그 외(Blob 업로드 실패 등)는 원문을 내리지 않고 서버 로그로만 남긴다.
    console.error("[api/admin/products/mirror-image] 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { ok: false, error: "이미지 복사 중 오류가 발생했습니다. 서버 로그를 확인하세요." },
      { status: 500 },
    );
  }
}
