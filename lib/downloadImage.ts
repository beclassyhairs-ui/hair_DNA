// ============================================================================
// lib/downloadImage.ts — AI 변신 이미지 저장(모바일 우선). 결과지·다시보기·마이헤어 공용.
//
// 저장 대상은 data URI(만료·CORS 없음)라, 실패는 "저장 방식" 문제였다:
//   ① iOS 사파리는 a[download]를 무시(같은 탭에서 이미지만 열림) → Web Share(파일)로 '사진에 추가' 유도.
//   ② click 직후 동기 revokeObjectURL이 다운로드를 시작 전에 취소 → revoke를 지연.
// ============================================================================

import { toast } from "./toast";

export async function downloadImage(url: string, styleName: string): Promise<void> {
  const filename = `mialtip-${styleName}-${Date.now()}.jpg`;

  let blob: Blob;
  try {
    blob = await (await fetch(url)).blob();
  } catch {
    toast("저장 준비에 실패했어요. 이미지를 길게 눌러 '사진에 추가'를 눌러 주세요.");
    return;
  }

  // ① iOS 사파리 등 — Web Share(파일)로 사진 앱 저장. 버튼 클릭(사용자 제스처) 흐름 안에서 호출.
  try {
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
    if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && typeof navigator.share === "function") {
      await navigator.share({ files: [file] });
      return; // 공유 시트에서 저장/취소 완료
    }
  } catch (e) {
    // 사용자가 공유 시트를 닫은 것(AbortError)은 실패가 아니다 — 조용히 종료.
    if (e instanceof DOMException && e.name === "AbortError") return;
    // 그 외(공유 미지원)면 아래 a[download]로 폴백.
  }

  // ② 데스크톱·안드로이드 크롬 — a[download]. revoke는 지연 해제.
  try {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href     = objectUrl;
    a.download = filename;
    a.rel      = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    toast("저장이 안 되면 이미지를 길게 눌러 '사진에 추가'를 눌러 주세요.");
  }
}
