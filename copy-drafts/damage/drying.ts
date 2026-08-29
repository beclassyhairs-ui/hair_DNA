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
      text: "감고 나서 다 마르기까지 한참 걸린다고 하셨죠. 오래 걸리는 이유는 크게 둘입니다. 하나는 숱이 많아서예요 — 이건 손상이 아니라 물을 머금는 양 자체가 많은 거라 걱정하실 일이 아니에요. 다른 하나는 모발 속을 채우던 단백질이 빠져나가면서, 그 빈자리에 물이 남는 경우입니다. 속이 비면 물을 머금었다가 잘 내보내지 못해서 늦게 말라요. 이쪽이라면 빠져나간 그 자리를 다시 채워주는 관리 — 속을 메우는 단백질 케어 — 가 잘 맞습니다.",
      status: "approved",
      sourceGrade: "파생",
      sourceRef: "사장님 원문 2026-08-21 기반 — Q3 slow 두 원인 분기(숱 많음=중립 / 단백질 유실→흡수성=손상) + 채움 관리. 확정115(오래=손상 신호) 방향은 후자 원인으로 보존, 전자(숱)는 중립으로 명시. ⚠️ 엔진은 slow를 +1.0 단일 가산 — 시간기반 3단계·원인 분기는 손상엔진 v2 안건(질문지 개편)",
      evidenceKeys: ["q3_dry"],
    },
    {
      id: "damage.drying.normal",
      text: "마르는 시간이 보통이라고 하셨어요. 모발이 물을 머금는 정도가 무난한 걸로 보입니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q3 normal(0) 문장화",
      evidenceKeys: ["q3_dry"],
    },
    {
      id: "damage.drying.fast",
      text: "금방 마른다고 하셨어요. 이건 좋고 나쁨을 가르는 신호는 아닙니다. 모발이 가늘거나 숱이 많지 않아도 빨리 마르기 때문에, 이 항목만으로는 판단하지 않습니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q3 fast(0) 문장화. 확정117(빨리=중립, 손상 단정 금지) 준수",
      evidenceKeys: ["q3_dry"],
    },
  ],
};
export default drying;
