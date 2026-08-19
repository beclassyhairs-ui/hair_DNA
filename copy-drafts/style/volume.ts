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
  ],
};
export default volume;
