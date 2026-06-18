// ============================================================================
// 어뷰티 — MediaPipe Face Mesh 기반 얼굴형 분석 라이브러리 v2
//
// 로드 방식: CDN 동적 주입 (npm install 불필요)
// CDN: https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619
//
// 한국인 '둥근형/계란형' 쏠림 방지 → 3가지 독립 비율 교차 검증:
//   lengthRatio    = 세로 / 가로              → 긴형·둥근형 판단
//   jawRatio       = 턱 너비 / 광대 너비      → 각진형·역삼각형 판단
//   foreheadRatio  = 이마 너비 / 광대 너비    → 다이아몬드·땅콩형 판단
// ============================================================================

export type FaceShapeKey =
  | "oval" | "round" | "oblong" | "square"
  | "heart" | "diamond" | "hexagon" | "peanut";

export interface Landmark { x: number; y: number; z: number; }

// ─────────────────────────────────────────────────────────────────────────────
// 핵심 랜드마크 인덱스 (MediaPipe Face Mesh 468점)
// 사용자 지정 정확 인덱스
// ─────────────────────────────────────────────────────────────────────────────
const LM = {
  TOP_HEAD:      10,   // 이마 최상단 (세로 Face Length 상단)
  CHIN:         152,   // 턱끝 (세로 Face Length 하단)

  LEFT_CHEEK:   234,   // 왼쪽 광대 최돌출 (가로 Face Width 기준)
  RIGHT_CHEEK:  454,   // 오른쪽 광대 최돌출

  LEFT_JAW:     132,   // 왼쪽 하관 각 (Jaw Width)
  RIGHT_JAW:    361,   // 오른쪽 하관 각

  LEFT_TEMPLE:   71,   // 왼쪽 관자놀이 (Forehead Width)
  RIGHT_TEMPLE: 301,   // 오른쪽 관자놀이
} as const;

// Face Oval 외곽 36점 순서 (MediaPipe 표준 face contour path)
export const FACE_OVAL_SEQUENCE = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172,  58, 132,  93, 234, 127, 162,  21,  54, 103,  67, 109,
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 임계값 객체 — 추후 미세 조정 시 이 객체만 수정
// ─────────────────────────────────────────────────────────────────────────────
export const FACE_THRESHOLDS = {
  LONG_FACE_RATIO:       1.35, // lengthRatio > 이 값 → 긴형(oblong)
  SHORT_FACE_RATIO:      1.15, // lengthRatio < 이 값 → 둥근형/짧은형(round)
  WIDE_JAW_RATIO:        0.85, // jawRatio > 이 값 → 각진형(square)
  NARROW_JAW_RATIO:      0.70, // jawRatio < 이 값 → 역삼각(heart) or 다이아몬드
  NARROW_FOREHEAD_RATIO: 0.75, // foreheadRatio < 이 값 → 다이아몬드·땅콩형
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 랜드마크 데이터 타입 (Canvas 시각화에 사용)
// ─────────────────────────────────────────────────────────────────────────────
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
  oval:  { x: number; y: number }[]; // 36점 외곽 윤곽선
  shape: ShapeKeyPoints;              // 8점 핵심 측정 좌표
}

