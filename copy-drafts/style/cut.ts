// style/cut — 커트 설계(기장×레이어×굵기×숱) 카피. §7-1 저장 구조.
//
// §6-5(3): "b4/b6의 커트 판단 이동 + 미용실 주문 멘트."
//   b10.procedure도 내용이 명백한 커트 판단("속의 부피만 덜어내는 커트")이라 함께 둔다.
//
// ⚠️ b6.detail은 §6-4가 volume 원재료로도 언급하지만, 내용이 숱치기 주기와 기장
//   무게추라 커트 판단이 명백하다. §6-5(3)의 "b6의 커트 판단 이동" 지시를 따라
//   cut에 둔다. 이 중복 언급은 보고 대상으로 올린다.
import type { StyleCopyBlockModule } from "../types";

const B4_KEYS = ["q7_thickness", "q8_density", "q11_length"] as const;
const B6_KEYS = ["q8_density", "q7_thickness"] as const;
const B10_KEYS = ["q8_density", "q7_thickness", "q3_curl"] as const;

const cut: StyleCopyBlockModule = {
  domain: "style",
  block: "cut",
  entries: [
    {
      id: "style.cut.b6_detail",
      text: "이 머리는 기장이 곧 무게추라서, 짧게 자를수록 눌러줄 무게가 없어져 옆으로 퍼집니다.\n\n그리고 숱치기에 함정이 하나 있어요. 치고 나면 딱 한두 달만 좋습니다. 다시 부해지니까 또 치고, 또 치고 — 그게 네다섯 번 쌓이면 끝은 너무 가벼워 보이고 뿌리만 무겁고 숱 많은 머리가 될 확률이 높습니다. 새로 자라나는 머리가 계속 쌓이기 때문이에요. 그래서 자주 치기보다 여섯 달 정도 간격을 두고 한 번에 제대로 치는 쪽이 이 머리를 지킵니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b6.detail 원문 그대로 (갈래6 숱많음+굵음 · §6-5(3) 커트 판단 이동)",
      evidenceKeys: [...B6_KEYS],
    },
    {
      id: "style.cut.b4_procedure",
      text: "길이를 지키고 싶다면 덮는 머리에 층을 많이 내서 가볍게 하고, 볼륨을 담당하는 부분은 길이를 짧게 잡습니다. 뿌리까지 컬을 넣는 것도 방법이에요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b4.procedure 원문 그대로 (갈래4 얇음+숱적음×긴기장 · §6-5(3) 커트 판단 이동)",
      evidenceKeys: [...B4_KEYS],
    },
    {
      id: "style.cut.b6_procedure",
      text: "겉머리를 쳐내면 결이 중간에 잘려 더 날립니다. 겉결은 그대로 두고 안쪽 양감만 조절하는 게 답이에요. 그리고 과한 웨이브는 이 머리에 독입니다. 컬이 필요하시면 어깨선 아래쪽으로만 들어가야 해요. 그 위로 컬이 올라오면 머리가 훨씬 더 커 보입니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef:
        "BRANCH_COPY.b6.procedure 원문 그대로 (갈래6) · 걸침: 커트 판단(양감 조절)이 주(主), 컬 위치 제한은 부수 — §6 보정 2에 따라 cut 배치",
      evidenceKeys: [...B6_KEYS],
    },
    {
      id: "style.cut.b10_procedure",
      text: "겉은 건드리지 않고 속(중간)의 부피만 덜어내는 커트가 잘 맞는 머리입니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b10.procedure 원문 그대로 (갈래10 숱많음+얇음+직모 · 내용이 명백한 커트 판단)",
      evidenceKeys: [...B10_KEYS],
    },
  ],
};
export default cut;
