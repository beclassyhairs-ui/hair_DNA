// damage/gray — 새치·흰머리 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: 현행 GRAY_HAIR_STORY(확정104 원문, 재배치)를 이관.
//   노출 조건은 h_root_gray — 뿌리염색 슬롯 위에서만 켜지는 하위체크라
//   "새치 있음 + 염색 안 함"은 구조상 존재 불가(설문이 보장).
import type { DamageCopyBlockModule } from "../types";

const gray: DamageCopyBlockModule = {
  domain: "damage",
  block: "gray",
  entries: [],
};
export default gray;
