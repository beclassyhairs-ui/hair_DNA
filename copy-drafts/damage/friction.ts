// damage/friction — Q2 마찰(빗질 걸림) 신호 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: Q2 4값(tangled/loosens/smooth/unsure) 문장화.
//   현행 MANAGEMENT_TIP(확정94)이 전원 동일 고정노출인데, Q2 신호가 있는
//   손님에게로 옮겨가는 대상이 이 블록이다(재배치).
import type { DamageCopyBlockModule } from "../types";

const friction: DamageCopyBlockModule = {
  domain: "damage",
  block: "friction",
  entries: [],
};
export default friction;
