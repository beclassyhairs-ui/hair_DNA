// ============================================================================
// 어뷰티 — MediaPipe Face Mesh 얼굴형 분석 라이브러리 v3
//
// 패키지: npm i @mediapipe/face_mesh@0.4.1633559619 (이미 설치됨)
// WASM/모델 파일: CDN locateFile (별도 서빙 불필요)
//
// 한국인 '둥근형/계란형' 쏠림 방지 → 3가지 독립 비율 교차 검증
//   lengthRatio    = 세로(10→152) / 가로(234→454)    → 긴형·둥근형
//   jawRatio       = 턱 너비(132→361) / 가로(234→454) → 각진형·역삼각형
//   foreheadRatio  = 이마(71→301) / 가로(234→454)    → 다이아몬드·땅콩형
// ============================================================================

// npm 타입 임포트 (런타임은 아래 동적 import 사용)
import type { Results } from "@mediapipe/face_mesh";

export type FaceShapeKey =
  | "oval" | "round" | "oblong" | "square"
  | "heart" | "diamond" | "hexagon" | "peanut";

export interface Landmark { x: number; y: number; z: number; }

// ─── 핵심 랜드마크 인덱스 ─────────────────────────────────────────────────────
const LM = {
  TOP_HEAD:      10,   // 이마 최상단
  CHIN:         152,   // 턱끝
  LEFT_CHEEK:   234,   // 왼쪽 광대 외곽
  RIGHT_CHEEK:  454,   // 오른쪽 광대 외곽
  LEFT_JAW:     132,   // 왼쪽 하관 각 (턱 너비)
  RIGHT_JAW:    361,   // 오른쪽 하관 각
  LEFT_TEMPLE:   71,   // 왼쪽 관자놀이 (이마 너비)
  RIGHT_TEMPLE: 301,   // 오른쪽 관자놀이
} as const;

// Face Oval 외곽 36점 (MediaPipe 표준 face contour path)
export const FACE_OVAL_SEQUENCE = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172,  58, 132,  93, 234, 127, 162,  21,  54, 103,  67, 109,
] as const;

// ─── THRESHOLDS — 미세 조정 시 이 객체만 수정 ─────────────────────────────────
//
// [비율 개요] MediaPipe 정규화 좌표 기준 실측 분포
//   jawRatio      일반 성인: 0.78~0.94 (LM 132/361 ↔ 234/454)
//   foreheadRatio 일반 성인: 0.68~0.92 (LM 71/301 ↔ 234/454)
//   lengthRatio   일반 성인: 1.05~1.45 (LM 10/152 ↔ 234/454)
//   taperDelta    = foreheadRatio - jawRatio
//
// [핵심 설계 변경 — v4]
//   LM 132/361은 턱 끝이 아닌 "광대 바로 아래 하면부"를 측정하므로
//   하트형 얼굴도 jawRatio 0.74~0.81 범위에서 나타남 → NARROW_JAW_RATIO 단독
//   판정으로는 하트형 캐치 불가. taperDelta(이마-하관 비율 차)를 1차 신호로 사용.
//
// [8대 얼굴형 판정 구간 — 현실화]
//   하트형   jawRatio < 0.82 AND taperDelta > 0.08 (V-라인 우선 포획)
//   다이아몬드 위 조건 + foreheadRatio < 0.82
//   각진형   jawRatio > 0.90 AND foreheadRatio ≥ 0.82
//   땅콩형   jawRatio > 0.90 AND foreheadRatio < 0.82  (또는 중간 하관+좁은 이마)
//   긴형     lengthRatio > 1.30
//   둥근형   lengthRatio < 1.25  (V-라인 배제 확인 후)
//   육각형   foreheadRatio > 0.87 AND jawRatio > 0.80
//   계란형   default
export const FACE_THRESHOLDS = {
  // 세로/가로 비율 구분점
  LONG_FACE_RATIO:       1.30,  // lengthRatio > this → 긴형  (1.32 → 1.30)
  SHORT_FACE_RATIO:      1.25,  // lengthRatio < this → 둥근형 (1.23 → 1.25)

  // V-라인 감지 (하트/다이아몬드) — 2중 조건
  VLINE_JAW_MAX:         0.82,  // jawRatio < this (신규) — 하트/다이아 상한
  HEART_TAPER_MIN:       0.08,  // taperDelta > this → V-라인 확정 (0.10 → 0.08)
  NARROW_JAW_RATIO:      0.76,  // jawRatio < this → 극단 V-라인 2차 방어선

  // 하관/광대 비율 구분점
  WIDE_JAW_RATIO:        0.90,  // jawRatio > this → 각진형/땅콩형 (0.92 → 0.90)

  // 이마(관자놀이)/광대 비율 구분점 — 연성화
  NARROW_FOREHEAD_RATIO: 0.82,  // foreheadRatio < this → 다이아몬드/땅콩형 (0.76 → 0.82)
  WIDE_FOREHEAD_RATIO:   0.87,  // foreheadRatio > this → 육각형 후보

  // 육각형 보조 조건
  HEXAGON_JAW_MIN:       0.80,
} as const;

