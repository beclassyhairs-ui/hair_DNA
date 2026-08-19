// style/volume — 볼륨·처짐 관련 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: 볼륨 상태(volumeState) 카피 + 현행 SCALP_ROUTINE
//   (정수리 드라이 순서 8슬롯, 최종본 §5 원문 = 재배치) 이관.
//   ⚠️ 지시서 §6-3: 볼륨 갈래 우선규칙을 새로 만들지 말 것.
import type { StyleCopyBlockModule } from "../types";

const volume: StyleCopyBlockModule = {
  domain: "style",
  block: "volume",
  entries: [],
};
export default volume;
