// style/cut — 커트 설계(기장×레이어×굵기×숱) 카피. §7-1 저장 구조.
//
// §6-5(3): "b4/b6의 커트 판단 이동 + 미용실 주문 멘트."
//   b10.procedure도 내용이 명백한 커트 판단("속의 부피만 덜어내는 커트")이라 함께 둔다.
//
// ⚠️ b6.detail은 §6-4가 volume 원재료로도 언급하지만, 내용이 숱치기 주기와 기장
//   무게추라 커트 판단이 명백하다. §6-5(3)의 "b6의 커트 판단 이동" 지시를 따라
//   cut에 둔다. 이 중복 언급은 보고 대상으로 올린다.
import type { StyleCopyBlockModule } from "../types";

const B4_KEYS = ["q7_thickness", "q8_density", "q11_length"] as const;
const B6_KEYS = ["q8_density", "q7_thickness"] as const;
const B10_KEYS = ["q8_density", "q7_thickness", "q3_curl"] as const;
// [PHASE2] 기장별 커트 확장 — 기장 축 + 레이어·굵기·숱을 본문에 녹임.
const LEN_KEYS = ["q11_length", "q14_layer", "q7_thickness", "q8_density"] as const;

const cut: StyleCopyBlockModule = {
  domain: "style",
  block: "cut",
  entries: [
    {
      id: "style.cut.b6_detail",
      text: "이 머리는 기장이 곧 무게추라서, 짧게 자를수록 눌러줄 무게가 없어져 옆으로 퍼집니다.\n\n그리고 숱치기에 함정이 하나 있어요. 치고 나면 딱 한두 달만 좋습니다. 다시 부해지니까 또 치고, 또 치고 — 그게 네다섯 번 쌓이면 끝은 너무 가벼워 보이고 뿌리만 무겁고 숱 많은 머리가 될 확률이 높습니다. 새로 자라나는 머리가 계속 쌓이기 때문이에요. 그래서 자주 치기보다 여섯 달 정도 간격을 두고 한 번에 제대로 치는 쪽이 이 머리를 지킵니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b6.detail 원문 그대로 (갈래6 숱많음+굵음 · §6-5(3) 커트 판단 이동)",
      evidenceKeys: [...B6_KEYS],
    },
    {
      id: "style.cut.b4_procedure",
      text: "길이를 지키고 싶다면 덮는 머리에 층을 많이 내서 가볍게 하고, 볼륨을 담당하는 부분은 길이를 짧게 잡습니다. 뿌리까지 컬을 넣는 것도 방법이에요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b4.procedure 원문 그대로 (갈래4 얇음+숱적음×긴기장 · §6-5(3) 커트 판단 이동)",
      evidenceKeys: [...B4_KEYS],
    },
    {
      id: "style.cut.b6_procedure",
      text: "겉머리를 쳐내면 결이 중간에 잘려 더 날립니다. 겉결은 그대로 두고 안쪽 양감만 조절하는 게 답이에요. 그리고 과한 웨이브는 이 머리에 독입니다. 컬이 필요하시면 어깨선 아래쪽으로만 들어가야 해요. 그 위로 컬이 올라오면 머리가 훨씬 더 커 보입니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef:
        "BRANCH_COPY.b6.procedure 원문 그대로 (갈래6) · 걸침: 커트 판단(양감 조절)이 주(主), 컬 위치 제한은 부수 — §6 보정 2에 따라 cut 배치",
      evidenceKeys: [...B6_KEYS],
    },
    {
      id: "style.cut.b10_procedure",
      text: "겉은 건드리지 않고 속(중간)의 부피만 덜어내는 커트가 잘 맞는 머리입니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b10.procedure 원문 그대로 (갈래10 숱많음+얇음+직모 · 내용이 명백한 커트 판단)",
      evidenceKeys: [...B10_KEYS],
    },

    // ════════════════════════════════════════════════════════════════════════
    // [PHASE2] 기장별 커트 확장 — 기장(q11)을 축으로, 레이어(q14)·굵기(q7)·숱(q8)을
    //   본문에 녹인 커트 조언 + 미용실 주문 멘트. 전건 draft. 갈래 커트(b4/b6/b10)가
    //   특정 모질만 덮던 것을, 전 기장 손님에게 기장 맞춤 커트 판단으로 확장한다.
    //   ⚠️ 레이어·굵기·숱을 별도 분기가 아니라 문장 안에서 다룬다(기장 5칸만 도달 축) —
    //      완전한 4축 조합 커버가 아니므로 리뷰 파일에 "미커버(문장 내 처리)"로 명시.
    //   ⚠️ b4(롱)·b6/b10(단발 겉결) 손님은 승인 커트 entry와 겹칠 수 있음 → 리뷰에 명시.
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "style.cut.len_short",
      text: "숏은 무게추가 거의 없어서, 굵거나 숱 많은 머리는 옆으로 벌어지고 가는 머리는 납작해지기 쉬운 기장이에요. 층을 많이 낼수록 더 가벼워지니, 숱 많으면 속만 덜어 겉결은 남기고, 숱 적으면 층을 최소화해 무게를 지켜야 합니다. 미용실에선 “옆 볼륨 눌러주고, 목덜미는 짧게 붙여주세요”라고 주문하시면 균형이 잡혀요.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "[PHASE2] 기장별 커트 — 숏. 원문 대응 없음(기장×레이어×모질 신규 판단)",
      evidenceKeys: [...LEN_KEYS],
    },
    {
      id: "style.cut.len_short_bob",
      text: "숏보브는 턱선 안팎에서 얼굴형을 제일 크게 바꾸는 기장이에요. 일자로 무겁게 가면 단정하지만 자칫 답답하고, 층을 넣으면 가벼운데 숱 적은 머리는 끝이 비어 보입니다. 그래서 끝선 한 줄은 살려 두고 안쪽만 정리하는 게 안전해요. 미용실에선 “끝 라인은 유지하고, 얼굴 옆 라인만 살짝 층 내주세요”라고 하시면 됩니다.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "[PHASE2] 기장별 커트 — 숏보브. 원문 대응 없음(신규 판단)",
      evidenceKeys: [...LEN_KEYS],
    },
    {
      id: "style.cut.len_bob",
      text: "단발은 무게와 가벼움의 균형점이라 층 조절이 인상을 좌우해요. 굵거나 숱 많은 머리는 겉을 치면 결이 중간에 잘려 더 날리니 속 양감만 덜고, 가는 머리는 층을 얕게 넣어 움직임만 주는 게 좋습니다. 미용실에선 “겉결은 그대로 두고 안쪽 무게만 빼주세요”라고 주문하시면 실패가 적어요.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] 기장별 커트 — 단발. BRANCH_COPY.b6/b10(겉결 두고 안쪽 양감) 논리를 기장 축으로 확장",
      evidenceKeys: [...LEN_KEYS],
    },
    {
      id: "style.cut.len_collarbone",
      text: "쇄골 기장은 층을 어디서 시작하느냐가 스타일을 가릅니다. 얼굴 옆부터 층을 주면 갸름해 보이지만, 너무 위에서 시작하면 정수리가 비어 보여요. 숱 많으면 무게가 실려 예쁘게 떨어지고, 숱 적으면 끝이 얇아지니 끝 무게를 남겨야 합니다. 미용실에선 “얼굴 옆 라인부터 층, 끝은 두껍게 남겨주세요”라고 하시면 좋아요.",
      status: "draft",
      sourceGrade: "신규",
      sourceRef: "[PHASE2] 기장별 커트 — 쇄골. 원문 대응 없음(신규 판단)",
      evidenceKeys: [...LEN_KEYS],
    },
    {
      id: "style.cut.len_chest",
      text: "롱은 길이 자체가 무게라, 가는·숱 적은 머리엔 오히려 위가 눌려 더 없어 보이는 기장이에요. 덮는 머리에 층을 많이 내 가볍게 하고, 볼륨 담당 부분은 짧게 잡아야 위가 삽니다. 반대로 굵고 숱 많으면 끝이 무거워 처지니 끝 무게를 덜어내야 해요. 미용실에선 “덮는 머리 층 많이, 끝 무게 덜어주세요”라고 주문하시면 됩니다.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] 기장별 커트 — 롱. BRANCH_COPY.b4.procedure(덮는 머리 층, 볼륨 부분 짧게) 논리를 기장 축으로 확장",
      evidenceKeys: [...LEN_KEYS],
    },
  ],
};
export default cut;
