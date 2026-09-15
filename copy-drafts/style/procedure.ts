// style/procedure — "시술할 때 지킬 것" (2026-09-15 사장님 구술 9갈래).
//   각 갈래의 시술 설계·주의를 담는다. 문장은 구술 원고 그대로(sourceGrade "구술").
//   여러 문단은 한 entry에 줄바꿈(\n)으로 이어 붙인다(문장 분할 금지). 들여쓴 목록 줄은
//   원문 표기(전각 공백)를 그대로 둔다. b8(문제없음)은 시술 설명이 없어 없음.
import type { StyleCopyBlockModule } from "../types";

const B1 = ["q3_curl", "q13_design"] as const;
const B2 = ["q3_curl", "q13_design"] as const;
const B3 = ["q8_density", "q7_thickness", "q3_curl", "q13_design"] as const;
const B4 = ["q7_thickness", "q8_density", "q11_length"] as const;
const B5 = ["q7_thickness", "q8_density", "q11_length"] as const;
const B6 = ["q8_density", "q7_thickness"] as const;
const B7 = ["q7_thickness", "q3_curl", "q13_design"] as const;
const B10 = ["q8_density", "q7_thickness", "q3_curl"] as const;

const ORAL = "2026-09-15 사장님 구술";

const procedure: StyleCopyBlockModule = {
  domain: "style",
  block: "procedure",
  entries: [
    { id: "style.procedure.b1", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B1],
      text: `곱슬 부스스함을 잡는 데 가장 효과적인 건 매직이 맞아요. 다만 약 처리가 과하거나 너무 눌리면 이번엔 괜찬아 보여도 다음 시술이 문제가 됩니다. 매직하고 좋아 보이는 결은 좋아 보이는 것이지 실제로 좋아진 게 아니에요.
그래서 주기를 정해놓고 이렇게 번갈아 하시면 손상을 덜 주면서 유지할 수 있어요.
　전체 매직 한 번 → 정수리·헤어라인 부분 매직 한 번 → 새로 자란 뿌리 매직 한 번 → 다시 처음부터
손상이 심하시면 보이는 곳만, 정수리와 헤어라인 잔머리만 부분 매직하는 것도 효과적입니다. 미용실에서 이렇게 주기를 나눠 하자고 제안해 보시는 것도 좋을 것 같아요.` },

    { id: "style.procedure.b2", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B2],
      text: `깔끔하게 잡는 방법은 시술할 때 곱슬을 다 잡아버리는 거예요. 과하게 말하면 매직 한 번 하고 웨이브를 걸면 깔끔하게 나옵니다. 실제로는 시술을 두 번 할 수 없으니, 한 번 시술할 때 곱슬기를 확연히 잡아야 해요.
단, 곱슬을 다 잡을 정도로 약 처리를 하면 머리가 너무 상할 수 있어요. 머릿결과 손상도에 맞는 약으로 곱슬기를 확실히 깔끔하게 만든 다음 컬이 들어가야 좋은 결과가 나옵니다. 이건 손님이 관리할 영역이 아니라 시술자의 영역이 커요. 이 내용을 디자이너에게 보여주시면 이야기가 훨씬 편해질 것 같아요.` },

    { id: "style.procedure.b3", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B3],
      text: `펴더라도 정수리는 볼륨을 남기는 방법으로 가야 해요. 세 가지가 있습니다.
　정수리 부분은 C컬을 말면서 펴기 — 볼륨 살리는 데 효과적이에요.
　정수리 꼭대기만 펴고, 그 아랫부분은 기존 곱슬 볼륨을 조금 남겨 덮어주기 — 깔끔함을 덮으면서 볼륨감이 살아요.
　아랫부분은 다 펴서 양감 줄이기 — 숱이 많다는 건 양감이라, 양감이 드러나는 아랫부분은 다 펴는 게 효과적입니다.
이것도 100% 시술자의 영역이에요. 미용실에서는 뿌리가 가라앉지 않게 펴달라고 말씀하시거나, 이 내용을 보여주시는 것도 효과적입니다.` },

    { id: "style.procedure.b4", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B4],
      text: `가늘고 숱 적으면 조금 짧게 가거나, 층을 많이 줘서 볼륨을 살려줄 수 있는 짧은 길이감이 위에 필요해요. 허쉬컷이나 예전 샤기컷처럼요.
그래도 기르고 싶으시면 층을 많이 주는 방법밖에 없어요. 층은 생각보다 많아야 할 수도 있고, 특히 앞쪽 — 헤어라인과 앞머리 부분 — 층이 많을수록 볼륨이 더 살아 보입니다.` },

    { id: "style.procedure.b5", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B5],
      text: `그렇다고 정수리 층을 너무 과하게 내는 건 별로예요. 앞머리·헤어라인·앞쪽 정수리에 층이 많고 뒤쪽은 층이 덜 있어야 머리 모양이 예쁘게 나옵니다.` },

    { id: "style.procedure.b6", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B6],
      text: `뿌리 뜸을 죽이기 위해 숱을 치기도 하고, 길수록 가라앉는 경향이 있어서 뜨는 분들은 어쩔 수 없이 길어야 하는 경우도 있어요. 길게 두고 숱을 쳐서 양 자체를 줄여 뜨는 느낌을 없애기도 합니다.
숱을 칠 때는 두 군데예요. 덮이는 탑 부분과 뒷목 쪽 속 양감은 두고, 중간에 있는 질감 두 군데를 손대는 게 좋아요. 숱이 많으면 양감을 먼저 정리하고, 그래도 많으면 질감까지 정리합니다.
"그렇게 치면 지저분해지지 않냐" 걱정하시는데, 탑 부분에 덮이는 형태의 머리를 살려두면 됩니다. 그래서 무게감이 어느 정도 필요해요.
짧아질수록 옆으로 더 떠 보일 수 있어서 너무 짧은 머리는 추천하지 않아요. 짧게 가시려면 안쪽은 가볍게 자르고 덮이는 부분은 무겁게 덮는 디스커넥션 커트로 가시는 게 좋습니다.
매직처럼 가라앉혀주는 시술도 들어갈 수 있는데, 곱슬을 잡아서 깔끔하게 만드는 것과는 별개예요.` },
    // b6 곱슬 조건 줄 — q3_curl 이 직모가 아닐 때만 노출(resolver 조건 렌더). 원문 마지막 줄.
    { id: "style.procedure.b6_curl", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: ["q8_density", "q7_thickness", "q3_curl"],
      text: `곱슬까지 있으시면 매직으로 가는 게 나을 수 있어요.` },

    { id: "style.procedure.b7", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B7],
      text: `컬을 너무 과하게 말기보다, 내 생각보다 1.5배에서 2배 정도 말면 원하는 컬이 나올 확률이 굉장히 높아집니다.
가는 모발은 안쪽 뼈대라고 할 수 있는 단백질 층이 되게 얇아요. 시술 전에 단백질 층을 채워준 다음 들어가면 컬감이 더 효과적으로 나옵니다.` },

    { id: "style.procedure.b10", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B10],
      text: `전체 볼륨을 죽일 필요는 없어요. 정수리 쪽에 볼륨을 살려주는 시술이 들어가면 훨씬 좋습니다.` },
  ],
};
export default procedure;
