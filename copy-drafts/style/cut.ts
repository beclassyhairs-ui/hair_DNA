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
      text: "짧은 머리는 두상 모양이 스타일을 좌우해요. 뒤통수부터 정수리로 이어지는 굴곡을 따라 볼륨을 쌓되, 튀어나온 곳은 무게를 덜고 꺼진 곳은 무게를 남겨야 형태가 삽니다. 반대로 하면 커트 모양이 무너져요. 옆통수가 튀어나왔는지도 함께 봅니다. 숱과 굵기는 그다음에 맞추면 돼요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21(2차) — 숏: 두상 1축(굴곡 따라 볼륨·튀나온곳 덜고 꺼진곳 남김·옆통수 돌출), 모질 2축",
      evidenceKeys: [...LEN_KEYS],
    },
    {
      id: "style.cut.len_short_bob",
      text: "숏보브도 짧은 머리와 같은 원리로, 두상 모양이 먼저예요. 목 뒤 라인부터 정수리까지 이어지는 굴곡을 따라 볼륨을 쌓고, 튀어나온 곳은 가볍게 꺼진 곳은 무게를 남겨 채웁니다. 목덜미에 남는 무게감과 옆통수가 튀어나왔는지를 보고 길이를 정해요. 숱과 굵기는 그다음입니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21(2차) — 숏보브: 숏과 동일 원리(두상 1축·목덜미 무게·옆통수)",
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
      text: "쇄골 길이는 어깨에 닿으면서 머리가 바깥으로 뻗치기 시작하는 기장이에요. 이건 머릿결 문제가 아니라, 쇄골 기장이면 당연히 그렇습니다. 그래서 방법이 세 가지예요. 어깨 아래로 더 기르거나, 어깨에 안 닿게 조금 짧게 자르거나, 아니면 그 뻗치는 흐름을 굴곡이나 컬로 살려 스타일로 잡는 겁니다. 뒤집히는 게 싫으시면 앞의 두 가지, 오히려 살리고 싶으시면 세 번째예요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21(2차) — 쇄골: 두상 아닌 뻗침 축, '당연히 뻗침' 인정 + 선택지 3(더 기르기/안 닿게/뻗침 살려 스타일)",
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

    // ── [PHASE2] §4 2단 미용실 주문 멘트 — 숏 계열(두상). 겉(_say)+더보기(_why) ──
    {
      id: "style.cut.order_short_say",
      text: "두상 형태 살려서 볼륨 예쁘게 살 수 있게 해주세요",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] §4 2단 겉(주문 멘트) — 숏 계열 두상. 사장님이 준 주문 문장",
      evidenceKeys: ["q11_length"],
    },
    {
      id: "style.cut.order_short_why",
      text: "짧은 머리는 두상 굴곡을 따라 무게를 배분하는 게 전부예요. 튀어나온 곳을 무겁게 두거나 꺼진 곳을 가볍게 자르면 형태가 무너지거든요. 이 한마디만 전해도 원장님이 두상을 먼저 보고 커트를 설계합니다.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] §4 2단 더보기(이유) — 숏 계열 두상 무게 배분",
      evidenceKeys: ["q11_length"],
    },
  ],
};
export default cut;
