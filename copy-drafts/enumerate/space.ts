// ============================================================================
// copy-drafts/enumerate/space.ts — 유효 입력공간 생성
//
// §7-3은 "유효 입력공간"을 요구한다. 설문이 구조적으로 만들 수 없는 조합
// (예: 뿌리염색을 안 골랐는데 새치 체크가 켜짐)은 유효 입력이 아니므로 제외한다.
// 제외 규칙은 전부 설문 UI(survey/page.tsx)가 실제로 강제하는 것들이다.
// ============================================================================

import type { DamageSurveyAnswers } from "../../app/damage-check/surveyData";
import type { StyleAnswers } from "../../app/style/surveyData";

// ─── Damage ────────────────────────────────────────────────────────────────

const PULL = ["", "snap", "stretch", "elastic", "firm", "unsure"] as const;
const FRICTION = ["", "tangled", "loosens", "smooth", "unsure"] as const;
const DRY = ["", "slow", "normal", "fast"] as const;
const TREATMENT = ["none", "bleach", "straight_perm", "heat_perm", "normal_perm", "dye", "root_dye"] as const;
const MORE = ["none", "few", "many"] as const;
const ROOT_INTERVAL = ["over_3m", "m1", "w2_3"] as const;

/**
 * 유효 Damage 입력 전수.
 *
 * 설문이 강제하는 하위질문 규칙:
 *   · h_bleach_2plus  — 탈색 슬롯이 있을 때만 노출
 *   · h_root_gray     — 뿌리염색 슬롯이 있을 때만 노출(hasRootDye && rootGray로 저장)
 *   · h_root_interval — 뿌리염색일 때만, 그리고 **필수**(빈값으로 진행 불가)
 *   · h_root_over6m   — 뿌리염색일 때만
 *   · h_self_dye      — 염색 또는 뿌리염색일 때만
 */
export function* damageSpace(): Generator<DamageSurveyAnswers> {
  for (const h_recent of TREATMENT) {
    for (const h_prev of TREATMENT) {
      const slots = [h_recent, h_prev];
      const hasRootDye = slots.includes("root_dye");
      const hasAnyDye = hasRootDye || slots.includes("dye");
      const hasBleach = slots.includes("bleach");

      const intervals = hasRootDye ? ROOT_INTERVAL : ([""] as const);
      const grays = hasRootDye ? [true, false] : [false];
      const over6ms = hasRootDye ? [true, false] : [false];
      const selfDyes = hasAnyDye ? [true, false] : [false];
      const bleach2s = hasBleach ? [true, false] : [false];

      for (const h_root_interval of intervals)
        for (const h_root_gray of grays)
          for (const h_root_over6m of over6ms)
            for (const h_self_dye of selfDyes)
              for (const h_bleach_2plus of bleach2s)
                for (const h_more of MORE)
                  for (const q1_pull of PULL)
                    for (const q2_friction of FRICTION)
                      for (const q3_dry of DRY)
                        yield {
                          q1_pull, q2_friction, q3_dry,
                          h_recent, h_prev, h_more,
                          h_bleach_2plus, h_root_gray, h_self_dye,
                          h_root_interval, h_root_over6m,
                        } as DamageSurveyAnswers;
    }
  }
}

/** 제약을 무시한 순수 Cartesian 크기 — 보고서에 "유효 vs 전체"를 적기 위한 값. */
export const DAMAGE_RAW_CARTESIAN =
  PULL.length * FRICTION.length * DRY.length *
  TREATMENT.length * TREATMENT.length * MORE.length *
  2 /*bleach2*/ * 2 /*gray*/ * 2 /*self*/ * (ROOT_INTERVAL.length + 1) * 2 /*over6m*/;

// ─── Style ─────────────────────────────────────────────────────────────────

export const AGE = ["", "age_20", "age_30", "age_40", "age_50", "age_60plus"] as const;
export const CURL = ["straight_hair", "wavy_hair", "curly_hair_mid", "curly_hair"] as const;
export const THICKNESS = ["fine", "medium_thickness", "coarse"] as const;
export const DENSITY = ["thin_density", "medium_density", "thick_density"] as const;
export const LENGTH = ["short", "short_bob", "bob", "collarbone", "chest"] as const;
export const DESIGN = ["straight", "c_curl", "s_curl", "wave"] as const;
export const ST_TREATMENT = ["none", "bleach", "straight_perm", "heat_perm", "normal_perm", "dye", "root_dye"] as const;
export const ST_MORE = ["none", "few", "many"] as const;

/**
 * 시술이력 축의 유효 조합 전수(게이트 입력 + 정수리 카드 입력).
 * q8_bleach_2plus는 탈색 슬롯이 있을 때만, q8_root_gray는 뿌리염색 슬롯이 있을 때만.
 */
export function* styleTreatmentSpace(): Generator<Partial<StyleAnswers>> {
  for (const q8a_recent of ST_TREATMENT) {
    for (const q8b_prev of ST_TREATMENT) {
      const slots = [q8a_recent, q8b_prev];
      const bleach2s = slots.includes("bleach") ? ["1", ""] : [""];
      const grays = slots.includes("root_dye") ? ["1", ""] : [""];
      for (const q8c_more of ST_MORE)
        for (const q8_bleach_2plus of bleach2s)
          for (const q8_root_gray of grays)
            yield { q8a_recent, q8b_prev, q8c_more, q8_bleach_2plus, q8_root_gray };
    }
  }
}

/** 모질·희망 축 전수(갈래 발동을 결정하는 축 + 정수리 카드가 읽는 나이). */
export function* styleHairSpace(): Generator<Partial<StyleAnswers>> {
  for (const q1_age of AGE)
    for (const q3_curl of CURL)
      for (const q7_thickness of THICKNESS)
        for (const q8_density of DENSITY)
          for (const q11_length of LENGTH)
            for (const q13_design of DESIGN)
              yield { q1_age, q3_curl, q7_thickness, q8_density, q11_length, q13_design };
}
