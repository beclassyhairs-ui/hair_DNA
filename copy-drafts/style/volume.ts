// style/volume — 볼륨·처짐 관련 카피. §7-1 저장 구조.
//
// 담는 것: 정수리 드라이 루틴(확정105 · 최종본 §5) 전체.
//   title + 6단계 + note를 각각 별도 entry로 쪼갠다 — 순서가 있는 절차라
//   resolver가 단계별로 렌더해야 하고, 한 덩어리로 묶어두면 조립이 불가능하다.
//
// ⚠️ step 문자열에 <b> 태그가 들어 있다. 현행 결과지가 dangerouslySetInnerHTML로
//   렌더하는 내부 신뢰 카피라 원문 그대로 보존한다(사용자 입력 아님).
//
// ⚠️ §6-3: 볼륨 갈래 우선규칙을 새로 만들지 말 것. 이 블록은 카피만 보관하고
//   어느 손님에게 보일지는 resolver가 기존 조건(SCALP_ROUTINE_BRANCHES b3·b5·b10 +
//   crossBranch scalpRoutineCard 트리거)을 그대로 쓴다.
import type { StyleCopyBlockModule } from "../types";

// scalpRoutineCard 발동 축(crossBranch.ts): q8_root_gray="1" OR (뿌리염색+펌계열)
//   OR (fine & thin) OR (age_50 & fine). 여기에 갈래 b3·b5·b10 상시 노출이 더해진다.
const SCALP_KEYS = [
  "q8_root_gray",
  "q8a_recent",
  "q8b_prev",
  "q7_thickness",
  "q8_density",
  "q1_age",
] as const;

