// ============================================================================
// Vercel Blob Storage — 이미지 업로드 유틸리티
// 환경변수: BLOB_READ_WRITE_TOKEN (Vercel 프로젝트 설정에서 발급)
// ※ 서버 전용 lib (Node 런타임 API 라우트에서만 import) → 정적 import 안전.
//   삭제(del)의 import 지연을 마감시각 예산 밖에 두지 않기 위해 동적 import를 쓰지 않는다.
// ============================================================================

import { put, del } from "@vercel/blob";

/**
 * base64 data URL(canvas.toDataURL 결과)을 Blob Storage에 업로드하고
 * 퍼블릭 URL을 반환한다.
 */
export async function uploadPhotoToBlob(
  dataUrl: string,
  opts?: { pathname?: string; abortSignal?: AbortSignal },
): Promise<string> {
  // BLOB_READ_WRITE_TOKEN 미설정 시 빈 URL 반환하고 계속 진행
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[storage] BLOB_READ_WRITE_TOKEN 없음 — 이미지 업로드 건너뜀");
    return "";
  }

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  // 호출부가 pathname(고유 UUID)을 주면 랜덤 접미사 없이 그대로 사용한다.
  // → 업로드가 abort돼 URL을 못 받아도 호출부가 이 pathname으로 삭제할 수 있어,
  //   "저장됐지만 참조 불가한 orphan"이 생기지 않는다.
  const pathname = opts?.pathname ?? `diagnosis/${Date.now()}.jpg`;
  const { url } = await put(pathname, buffer, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: !opts?.pathname,     // pathname 지정 시 접미사 없이 결정적 경로 유지
    abortSignal: opts?.abortSignal,       // 호출부 예산 초과 시 업로드를 끊어 finally 실행을 보장
  });

  return url;
}

/**
 * Blob에 올린 원본 셀카를 즉시 삭제한다.
 * 합성(hair-transform)은 Replicate가 input_image를 URL로 가져가야 해서 셀카를 잠깐
 * Blob에 올리는데, 합성이 끝나면 원본은 더 필요 없다 — 영구 보관하지 않기 위해 지운다.
 * `urlOrPathname`은 공개 URL 또는 pathname 둘 다 가능(@vercel/blob del이 둘 다 받음).
 * 업로드가 abort돼 URL을 못 받은 경우 호출부가 pathname으로 지울 수 있게 하기 위함.
 * (토큰 없음/빈 값/삭제 실패는 사용자 플로우를 막지 않도록 조용히 넘어간다.)
 */
export async function deletePhotoFromBlob(
  urlOrPathname: string,
  opts?: { deadline?: number },
): Promise<void> {
  if (!urlOrPathname) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const url = urlOrPathname;

  // 절대 마감시각을 공유받아 재시도가 호출부 예산(maxDuration)을 넘기지 않게 한다.
  const deadline = opts?.deadline ?? Date.now() + 5_000;

  // 일시적 삭제 장애가 곧바로 영구 공개 보관이 되지 않도록 짧은 타임아웃 + 1회 재시도.
  // (del은 정적 import라 import 지연 없음. 삭제 실패는 잡아서 로그만 — 응답을 오류로 바꾸지 않음.)
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      console.warn(`[storage] ⚠️ 원본 셀카 Blob 삭제 예산 소진 (다음 합성 시 정리 대상): ${url}`);
      return;
    }
    try {
      await del(url, { abortSignal: AbortSignal.timeout(Math.min(2_500, remaining)) });
      console.log(`[storage] 🗑️ 원본 셀카 Blob 삭제 완료: ${url}`);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 2) {
        console.warn(`[storage] ⚠️ 원본 셀카 Blob 삭제 최종 실패 (주기적 정리로 회수 필요): ${url} — ${msg}`);
      } else {
        console.warn(`[storage] 원본 셀카 Blob 삭제 재시도(${attempt}회차 실패): ${msg}`);
      }
    }
  }
}
