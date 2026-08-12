// ============================================================================
// app/style/crossBranch.ts — 교차 갈래 엔진 (지시서 A-4)
//
// 입력 = 기존 answers 키. 출력 = 대표 갈래 1개 + 흡수 규칙 목록(+ 부가 카드).
//   ★ 갈래 9(게이트 차단)가 최우선 — 차단이면 갈래 매칭을 무시하고 갈래 9로 전환(PM).
//   ★ 복수 발동 시 "문 1개": 지시서 표 순서(1→2→3→4→5→6→7→10)로 첫 발동이 대표,
//     나머지 발동 갈래는 시술 참고 스텝으로 "흡수". 아무것도 안 걸리면 갈래 8(선택 폭 최대).
//
// ※ 이 모듈은 "어느 갈래인가"(구조)만 판정한다. 갈래별 사용자 카피는 branchCopy.ts에서
//   채운다(카피 최종본 §1로 갈래 1~10 전부 주입 완료).
// ============================================================================

import type { StyleAnswers } from "./surveyData";
import { evaluateStyleGate } from "./styleGate";

export type BranchKey =
  | "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7" | "b8" | "b9" | "b10";

// 지시서 표의 갈래 번호·라벨(구조 식별용 — 사용자 노출 카피 아님).
export const BRANCH_META: Record<BranchKey, { num: number; label: string }> = {
  b9:  { num: 9,  label: "컷+관리 모드 (게이트 차단)" },
  b1:  { num: 1,  label: "곱슬 펴기 — 뿌리매직 프레임" },
  b2:  { num: 2,  label: "펴고 얹기 순서" },
  b3:  { num: 3,  label: "정수리 빼고 펴기" },
  b4:  { num: 4,  label: "처짐 경고 + 층·부분펌" },
  b5:  { num: 5,  label: "볼륨 루틴" },
  b6:  { num: 6,  label: "숱치기 악순환 + 기장 하한" },
  b7:  { num: 7,  label: "컬 한 단계 강하게 + 단백질 바탕" },
  b10: { num: 10, label: "중간 양감 커트 + 정수리" },
  b8:  { num: 8,  label: "선택 폭 최대" },
};

export interface CrossBranchResult {
  primary:          BranchKey;    // 대표 갈래(문 1개)
  absorbed:         BranchKey[];  // 흡수(시술 참고 스텝으로 합침)
  gateBlocked:      boolean;      // 갈래 9(차단) 여부
  scalpRoutineCard: boolean;      // 부가 카드(갈래와 독립) — 정수리 루틴
}

// 대표 선정 우선순위(지시서 표 순서). 9는 별도 최우선 처리, 8은 폴백이라 목록에서 제외.
const PRIORITY: BranchKey[] = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b10"];

export function resolveCrossBranch(answers: StyleAnswers): CrossBranchResult {
  const curl   = answers.q3_curl ?? "straight_hair";
  const design = answers.q13_design ?? "straight";
  const dens   = answers.q8_density ?? "medium_density";
  const thick  = answers.q7_thickness ?? "medium_thickness";
  const length = answers.q11_length ?? "bob";
  const age    = answers.q1_age ?? "";

  // ── 파생 조건 ──
  const isCurlStrong = curl === "curly_hair_mid" || curl === "curly_hair"; // 곱슬·악성
  const isWavyPlus   = curl === "wavy_hair" || isCurlStrong;               // 반곱슬 이상
  const hasCurl      = curl !== "straight_hair";                           // 곱슬기 있음
  const isStraightHair = curl === "straight_hair";
  const wantsStraight = design === "straight";
  const wantsCurl     = design === "c_curl" || design === "s_curl" || design === "wave";
  const isFine  = thick === "fine";
  const isCoarse = thick === "coarse";
  const isThin  = dens === "thin_density";
  const isThick = dens === "thick_density";
  const isShort = length === "short" || length === "short_bob";
  const isShortToShoulder = isShort || length === "bob";        // 숏~어깨
  const isCollarboneOrChest = length === "collarbone" || length === "chest";

  // ── 갈래별 발동 조건(지시서 표) ──
  const fired: Record<BranchKey, boolean> = {
    b1:  isCurlStrong && wantsStraight,
    b2:  isWavyPlus && wantsCurl,
    b3:  isThick && isFine && hasCurl && wantsStraight,
    b4:  isFine && isThin && isCollarboneOrChest,
    b5:  isFine && isThin && isShortToShoulder,
    b6:  isThick && isCoarse,
    b7:  isFine && isStraightHair && wantsCurl,
    b10: isThick && isFine && isStraightHair,
    b8:  false, // 폴백 전용
    b9:  false, // 게이트 전용
  };

  // ── 갈래 9(게이트 차단) 최우선 ──
  const gateBlocked = evaluateStyleGate(answers).level === "block";

  // ── 부가 카드(갈래와 독립): 정수리 루틴 ──
  //   트리거: 새치 체크 / 뿌염+열펌·일반펌 / fine+thin / 50대+fine
  const usedRootDye = answers.q8a_recent === "root_dye" || answers.q8b_prev === "root_dye";
  const usedPerm    = ["straight_perm", "heat_perm", "normal_perm"].includes(answers.q8a_recent ?? "")
                   || ["straight_perm", "heat_perm", "normal_perm"].includes(answers.q8b_prev ?? "");
  const scalpRoutineCard =
    answers.q8_root_gray === "1"        // 새치 체크
    || (usedRootDye && usedPerm)        // 뿌염 + 열펌·일반펌
    || (isFine && isThin)               // 가늘고 숱 적음
    || (age === "age_50" && isFine);    // 50대 + 가는 모발(지시서 문구 그대로)

  if (gateBlocked) {
    return { primary: "b9", absorbed: [], gateBlocked: true, scalpRoutineCard };
  }

  const firedList = PRIORITY.filter((k) => fired[k]);
  if (firedList.length === 0) {
    return { primary: "b8", absorbed: [], gateBlocked: false, scalpRoutineCard };
  }
  return {
    primary: firedList[0]!,
    absorbed: firedList.slice(1),
    gateBlocked: false,
    scalpRoutineCard,
  };
}
