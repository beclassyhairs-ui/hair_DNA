// damage/cause — 손상 원인 설명 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: h_recent 6종(dye/root_dye/bleach/straight_perm/
//   heat_perm/normal_perm) 원인 블록. 현행 TYPE_INFO 3종(DRY/RIGID/HEALTHY)의
//   causeExplain을 6종으로 세분화하는 작업이라 재배치+파생이 섞인다.
//   ※ 탈색은 현재 dye와 함께 DRY로 뭉쳐 있어 별도 고위험 분기가 필요하다.
import type { DamageCopyBlockModule } from "../types";

const cause: DamageCopyBlockModule = {
  domain: "damage",
  block: "cause",
  entries: [],
};
export default cause;
