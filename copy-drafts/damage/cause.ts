// damage/cause — 손상 원인 설명 카피. §7-1 저장 구조.
//
// V2 §5-4: 현행 TYPE_INFO 3종(DRY/RIGID/HEALTHY)의 causeExplain을 h_recent 6종 +
//   시술 없음으로 세분화한다. 옛 구조는 causeExplain이 level 파라미터를 받지 않아
//   레벨과 무관하게 같은 문장이 나갔고, 무엇보다 **탈색이 전체염색과 함께 DRY로
//   뭉쳐 있었다** — 출발선이 다른 시술이라 고위험 분기를 신설했다.
//
// sourceGrade 판단 근거:
//   · dye        재배치 — DRY 원문이 사실상 전체염색을 묘사하고 있어 거의 그대로 쓴다
//   · normal_perm 재배치 — RIGID 원문의 "결합을 끊었다 다시 붙인다"가 일반펌 그 자체
//   · none       재배치 — HEALTHY 원문 그대로
//   · root_dye / straight_perm / heat_perm  파생 — 원문 논리를 각 시술에 특화
//   · bleach     신규 — 원문에 탈색 고유의 판단이 없다. 최우선 정독 검수 대상.
//
// ⚠️ 겁주기 금지(CLAUDE.md §9). 탈색조차 "버텨야 하는 양이 늘어난다"까지만 말하고
//   불안을 만들지 않는다. 화장품법 금지어(복구·재생·회복·영양·개선·강화·탈모) 전량 회피.
import type { DamageCopyBlockModule } from "../types";

const cause: DamageCopyBlockModule = {
  domain: "damage",
  block: "cause",
  entries: [
    {
      id: "damage.cause.dye",
      text: "마지막에 하신 염색은, 색을 넣는 과정에서 단백질 구성 성분인 멜라닌이 손상되고 유수분이 함께 빠져나갑니다. 채워주는 것도, 더 빠져나가지 않게 막아주는 것도 둘 다 중요한 시기예요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-20 사장님 구술(주된 원인 교체)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.root_dye",
      text: "마지막에 하신 뿌리 염색은, 뿌리만 하시니 손상 부담이 덜할 것 같지만 약이 닿는 자리가 매번 비슷하고 주기가 짧습니다. 지난번 염색한 부분과 겹쳐 닿는 경계에 손상이 누적될 수 있어요. 집에서 직접 하시면 그 경계선에 더 많이 쌓일 수밖에 없습니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-20 사장님 구술(주된 원인 교체)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.bleach",
      text: "마지막 시술 탈색은, 색을 넣기 전 색소를 빼는 시술이라 다른 시술과 중복해 원하는 느낌을 만들기엔 손상도가 너무 높아요. 데일리로 꾸준한 관리(현 상태 유지하기)와 조금씩 잘라내면서 손상도를 줄이는 게 가장 이상적이에요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(주된 원인 2차 — 탈색)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.straight_perm",
      text: "마지막에 하신 매직은, 결을 펴서 정돈돼 보이게 하는 시술이라 겉은 매끈해지지만 안쪽 결합을 끊었다 다시 붙인 상태라 겉보기와 다르게 데미지가 누적되고 있어요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-20 사장님 구술(주된 원인 교체)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.heat_perm",
      text: "마지막에 하신 열펌은, 약으로 모발 결합을 끊고 열로 모양을 잡는 방식이라 약과 열이 한 번에 들어갑니다. 반복될수록 깔끔하고 탱글했던 컬감은 부스스해지고 탄력도가 떨어질 수밖에 없어요.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-20 사장님 구술(주된 원인 교체)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.normal_perm",
      text: "마지막에 하신 일반 펌은, 모발 안쪽 결합을 끊었다 다시 붙이는 시술이에요. 반복되면 부스스함은 커지고, 힘없이 처지거나 볼륨 유지력이 줄어들 수밖에 없습니다.",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-20 사장님 구술(주된 원인 교체)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.none",
      text: "어떤 스타일이든 도전하기 쉬운 상태예요!",
      status: "approved",
      sourceGrade: "구술",
      sourceRef: "2026-09-29 사장님 구술(주된 원인 2차 — 없음)",
      evidenceKeys: ["h_recent"],
    },
  ],
};
export default cause;
