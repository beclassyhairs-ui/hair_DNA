// ============================================================================
// lib/faceswapModel.ts — faceswap 모델·해시 단일 출처(Single Source of Truth)
//
// ⚠️ 2026-08-06 사고 교훈: 옛 동작본은 lucataco/faceswap(해시 9a4298…)인데 코드 주석·
//   설계문서가 "codeplugtech"으로 잘못 라벨했다 → 8/5 "복원" 때 그 라벨을 보고 진짜
//   codeplugtech(278a81e7, 실측 57~59s)으로 갈아타 함수 예산(52s)을 넘겨 전건 타임아웃.
//   재발 방지: 모델명·해시를 여기 "한 곳"에서만 정의하고 라우트·로그가 이걸 참조한다.
//   → 라벨과 실물이 다시는 갈라지지 않는다.
//
// 확정(2026-08-06): lucataco/faceswap · 9a4298…843d20d · 사유: 실측 ~1s(6/25 0.6~1.0s·canary 1.15s / codeplugtech 57~59s).
// 스키마: { target_image=레퍼런스(캔버스), swap_image=셀카(넣을 얼굴) }. 커뮤니티 모델 →
//   /v1/predictions + version hash. 해시 교체는 canary + 품질 회귀테스트 동반(단순 설정 아님).
// ============================================================================

/** 표시·로그용 모델 식별자(라벨은 여기서만). */
export const FACESWAP_MODEL = "lucataco/faceswap";

/** Replicate version hash(실물). env REPLICATE_VERSION이 있으면 그게 우선. */
export const FACESWAP_VERSION =
  "9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d";
