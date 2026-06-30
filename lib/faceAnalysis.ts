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
//   jawRatio      일반 성인: 0.78~0.94 (LM 132/361 ↔ 234/454 비율)
//   foreheadRatio 일반 성인: 0.68~0.92 (LM 71/301 ↔ 234/454 비율)
//   lengthRatio   일반 성인: 1.05~1.45 (LM 10/152 ↔ 234/454 비율)
//
// [8대 얼굴형 예상 구간]
//   각진형   jawRatio > 0.92
//   둥근형   jawRatio 0.78~0.92 + lengthRatio < 1.23
//   계란형   jawRatio 0.73~0.85 + lengthRatio 1.23~1.32  (default)
//   긴형     lengthRatio > 1.32
//   하트형   jawRatio < 0.72 + foreheadRatio ≥ 0.76  (역삼각)
//   다이아몬드 jawRatio < 0.72 + foreheadRatio < 0.76 + taperDelta < 0.10
//   땅콩형   jawRatio 0.72~0.92 + foreheadRatio < 0.76
//   육각형   jawRatio 0.80~0.92 + foreheadRatio > 0.87
export const FACE_THRESHOLDS = {
  // 세로/가로 비율 구분점
  LONG_FACE_RATIO:       1.32,  // lengthRatio > this → 긴형
  SHORT_FACE_RATIO:      1.23,  // lengthRatio < this (중간 하관 구간) → 둥근형

  // 하관/광대 비율 구분점
  WIDE_JAW_RATIO:        0.92,  // jawRatio > this → 각진형
  NARROW_JAW_RATIO:      0.72,  // jawRatio < this → V라인 계열

  // 이마(관자놀이)/광대 비율 구분점
  NARROW_FOREHEAD_RATIO: 0.76,  // foreheadRatio < this → 다이아몬드 / 땅콩형
  WIDE_FOREHEAD_RATIO:   0.87,  // foreheadRatio > this → 육각형 / 하트형 후보

  // 육각형 보조 조건
  HEXAGON_JAW_MIN:       0.80,  // 육각형: 하관도 넓어야 함

  // 하트형 vs 다이아몬드형 구분
  // (foreheadRatio - jawRatio) > this → 이마가 하관보다 뚜렷이 넓음 → 하트
  HEART_TAPER_MIN:       0.10,
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

// ─── 8대 얼굴형 판별 로직 — FACE_THRESHOLDS 기반 if/else 트리 ─────────────────
//
// 판정 흐름:
//   긴형 → 각진형 → [V라인: 다이아몬드 / 하트]
//   → 둥근형 → 땅콩형 → 육각형 → 계란형(default)
//
// taperDelta = foreheadRatio - jawRatio
//   · 양수가 클수록 "이마가 하관보다 뚜렷이 넓음" → 하트형에 가까움
//   · 0에 가깝거나 음수 → 위아래 모두 비슷하게 좁거나 좁지 않음
export function classifyFaceShape(landmarks: Landmark[]): FaceShapeKey {
  const T = FACE_THRESHOLDS;
  const lengthRatio   = calcLengthRatio(landmarks);
  const jawRatio      = calcJawRatio(landmarks);
  const foreheadRatio = calcForeheadRatio(landmarks);
  const taperDelta    = foreheadRatio - jawRatio; // +: 이마 > 하관

  // ── 1. 긴형: 세로/가로 > 1.32 ────────────────────────────────────────────────
  if (lengthRatio > T.LONG_FACE_RATIO) return "oblong";

  // ── 2. 각진형: 하관이 광대의 92% 이상 — 뚜렷한 사각 하관 ─────────────────────
  if (jawRatio > T.WIDE_JAW_RATIO) return "square";

  // ── 3. V라인 계열: 하관 < 72% — 좁은 턱선 ────────────────────────────────────
  if (jawRatio < T.NARROW_JAW_RATIO) {

    // 다이아몬드형:
    //   · 이마(관자놀이)도 좁음 (< 0.76)
    //   · 이마-하관 차이가 작음 (< 0.10) → 위아래 모두 좁고 광대만 돌출
    if (foreheadRatio < T.NARROW_FOREHEAD_RATIO && taperDelta < T.HEART_TAPER_MIN) {
      return "diamond";
    }

    // 하트형(역삼각형):
    //   · 이마가 넓음 (≥ 0.76) — 조건 A
    //   · OR 이마가 좁아도 하관보다 뚜렷이 넓음 (taperDelta ≥ 0.10) — 조건 B
    //   → 두 조건 모두 이마가 하관보다 우세 → 역삼각 실루엣
    return "heart";
  }

  // ── 4. 중간 하관 범위 (0.72 ~ 0.92) ──────────────────────────────────────────

  // 4-a. 둥근형: 짧은 얼굴 + 중간 하관
  //      (각진형 체크를 통과했으므로 jawRatio ≤ 0.92 보장)
  if (lengthRatio < T.SHORT_FACE_RATIO) return "round";

  // 4-b. 땅콩형: 관자놀이(이마)가 눈에 띄게 좁음
  //      중간 하관 + 좁은 이마 → 광대가 얼굴에서 유독 두드러짐
  //      (긴형·각진형·둥근형 아님이 이미 확인된 상태)
  if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "peanut";

  // 4-c. 육각형: 이마·광대·하관 세 구간이 모두 넓음
  //      위아래가 동시에 발달한 풍성한 골격
  //      (이 조건에 도달하면 길이는 1.23~1.32로 제한됨)
  if (foreheadRatio > T.WIDE_FOREHEAD_RATIO && jawRatio > T.HEXAGON_JAW_MIN) return "hexagon";

  // ── 5. 계란형: 균형잡힌 비율 (default) ──────────────────────────────────────
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