const volume: StyleCopyBlockModule = {
  domain: "style",
  block: "volume",
  entries: [
    {
      id: "style.volume.scalp_title",
      text: "정수리만 다시 세우는 드라이 · 순서 그대로",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.title 원문 그대로 (확정105 · 최종본 §5)",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_step1",
      text: "머리를 거의 다 말립니다. 물기가 살짝 남았을 때가 잘 잡혀요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.steps[0] 원문 그대로",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_step2",
      text: "정수리 머리를 위로 한 줌 들어 올립니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.steps[1] 원문 그대로",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_step3",
      text: "집게형 볼륨 롤을 <b>뿌리에 바짝 대줍니다.</b> 감는 게 아니라 대는 거예요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.steps[2] 원문 그대로 (<b> 강조 포함)",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_step4",
      text: "그 상태로 드라이 열을 잠깐만.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.steps[3] 원문 그대로",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_step5",
      text: "<b>롤을 댄 그대로</b> 뿌리에 픽서를 뿌립니다 — 롤이 뿌리를 들고 있는 상태에서 굳혀야 삽니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.steps[4] 원문 그대로 (<b> 강조 포함)",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_step6",
      text: "그다음에 롤을 뺍니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.steps[5] 원문 그대로",
      evidenceKeys: [...SCALP_KEYS],
    },
    {
      id: "style.volume.scalp_note",
      text: "픽서는 딱딱하게 굳는 스프레이 말고, 만졌을 때 부서지지 않는 자연스러운 타입으로.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "SCALP_ROUTINE.note 원문 그대로",
      evidenceKeys: [...SCALP_KEYS],
    },

    // ── §6-4 "이슈 활성 시 상세 블록" 원재료 — b3/b4/b5/b6 tip·detail ────────
    {
      id: "style.volume.b3_detail",
      text: "무게는 그대로인데 세울 힘이 없으니 전체를 펴면 정수리부터 눌립니다. 그래서 이 머리는 펼까 말까가 아니라, 어디를 남기고 펴느냐가 문제예요. 그냥 타고나야 하나 보다 하고 포기하셨을 수도 있는데, 타고난 게 아니라 설계 문제입니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b3.detail 원문 그대로 (갈래3 숱많음+얇음+곱슬기×펴기)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl", "q13_design"],
    },
    {
      id: "style.volume.b3_tip",
      text: "정수리는 시술 없이도 세울 수 있습니다. 아래 순서대로만 해보셔도 달라져요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b3.tip 원문 그대로 (갈래3 · 정수리 루틴 도입부)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl", "q13_design"],
    },
    {
      id: "style.volume.b4_detail",
      text: "머릿결이 나빠서가 아니라 물리적인 무게 문제입니다. 그래서 이 머리로 길게 가려면 덮는 머리를 가볍게 만들어야 해요. 무게를 덜어야 뿌리가 버팁니다. 길이를 포기하지 않고도 가능합니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b4.detail 원문 그대로 (갈래4 얇음+숱적음×긴 기장)",
      evidenceKeys: ["q7_thickness", "q8_density", "q11_length"],
    },
    {
      id: "style.volume.b4_tip",
      text: "정수리에 롤 하나 집고 스프레이를 살짝 뿌려주세요. 길이가 길수록 뿌리가 눌리니까 여기가 제일 중요합니다. 볼륨 제품은 뿌리에만 쓰시고요 — 길이에 바르면 무게만 늘어납니다. 그리고 가르마를 반대쪽으로 바꿔서 말려 버릇하시면 눌려 있던 뿌리가 삽니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b4.tip 원문 그대로 (갈래4 얇음+숱적음×긴 기장)",
      evidenceKeys: ["q7_thickness", "q8_density", "q11_length"],
    },
    {
      id: "style.volume.b5_detail",
      text: "곱슬기라도 있으면 컬 사이가 비어 보이고, 없으면 아예 눌립니다. 그래서 이 머리는 미용실에서 뭘 하느냐보다 집에서 매일 3분을 어떻게 쓰느냐가 체감이 훨씬 큽니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b5.detail 원문 그대로 (갈래5 얇음+숱적음 숏~어깨)",
      evidenceKeys: ["q7_thickness", "q8_density", "q11_length"],
    },
    {
      id: "style.volume.b5_tip",
      text: "제일 확실한 건 정수리에 롤 하나 집고 스프레이를 살짝 뿌리는 겁니다. 전체가 아니라 정수리만요. 그리고 가르마를 반대쪽으로 바꿔서 말려 버릇해보세요. 눌려 있던 뿌리가 서면서, 나중에 원래 가르마로 돌아와도 볼륨이 남아 있습니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b5.tip 원문 그대로 (갈래5 얇음+숱적음 숏~어깨)",
      evidenceKeys: ["q7_thickness", "q8_density", "q11_length"],
    },
    {
      id: "style.volume.b6_tip",
      text: "이 머리는 감고 나서 말리면 붕 뜨는 느낌이 있으실 거예요. 속까지 마르는 데 시간이 오래 걸리는 머리라서, 아침에 감으면 그 상태로 하루를 시작하게 됩니다. 밤에 감고 잘 말리고 주무시면 아침에 훨씬 덜 떠 보여요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b6.tip 원문 그대로 (갈래6 숱많음+굵음 · 볼륨 과다 쪽 관리)",
      evidenceKeys: ["q8_density", "q7_thickness"],
    },
    {
      id: "style.volume.b10_tip",
      text: "정수리에 롤 하나 집고 스프레이를 살짝 뿌려주세요. 전체 말고 정수리만요. 가르마를 반대쪽으로 바꿔서 말려 버릇하는 것도 도움이 됩니다. 제품은 뿌리에만 쓰시고요 — 중간이나 끝에 바르면 안 그래도 무거운 중간이 더 눌립니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b10.tip 원문 그대로 (갈래10 숱많음+얇음+직모 · 정수리 관리)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl"],
    },

    // ── §6-4 BALANCED 축소 카피 — 명시적으로 허용된 신규 1건 ─────────────────
    // "볼륨 위험 규칙 하나도 미활성 시에만 BALANCED로 1~2문장 축소" (§6-4)
    {
      id: "style.volume.balanced",
      text: "볼륨 균형은 좋은 편이에요. 지금은 따로 손대실 것 없이, 말리실 때 뿌리 쪽만 세워주시면 충분합니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "§6-4 규정 — 볼륨 위험 규칙 전부 미활성 시 BALANCED 축소 카피(신규 1건으로 명시됨)",
      evidenceKeys: ["q7_thickness", "q8_density", "q3_curl", "q11_length"],
    },
  ],
};
export default volume;
