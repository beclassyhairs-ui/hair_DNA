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
// ⚠️ firm(−0.3)은 물리테스트에서 유일한 음수(건강 쪽) 보정이라 카피가 가장 조심스럽다.
//   손상 판단의 우선순위는 **시술이력 > 물리테스트**이므로(2026-08-20 사업주 확정),
//   이력이 쌓인 손님에게는 firm을 건강 신호로 말하지 않는다. 4분기로 나눈다:
//     · firm_after_bleach  탈색 이력(1회 포함) — 최우선. 건강 신호로 보지 않는다
//     · firm_after_magic   마지막이 매직 — 확정124 코팅 규칙(엔진이 −0.3을 무효화)
//     · firm_heavy_history 누적 많음(h_more=many 또는 두 슬롯 모두 시술)
//     · firm               위 셋 다 아닌 가벼운 이력 전용
//   ★ firm(가벼운 이력)조차 "좋은 신호"라고 확언하지 않는다(PM 빨간펜 2026-08-20) —
//     다른 물리진단은 전부 손상 신호를 주는데 당김만 건강을 확언하면 톤이 튄다.
import type { DamageCopyBlockModule } from "../types";

const elasticity: DamageCopyBlockModule = {
  domain: "damage",
  block: "elasticity",
  entries: [
    {
      id: "damage.elasticity.snap",
      text: "살짝만 당겨도 톡 끊어진다고 하셨어요. 모발 안쪽에서 힘을 버텨주던 결합이 많이 풀린 걸로 보입니다. 지금은 새로 뭘 얹기보다, 끊어진 끝을 정리하면서 기르는 쪽이 빠릅니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q1 snap(+1.0) 문장화. 결과지에 물리테스트 렌더가 없어 원문 없음",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.stretch",
      text: "쭉 늘어나다 끊어진다고 하셨어요. 젖은 머리는 원래 3할 정도 늘어났다가 바로 돌아오는데, 늘어난 채 못 돌아오고 끊어지면 속을 채우던 단백질이 빠져나가고 그 자리에 물이 들어찬 상태로 보입니다. 이쪽은 빠진 자리를 단백질로 채워주는 관리가 맞습니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-15 사장님 구술(되읽기 교체) — Q1 stretch(늘어나다 끊어짐)",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.elastic",
      text: "늘어났다가 다시 돌아온다고 하셨어요. 건강한 머리는 젖었을 때 3할 정도 늘어났다가 바로 돌아옵니다. 탄력이 남아 있는 상태라 지금 리듬을 유지하시면 됩니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-15 사장님 구술(되읽기 교체) — Q1 elastic(늘어났다 돌아옴)",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.firm",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 지금은 크게 걱정하실 신호가 보이지 않는 단계예요. 다만 당김 하나로 단정하지는 않으니, 다른 항목과 함께 보시면 됩니다.",
      status: "approved",
      sourceGrade: "신규",
      // ⚠️ 이 문장은 firm을 부정 신호로 말하지 않는 유일한 분기다. 이력이 가벼운 손님에게만
      //   도달해야 하며, Lv3 이상 화면에 뜨면 안 된다(check.ts가 유효 입력공간 전수로 보장).
      //   "좋은 신호" 확언은 넣지 않는다 — 다른 물리진단은 전부 손상 신호를 주는데 당김만
      //   건강을 확언하면 톤이 튄다(PM 빨간펜).
      sourceRef: "신규 — Q1 firm(−0.3) 문장화. 탈색·누적·매직 없는 가벼운 이력 전용 / PM 빨간펜 2026-08-20 — firm 단정 완화",
      evidenceKeys: ["q1_pull"],
    },
    {
      id: "damage.elasticity.firm_after_magic",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 다만 마지막에 매직을 하셨다면, 이 단단함은 결을 펴면서 겉을 잡아준 상태일 수 있습니다. 겉이 매끈해도 속은 따로 보셔야 하는 걸로 보입니다.",
      status: "approved",
      sourceGrade: "파생",
      sourceRef: "확정124 — 매직 코팅 규칙(firm의 −0.3 무효화)을 카피로 확장",
      evidenceKeys: ["q1_pull", "h_recent"],
    },
    {
      id: "damage.elasticity.firm_after_bleach",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 그런데 탈색한 머리는 단단할 수가 없어서, 마른 상태에서 해보셨을 확률이 높습니다. 젖은 머리로 한 번만 다시 해보세요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-15 사장님 구술(되읽기 교체) — Q1 firm × 탈색 이력",
      evidenceKeys: ["q1_pull", "h_recent", "h_prev", "h_bleach_2plus"],
    },
    {
      id: "damage.elasticity.firm_heavy_history",
      text: "단단해서 잘 안 늘어난다고 하셨어요. 시술이 많이 쌓인 머리가 단단하게 느껴지는 경우는 단백질·케라틴 케어를 과하게 했을 때 정도예요. 이 항목은 참고로만 두고, 판단은 시술 이력을 더 크게 봅니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-15 사장님 구술(되읽기 교체·❓애매) — Q1 firm × 시술 누적 많음",
      evidenceKeys: ["q1_pull", "h_recent", "h_prev", "h_more"],
    },
    {
      id: "damage.elasticity.unsure",
      text: "잘 모르겠다고 하셨어요. 머리를 감은 뒤 젖은 상태에서 한 가닥만 골라 양끝을 천천히 당겨보시면 가장 잘 보입니다. 이 항목은 판단에서 비중이 작으니, 편하게 다음에 확인해보셔도 됩니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "PM 확정 2026-08-19 — unsure 블록 숨김 금지, 안내 문구 제공. Q2 unsure와 동일 구조",
      evidenceKeys: ["q1_pull"],
    },
  ],
};
export default elasticity;
