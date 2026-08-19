// style/safety — 시술 가능 여부·주의 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: 현행 CAUTION_NOTICE(지시서 A-2, 재배치) + 갈래9
//   (게이트 차단) 카피 이관.
//   ⚠️ styleGate.ts는 Phase 1.0 동결(§8-6·§10-10). 이 블록은 게이트의 "판정"을
//      바꾸지 않고 그 결과를 문장으로 표현만 한다. 게이트 구조 변경이 필요해지면
//      작업을 멈추고 보고한다.
import type { StyleCopyBlockModule } from "../types";

const safety: StyleCopyBlockModule = {
  domain: "style",
  block: "safety",
  entries: [],
};
export default safety;
