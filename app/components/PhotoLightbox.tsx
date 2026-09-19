"use client";

// ============================================================================
// PhotoLightbox — After(AI 변신) 이미지 전체화면 확대 뷰어. 결과지·다시보기·마이헤어 공용.
//
//   · 핀치 줌(touch-action: pinch-zoom + overflow 스크롤로 팬), 닫기 버튼.
//   · 하단: [사진 저장](기기 사진첩, 기존 downloadImage 재사용) + [공유하기](Web Share, 미지원 시 링크 복사).
//   · 카카오 채널로 사진 전송 없음 — 시스템 공유 시트만(개인 사진 서버 보관 금지·처리방침).
//   · 계측: 열릴 때 photo_zoom, 저장 시 photo_save (meta: source). 이벤트명 신규만 추가.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/eventTracking";
import { downloadImage } from "@/lib/downloadImage";
import { SITE_URL } from "@/lib/siteUrl";
import { toast } from "@/lib/toast";

function dataOrUrlToFile(url: string, filename: string): Promise<File | null> {
  return fetch(url)
    .then((r) => r.blob())
    .then((b) => new File([b], filename, { type: b.type || "image/jpeg" }))
    .catch(() => null);
}

export default function PhotoLightbox({
  url,
  title,
  source,
  onClose,
}: {
  url: string;
  /** 저장 파일명·공유 문구에 쓰는 스타일명(없으면 기본값). */
  title?: string;
  /** 계측 구분(style_result | revisit | my_diary 등). */
  source: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    trackEvent("photo_zoom", { source });
    // ESC 로 닫기(데스크톱).
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const styleName = (title && title.trim()) || "AI헤어";

  async function onSave() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      trackEvent("photo_save", { source });
      await downloadImage(url, styleName);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onShare() {
    try {
      const file = await dataOrUrlToFile(url, `mialtip-${styleName}.jpg`);
      const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
      if (file && typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && typeof navigator.share === "function") {
        await navigator.share({ files: [file], title: "미알팁 | 내 AI 헤어 변신" });
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "미알팁 | 내 AI 헤어 변신", text: "미알팁 — 미용실에서 알 수 없는 꿀팁", url: `${SITE_URL}/style` });
        return;
      }
      await navigator.clipboard?.writeText(`${SITE_URL}/style`);
      toast("링크가 복사됐어요");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // 사용자가 공유 취소
      try { await navigator.clipboard?.writeText(`${SITE_URL}/style`); toast("링크가 복사됐어요"); } catch { /**/ }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      {/* 상단: 닫기 */}
      <div className="flex justify-end p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm active:opacity-80"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 확대 영역 — 핀치 줌(두 손가락) + 줌 후 스크롤로 팬 */}
      <div
        className="flex flex-1 items-center justify-center overflow-auto px-3"
        style={{ touchAction: "pinch-zoom" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="AI 변신 스타일" className="max-h-full max-w-full select-none object-contain" />
      </div>

      {/* 하단: 저장 · 공유 */}
      <div className="flex gap-2.5 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-white text-body font-bold text-black active:opacity-80 disabled:opacity-60"
        >
          {busy ? "저장 중..." : "사진 저장"}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-white/40 text-body font-semibold text-white active:opacity-80"
        >
          공유하기
        </button>
      </div>
    </div>
  );
}
