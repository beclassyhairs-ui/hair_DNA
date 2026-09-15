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
      text: "감고 나서 다 마르기까지 한참 걸린다고 하셨죠. 숱이 많아서 물을 머금는 양이 많은 거면 손상이 아니에요. 그게 아니면, 원래 단백질이 채우고 있어야 할 자리가 비어서 그 안에 물이 들어찬 다공성 모발일 확률이 높습니다 — 이런 머리는 물을 두 배 가까이 머금고 잘 내보내지 못해요. 이쪽이면 물이 차지한 자리를 원래 성분인 단백질로 다시 채워주는 관리가 맞습니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-15 사장님 구술(되읽기 교체) — Q3 slow(다 마르기 오래) 두 원인 분기. copy:lint L1(4문장+) 사장님 승인 예외",
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
