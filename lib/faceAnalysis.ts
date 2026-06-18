// ============================================================================
// 어뷰티 — MediaPipe Face Mesh 기반 얼굴형 분석 라이브러리
//
// 로드 방식: CDN 동적 주입 (npm install 불필요, WASM 서빙 설정 불필요)
// CDN: https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619
//
// 4가지 교차 비율로 한국인 '둥근형/계란형' 쏠림 현상 방지:
//   [비율 1] 가로 vs 세로       → 긴형(oblong) / 둥근형(round) 판단
//   [비율 2] 광대 vs 턱 너비    → 각진형(square) / 하트형(heart) 판단
//   [비율 3] 이마 vs 광대 너비  → 다이아몬드형(diamond) 판단
//   [비율 4] 관자놀이/볼 굴곡   → 땅콩형(peanut) / 육각형(hexagon) 판단
// ============================================================================

export type FaceShapeKey =
  | "oval" | "round" | "oblong" | "square"
  | "heart" | "diamond" | "hexagon" | "peanut";

export interface Landmark { x: number; y: number; z: number; }

// ─── MediaPipe Face Mesh 468점 중 얼굴형 판단용 핵심 랜드마크 인덱스 ───────────
// 참고: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
const LM = {
  TOP_HEAD:          10,   // 이마 최상단 (헤어라인 중심)
  CHIN:             152,   // 턱끝

  LEFT_EAR:         234,   // 왼쪽 볼/귀 외곽 최돌출
  RIGHT_EAR:        454,   // 오른쪽 볼/귀 외곽 최돌출

  LEFT_CHEEKBONE:   116,   // 왼쪽 광대 최돌출
  RIGHT_CHEEKBONE:  345,   // 오른쪽 광대 최돌출

  LEFT_FOREHEAD:    103,   // 왼쪽 이마 폭
  RIGHT_FOREHEAD:   332,   // 오른쪽 이마 폭

  LEFT_JAW:         172,   // 왼쪽 턱선 (하관)
  RIGHT_JAW:        397,   // 오른쪽 턱선 (하관)

  LEFT_TEMPLE:       70,   // 왼쪽 관자놀이
  RIGHT_TEMPLE:     300,   // 오른쪽 관자놀이

  LEFT_LOWER_CHEEK:  50,   // 왼쪽 볼 하부 (광대 아래-턱 위 중간)
  RIGHT_LOWER_CHEEK:280,   // 오른쪽 볼 하부
} as const;

// ─── 거리 계산 헬퍼 ──────────────────────────────────────────────────────────

function hDist(a: Landmark, b: Landmark): number {
  return Math.abs(b.x - a.x);
}
function vDist(a: Landmark, b: Landmark): number {
  return Math.abs(b.y - a.y);
}

