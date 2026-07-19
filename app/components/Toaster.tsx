"use client";

// 하단 중앙 토스트 렌더러. layout에 1회 마운트되어 toast() 호출을 구독한다.
// 각 토스트는 2.5초 후 자동 해제.

import { useEffect, useState } from "react";
import { subscribeToast } from "../../lib/toast";

type ToastItem = { id: number; message: string };

const AUTO_DISMISS_MS = 2500;

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let nextId = 0;
    return subscribeToast((message) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className="pointer-events-auto max-w-[90%] rounded-full bg-[#2F2A22]/95 px-5 py-3 text-center text-[14px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
