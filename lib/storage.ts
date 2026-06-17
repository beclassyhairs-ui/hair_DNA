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
