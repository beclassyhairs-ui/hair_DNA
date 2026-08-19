// damage/elasticity — Q1 당김(탄력) 신호 카피. §7-1 저장 구조.
// 다음 단계에서 채울 슬롯: Q1 5값(snap/stretch/elastic/firm/unsure) 문장화.
//   현재 결과지에 물리테스트 답 렌더가 0건이라 전량 신규 작성 대상이다.
import type { DamageCopyBlockModule } from "../types";

const elasticity: DamageCopyBlockModule = {
  domain: "damage",
  block: "elasticity",
  entries: [],
};
export default elasticity;
