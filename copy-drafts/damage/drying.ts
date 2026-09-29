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
      id: "damage.drying.slow", // 10분 이상
      text: "감고 말리기까지 10분 이상 걸린다면 두 가지 상태일 확률이 높아요. 숱이 많고 모발 밀도가 높거나, 머리에 손상도가 높아 단백질 성분들이 들어갈 자리에 물로 채워져 있는(다공성모) 경우입니다. 이쪽이라면 물이 머금는 자리에 다시 단백질을 채워줘야 하는 쪽이 맞아요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(건조 되읽기 2차 — 10분 이상=slow)",
      evidenceKeys: ["q3_dry"],
    },
    {
      id: "damage.drying.normal", // 5~10분
      text: "보편적인 손상도를 갖고 계십니다. 머리 말리는 시간의 기준은, 모발 속 단백질 자리에 수분이 머금고 있어(다공성모) 수분이 마르는 시간에 비해 길어질 수 있어요. 모발 속 단백질을 채워주는 관리가 필요할 수 있어요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(건조 되읽기 2차 — 5~10분=normal)",
      evidenceKeys: ["q3_dry"],
    },
    {
      // 5분 안쪽(fast)은 5~10분(normal)과 같은 문장 노출(설문 의도 전달 위해 동일 조각 재사용).
      //   문장 복사 대신 refId로 normal 본문을 상속(사장님 지시 "동일 조각 재사용").
      id: "damage.drying.fast",
      refId: "damage.drying.normal",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(건조 되읽기 2차 — 5분 안쪽=5~10분과 동일 조각 재사용)",
      evidenceKeys: ["q3_dry"],
    },
  ],
};
export default drying;