// ─────────────────────────────────────────────────────────────────────────────
// 거리 계산 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
function hDist(a: Landmark, b: Landmark): number {
  return Math.abs(b.x - a.x);
}
function vDist(a: Landmark, b: Landmark): number {
  return Math.abs(b.y - a.y);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3가지 비율 계산 함수 (독립 공개 — 테스트·디버깅용)
// ─────────────────────────────────────────────────────────────────────────────

/** 세로/가로 비율 — 긴형/둥근형 판단 */
export function calcLengthRatio(lm: Landmark[]): number {
  const faceW = hDist(lm[LM.LEFT_CHEEK], lm[LM.RIGHT_CHEEK]);
  return faceW > 0 ? vDist(lm[LM.TOP_HEAD], lm[LM.CHIN]) / faceW : 1.0;
}

/** 턱 너비 / 광대 너비 — 각진형/하트형 판단 */
export function calcJawRatio(lm: Landmark[]): number {
  const cheekW = hDist(lm[LM.LEFT_CHEEK], lm[LM.RIGHT_CHEEK]);
  return cheekW > 0 ? hDist(lm[LM.LEFT_JAW], lm[LM.RIGHT_JAW]) / cheekW : 1.0;
}

/** 이마 너비 / 광대 너비 — 다이아몬드/땅콩형 판단 */
export function calcForeheadRatio(lm: Landmark[]): number {
  const cheekW = hDist(lm[LM.LEFT_CHEEK], lm[LM.RIGHT_CHEEK]);
  return cheekW > 0 ? hDist(lm[LM.LEFT_TEMPLE], lm[LM.RIGHT_TEMPLE]) / cheekW : 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 랜드마크 데이터 추출 (Canvas 시각화 입력용)
// ─────────────────────────────────────────────────────────────────────────────
export function extractLandmarkData(lm: Landmark[]): FaceLandmarkData {
  const oval = Array.from(FACE_OVAL_SEQUENCE).map((idx) => ({
    x: lm[idx].x,
    y: lm[idx].y,
  }));

  const shape: ShapeKeyPoints = {
    top:         { x: lm[LM.TOP_HEAD].x,     y: lm[LM.TOP_HEAD].y },
    chin:        { x: lm[LM.CHIN].x,          y: lm[LM.CHIN].y },
    leftCheek:   { x: lm[LM.LEFT_CHEEK].x,   y: lm[LM.LEFT_CHEEK].y },
    rightCheek:  { x: lm[LM.RIGHT_CHEEK].x,  y: lm[LM.RIGHT_CHEEK].y },
    leftJaw:     { x: lm[LM.LEFT_JAW].x,     y: lm[LM.LEFT_JAW].y },
    rightJaw:    { x: lm[LM.RIGHT_JAW].x,    y: lm[LM.RIGHT_JAW].y },
    leftTemple:  { x: lm[LM.LEFT_TEMPLE].x,  y: lm[LM.LEFT_TEMPLE].y },
    rightTemple: { x: lm[LM.RIGHT_TEMPLE].x, y: lm[LM.RIGHT_TEMPLE].y },
  };

  return { oval, shape };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8대 얼굴형 판별 로직 — FACE_THRESHOLDS 기반 if/else 트리
// ─────────────────────────────────────────────────────────────────────────────
export function classifyFaceShape(landmarks: Landmark[]): FaceShapeKey {
  const T = FACE_THRESHOLDS;

  const lengthRatio   = calcLengthRatio(landmarks);
  const jawRatio      = calcJawRatio(landmarks);
  const foreheadRatio = calcForeheadRatio(landmarks);

  // ── 1. 긴형: 세로/가로 비율이 임계값 초과 ──────────────────────────────────
  if (lengthRatio > T.LONG_FACE_RATIO) return "oblong";

  // ── 2. 각진형: 턱이 광대만큼 넓음 ─────────────────────────────────────────
  if (jawRatio > T.WIDE_JAW_RATIO) return "square";

  // ── 3. V라인 계열 (턱이 좁음) ─────────────────────────────────────────────
  if (jawRatio < T.NARROW_JAW_RATIO) {
    if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) {
      // 이마도 좁음 → 광대만 돌출 → 다이아몬드
      return "diamond";
    } else {
      // 이마는 정상 이상 → 역삼각형 → 하트
      return "heart";
    }
  }

  // ── 4. 중간 턱 너비 (0.70 ~ 0.85) ─────────────────────────────────────────
  if (lengthRatio < T.SHORT_FACE_RATIO) {
    // 세로/가로가 짧음 → 둥근형
    return "round";
  }

  if (foreheadRatio < T.NARROW_FOREHEAD_RATIO) {
    // 이마 좁고 + 턱 중간 → 관자놀이 패임 특징 → 땅콩형
    return "peanut";
  }

  if (foreheadRatio > 0.90 && jawRatio > 0.78) {
    // 이마·턱 모두 넓고 광대도 강함 → 육각형
    return "hexagon";
  }

  // ── 5. 균형 잡힌 비율 → 계란형 ────────────────────────────────────────────
  return "oval";
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe CDN 로더
// ─────────────────────────────────────────────────────────────────────────────

const MP_CDN      = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js";
const MP_FILES    = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/";

declare global {
  interface Window { FaceMesh?: unknown; }
}

async function loadFaceMesh(): Promise<unknown> {
  if (typeof window === "undefined") throw new Error("Browser only");
  if (window.FaceMesh) return window.FaceMesh;

  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${MP_CDN}"]`)) {
      const poll = setInterval(() => {
        if (window.FaceMesh) { clearInterval(poll); resolve(window.FaceMesh); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("MediaPipe timeout")); }, 15000);
      return;
    }
    const s = document.createElement("script");
    s.src = MP_CDN;
    s.crossOrigin = "anonymous";
    s.onload  = () => resolve(window.FaceMesh ?? null);
    s.onerror = () => reject(new Error("MediaPipe CDN 로드 실패"));
    document.head.appendChild(s);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────────────────────

export interface FaceAnalysisResult {
  shape:     FaceShapeKey;
  landmarks: FaceLandmarkData | null;
}

/**
 * 이미지에서 얼굴형을 분석합니다.
 * MediaPipe 로드 실패 / 얼굴 미감지 시 null 반환 → 호출부에서 mock fallback 처리
 */
export async function analyzeFaceShape(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): Promise<FaceAnalysisResult | null> {
  try {
    // any: MediaPipe CDN 동적 로드 — 정적 타입 정의 없음
    const FaceMeshClass = await loadFaceMesh() as any; // eslint-disable-line
    if (!FaceMeshClass) return null;

    return new Promise<FaceAnalysisResult | null>((resolve) => {
      const faceMesh = new FaceMeshClass({
        locateFile: (file: string) => `${MP_FILES}${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => { // eslint-disable-line
        const lms: Landmark[] = results.multiFaceLandmarks?.[0];
        if (!lms || lms.length < 468) {
          resolve(null);
        } else {
          resolve({
            shape:     classifyFaceShape(lms),
            landmarks: extractLandmarkData(lms),
          });
        }
        try { faceMesh.close(); } catch { /* ignore */ }
      });

      faceMesh.send({ image }).catch(() => {
        try { faceMesh.close(); } catch { /* ignore */ }
        resolve(null);
      });

      // 5초 타임아웃
      setTimeout(() => resolve(null), 5000);
    });
  } catch {
    return null;
  }
}
