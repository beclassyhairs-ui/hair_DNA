// damage/drying — Q3 자연건조 시간 신호 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: Q3 3값(slow/normal/fast) 문장화.
//   확정115(오래=손상)·확정117(빨리=중립, 손상 단정 금지)을 문구가 지켜야 한다.
import type { DamageCopyBlockModule } from "../types";

const drying: DamageCopyBlockModule = {
  domain: "damage",
  block: "drying",
  entries: [],
};
export default drying;
