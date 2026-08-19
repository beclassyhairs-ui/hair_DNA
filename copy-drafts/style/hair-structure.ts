// style/hair-structure — 모발 구조(굵기×숱, 곱슬 modifier) 카피. §7-1 저장 구조.
//
// §6-5(1): "b3/b6/b10의 모질 판단 이동. Phase 1.0은 기존 원문에 존재하는 조합만,
//   없는 칸은 생략."
//
// 🔴 현재 비어 있는 이유 — §6 내부 충돌로 배치 보류(추측 금지 원칙).
//   b3/b6/b10의 "모질 판단"에 해당하는 문장은 각 갈래의 **aha**다:
//     · b3.aha "숱은 양이고, 버티는 힘은 한 올의 굵기예요. 양은 많은데 기둥이 없는 머리입니다."
//     · b6.aha "숱과 굵기가 같이 있으면 머리가 옆으로 뜨면서 부해 보이고 커 보입니다…"
//     · b10.aha "숱이 많아 중간 부피는 큰데, 한 올이 가늘어서 정수리를 세울 힘이 없습니다."
//   그런데 §6-3은 "door/aha = Primary Insight에 사용(재배치)"이라고 aha 전량을
//   Primary Insight로 보낸다. 같은 문장을 두 블록이 요구한다.
//
//   덧붙여 §7-1의 style 블록 목록(volume·hair-structure·curl-fit·cut·safety)에는
//   **Primary Insight를 담을 폴더가 없다.** stamp/door/aha 27슬롯의 저장 위치가
//   규정되지 않은 상태다.
//
//   → PM 판단을 받은 뒤 채운다. 임의로 한쪽에 넣으면 나중에 되돌리는 비용이 크다.
import type { StyleCopyBlockModule } from "../types";

const hairStructure: StyleCopyBlockModule = {
  domain: "style",
  block: "hair-structure",
  entries: [],
};
export default hairStructure;