// ─── 거리 계산 헬퍼 ───────────────────────────────────────────────────────────
function hDist(a: Landmark, b: Landmark) { return Math.abs(b.x - a.x); }
function vDist(a: Landmark, b: Landmark) { return Math.abs(b.y - a.y); }

// ─── 3가지 비율 계산 (독립 공개 — 디버깅/튜닝 용도) ─────────────────────────
export function calcLengthRatio(lm: Landmark[]): number {
  const w = hDist(lm[LM.LEFT_CHEEK], lm[LM.RIGHT_CHEEK]);
  return w > 0 ? vDist(lm[LM.TOP_HEAD], lm[LM.CHIN]) / w : 1.0;
}
export function calcJawRatio(lm: Landmark[]): number {
  const w = hDist(lm[LM.LEFT_CHEEK], lm[LM.RIGHT_CHEEK]);
  return w > 0 ? hDist(lm[LM.LEFT_JAW], lm[LM.RIGHT_JAW]) / w : 1.0;
}
export function calcForeheadRatio(lm: Landmark[]): number {
  const w = hDist(lm[LM.LEFT_CHEEK], lm[LM.RIGHT_CHEEK]);
  return w > 0 ? hDist(lm[LM.LEFT_TEMPLE], lm[LM.RIGHT_TEMPLE]) / w : 1.0;
}

// ─── 랜드마크 데이터 타입 (Canvas 시각화) ────────────────────────────────────
export interface ShapeKeyPoints {
  top:          { x: number; y: number };
  chin:         { x: number; y: number };
  leftCheek:    { x: number; y: number };
  rightCheek:   { x: number; y: number };
  leftJaw:      { x: number; y: number };
  rightJaw:     { x: number; y: number };
  leftTemple:   { x: number; y: number };
  rightTemple:  { x: number; y: number };
}
export interface FaceLandmarkData {
  oval:  { x: number; y: number }[];
  shape: ShapeKeyPoints;
}

export function extractLandmarkData(lm: Landmark[]): FaceLandmarkData {
  return {
    oval: Array.from(FACE_OVAL_SEQUENCE).map((i) => ({ x: lm[i].x, y: lm[i].y })),
    shape: {
      top:          { x: lm[LM.TOP_HEAD].x,    y: lm[LM.TOP_HEAD].y },
      chin:         { x: lm[LM.CHIN].x,         y: lm[LM.CHIN].y },
      leftCheek:    { x: lm[LM.LEFT_CHEEK].x,  y: lm[LM.LEFT_CHEEK].y },
      rightCheek:   { x: lm[LM.RIGHT_CHEEK].x, y: lm[LM.RIGHT_CHEEK].y },
      leftJaw:      { x: lm[LM.LEFT_JAW].x,    y: lm[LM.LEFT_JAW].y },
      rightJaw:     { x: lm[LM.RIGHT_JAW].x,   y: lm[LM.RIGHT_JAW].y },
      leftTemple:   { x: lm[LM.LEFT_TEMPLE].x, y: lm[LM.LEFT_TEMPLE].y },
      rightTemple:  { x: lm[LM.RIGHT_TEMPLE].x,y: lm[LM.RIGHT_TEMPLE].y },
    },
  };
}

