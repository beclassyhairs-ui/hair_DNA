// ============================================================================
// lib/consent.ts — 동의(consent) 공유 상수·타입 (클라/서버 공용, server-only 아님)
//
// user_consents 테이블(append-only)에 쌓는 동의의 정책버전·유형을 단일 출처로 둔다.
//
// §7 버전 포맷: 시행일 기반 "YYYY-MM-DD". 최초값은 이번 배포일.
//   ⚠️ CONSENT_POLICY_VERSION을 바꿀 때는 반드시 /privacy·/terms 방침 시행일 변경과
//      "같은 커밋"에서 한다. 코드 상수와 화면 문구가 어긋나면 경량안(방침버전 원장 대신
//      상수+git 이력) 전제가 무너진다. (PM방 §7 · C-1)
// ============================================================================

/** 현재 동의문/방침 버전(시행일 기반). 화면 문구와 반드시 일치시킨다.
 *  ※ 2026-08-08 개정 — 합성 수탁사 OpenAI→Replicate 재전환으로 국외이전 이전받는 자·보유기간이
 *     바뀌었다(실질적 변경, PIPA §28-8). 버전을 올려 전 유저 재동의를 강제한다(유입 0이라 실피해 없음). */
export const CONSENT_POLICY_VERSION = "2026-08-08";

/** 필수 동의 유형 — 이게 전부 granted=true여야 사진(얼굴 수집) 단계로 진입한다. */
export const REQUIRED_CONSENT_TYPES = ["privacy", "terms", "overseas_transfer"] as const;

/** 허용된 전체 동의 유형(DB check 제약과 일치). marketing은 서버저장 후 화면 재추가 예정. */
export const ALL_CONSENT_TYPES = ["privacy", "terms", "overseas_transfer", "marketing"] as const;

export type ConsentType = (typeof ALL_CONSENT_TYPES)[number];

export function isConsentType(v: unknown): v is ConsentType {
  return typeof v === "string" && (ALL_CONSENT_TYPES as readonly string[]).includes(v);
}
