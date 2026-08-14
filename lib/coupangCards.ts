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

// ⚠️⚠️⚠️ 절대 주의 (실수로 끄면 결과지 제품칸이 통째로 사라진다) ⚠️⚠️⚠️
//   COUPANG_CARDS_LIVE = false 로 바꾸면 pickStyleCards/pickDamageCards 가 [] 를 반환해
//   "모든 손님, 모든 조합"에서 제품이 0개가 된다(= 커머스 수익 라인 전면 중단).
//   이 값은 오직 "링크 대량 교체·긴급 내림" 같은 의도된 상황에서만 false 로 내린다.
//   내릴 때는 반드시 사장님 승인 + 되돌릴 시점을 함께 기록할 것. 리팩터링/자동수정으로 건드리지 말 것.
/** ★ 사장님 승인 스위치 — 21개 링크 검수 후 true 로. false 면 결과지에 하나도 안 뜸(draft). */
export const COUPANG_CARDS_LIVE = true;

// 런타임 가드: 라이브인데 실수로 꺼지면 콘솔에 크게 경고(무음 사고 방지).
if (!COUPANG_CARDS_LIVE && typeof console !== "undefined") {
  console.warn("[coupangCards] ⚠️ COUPANG_CARDS_LIVE=false — 결과지 전 조합 제품 0개 상태입니다. 의도한 것이 맞는지 확인하세요.");
}

/** 결과지 하단 최대 노출 수(우선순위 상위부터 잘라 광고전단 느낌 방지). */
export const COUPANG_MAX_CARDS = 4;

/** 최소 노출 보장 수 — 매칭이 부족한 '보통' 조합도 최소 이만큼은 채운다(FIX-B). */
export const COUPANG_MIN_CARDS = 3;

