// damage/friction — Q2 마찰(빗질 걸림) 신호 카피. §7-1 저장 구조.
//
// Q2 4값(tangled/loosens/smooth/unsure) 전량.
//   ※ 지시서에는 "Q2 3값"으로 적혀 있었으나 코드 실제는 4값이다(FRICTION_ADJ에
//     unsure 포함). PM 확정으로 unsure도 카피를 갖는다 — 아래 참조.
//
// ★ PM 확정(2026-08-19) — unsure는 블록을 숨기지 않고 안내 문구를 준다.
//   Q1 unsure와 동일 구조로 통일한다(한 화면에서 어떤 건 안내가 뜨고 어떤 건
//   사라지면 일관성이 깨진다).
//
// ★ MANAGEMENT_TIP(확정94)의 이사 도착지가 이 블록이다.
//   지금은 result/page.tsx에서 전원에게 같은 문장이 고정 노출되는데, 원래 이 조언은
//   "빗질이 걸리는 사람"에게 의미가 있다. 신호가 있는 손님(tangled·loosens)에게만
//   붙도록 별도 entry로 분리했다 — 문장은 원문 그대로라 sourceGrade는 재배치.
import type { DamageCopyBlockModule } from "../types";

const friction: DamageCopyBlockModule = {
  domain: "damage",
  block: "friction",
  entries: [
    {
      id: "damage.friction.tangled",
      text: "모발 겉면이 거칠어져 서로 걸리는 상태에선, 부드러운 트리트먼트나 마스크를 바르고 빗질해서 머릿결 정돈을 해주고 말리거나, 다 헹구고 젖은 상태에서 오일 바르고 결 정돈 빗질 등을 해주고 말린다면 훨씬 더 부드럽고 좋은 컨디션으로 관리할 수 있어요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(빗질 되읽기 2차 — 전혀 안 됨/좀 엉킴 공통 문장)",
      evidenceKeys: ["q2_friction"],
    },
    {
      // 좀 엉킴(loosens)도 전혀 안 됨(tangled)과 같은 공통 문장(사장님 구술) → refId 공유(복사 방지).
      id: "damage.friction.loosens",
      refId: "damage.friction.tangled",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(빗질 되읽기 2차 — tangled와 동일 → refId)",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.smooth",
      text: "빗질이 부드럽게 넘어간다고 하셨어요. 모발 겉면이 잘 정돈돼 있는 걸로 보입니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q2 smooth(0) 문장화",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.unsure",
      text: "잘 모르겠다고 하셨어요. 감고 나서 물기를 턴 뒤 빗을 한 번 통과시켜 보시면 가장 잘 보입니다. 이 항목은 판단에서 비중이 작으니, 편하게 다음에 확인해보셔도 됩니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "PM 확정 2026-08-19 — unsure 블록 숨김 금지, 안내 문구 제공. Q1 unsure와 동일 구조",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.brush_tip",
      text: "트리트먼트는 바른 다음 빗으로 골고루 빗어서 결 정돈까지 돼야 효과가 나요. 손으로만 훑으면 부족합니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-15 사장님 구술(되읽기 교체·반말→해요체) — 구 확정94 MANAGEMENT_TIP. 노출 조건은 Q2 신호자(tangled·loosens) 유지",
      evidenceKeys: ["q2_friction"],
    },
  ],
};
export default friction;
