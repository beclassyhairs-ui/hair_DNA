// damage/risk — 위험 예고(예언) 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: 예언 14종 × (door/aha/tip) = 42문장.
//   ⚠️ 2026-08-13 지시서 원문 그대로 = sourceGrade "재배치", 문장 재작성 금지.
//   ⚠️ 예언 11~14는 단독 매칭과 폴백을 겸한다 — riskFamily 태깅 시 primary와
//      중복될 수 있어 dedupe 설계에 반영해야 한다(V2_PRECHECK §5 주의).
//   ⚠️ 예언 8번은 길이 문항 부재로 match=false(구조상 미노출). 손상 엔진 v2에서
//      길이 문항이 생기면 부활 대상.
import type { DamageCopyBlockModule } from "../types";

const risk: DamageCopyBlockModule = {
  domain: "damage",
  block: "risk",
  entries: [],
};
export default risk;
