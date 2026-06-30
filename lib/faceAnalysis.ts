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
// MediaPipe LM 132/361(하관)은 LM 234/454(광대)와 윤곽선상 2칸 차이라
// jawRatio가 실제 얼굴 어느 유형이든 0.82~0.93 대에 몰리는 경향이 있음.
// 이를 반영해 WIDE_JAW_RATIO를 0.85→0.92로 대폭 상향,
// SHORT_FACE_RATIO를 1.15→1.23으로 상향해 둥근형 판정 가용 범위를 확장.
export const FACE_THRESHOLDS = {
  LONG_FACE_RATIO:       1.32, // lengthRatio > this → 긴형 (기존 1.35)
  SHORT_FACE_RATIO:      1.23, // lengthRatio < this → 둥근형 후보 (기존 1.15)
  WIDE_JAW_RATIO:        0.92, // jawRatio > this → 각진형 (기존 0.85 → 상향)
  NARROW_JAW_RATIO:      0.72, // jawRatio < this → 하트/다이아몬드 (기존 0.70)
  NARROW_FOREHEAD_RATIO: 0.76, // foreheadRatio < this → 다이아몬드/땅콩형 (기존 0.75)
  WIDE_FOREHEAD_RATIO:   0.87, // foreheadRatio > this → 육각형 후보 (신규)
  HEXAGON_JAW_MIN:       0.80, // 육각형 최소 하관 비율 (신규)
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
// 판정 흐름 요약:
//   긴형(oblong) → 각진형(square) → V라인(heart/diamond)
//   → 둥근형(round) → 땅콩형(peanut) → 육각형(hexagon) → 계란형(oval)
//
// 핵심 수정: 각진형 임계값을 0.85→0.92로 올려 대부분 얼굴이
//           square에 수렴하던 버그를 해소. 둥근형 판정 범위도
//           SHORT_FACE_RATIO 1.15→1.23 상향으로 확장.
export function classifyFaceShape(landmarks: Landmark[]): FaceShapeKey {
  const T = FACE_THRESHOLDS;
  const lengthRatio   = calcLengthRatio(landmarks);
  const jawRatio      = calcJawRatio(landmarks);
  const foreheadRatio = calcForeheadRatio(landmarks);

  // 1. 긴형: 세로/가로 > 1.32
  if (lengthRatio > T.LONG_FACE_RATIO) return "oblong";

  // 2. 각진형: 하관이 광대의 92% 이상 — 명확한 사각 하관만 해당
  //    (기존 0.85는 대부분 얼굴을 여기서 걸러냈음)
  if (jawRatio > T.WIDE_JAW_RATIO) return "square";

  // 3. V라인 계열: 하관이 광대의 72% 미만 — 좁은 턱선
  if (jawRatio < T.NARROW_JAW_RATIO) {
    // 이마(관자놀이)도 좁음 → 광대만 돌출 → 다이아몬드
    if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "diamond";
    // 이마는 정상 이상 → 역삼각 → 하트
    return "heart";
  }

  // 4. 중간 하관 범위 (0.72 ~ 0.92) — 세부 분류
  // 4-a. 둥근형: 짧은 얼굴 (이미 각진형 아님이 확인된 jawRatio 범위)
  if (lengthRatio < T.SHORT_FACE_RATIO) return "round";

  // 4-b. 땅콩형: 관자놀이가 눈에 띄게 좁음 (측두부 패임)
  if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) return "peanut";

  // 4-c. 육각형: 이마·광대·하관 세 구간이 모두 넓음
  if (foreheadRatio > T.WIDE_FOREHEAD_RATIO && jawRatio > T.HEXAGON_JAW_MIN) return "hexagon";

  // 5. 균형잡힌 비율 → 계란형 (default)
  return "oval";
}

// ─── 공개 API 타입 ─────────────────────────────────────────────────────────────
export interface FaceAnalysisResult {
  shape:     FaceShapeKey;
  landmarks: FaceLandmarkData | null;
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
