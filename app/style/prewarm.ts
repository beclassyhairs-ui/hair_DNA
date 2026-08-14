// ============================================================================
// app/style/prewarm.ts — faceswap GPU 선점 예열 발사 헬퍼(클라 전용) · B안(확정125)
//
// 서버(/api/hair-transform/warmup)가 90초 쿨다운·전역상한으로 최종 방어하므로, 클라는 "언제
// 쏠지"만 판단한다. 발사 시각을 sessionStorage(STYLE_PREWARM_KEY)에 ms 로 남겨 두 지점이 공유한다.
//   · 주발사(survey 마운트) : 세션당 1회 — 플래그 없을 때만.
//   · 보조발사(upload 마운트): 직전 발사 180초 초과일 때만(유휴 GPU 재수면 대비 재점화).
// 실패해도 조용히 무시(fire-and-forget). 응답 본문은 읽지 않는다.
// ============================================================================

import { STYLE_PREWARM_KEY } from "./constants";

const SECONDARY_REFIRE_MS = 180_000; // 보조발사 재점화 문턱(직전 발사 후 3분)

function readLastFire(): number | null {
  try {
    const raw = sessionStorage.getItem(STYLE_PREWARM_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** 예열 예측을 백그라운드로 발사하고 발사 시각을 기록한다. keepalive 로 네비게이션 중에도 완주. */
function fire(now: number): void {
  try { sessionStorage.setItem(STYLE_PREWARM_KEY, String(now)); } catch { /* 접근 불가 — 무시 */ }
  // keepalive: 페이지 전환(설문→로그인→사진)로 컴포넌트가 언마운트돼도 요청이 끊기지 않게.
  void fetch("/api/hair-transform/warmup", { method: "POST", keepalive: true }).catch(() => { /* 무시 */ });
}

/** 주발사 — 이 세션에서 아직 예열한 적 없으면 1회 발사. (survey 마운트에서 호출) */
export function prewarmPrimary(): void {
  if (readLastFire() !== null) return;
  fire(Date.now());
}

/** 보조발사 — 직전 발사가 없거나 180초를 넘었으면 재점화. (upload 마운트에서 호출) */
export function prewarmSecondary(): void {
  const last = readLastFire();
  const now = Date.now();
  if (last !== null && now - last <= SECONDARY_REFIRE_MS) return;
  fire(now);
}
