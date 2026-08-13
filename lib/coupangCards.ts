// ============================================================================
// lib/coupangCards.ts — 쿠팡 파트너스 제휴 카드 21종 (결과지 하단 커머스 단일 출처)
//
// 최종 지시서(2026-08-13) 기준:
//  · 텍스트 카드(사진 없음) + 쿠팡 단축링크. 배너 iframe·이미지 핫링크 안 함. 새 SQL 없음(DB 미사용).
//  · 문구(이름·추천사유)와 링크·매칭은 지시서 그대로 — 재작성 금지.
//  · 가격 미표시. 대가성 문구는 렌더 컴포넌트가 카드 영역에 붙인다(가독 크기).
//  · 화장품법 금지어(복구·재생·회복·영양공급·손상개선·모발강화·탈모·치료 등) 미사용 — 사용법/사용감/성분 사실만.
//
// ★ 승인 게이트(§4): 코드가 자동으로 켜지 않는다. 사장님이 21개 링크를 실제로 확인한 뒤
//   COUPANG_CARDS_LIVE 를 true 로 바꿔야 결과지에 노출된다. false 인 동안엔 아무것도 안 뜬다(안전).
//
// ★ G13(뿌리 볼륨 파우더) 데미지 하드 차단: STYLE_CARDS 에만 두고 DAMAGE_CARDS 에는 없다 →
//   구조적으로 데미지 결과지에선 절대 안 뜬다(기름 빨아들이는 파우더 ↔ 새치 기름 지켜라 논리충돌).
// ============================================================================

import type { StyleAnswers } from "@/app/style/surveyData";
import type { DamageType } from "@/app/damage-check/damageRecommend";
import type { DamageSurveyAnswers } from "@/app/damage-check/surveyData";

/** ★ 사장님 승인 스위치 — 21개 링크 검수 후 true 로. false 면 결과지에 하나도 안 뜸(draft). */
export const COUPANG_CARDS_LIVE = true;

/** 결과지 하단 최대 노출 수(우선순위 상위부터 잘라 광고전단 느낌 방지). */
export const COUPANG_MAX_CARDS = 4;

/** 대가성 문구(법적 필수) — 공식형. 렌더 컴포넌트가 제품 영역에 가독 크기로 붙인다. */
export const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export interface CoupangCard {
  g: string;      // 지시서 코드(G01…)
  name: string;   // 화면 표기 이름(원본 상품명이 금지어여도 이 이름으로 표기)
  reason: string; // 추천 사유 한 줄
  emoji: string;  // 사진 없음 → 아이콘
  link: string;   // 쿠팡 파트너스 단축링크
}

// ─── 스타일 결과지 매칭(모발타입 기준) ──────────────────────────────────────────
// 배열 순서 = 우선순위. match(answers)=true 인 카드를 순서대로 최대 COUPANG_MAX_CARDS개.
const s = (a: StyleAnswers) => ({
  thin:     a.q8_density === "thin_density",     // 숱 적음 → 볼륨 없음/처짐
  fine:     a.q7_thickness === "fine",           // 얇음
  thick:    a.q8_density === "thick_density",    // 숱 많음
  coarse:   a.q7_thickness === "coarse",         // 두꺼움
  curly:    a.q3_curl === "wavy_hair" || a.q3_curl === "curly_hair_mid" || a.q3_curl === "curly_hair",
  straight: a.q3_curl === "straight_hair",
  wantWave: a.q13_design === "s_curl" || a.q13_design === "wave", // 웨이브 희망(원하는 디자인)
});

export const STYLE_CARDS: (CoupangCard & { match: (a: StyleAnswers) => boolean })[] = [
  { g: "G06", name: "픽서 스프레이",     emoji: "💨", reason: "롤을 댄 상태에서 뿌리는 용도입니다",   link: "https://link.coupang.com/a/gaIKiJc9dY", match: (a) => { const x = s(a); return x.thin || x.fine; } },
  { g: "G07", name: "볼륨 무스",         emoji: "🫧", reason: "바르고 말리면 뿌리가 섭니다",         link: "https://link.coupang.com/a/gaJdPEb6iW", match: (a) => { const x = s(a); return x.fine || x.thin; } },
  { g: "G11", name: "헤어롤",           emoji: "🧻", reason: "뿌리에 바짝 대는 용도입니다",         link: "https://link.coupang.com/a/gaJKmNaMea", match: (a) => s(a).thin },
  { g: "G14", name: "정수리 볼륨",       emoji: "⬆️", reason: "정수리만 띄워줍니다",               link: "https://link.coupang.com/a/gaMEkCnBmu", match: (a) => s(a).thin },
  { g: "G13", name: "뿌리 볼륨 파우더",   emoji: "🧂", reason: "뿌리가 가라앉았을 때 뿌립니다",       link: "https://link.coupang.com/a/gaKJrlwmvA", match: (a) => { const x = s(a); return x.fine || x.thin; } }, // ★ 스타일 전용(데미지 차단)
  { g: "G24", name: "뿌리볼륨 롤브러시",  emoji: "🪮", reason: "드라이하면서 뿌리를 들어올릴 때",     link: "https://link.coupang.com/a/gaL1b5C1lY", match: (a) => s(a).thin },
  { g: "G23", name: "집게핀",           emoji: "📎", reason: "자국 안 남게 집을 때",             link: "https://link.coupang.com/a/gaLXIIhDrg", match: (a) => s(a).thin },
  { g: "G26", name: "볼륨 세럼",         emoji: "💧", reason: "가벼워서 볼륨이 안 죽습니다",         link: "https://link.coupang.com/a/gaLEgqwQCa", match: (a) => s(a).fine },
  { g: "G12", name: "결 정돈 미스트",     emoji: "🌫️", reason: "부스스한 결을 정돈할 때",           link: "https://link.coupang.com/a/gaJP8JUZQi", match: (a) => s(a).curly },
  { g: "G15", name: "스무딩 밤",         emoji: "🪔", reason: "부피가 부담스러울 때 눌러줍니다",     link: "https://link.coupang.com/a/gaKZwgKmZ2", match: (a) => { const x = s(a); return x.thick || x.coarse; } },
  { g: "G17", name: "컬크림",           emoji: "🌀", reason: "파마 없이 웨이브를 낼 때",           link: "https://link.coupang.com/a/gaLblBcvJY", match: (a) => { const x = s(a); return x.straight && x.wantWave; } },
  { g: "G18", name: "무열 웨이브",       emoji: "〰️", reason: "열 없이 컬을 만듭니다",             link: "https://link.coupang.com/a/gaKcE8FoD6", match: (a) => s(a).wantWave },
  { g: "G21", name: "잔머리 고정 스틱",   emoji: "🖊️", reason: "묶은 머리 마무리에",               link: "https://link.coupang.com/a/gaLVfhXDiu", match: () => false }, // ★ 노출 보류(비활성): 묶는 습관 신호(문항) 없음 → 전원 노출 시 상위 4칸 잠식. 문항 생기면 활성화. 카드는 유지.
  { g: "G05", name: "열보호 미스트",     emoji: "🛡️", reason: "스타일링 전에 한 겹 씌워주세요",     link: "https://link.coupang.com/a/gaIAKxm2mW", match: () => true }, // 고데기·드라이 쓰는 전원
];

