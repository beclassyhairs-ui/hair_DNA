// ============================================================================
// Vercel Blob Storage — 이미지 업로드 유틸리티
// 환경변수: BLOB_READ_WRITE_TOKEN (Vercel 프로젝트 설정에서 발급)
// ============================================================================

/**
 * base64 data URL(canvas.toDataURL 결과)을 Blob Storage에 업로드하고
 * 퍼블릭 URL을 반환한다.
 */
export async function uploadPhotoToBlob(dataUrl: string): Promise<string> {
  // BLOB_READ_WRITE_TOKEN 미설정 시 Sheets에는 빈 URL로 기록하고 계속 진행
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[storage] BLOB_READ_WRITE_TOKEN 없음 — 이미지 업로드 건너뜀");
    return "";
  }

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const { put } = await import("@vercel/blob");

  const filename = `diagnosis/${Date.now()}.jpg`;
  const { url } = await put(filename, buffer, {
    access: "public",
    contentType: "image/jpeg",
  });

  return url;
}

/**
 * base64 data URL(제품 이미지 파일 업로드)을 Blob Storage의 products/ 경로에
 * 업로드하고 퍼블릭 URL을 반환한다. BLOB_READ_WRITE_TOKEN 미설정 시 에러를 던진다
 * (제품 등록 폼에서 업로드 실패를 즉시 사용자에게 알려야 하므로 diagnosis 업로드와
 * 달리 조용히 건너뛰지 않는다).
 */
export async function uploadProductImageToBlob(dataUrl: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN이 설정되지 않아 이미지를 업로드할 수 없습니다.");
  }

  const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const ext = match?.[1] === "png" ? "png" : "jpg";
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const { put } = await import("@vercel/blob");

  const filename = `products/${Date.now()}.${ext}`;
  const { url } = await put(filename, buffer, {
    access: "public",
    contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
  });

  return url;
}
