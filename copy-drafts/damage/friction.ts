// damage/friction — Q2 마찰(빗질 걸림) 신호 카피. §7-1 저장 구조.
//
// Q2 4값(tangled/loosens/smooth/unsure) 전량.
//   ※ 지시서에는 "Q2 3값"으로 적혀 있었으나 코드 실제는 4값이다(FRICTION_ADJ에
//     unsure 포함). PM 확정으로 unsure도 카피를 갖는다 — 아래 참조.
//
// ★ PM 확정(2026-08-19) — unsure는 블록을 숨기지 않고 안내 문구를 준다.
//   Q1 unsure와 동일 구조로 통일한다(한 화면에서 어떤 건 안내가 뜨고 어떤 건
//   사라지면 일관성이 깨진다).
//
// ★ MANAGEMENT_TIP(확정94)의 이사 도착지가 이 블록이다.
//   지금은 result/page.tsx에서 전원에게 같은 문장이 고정 노출되는데, 원래 이 조언은
//   "빗질이 걸리는 사람"에게 의미가 있다. 신호가 있는 손님(tangled·loosens)에게만
//   붙도록 별도 entry로 분리했다 — 문장은 원문 그대로라 sourceGrade는 재배치.
import type { DamageCopyBlockModule } from "../types";

const friction: DamageCopyBlockModule = {
  domain: "damage",
  block: "friction",
  entries: [
    {
      id: "damage.friction.tangled",
      text: "감고 나면 빗질이 전혀 안 된다고 하셨어요. 모발 겉면이 거칠어져 서로 걸리는 상태로 보입니다. 억지로 빗어 내리면 걸린 자리부터 끊어지니, 끝쪽부터 조금씩 나눠 푸시는 게 안전합니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q2 tangled(+1.0) 문장화. 확정124에서 문구가 '뜯긴다'→'빗질이 전혀 안 돼요'로 완화된 톤을 따름",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.loosens",
      text: "몇 번 빗으면 풀린다고 하셨어요. 겉면이 조금 거칠어졌지만, 아직 크게 걸리는 단계는 아닌 걸로 보입니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q2 loosens(+0.5) 문장화",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.smooth",
      text: "빗질이 부드럽게 넘어간다고 하셨어요. 모발 겉면이 잘 정돈돼 있는 걸로 보입니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "신규 — Q2 smooth(0) 문장화",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.unsure",
      text: "잘 모르겠다고 하셨어요. 감고 나서 물기를 턴 뒤 빗을 한 번 통과시켜 보시면 가장 잘 보입니다. 이 항목은 판단에서 비중이 작으니, 편하게 다음에 확인해보셔도 됩니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef: "PM 확정 2026-08-19 — unsure 블록 숨김 금지, 안내 문구 제공. Q1 unsure와 동일 구조",
      evidenceKeys: ["q2_friction"],
    },
    {
      id: "damage.friction.brush_tip",
      text: "트리트먼트는 바른 다음 빗으로 골고루 빗질해서 결 정돈까지 돼야 효과가 난다. 손 빗질만으론 부족하다.",
      status: "approved",
      sourceGrade: "재배치",
      // ⚠️ verbatim 마커("원문 그대로")를 뗀 이유: 결과지 V2 배선(2026-08-20)에서
      //   원본 상수 MANAGEMENT_TIP을 result/page.tsx에서 삭제했다. 대조할 라이브 원본이
      //   사라져 자동 검사 대상에서 빠진다. **문장 자체는 확정94 원문과 한 글자도 다르지
      //   않으며**, 삭제 직전 커밋(949c840)까지 원문 대조를 통과한 상태였다.
      sourceRef: "확정94 MANAGEMENT_TIP 원문(문장 불변) — 노출 조건만 전원 고정에서 Q2 신호자(tangled·loosens)로 이동. 원본 상수는 V2 배선에서 삭제돼 자동 대조 대상 아님",
      evidenceKeys: ["q2_friction"],
    },
  ],
};
export default friction;