// ─────────────────────────────────────────────────────────────────────────────
// [비율 1] 가로 vs 세로 비율
// 결과 > 1.35 → 긴형(oblong) | < 0.95 → 둥근형(round) 경향
// ─────────────────────────────────────────────────────────────────────────────
export function calcHeightRatio(lm: Landmark[]): number {
  const h = vDist(lm[LM.TOP_HEAD], lm[LM.CHIN]);
  const w = hDist(lm[LM.LEFT_EAR], lm[LM.RIGHT_EAR]);
  return w > 0 ? h / w : 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// [비율 2] 광대 vs 턱 너비 비율
// > 1.25 → 하트형/다이아몬드 경향 | < 1.07 → 각진형 경향
// ─────────────────────────────────────────────────────────────────────────────
export function calcCheekToJawRatio(lm: Landmark[]): number {
  const cheek = hDist(lm[LM.LEFT_CHEEKBONE], lm[LM.RIGHT_CHEEKBONE]);
  const jaw   = hDist(lm[LM.LEFT_JAW],       lm[LM.RIGHT_JAW]);
  return jaw > 0 ? cheek / jaw : 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// [비율 3] 이마 vs 광대 너비 비율
// < 0.84 (이마 좁음) + 광대>턱 → 다이아몬드형
// ─────────────────────────────────────────────────────────────────────────────
export function calcForeheadToCheekRatio(lm: Landmark[]): number {
  const forehead = hDist(lm[LM.LEFT_FOREHEAD],   lm[LM.RIGHT_FOREHEAD]);
  const cheek    = hDist(lm[LM.LEFT_CHEEKBONE],  lm[LM.RIGHT_CHEEKBONE]);
  return cheek > 0 ? forehead / cheek : 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// [비율 4] 관자놀이/볼 굴곡 감지 (이중 패임 → 땅콩형 / 육각형 판단)
// templeRatio: 관자놀이 / 광대  → 0.88 미만이면 패임 있음
// lowerCheekRatio: 하볼 / 광대  → 0.88 미만이면 패임 있음
// ─────────────────────────────────────────────────────────────────────────────
export interface ContourRatios {
  templeRatio:     number;  // 관자놀이 폭 / 광대 폭
  lowerCheekRatio: number;  // 하볼 폭 / 광대 폭
}
export function calcContourRatios(lm: Landmark[]): ContourRatios {
  const cheekW = hDist(lm[LM.LEFT_CHEEKBONE], lm[LM.RIGHT_CHEEKBONE]);
  if (cheekW === 0) return { templeRatio: 1, lowerCheekRatio: 1 };
  return {
    templeRatio:     hDist(lm[LM.LEFT_TEMPLE],       lm[LM.RIGHT_TEMPLE])       / cheekW,
    lowerCheekRatio: hDist(lm[LM.LEFT_LOWER_CHEEK],  lm[LM.RIGHT_LOWER_CHEEK]) / cheekW,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 종합 얼굴형 분류 — 4가지 비율을 조합한 Decision Tree
// ─────────────────────────────────────────────────────────────────────────────
export function classifyFaceShape(landmarks: Landmark[]): FaceShapeKey {
  const heightRatio      = calcHeightRatio(landmarks);
  const cheekToJaw       = calcCheekToJawRatio(landmarks);
  const foreheadToCheek  = calcForeheadToCheekRatio(landmarks);
  const { templeRatio, lowerCheekRatio } = calcContourRatios(landmarks);

  // 1. 긴형: 얼굴 높이가 너비의 1.35배 초과
  if (heightRatio > 1.35) return "oblong";

  // 2. 둥근형: 세로/가로 < 0.95 + 광대≈턱(차이 작음)
  if (heightRatio < 0.95 && cheekToJaw < 1.15) return "round";

  // 3. 다이아몬드형: 이마<광대 + 광대>턱 + 관자놀이 패임
  if (foreheadToCheek < 0.84 && cheekToJaw > 1.18 && templeRatio < 0.88) return "diamond";

  // 4. 하트형(역삼각형): 이마≥광대 + 광대>턱(뚜렷)
  if (cheekToJaw > 1.25 && foreheadToCheek > 0.90) return "heart";

  // 5. 각진형: 광대≈턱(차이 작음) + 세로/가로 정상 범위
  if (cheekToJaw < 1.07 && heightRatio > 0.95) return "square";

  // 6. 땅콩형: 관자놀이+하볼 모두 패임 (이중 굴곡)
  if (templeRatio < 0.88 && lowerCheekRatio < 0.88) return "peanut";

  // 7. 육각형: 광대>턱(중간 정도) + 턱 폭이 전체 얼굴 폭 대비 넓음
  if (cheekToJaw > 1.08 && cheekToJaw < 1.20) {
    const earW  = hDist(landmarks[LM.LEFT_EAR], landmarks[LM.RIGHT_EAR]);
    const jawW  = hDist(landmarks[LM.LEFT_JAW], landmarks[LM.RIGHT_JAW]);
    if (earW > 0 && jawW / earW > 0.74) return "hexagon";
  }

  // 8. 계란형 (기본값) — 나머지 모든 경우
  return "oval";
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaPipe Face Mesh CDN 로더
// ─────────────────────────────────────────────────────────────────────────────

const MP_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js";
const MP_FILES_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/";

declare global {
  interface Window {
    // any: MediaPipe CDN 동적 로드 — 타입 정의 없음
    FaceMesh?: any;
  }
}

async function loadFaceMesh(): Promise<unknown> {
  if (typeof window === "undefined") throw new Error("Browser only");
  if (window.FaceMesh) return window.FaceMesh;

  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${MP_CDN}"]`)) {
      // 이미 삽입된 경우 로드 완료 대기
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
// 공개 API: 이미지/비디오 요소에서 얼굴형 분석
// 실패 시 null 반환 → 호출부에서 mock fallback 처리
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeFaceShape(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
): Promise<FaceShapeKey | null> {
  try {
    // any: MediaPipe CDN 동적 로드 — 타입 정의 없음
    const FaceMeshClass = await loadFaceMesh() as any;
    if (!FaceMeshClass) return null;

    return new Promise<FaceShapeKey | null>((resolve) => {
      // any: MediaPipe CDN 동적 로드 — 타입 정의 없음
      const faceMesh = new FaceMeshClass({
        locateFile: (file: string) => `${MP_FILES_BASE}${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // any: MediaPipe CDN 동적 로드 — 타입 정의 없음
      faceMesh.onResults((results: any) => {
        const lms: Landmark[] = results.multiFaceLandmarks?.[0];
        if (!lms || lms.length < 468) {
          resolve(null);
        } else {
          resolve(classifyFaceShape(lms));
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