// ─── 데미지 결과지 매칭(유형 DRY/RIGID + 새치 h_root_gray + 시술이력 기준) ──────────
const dyeHistory = (a: DamageSurveyAnswers) =>
  ["dye", "root_dye", "bleach"].includes(a.h_recent) || ["dye", "root_dye", "bleach"].includes(a.h_prev);

export const DAMAGE_CARDS: (CoupangCard & { match: (type: DamageType, a: DamageSurveyAnswers) => boolean })[] = [
  { g: "G02", name: "새치 커버 마스카라", emoji: "🖌️", reason: "뿌리 새치가 올라왔을 때 잠깐 가려줍니다", link: "https://link.coupang.com/a/gaHH5CqEpg", match: (_t, a) => a.h_root_gray === true }, // 맨 위 칸
  { g: "G01", name: "염색모 케어 샴푸",   emoji: "🧴", reason: "염색모용으로 나온 약산성 샴푸입니다",     link: "https://link.coupang.com/a/gaJof2spZ6", match: (_t, a) => a.h_root_gray === true || dyeHistory(a) }, // 새치 최우선, 그 외 염색이력
  { g: "G03", name: "수분 트리트먼트",   emoji: "💧", reason: "염색 뒤 뻑뻑한 느낌이 덜하도록",         link: "https://link.coupang.com/a/gaIqpvrl5E", match: (t) => t === "DRY" },
  { g: "G04", name: "코코넛 헤어 오일",   emoji: "🥥", reason: "코코넛 오일이 들어 있습니다",           link: "https://link.coupang.com/a/gaIwLB3s1k", match: (t) => t === "RIGID" },
  { g: "G09", name: "단백질 앰플",       emoji: "💊", reason: "펌 뒤 결이 힘없을 때",               link: "https://link.coupang.com/a/gaJB3rNJD2", match: (t) => t === "RIGID" },
  { g: "G08", name: "컬러 샴푸",         emoji: "🎨", reason: "색 빠짐이 신경 쓰이실 때",           link: "https://link.coupang.com/a/gaJvhgmrOS", match: (_t, a) => dyeHistory(a) },
  { g: "G05", name: "열보호 미스트",     emoji: "🛡️", reason: "고데기 쓰시기 전에 한 번 뿌리세요",     link: "https://link.coupang.com/a/gaIAKxm2mW", match: () => true }, // 고데기·드라이 쓰는 전원
  { g: "G10", name: "디탱글 브러시",     emoji: "🪮", reason: "트리트먼트 바르고 빗을 때 쓰세요",     link: "https://link.coupang.com/a/gaJGqbRAMS", match: () => true }, // 전원(관리 꿀팁 연결)
];

/** 스타일 결과지용 — 매칭+우선순위+캡. LIVE 아니면 빈 배열. */
export function pickStyleCards(a: StyleAnswers): CoupangCard[] {
  if (!COUPANG_CARDS_LIVE) return [];
  return STYLE_CARDS.filter((c) => c.match(a)).slice(0, COUPANG_MAX_CARDS)
    .map(({ g, name, reason, emoji, link }) => ({ g, name, reason, emoji, link }));
}

/** 데미지 결과지용 — G13 은 애초에 목록에 없어 절대 안 뜸(하드 차단). LIVE 아니면 빈 배열. */
export function pickDamageCards(type: DamageType, a: DamageSurveyAnswers): CoupangCard[] {
  if (!COUPANG_CARDS_LIVE) return [];
  return DAMAGE_CARDS.filter((c) => c.match(type, a)).slice(0, COUPANG_MAX_CARDS)
    .map(({ g, name, reason, emoji, link }) => ({ g, name, reason, emoji, link }));
}
