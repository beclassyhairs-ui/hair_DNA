// ============================================================================
// lib/hairSynthModel.ts — 헤어 합성 모델 단일 출처(Single Source of Truth)
//
// 2026-08-14(개정): ddvinh1/face-swap-gpu → lucataco/faceswap 교체.
//   근거: ddvinh1은 58K런 저트래픽이라 GPU가 항상 cold → 콜드부팅 ~4분(예열로도 못 덮음).
//   실측 비교 결과 lucataco(27.5M런·항상 warm)가 queue 0s·run 0.25s·총 4.2s로 압도적,
//   품질은 동일(같은 inswapper 계열). → lucataco 채택. 프롬프트 없고 레퍼런스 헤어가 그대로 반영.
//   ★ 폴백(lucataco 장애 시 차선): cdingram/face-swap(queue 0.1s·run 7.2s·3.1M런, 동일 스키마).
//
// ⚠️ 반복 사고 교훈: 라벨과 실물이 갈라지면 안 된다(과거 100배 느린 모델로 갔던 사고). 모델명·
//    버전 해시·파라미터를 여기 "한 곳"에서만 정의하고 라우트가 참조한다.
//
// 입력(★ 뒤바뀌면 엉뚱한 결과 — lucataco 스키마):
//   swap_image   = 손님 셀카(넣을 얼굴)   ← "Swap/source image"
//   target_image = 레퍼런스 헤어(장면)     ← "Target/base image"
//   결과 = 레퍼런스의 헤어·몸에 손님 얼굴이 들어간 이미지. (enhance 필드 없음.)
// ============================================================================

/** Replicate 모델 slug. 버전 해시와 함께 고정한다. */
export const HAIRSYNTH_MODEL = "lucataco/faceswap";

/** 모델 버전 해시(불변 고정) — slug만으로는 버전이 흘러갈 수 있어 해시로 못박는다. */
export const HAIRSYNTH_MODEL_VERSION =
  "9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d";

/** Replicate 예측 생성 엔드포인트. */
export const REPLICATE_PREDICTIONS_ENDPOINT = "https://api.replicate.com/v1/predictions";

/** 특정 예측 조회 URL(비동기 폴링용). */
export function replicatePredictionUrl(id: string): string {
  return `${REPLICATE_PREDICTIONS_ENDPOINT}/${encodeURIComponent(id)}`;
}

/** 예측 취소 URL(장기 콜드스타트 타임아웃 시 비용 방치 방지용). */
export function replicateCancelUrl(id: string): string {
  return `${REPLICATE_PREDICTIONS_ENDPOINT}/${encodeURIComponent(id)}/cancel`;
}

/**
 * 결과 이미지 URL 호스트 화이트리스트(SSRF 가드). status 라우트가 예측 output URL 의 바이트를
 * 우리 서버로 가져와 data URI 로 재전송하므로, Replicate 가 실제로 결과를 두는 도메인만 허용한다.
 * (Codex 반영: 신뢰 가능한 Replicate 출력 URL 만 fetch.)
 */
export function isAllowedReplicateOutputUrl(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  return (
    h === "replicate.delivery" ||
    h.endsWith(".replicate.delivery") ||
    h === "replicate.com" ||
    h.endsWith(".replicate.com")
  );
}
