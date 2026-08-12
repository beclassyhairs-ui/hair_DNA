// ============================================================================
// lib/hairSynthModel.ts — 헤어 합성 모델 단일 출처(Single Source of Truth)
//
// 2026-08-07(개정): OpenAI gpt-image 폐기 → Replicate faceswap 복귀.
//   근거: 합성 방식 전수 탐색 결과, gpt-image는 얼굴을 미화·재생성해 정체성이 흔들렸고
//   인페인팅 경로도 실전 장벽(스킨톤 이음새·자동 랜드마크·재동의)이 커 폐기. faceswap 계열에서
//   "미화를 최대한 끈" 조합이 최선 → ddvinh1/face-swap-gpu · enhance=false 채택(스윕 최선,
//   0.37초 · ≈₩0). 프롬프트가 없고 레퍼런스 헤어 픽셀이 그대로 반영된다.
//
// ⚠️ 반복 사고 교훈: 라벨과 실물이 갈라지면 안 된다(과거 100배 느린 모델로 갔던 사고). 모델명·
//    버전 해시·파라미터를 여기 "한 곳"에서만 정의하고 라우트가 참조한다.
//
// 입력 순서(★ 뒤바뀌면 엉뚱한 결과):
//   swap_image  = 손님 셀카(넣을 얼굴)   ← "Swap image"
//   input_image = 레퍼런스 헤어(장면)     ← "Target image"
//   결과 = 레퍼런스의 헤어·몸에 손님 얼굴이 들어간 이미지.
//   (스키마 원문: swap_image "Swap image" / input_image "Target image" / enhance "Apply GFPGAN
//    enhancement (slower)". enhance=false = GFPGAN 미화 끔 = 원본 최대 보존.)
// ============================================================================

/** Replicate 모델 slug. 버전 해시와 함께 고정한다. */
export const HAIRSYNTH_MODEL = "ddvinh1/face-swap-gpu";

/** 모델 버전 해시(불변 고정) — slug만으로는 버전이 흘러갈 수 있어 해시로 못박는다. */
export const HAIRSYNTH_MODEL_VERSION =
  "d766886cf43ea2e9821703c392e3d403d2311eb8d013feef924655f9b7e2971d";

/** ★ 이번 선택의 핵심: GFPGAN 미화를 끈다(원본 얼굴 최대 보존). 상수 한 곳에서만 정의. */
export const HAIRSYNTH_ENHANCE = false as const;

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
