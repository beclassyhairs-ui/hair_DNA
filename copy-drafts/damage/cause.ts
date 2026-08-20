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
      text: "마지막에 하신 게 전체 염색이네요. 염색은 색을 넣는 과정에서 머릿결 속 수분과 유분이 같이 빠져나갑니다. 그래서 만졌을 때 뻑뻑하고 부스스한 걸로 보입니다. 채우기보다, 빠져나가는 걸 막아주는 쪽이 먼저입니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "TYPE_INFO.DRY.causeExplain 원문 — 전체염색 케이스로 좁힘",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.root_dye",
      text: "마지막에 하신 게 뿌리 염색이네요. 뿌리만 하시니 부담이 덜할 것 같지만, 약이 닿는 자리가 매번 비슷하고 주기가 짧습니다. 그래서 새로 자란 뿌리보다, 지난번 염색한 부분과 겹쳐 닿는 경계가 먼저 지치는 걸로 보입니다.",
      status: "approved",
      sourceGrade: "파생",
      sourceRef: "TYPE_INFO.DRY 논리 + 확정95 뿌리염색 주기 축(h_root_interval)을 원인 설명에 적용",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.bleach",
      text: "마지막에 하신 게 탈색이네요. 탈색은 색을 넣기 전에 원래 있던 색소를 빼내는 시술이라, 다른 시술과 출발선이 다릅니다. 원하는 밝기까지 한 번에 안 되면 반복하게 되고, 그만큼 모발이 버텨야 하는 양도 같이 늘어납니다. 지금은 다음 시술까지 간격을 넉넉히 두시는 게 가장 확실합니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — 원문에 탈색 고유 판단 없음. 현행은 전체염색과 함께 DRY로 뭉쳐 있어 §5-4 고위험 분기로 신설",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.straight_perm",
      text: "마지막에 하신 게 매직이네요. 결을 펴서 정돈돼 보이게 하는 시술이라 겉은 매끈해집니다. 다만 안쪽 결합을 끊었다 다시 붙인 상태라, 겉보기와 속 상태가 따로 가는 걸로 보입니다. 겉이 괜찮아 보여도 속을 기준으로 보시는 게 맞습니다.",
      status: "approved",
      sourceGrade: "파생",
      sourceRef: "TYPE_INFO.RIGID 논리를 매직에 특화 + 확정124 코팅 규칙(겉/속 분리)과 정합",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.heat_perm",
      text: "마지막에 하신 게 열펌이네요. 약으로 결합을 끊고 열로 모양을 잡는 방식이라, 약과 열이 한 번에 들어갑니다. 반복될수록 컬은 잡히는데 만졌을 때 힘이 빠지는 걸로 보입니다.",
      status: "approved",
      sourceGrade: "파생",
      sourceRef: "TYPE_INFO.RIGID 논리를 열펌에 특화(FIX2에서 매직과 분리된 시술)",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.normal_perm",
      text: "마지막에 하신 게 일반 펌이네요. 머릿결 안쪽 결합을 끊었다 다시 붙이는 시술이라, 반복될수록 힘없이 처지거나 반대로 뻣뻣해지는 걸로 보입니다. 유연하게 풀어주는 관리가 맞습니다. 단백질을 너무 세게 채우면 오히려 딱딱해지니 주의하세요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "TYPE_INFO.RIGID.causeExplain 원문 — 일반펌 케이스로 좁힘",
      evidenceKeys: ["h_recent"],
    },
    {
      id: "damage.cause.none",
      text: "지금은 시술 손상이 거의 없는 상태예요. 뭘 해도 잘 나오는, 선택의 폭이 가장 넓은 시기입니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "TYPE_INFO.HEALTHY.causeExplain 원문 그대로",
      evidenceKeys: ["h_recent"],
    },
  ],
};
export default cause;