/** 대가성 문구(법적 필수) — 공식형. 렌더 컴포넌트가 제품 영역에 가독 크기로 붙인다. */
export const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export interface CoupangCard {
  g: string;      // 지시서 코드(G01…)
  name: string;   // 화면 표기 이름(원본 상품명이 금지어여도 이 이름으로 표기)
  reason: string; // 추천 사유 한 줄(진한 회색 14px)
  detail: string; // 이유 2~3줄(한 줄 요약 아래, 한 톤 연하게). 지시서 문구 그대로 — 재작성 금지.
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

export const STYLE_CARDS: (CoupangCard & { parked?: boolean; match: (a: StyleAnswers) => boolean })[] = [
  { g: "G06", name: "픽서 스프레이", emoji: "💨",
    reason: "롤을 댄 상태에서 뿌리는 용도입니다",
    detail: "롤을 빼고 뿌리면 이미 가라앉은 뒤라 안 섭니다. 롤이 뿌리를 들고 있는 그 상태에서 굳혀야 자연스럽게 살아납니다. 딱딱하게 굳는 스프레이는 정수리에 뭉치니 피하십시오.",
    link: "https://link.coupang.com/a/gaIKiJc9dY", match: (a) => { const x = s(a); return x.thin || x.fine; } },
  { g: "G07", name: "볼륨 무스", emoji: "🫧",
    reason: "바르고 말리면 뿌리가 섭니다",
    detail: "가는 머리를 굵게 만드는 방법은 없습니다. 정직하게 말하면 볼륨으로 보완하는 게 답입니다. 롤 잡기 번거로우시면 이걸로 대신하셔도 됩니다.",
    link: "https://link.coupang.com/a/gaJdPEb6iW", match: (a) => { const x = s(a); return x.fine || x.thin; } },
  { g: "G11", name: "헤어롤", emoji: "🧻",
    reason: "뿌리에 바짝 대는 용도입니다",
    detail: "여러 바퀴 감으실 필요 없습니다. 컬을 만드는 게 아니라 뿌리를 세우는 거라, 롤이 뿌리에 가까이 붙어 있는 게 전부입니다.",
    link: "https://link.coupang.com/a/gaJKmNaMea", match: (a) => s(a).thin },
  { g: "G14", name: "정수리 볼륨", emoji: "⬆️",
    reason: "정수리만 띄워줍니다",
    detail: "나이가 들면 머리카락보다 두피가 먼저 처집니다. 그래서 정수리부터 눌립니다. 전체를 건드리기보다 정수리만 손보는 쪽이 효율이 좋습니다.",
    link: "https://link.coupang.com/a/gaMEkCnBmu", match: (a) => s(a).thin },
  { g: "G13", name: "뿌리 볼륨 파우더", emoji: "🧂",
    reason: "뿌리가 가라앉았을 때 뿌립니다",
    detail: "이미 마른 머리에 바로 쓰는 물건입니다. 드라이 전에 바르는 무스와는 쓰는 순간이 다릅니다. 외출 직전 정수리만 살짝 띄우고 싶을 때요.",
    link: "https://link.coupang.com/a/gaKJrlwmvA", match: (a) => { const x = s(a); return x.fine || x.thin; } }, // ★ 스타일 전용(데미지 차단)
  { g: "G24", name: "뿌리볼륨 롤브러시", emoji: "🪮",
    reason: "드라이하면서 뿌리를 들어올릴 때",
    detail: "정수리는 파마 말고 드라이로도 세울 수 있습니다. 뿌리를 들어올리면서 말리는 게 핵심이고, 그때 쓰는 빗입니다.",
    link: "https://link.coupang.com/a/gaL1b5C1lY", match: (a) => s(a).thin },
  { g: "G23", name: "집게핀", emoji: "📎",
    reason: "자국 안 남게 집을 때",
    detail: "미용실에서 제일 많이 쓰는 물건인데 손님들은 잘 모릅니다. 일반 집게로 오래 집어두면 자국이 남아 다시 손봐야 합니다.",
    link: "https://link.coupang.com/a/gaLXIIhDrg", match: (a) => s(a).thin },
  { g: "G26", name: "볼륨 세럼", emoji: "💧",
    reason: "가벼워서 볼륨이 안 죽습니다",
    detail: "마무리 제품이 무거우면 애써 세운 뿌리가 도로 가라앉습니다. 가는 머리에는 오일보다 가벼운 세럼이 맞습니다.",
    link: "https://link.coupang.com/a/gaLEgqwQCa", match: (a) => s(a).fine },
  { g: "G12", name: "결 정돈 미스트", emoji: "🌫️",
    reason: "부스스한 결을 정돈할 때",
    detail: "부스스함은 습기와 정전기입니다. 머리카락이 산성 쪽에 있으면 정전기가 줄어듭니다. 비 오는 날 유난히 결이 무너지는 분께 씁니다.",
    link: "https://link.coupang.com/a/gaJP8JUZQi", match: (a) => s(a).curly },
  { g: "G15", name: "스무딩 밤", emoji: "🪔",
    reason: "부피가 부담스러울 때 눌러줍니다",
    detail: "숱이 많은데 머리카락이 얇으면 부피만 커지고 모양은 안 잡힙니다. 겉머리를 쳐내면 결이 중간에 잘려 더 날립니다. 치는 것보다 무게로 눌러주는 쪽이 낫습니다.",
    link: "https://link.coupang.com/a/gaKZwgKmZ2", match: (a) => { const x = s(a); return x.thick || x.coarse; } },
  { g: "G17", name: "컬크림", emoji: "🌀",
    reason: "파마 없이 웨이브를 낼 때",
    detail: "직모는 컬을 붙잡아둘 심지가 약합니다. 컬을 거는 것보다 버티게 하는 게 어렵습니다. 파마를 한 번 더 하기 전에 이걸로 먼저 해보시는 것도 방법입니다.",
    link: "https://link.coupang.com/a/gaLblBcvJY", match: (a) => { const x = s(a); return x.straight && x.wantWave; } },
  { g: "G18", name: "무열 웨이브", emoji: "〰️",
    reason: "열 없이 컬을 만듭니다",
    detail: "고데기는 200도가 넘고 그 온도에서 단백질 구조가 바뀝니다. 열을 아예 안 쓰면 그 손상이 없습니다. 자는 동안 감아두면 됩니다.",
    link: "https://link.coupang.com/a/gaKcE8FoD6", match: (a) => s(a).wantWave },
  { g: "G21", name: "잔머리 고정 스틱", emoji: "🖊️",
    reason: "묶은 머리 마무리에",
    detail: "",
    link: "https://link.coupang.com/a/gaLVfhXDiu", parked: true, match: () => true }, // ★ 노출 보류(parked): 묶는 습관 신호(문항) 없음 → 결과지·발견템 어디서도 미노출. 문항 생기면 parked 해제. 카드는 유지.
  { g: "G05", name: "열보호 미스트", emoji: "🛡️",
    reason: "스타일링 전에 한 겹 씌워주세요",
    detail: "고데기는 200도가 넘습니다. 그 온도에서 머리카락 속 단백질 구조가 바뀝니다. 미리 한 겹 씌워두면 빗을 때 끊기는 게 줄어듭니다.",
    link: "https://link.coupang.com/a/gaIAKxm2mW", match: () => true }, // 고데기·드라이 쓰는 전원
];

// ─── 데미지 결과지 매칭(유형 DRY/RIGID + 새치 h_root_gray + 시술이력 기준) ──────────
const dyeHistory = (a: DamageSurveyAnswers) =>
  ["dye", "root_dye", "bleach"].includes(a.h_recent) || ["dye", "root_dye", "bleach"].includes(a.h_prev);

// TODO(셀프염색 제품 · 2026-08-14): 셀프염색 체크(a.h_self_dye) 손님용 pH 밸런서·염색 보조제 카드 자리.
//   현재 쿠팡 21종에 해당 제품이 없어 미연결. 사장님이 링크를 따면 아래에 카드 추가 + match:(_t,a)=>a.h_self_dye===true.
export const DAMAGE_CARDS: (CoupangCard & { parked?: boolean; match: (type: DamageType, a: DamageSurveyAnswers) => boolean })[] = [
  { g: "G02", name: "새치 커버 마스카라", emoji: "🖌️",
    reason: "뿌리 새치가 올라왔을 때 잠깐 가려줍니다",
    detail: "손상을 줄이는 가장 확실한 방법은 시술을 덜 하는 겁니다. 이걸로 2~3주만 미뤄도 일 년이면 염색 횟수가 몇 번은 줄어듭니다. 바르는 것보다 안 하는 게 셉니다.",
    link: "https://link.coupang.com/a/gaHH5CqEpg", match: (_t, a) => a.h_root_gray === true }, // 맨 위 칸
  { g: "G01", name: "염색모 케어 샴푸", emoji: "🧴",
    reason: "염색모용으로 나온 약산성 샴푸입니다",
    detail: "머리카락은 산성일 때 표면이 안정됩니다. 알칼리 쪽으로 가면 머리카락끼리 마찰이 커져서 겉이 상하기 쉽습니다. 그런데 시중 샴푸 중 산성 쪽은 열에 넷도 안 됩니다.",
    link: "https://link.coupang.com/a/gaJof2spZ6", match: (_t, a) => a.h_root_gray === true || dyeHistory(a) }, // 새치 최우선, 그 외 염색이력
  { g: "G03", name: "수분 트리트먼트", emoji: "💧",
    reason: "염색 뒤 뻑뻑한 느낌이 덜하도록",
    detail: "마지막에 하신 게 염색 계열이라 수분이 빠져나간 상태로 보입니다. 트리트먼트가 머릿결 구조를 바꾸지는 못합니다. 다만 만졌을 때의 느낌과 색 빠짐은 확실히 달라집니다. 역할을 알고 쓰시면 됩니다.",
    link: "https://link.coupang.com/a/gaIqpvrl5E", match: (t) => t === "DRY" },
  { g: "G04", name: "코코넛 헤어 오일", emoji: "🥥",
    reason: "코코넛 오일이 들어 있습니다",
    detail: "오일이라고 다 같지 않습니다. 코코넛은 분자가 곧고 작아서 머리카락 속 깊이까지 들어가는데, 아르간 같은 건 겉에서 멈춥니다. 그리고 이미 상한 머리일수록 오히려 더 깊이 들어갑니다.",
    link: "https://link.coupang.com/a/gaIwLB3s1k", match: (t) => t === "RIGID" },
  { g: "G09", name: "단백질 앰플", emoji: "💊",
    reason: "펌 뒤 결이 힘없을 때",
    detail: "마지막에 하신 게 펌 계열이라 속 결합이 끊겼다 붙은 상태로 보입니다. 단백질이 그 자리에 얹히는 방식인데, 과하면 오히려 뻣뻣해집니다. 뿌리고 말리는 분무형이 조절하기 쉽습니다.",
    link: "https://link.coupang.com/a/gaJB3rNJD2", match: (t) => t === "RIGID" },
  { g: "G08", name: "컬러 샴푸", emoji: "🎨",
    reason: "색 빠짐이 신경 쓰이실 때",
    detail: "염색을 자주 하시는 분들의 진짜 고민은 손상보다 색이 빠지는 겁니다. 색도 감을 때 조금씩 빠져나갑니다. 감을 때마다 되채워주는 방식입니다.",
    link: "https://link.coupang.com/a/gaJvhgmrOS", match: (_t, a) => dyeHistory(a) },
  { g: "G05", name: "열보호 미스트", emoji: "🛡️",
    reason: "고데기 쓰시기 전에 한 번 뿌리세요",
    detail: "고데기는 200도가 넘습니다. 그 온도에서 머리카락 속 단백질 구조가 바뀝니다. 미리 한 겹 씌워두면 빗을 때 끊기는 게 줄어듭니다.",
    link: "https://link.coupang.com/a/gaIAKxm2mW", match: () => true }, // 고데기·드라이 쓰는 전원
  { g: "G10", name: "디탱글 브러시", emoji: "🪮",
    reason: "트리트먼트 바르고 빗을 때 쓰세요",
    detail: "트리트먼트는 바르는 걸로 끝나지 않습니다. 바른 다음 빗으로 골고루 빗어서 결이 정돈돼야 제값을 합니다. 손으로만 훑으면 절반도 못 씁니다.",
    link: "https://link.coupang.com/a/gaJGqbRAMS", match: () => true }, // 전원(관리 꿀팁 연결)
];

const strip = ({ g, name, reason, detail, emoji, link }: CoupangCard): CoupangCard => ({ g, name, reason, detail, emoji, link });

// ─── FIX-B 최소보장 헬퍼 ────────────────────────────────────────────────────────
// 매칭축(thin/fine/thick/coarse/curly/wantWave)에 안 걸리는 '보통' 조합이 1~2개로 뜨는 걸 막는다.
// 폴백은 어느 조합에나 크게 어긋나지 않는 범용 카드만. skip=true 인 항목은 논리충돌(굵은/숱많은 머리에
//   볼륨류 등)이라 건너뛴다 — "억지로 안 맞는 걸 끼우지 말 것"이라 그만큼 못 채워도 강제하지 않는다.
type FallbackPick = { g: string; skip?: boolean };

/** 매칭 결과가 min 미만이면 폴백에서 (중복·skip 제외) 채워 최소 노출을 보장. 최대 cap 유지. */
function topUp(
  picked: (CoupangCard & { parked?: boolean })[],
  pool: readonly (CoupangCard & { parked?: boolean })[],
  fallback: FallbackPick[],
  min: number, cap: number,
): (CoupangCard & { parked?: boolean })[] {
  if (picked.length >= min) return picked;
  const have = new Set(picked.map((c) => c.g));
  for (const f of fallback) {
    if (picked.length >= min || picked.length >= cap) break;
    if (f.skip || have.has(f.g)) continue;
    const card = pool.find((c) => c.g === f.g && !c.parked);
    if (!card) continue;
    picked.push(card);
    have.add(f.g);
  }
  return picked;
}

/** 스타일 결과지용 — 매칭+우선순위+캡. parked 제외. LIVE 아니면 빈 배열.
 *  FIX-C①: 컬(웨이브) 희망이면 컬 제품(G17 컬크림·G18 무열웨이브)을 볼륨 제품보다 앞으로.
 *  FIX-B: 매칭이 부족하면 폴백으로 최소 COUPANG_MIN_CARDS 개 보장. */
export function pickStyleCards(a: StyleAnswers): CoupangCard[] {
  if (!COUPANG_CARDS_LIVE) return [];
  const flags = s(a);
  let matched = STYLE_CARDS.filter((c) => !c.parked && c.match(a));
  if (flags.wantWave) {
    // 컬 제품 먼저(안정적 부분정렬) — 갈래b7처럼 카피는 '컬'인데 제품이 전부 볼륨이던 문제 해소.
    const curl = new Set(["G17", "G18"]);
    matched = [...matched.filter((c) => curl.has(c.g)), ...matched.filter((c) => !curl.has(c.g))];
  }
  const fallback: FallbackPick[] = [
    { g: "G12" },                                        // 결 정돈 미스트 — 부스스/정전기, 범용
    { g: "G26", skip: flags.thick || flags.coarse },     // 볼륨 세럼 — 굵은/숱많은 머리엔 상충 → 제외
    { g: "G05" },                                        // 열보호 미스트 — 고데기/드라이 쓰는 전원
  ];
  const picked = topUp(matched.slice(0, COUPANG_MAX_CARDS), STYLE_CARDS, fallback, COUPANG_MIN_CARDS, COUPANG_MAX_CARDS);
  return picked.map(strip);
}

/** 데미지 결과지용 — G13 은 애초에 목록에 없어 절대 안 뜸(하드 차단). parked 제외. LIVE 아니면 빈 배열.
 *  FIX-B: 건강모 등 2개짜리 조합에 예방 1개를 더해 최소 COUPANG_MIN_CARDS 개 보장. */
export function pickDamageCards(type: DamageType, a: DamageSurveyAnswers): CoupangCard[] {
  if (!COUPANG_CARDS_LIVE) return [];
  const matched = DAMAGE_CARDS.filter((c) => !c.parked && c.match(type, a));
  const fallback: FallbackPick[] = [
    { g: "G10" },  // 디탱글 브러시 — 전원(관리 꿀팁 연결)
    { g: "G05" },  // 열보호 미스트 — 전원
    { g: "G01" },  // 약산성 샴푸(데일리·예방) — 건강모 3번째 칸 ※ 카드명은 '염색모 케어'지만 약산성 데일리 성격
  ];
  const picked = topUp(matched.slice(0, COUPANG_MAX_CARDS), DAMAGE_CARDS, fallback, COUPANG_MIN_CARDS, COUPANG_MAX_CARDS);
  return picked.map(strip);
}

/**
 * 발견템(/items)용 — 전체 활성 카드 카탈로그(스타일+데미지 합집합, g 중복 제거, parked 제외).
 * /items 는 "나중에 다시 찾기" 브라우즈 공간이라 캡·매칭 없이 활성 전부 보여준다.
 * ★ DB(/api/items)의 image_status='approved' 필터를 타지 않는다 — config 소스라 필터 밖.
 * LIVE 아니면 빈 배열(도매매 35개는 DB에서 draft 라 어차피 미노출).
 */
export function allActiveCoupangCards(): CoupangCard[] {
  if (!COUPANG_CARDS_LIVE) return [];
  const seen = new Set<string>();
  const out: CoupangCard[] = [];
  for (const c of [...STYLE_CARDS, ...DAMAGE_CARDS]) {
    if (c.parked || seen.has(c.g)) continue;
    seen.add(c.g);
    out.push(strip(c));
  }
  return out;
}
