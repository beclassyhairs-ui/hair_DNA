// ============================================================================
// lib/hairSynthModel.ts — 헤어 합성 모델 단일 출처(Single Source of Truth)
//
// 2026-08-14(확정125): lucataco/faceswap → ddvinh1/face-swap-gpu 복귀(enhance=false).
//   근거: lucataco는 상시 warm(빠름)이나 GFPGAN 상시 미화가 원본 대비 15~20년 젊게 만들어
//     50·60 타겟에 치명(나이별 레퍼런스 무력화). ddvinh1은 이 계열 유일의 enhance 토글이 있어
//     enhance=false 로 미화를 끌 수 있다(나이 레퍼런스 파일럿에서 사업주 승인). 교체 이유=미화 하나.
//   콜드스타트(저트래픽 GPU 부팅 ~4분)는 선점 예열(/api/hair-transform/warmup)로 숨긴다.
//   라이선스 상태는 lucataco와 동일(둘 다 inswapper 계열) → 그 외 방침 변경 없음.
//   ★ 폴백/롤백(이탈 심할 때 차선): lucataco/faceswap
//       ver 9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d,
//       입력 { swap_image, target_image }(enhance 없음). 이 파일의 MODEL/VERSION/빌더만 바꾸면
//       라우트·예열이 함께 따라온다(라벨↔실물 재분리 방지 위해 라우트에 스키마를 흩지 않는다).
//
// ⚠️ 반복 사고 교훈: 라벨과 실물이 갈라지면 안 된다(과거 100배 느린 모델로 갔던 사고). 모델명·
//    버전 해시·파라미터·입력 스키마를 여기 "한 곳"에서만 정의하고 라우트가 참조한다.
//
// 입력(★ 뒤바뀌면 엉뚱한 결과 — ddvinh1 스키마):
//   swap_image  = 손님 셀카(넣을 얼굴)     ← "Swap image"
//   input_image = 레퍼런스 헤어(장면)       ← "Target image"
//   enhance     = GFPGAN 미화(느림). false = 미화 끔 = 원본 얼굴 최대 보존.
//   결과 = 레퍼런스의 헤어·몸에 손님 얼굴이 들어간 이미지.
// ============================================================================

/** Replicate 모델 slug. 버전 해시와 함께 고정한다. */
export const HAIRSYNTH_MODEL = "ddvinh1/face-swap-gpu";

/** 모델 버전 해시(불변 고정) — slug만으로는 버전이 흘러갈 수 있어 해시로 못박는다. */
export const HAIRSYNTH_MODEL_VERSION =
  "d766886cf43ea2e9821703c392e3d403d2311eb8d013feef924655f9b7e2971d";

/** ★ 이번 선택의 핵심: GFPGAN 미화를 끈다(원본 얼굴 최대 보존). 상수 한 곳에서만 정의. */
export const HAIRSYNTH_ENHANCE = false as const;

/**
 * 모델 입력 페이로드 빌더 — 모델마다 "레퍼런스 헤어"를 담는 키가 다르므로(ddvinh1=input_image,
 * lucataco=target_image) 여기서 흡수한다. 롤백 시 위 MODEL/VERSION 과 이 함수만 함께 바꾸면
 * 라우트(실합성)·예열(warmup)이 자동으로 같은 스키마를 쓴다.
 *   @param swapImage 손님 얼굴(넣을 얼굴)
 *   @param hairImage 레퍼런스 헤어(장면)
 */
export function buildFaceswapInput(
  swapImage: string,
  hairImage: string,
): Record<string, unknown> {
  return { swap_image: swapImage, input_image: hairImage, enhance: HAIRSYNTH_ENHANCE };
}

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
