// 유저 대면 안내 토스트 — 화면 하단 중앙, 2.5초 자동 해제.
// 모듈 단위 pub/sub로 컴포넌트 훅 없이 어디서든 toast() 호출 가능.
// (관리자 삭제 확인 등 "차단형" 상호작용은 window.confirm 유지 — 토스트로 대체 금지)

type ToastListener = (message: string) => void;

let listeners: ToastListener[] = [];

export function toast(message: string) {
  listeners.forEach((listener) => listener(message));
}

export function subscribeToast(listener: ToastListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
