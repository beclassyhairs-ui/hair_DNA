// damage/elasticity — Q1 당김(탄력) 신호 카피. §7-1 저장 구조.
//
// Q1 5값(snap/stretch/elastic/firm/unsure) 전량. 현재 결과지에 물리테스트 답
// 렌더가 0건이라 대부분 신규 작성이다.
//
// ★ PM 확정(2026-08-19) — unsure는 블록을 숨기지 않고 안내 문구를 준다.
//   "잘 모르겠어요"를 고르는 손님은 자가진단을 어려워하는 분(주 고객 50~60대에 많음)이라,
//   답했는데 화면에서 그 항목이 사라지면 "내 답을 안 읽었나" 하는 허전함이 생긴다.
//   V2의 목적("내 답을 다 읽었구나")과 정반대가 되므로 금지. Q2 unsure와 동일 구조로 통일.
//
// ⚠️ firm(−0.3)은 유일한 건강 신호인데, 마지막 시술이 매직이면 엔진이 그 −0.3을
//   무효화한다(확정124 코팅 규칙, damageRecommend.ts:264-265). 그래서 firm 카피도
//   일반용과 매직용 2종으로 나눈다 — 매직 손님에게 "좋은 신호"라고 말하면 엔진 판정과
//   화면 문장이 어긋난다.
import type { DamageCopyBlockModule } from "../types";

const elasticity: DamageCopyBlockModule = {
  domain: "damage",
  block: "elasticity",
  entries: [
    {
      id: "damage.elasticity.snap",
      text: "살짝만 당겨도 톡 끊어진다고 하셨어요. 모발 안쪽에서 힘을 버텨주던 결합이 많이 풀린 걸로 보입니다. 지금은 새로 뭘 얹기보다, 끊어진 끝을 정리하면서 기르는 쪽이 빠릅니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "신규 — Q1 snap(+1.0) 문장화. 결과지에 물리테스트 렌더가 없어 원문 없음",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.stretch",
      text: "쭉 늘어나다 끊어진다고 하셨어요. 모발이 힘을 버티지 못하고 늘어나는 단계로 보입니다. 젖어 있을 때가 가장 약하니, 감고 나서 세게 빗어 내리는 습관만 줄여도 차이가 납니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "신규 — Q1 stretch(+0.7) 문장화",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.elastic",
      text: "늘어났다가 다시 돌아온다고 하셨어요. 탄력이 남아 있는 상태로 보입니다. 크게 걱정하실 단계는 아니고, 지금 리듬을 유지하시면 됩니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "신규 — Q1 elastic(+0.3) 문장화",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.firm",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 모발이 힘을 그대로 버티고 있는, 좋은 신호로 보입니다.",
      status: "draft",
      sourceGrade: "신규",
      // ⚠️ 이 문장만 firm을 "좋은 신호"라고 말한다. 이력이 가벼운 손님에게만 도달해야 하며,
      //   Lv3 이상 화면에 뜨면 안 된다(check.ts가 유효 입력공간 전수로 보장한다).
      sourceRef: "신규 — Q1 firm(−0.3, 유일한 건강 신호) 문장화. 탈색·누적·매직 없는 가벼운 이력 전용",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.firm_after_magic",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 다만 마지막에 매직을 하셨다면, 이 단단함은 결을 펴면서 겉을 잡아준 상태일 수 있습니다. 겉이 매끈해도 속은 따로 보셔야 하는 걸로 보입니다.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "확정124 — 매직 코팅 규칙(firm의 −0.3 무효화)을 카피로 확장",
      evidenceKeys: ["q1_pull", "h_recent"],
    },
    {
      id: "damage.elasticity.firm_after_bleach",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 다만 탈색을 하신 머리에서는 이 단단함을 건강한 신호로 읽지 않습니다. 속이 비면서 뻣뻣해진 것도 손끝에는 비슷하게 느껴지기 때문이에요. 판단은 시술 이력 쪽을 더 크게 보고 있습니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "PM 확정 2026-08-20 — 탈색 이력(1회 포함)이면 firm을 좋은 신호로 말하지 않는다. 확정124 매직 코팅 논리의 일반화",
      evidenceKeys: ["q1_pull", "h_recent", "h_prev", "h_bleach_2plus"],
    },
    {
      id: "damage.elasticity.firm_heavy_history",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 다만 시술이 여러 번 쌓인 머리에서는 이 단단함만으로 안심하기는 어렵습니다. 겉이 버텨주는 것과 속이 튼튼한 건 다를 수 있어서요. 이 항목은 참고로만 두고 보시는 게 좋겠습니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "PM 확정 2026-08-20 — 시술 누적 많음(h_more=many 또는 두 슬롯 모두 시술)이면 firm 신중 분기",
      evidenceKeys: ["q1_pull", "h_recent", "h_prev", "h_more"],
    },
    {
      id: "damage.elasticity.unsure",
      text: "잘 모르겠다고 하셨어요. 머리를 감은 뒤 젖은 상태에서 한 가닥만 골라 양끝을 천천히 당겨보시면 가장 잘 보입니다. 이 항목은 판단에서 비중이 작으니, 편하게 다음에 확인해보셔도 됩니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "PM 확정 2026-08-19 — unsure 블록 숨김 금지, 안내 문구 제공. Q2 unsure와 동일 구조",
      evidenceKeys: ["q1_pull"],
    },
  ],
};
export default elasticity;
