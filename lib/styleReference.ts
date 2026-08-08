// ============================================================================
// lib/styleReference.ts
// 설문 답변 → public/references/ 레퍼런스 슬롯키 매핑 (2026-08-05 무나이 전환)
//
// 구조(사업주 확정, §0): /references/<기장>/<weight: heavy|medium|light>/<컬>/
//   예) 단발 + 층없음(heavy) + C컬 → references/bob/heavy/c_curl
//   ※ 나이(group_2040/5060) 제거 — 나이는 결과지 노출 필터에서 처리.
//   ※ 폴더명은 사업주 분류가 최종. weight 폴더는 heavy/medium/light 그대로 쓴다.
//
// ※ 레퍼런스 이미지는 합성 백엔드(Replicate faceswap) 전용 — 유저 브라우저 미노출
// ※ 2026-08-05 faceswap 전용 전환: flux-kontext 텍스트 프롬프트(buildHairStylePrompt)는
//   완전 삭제됐다. 이 모듈은 이제 "슬롯키 매핑"만 담당한다(텍스트 생성 경로 0).
// ============================================================================

import type { StyleAnswers } from "@/app/style/surveyData";

// ─── [기장] — public/references/ 실제 폴더명과 1:1. shoulder는 레거시→collarbone ──
// (설문에서 2026-07 제거됐으나 과거 저장 다이어리/세션 값 방어. surveyData와 동일 처리.)
const LENGTH_DIR: Record<string, string> = {
  short:      "short",
  short_bob:  "short_bob",
  bob:        "bob",
  shoulder:   "collarbone", // 레거시 별칭
  collarbone: "collarbone",
  chest:      "chest",
};

// ─── [컬] 4종 ─────────────────────────────────────────────────────────────────
const WAVE_DIR: Record<string, string> = {
  straight: "straight",
  c_curl:   "c_curl",
  s_curl:   "s_curl",
  wave:     "wave",
};

// ─── [weight/층] 3종 — 설문 값(heavy/medium/light) = 폴더명 그대로(항등) ──────────
const LAYER_SET = new Set(["heavy", "medium", "light"]);

// 최종 폴백 이미지 경로(모든 슬롯·기장 폴백 실패 시). 사업주 지정 대표 폴백 1장.
export const DEFAULT_REFERENCE_PATH = "/references/default_style.jpg";

// 컬·weight 순회용(폴백 체인) — allowlist. 여기 없는 값은 슬롯키에 절대 안 들어간다(traversal 차단).
export const ALL_WEIGHTS = ["heavy", "medium", "light"] as const;
export const ALL_CURLS   = ["straight", "c_curl", "s_curl", "wave"] as const;

// ─── 핵심: 설문 답변 → 레퍼런스 슬롯키 "<len>/<weight>/<curl>" ──────────────────
// 반환값의 3토막은 전부 위 allowlist(LENGTH_DIR 값 / LAYER_SET / WAVE_DIR 값)에서만 나온다.
// 원시 설문값을 경로에 직접 넣지 않으므로 경로 traversal이 원천 불가능하다.
/**
 * @example
 * getReferenceSlotKey({ q11_length:"bob", q14_layer:"heavy", q13_design:"c_curl" })
 * // → "bob/heavy/c_curl"
 */
export function getReferenceSlotKey(answers: StyleAnswers): string {
  const length = LENGTH_DIR[answers.q11_length ?? ""] ?? "bob";
  const layer  = LAYER_SET.has(answers.q14_layer ?? "") ? (answers.q14_layer as string) : "medium";
  const wave   = WAVE_DIR[answers.q13_design ?? ""] ?? "straight";
  return `${length}/${layer}/${wave}`;
}
