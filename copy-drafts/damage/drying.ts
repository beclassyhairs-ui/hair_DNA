// damage/drying — Q3 자연건조 시간 신호 카피. §7-1 저장 구조.
//
// Q3 3값(slow/normal/fast) 전량. **unsure 옵션이 설문에 없다** — Q1·Q2와 달리
//   DRY_ADJ에 unsure 키가 없으므로 안내 문구 대상도 아니다(PM 확정 참고란 그대로).
//
// ⚠️ 지켜야 하는 두 확정:
//   · 확정115 — 오래 걸림(slow)이 손상 신호다. 옛 엔진은 이 방향이 뒤집혀 있었다.
//   · 확정117 — 빨리 마름(fast)은 **중립**이다. 손상으로 단정하지 않는다.
//     가늘거나 숱이 적어도 빨리 마르기 때문에, 좋다/나쁘다 어느 쪽으로도 말하지 않는다.
import type { DamageCopyBlockModule } from "../types";

const drying: DamageCopyBlockModule = {
  domain: "damage",
  block: "drying",
  entries: [
    {
      id: "damage.drying.slow",
      text: "감고 나서 다 마르는 데 한참 걸린다고 하셨어요. 모발이 물을 머금었다가 잘 내보내지 못하는 상태로 보입니다. 겉면이 열려 있으면 물이 쉽게 들어오고 늦게 나갑니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "신규 — Q3 slow(+1.0) 문장화. 확정115(오래=손상) 방향 준수",
      evidenceKeys: ["q3_dry"],
    },
    {
      id: "damage.drying.normal",
      text: "마르는 시간이 보통이라고 하셨어요. 모발이 물을 머금는 정도가 무난한 걸로 보입니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "신규 — Q3 normal(0) 문장화",
      evidenceKeys: ["q3_dry"],
    },
    {
      id: "damage.drying.fast",
      text: "금방 마른다고 하셨어요. 이건 좋고 나쁨을 가르는 신호는 아닙니다. 모발이 가늘거나 숱이 많지 않아도 빨리 마르기 때문에, 이 항목만으로는 판단하지 않습니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "신규 — Q3 fast(0) 문장화. 확정117(빨리=중립, 손상 단정 금지) 준수",
      evidenceKeys: ["q3_dry"],
    },
  ],
};
export default drying;