// ─── 8대 얼굴형 판별 로직 v4 — 우선순위 전면 재정렬 ─────────────────────────────
//
// [v4 핵심 변경]
//   기존 오류: 하트형(역삼각)이 V-라인 버킷 도달 전에 "둥근형" 덫에 걸림
//     원인: LM 132/361이 턱 끝 아닌 하면부를 측정 → 하트형도 jawRatio 0.74~0.81
//           → NARROW_JAW_RATIO(0.72) 통과 실패 → 짧은 얼굴이면 round 조기 반환
//
//   수정: ① V-라인을 1순위로 격상
//         ② jawRatio 단독 대신 [jawRatio < 0.82 AND taperDelta > 0.08] 2중 조건
//         ③ 짧은 얼굴의 하트형 → V-라인 선포획 후 round 체크로 진입 불가
//
// [판정 순서]
//   1위. V-라인(하트/다이아)  — taperDelta 우선 신호
//   2위. 각진형/땅콩형        — 넓은 하관
//   3위. 긴형
//   4위. 둥근형               — V-라인 배제 확인 후에만 도달
//   5위. 땅콩형 (2차 포획)
//   6위. 육각형
//   7위. 계란형 (default)
export function classifyFaceShape(landmarks: Landmark[]): FaceShapeKey {
  const T = FACE_THRESHOLDS;
  const lengthRatio   = calcLengthRatio(landmarks);
  const jawRatio      = calcJawRatio(landmarks);
  const foreheadRatio = calcForeheadRatio(landmarks);
  const taperDelta    = foreheadRatio - jawRatio; // +크면 이마 > 하관 → 역삼각 신호

  // ── 1위. V-라인 계열 (하트/다이아몬드) — 최우선 포획 ─────────────────────────
  //
  // [1차] 2중 조건: 하관이 중간 이하이고 이마가 하관보다 의미 있게 넓음
  //   · jawRatio < VLINE_JAW_MAX(0.82): 하관이 광대의 82% 미만 — 역삼각 범위
  //   · taperDelta > HEART_TAPER_MIN(0.08): 이마가 하관보다 8%p 이상 넓음
  //   → 이 두 조건을 동시에 만족하면 V-라인 계열로 확정
  if (jawRatio < T.VLINE_JAW_MAX && taperDelta > T.HEART_TAPER_MIN) {
    // 다이아몬드: 이마도 좁음(이마가 넓지 않고 광대만 돌출)
    if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "diamond";
    // 하트(역삼각): 이마가 정상 이상
    return "heart";
  }

  // [2차] 극단 V-라인 안전망: jawRatio가 매우 좁은 경우 (하트의 극단형)
  if (jawRatio < T.NARROW_JAW_RATIO) {
    if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "diamond";
    return "heart";
  }

  // ── 2위. 각진형 / 땅콩형 — 넓은 하관 ─────────────────────────────────────────
  //   jawRatio > 0.90, foreheadRatio로 세부 분기
  if (jawRatio > T.WIDE_JAW_RATIO) {
    if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "peanut";
    return "square";
  }

  // ── 3위. 긴형 ────────────────────────────────────────────────────────────────
  if (lengthRatio > T.LONG_FACE_RATIO) return "oblong";

  // ── 4위. 둥근형 — V-라인 이미 배제된 상태에서만 도달 ──────────────────────────
  //   (1위에서 V-라인을 걸러냈으므로 여기 도달한 짧은 얼굴 = 진짜 둥근형)
  if (lengthRatio < T.SHORT_FACE_RATIO) return "round";

  // ── 5위. 땅콩형 (2차 포획) — 중간 하관 + 좁은 이마 ──────────────────────────
  if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "peanut";

  // ── 6위. 육각형 — 이마·하관 모두 넓음 ───────────────────────────────────────
  if (foreheadRatio > T.WIDE_FOREHEAD_RATIO && jawRatio > T.HEXAGON_JAW_MIN) return "hexagon";

  // ── 7위. 계란형 — 균형잡힌 비율 (default) ────────────────────────────────────
  return "oval";
}

// ─── 공개 API 타입 ─────────────────────────────────────────────────────────────
export interface FaceRatios {
  lengthRatio:   number;
  jawRatio:      number;
  foreheadRatio: number;
}

export interface FaceAnalysisResult {
  shape:     FaceShapeKey;
  landmarks: FaceLandmarkData | null;
  ratios:    FaceRatios;
}

// ─────────────────────────────────────────────────────────────────────────────
// analyzeFaceShape — npm @mediapipe/face_mesh 동적 임포트
// WASM/모델 파일은 CDN locateFile로 제공 (빌드 설정 불필요)
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeFaceShape(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): Promise<FaceAnalysisResult | null> {
  if (typeof window === "undefined") return null;

  try {
    // 동적 임포트: 브라우저에서만 실행, SSR 완전 차단
    const { FaceMesh } = await import("@mediapipe/face_mesh");

    const faceMesh = new FaceMesh({
      // WASM·모델 파일은 CDN에서 로드 (node_modules 서빙 불필요)
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces:            1,
      refineLandmarks:        true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5,
    });

    return new Promise<FaceAnalysisResult | null>((resolve) => {
      faceMesh.onResults((results: Results) => {
        const lms = results.multiFaceLandmarks?.[0];
        if (!lms || lms.length < 468) {
          resolve(null);
        } else {
          const asLm = lms as unknown as Landmark[];
          resolve({
            shape:     classifyFaceShape(asLm),
            landmarks: extractLandmarkData(asLm),
            ratios: {
              lengthRatio:   calcLengthRatio(asLm),
              jawRatio:      calcJawRatio(asLm),
              foreheadRatio: calcForeheadRatio(asLm),
            },
          });
        }
        faceMesh.close().catch(() => {});
      });

      faceMesh.send({ image }).catch(() => {
        faceMesh.close().catch(() => {});
        resolve(null);
      });

      // 8초 타임아웃 (모델 최초 다운로드 시간 고려)
      setTimeout(() => resolve(null), 8000);
    });
  } catch {
    return null;
  }
}
