// style/insight — 대표 판정(Primary Insight) 카피. §6-3 · §6 보정 1(2026-08-19 PM).
//
// §6-3: b1~b10에서 1개 선택하는 현행 로직은 유지하되, 역할을 "결과 전체 결정"에서
//   "Hero 아래 대표 한 줄 + 이래서 그렇습니다"로 축소한다.
//   stamp·door·aha가 여기 살고, detail·tip·procedure는 §6-5 독립 블록으로 분산된다.
//   **Primary Insight는 aha/door 재배치이므로 신규가 아니다.**
//
// ★ aha의 "원본 entry"가 여기 있다. b3/b6/b10의 aha는 hair-structure에서도 필요한데
//   문장을 복사하지 않고 refId로 가리킨다(§6 보정 1) — 원문 대조·수정을 한 곳으로
//   묶기 위해서다.
//
// ⚠️ b9(게이트 차단)는 여기 없다. §6-6에 따라 stamp·door·aha까지 통째로 safety에
//   있다 — 모질 갈래가 아니라 안전 판정이라서다. 그래서 이 블록은 9갈래 × 3 = 27,
//   여기에 b8 폴백의 detail·tip·procedure 3을 더해 30이다.
//
// ⚠️ b8은 §6-5가 어느 독립 블록에도 배정하지 않았다(보정 2에서 "누락"으로 확인).
//   b8은 어느 갈래도 발동하지 않은 손님에게 나가는 폴백이고, 내용도 특정 블록 주제가
//   아니라 범용 총평이라 보정 2 지시대로 insight에 두고 sourceRef에 "b8 폴백"을 남긴다.
import type { StyleCopyBlockModule } from "../types";

// 발동 축(crossBranch.ts)
const B1 = ["q3_curl", "q13_design"] as const;
const B2 = ["q3_curl", "q13_design"] as const;
const B3 = ["q8_density", "q7_thickness", "q3_curl", "q13_design"] as const;
const B4 = ["q7_thickness", "q8_density", "q11_length"] as const;
const B5 = ["q7_thickness", "q8_density", "q11_length"] as const;
const B6 = ["q8_density", "q7_thickness"] as const;
const B7 = ["q7_thickness", "q3_curl", "q13_design"] as const;
const B10 = ["q8_density", "q7_thickness", "q3_curl"] as const;
// b8은 폴백 — 어떤 갈래 조건도 발동하지 않았을 때라 특정 답 키에 매이지 않는다.
const B8: readonly string[] = [];

const insight: StyleCopyBlockModule = {
  domain: "style",
  block: "insight",
  entries: [
    // ── 갈래1 · 곱슬 펴기 ──────────────────────────────────────────────────
    { id: "style.insight.b1_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b1.stamp 원문 그대로 (갈래1 곱슬 펴기)", evidenceKeys: [...B1],
      text: "할 수 있습니다 — 주기가 관건이에요" },
    { id: "style.insight.b1_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b1.door 원문 그대로 (갈래1 곱슬 펴기)", evidenceKeys: [...B1],
      text: "아침에 펴고 나가도 오후엔 앞머리랑 얼굴 주변부터 곱슬이 올라온 적 있다면 — 바로 이것 때문이에요." },
    { id: "style.insight.b1_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b1.aha 원문 그대로 (갈래1 곱슬 펴기)", evidenceKeys: [...B1],
      text: "헤어라인 쪽 머리는 곱슬이 제일 먼저 돌아옵니다. 게다가 그 자리 머리가 얇아서, 조금만 올라와도 훨씬 많이 올라온 것처럼 보여요." },

    // ── 갈래2 · 곱슬인데 컬 희망 ───────────────────────────────────────────
    { id: "style.insight.b2_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b2.stamp 원문 그대로 (갈래2 곱슬인데 컬 희망)", evidenceKeys: [...B2],
      text: "할 수 있습니다 — 순서만 지키면요" },
    { id: "style.insight.b2_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b2.door 원문 그대로 (갈래2 기본 door=C컬. wave·s_curl은 curl-fit의 디자인 분기)", evidenceKeys: [...B2],
      text: "C컬 해달라고 했는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요." },
    { id: "style.insight.b2_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b2.aha 원문 그대로 (갈래2 곱슬인데 컬 희망)", evidenceKeys: [...B2],
      text: "파마는 새 컬을 얹는 거지, 원래 곱슬을 없애주는 게 아니에요." },

    // ── 갈래3 · 숱많음+얇음+곱슬기 × 펴기 ──────────────────────────────────
    { id: "style.insight.b3_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b3.stamp 원문 그대로 (갈래3)", evidenceKeys: [...B3],
      text: "할 수 있습니다 — 어디를 남기느냐가 관건이에요" },
    { id: "style.insight.b3_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b3.door 원문 그대로 (갈래3)", evidenceKeys: [...B3],
      text: "매직 하고 싶은데 정수리까지 가라앉을까 봐 망설인 적 있다면 — 맞습니다. 그래서 방법이 따로 있어요." },
    { id: "style.insight.b3_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b3.aha 원문 그대로 (갈래3 · 모질 판단 원본. hair-structure가 refId로 재사용)", evidenceKeys: [...B3],
      text: "숱은 양이고, 버티는 힘은 한 올의 굵기예요. 양은 많은데 기둥이 없는 머리입니다." },

    // ── 갈래4 · 얇음+숱적음 × 긴 기장 ──────────────────────────────────────
    { id: "style.insight.b4_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b4.stamp 원문 그대로 (갈래4)", evidenceKeys: [...B4],
      text: "할 수 있습니다 — 무게를 덜어내면요" },
    { id: "style.insight.b4_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b4.door 원문 그대로 (갈래4)", evidenceKeys: [...B4],
      text: "머리를 기를수록 오히려 더 없어 보인 적 있다면 — 바로 이 머리 성질 때문이에요." },
    { id: "style.insight.b4_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b4.aha 원문 그대로 (갈래4)", evidenceKeys: [...B4],
      text: "가늘고 숱 적은 머리는 길이가 곧 무게예요. 길수록 위는 눌리고 끝은 비어 보입니다." },

    // ── 갈래5 · 얇음+숱적음 (숏~어깨) ──────────────────────────────────────
    { id: "style.insight.b5_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b5.stamp 원문 그대로 (갈래5)", evidenceKeys: [...B5],
      text: "할 수 있습니다 — 볼륨은 루틴이 지켜줘요" },
    { id: "style.insight.b5_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b5.door 원문 그대로 (갈래5)", evidenceKeys: [...B5],
      text: "볼륨을 넣어도 몇 시간이면 가라앉고, 가르마 쪽이 휑해 보여 신경 쓰인 적 있다면 — 바로 이 머리 성질 때문이에요." },
    { id: "style.insight.b5_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b5.aha 원문 그대로 (갈래5)", evidenceKeys: [...B5],
      text: "가늘고 숱 적은 머리는 통째로 가라앉습니다. 파마는 해결책이라기보다 버티는 수단에 가까워요." },

    // ── 갈래6 · 숱많음+굵음 ────────────────────────────────────────────────
    { id: "style.insight.b6_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b6.stamp 원문 그대로 (갈래6)", evidenceKeys: [...B6],
      text: "할 수 있습니다 — 길이가 관건이에요" },
    { id: "style.insight.b6_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b6.door 원문 그대로 (갈래6)", evidenceKeys: [...B6],
      text: "미용실 다녀온 지 한 달이면 부해져서 답답하고, 짧게 잘랐다가 옆으로 벌어져 고생한 적 있다면 — 바로 이 머리 성질 때문이에요." },
    { id: "style.insight.b6_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b6.aha 원문 그대로 (갈래6 · 모질 판단 원본. hair-structure가 refId로 재사용)", evidenceKeys: [...B6],
      text: "숱과 굵기가 같이 있으면 머리가 옆으로 뜨면서 부해 보이고 커 보입니다. 짧을수록 더 벌어져요." },

    // ── 갈래7 · 가는 직모 × 컬 ─────────────────────────────────────────────
    { id: "style.insight.b7_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b7.stamp 원문 그대로 (갈래7)", evidenceKeys: [...B7],
      text: "할 수 있습니다 — 버티게 만드는 게 관건이에요" },
    { id: "style.insight.b7_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b7.door 원문 그대로 (갈래7)", evidenceKeys: [...B7],
      text: "펌을 해도 한 달이면 다 풀려버린 적 있다면 — 바로 이 머리 성질 때문이에요." },
    { id: "style.insight.b7_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b7.aha 원문 그대로 (갈래7)", evidenceKeys: [...B7],
      text: "가는 직모는 컬을 붙잡아둘 심지가 약한 머리예요. 거는 것보다 버티게 하는 게 어렵습니다." },

    // ── 갈래8 · 무난(폴백) — §6-5 미배정분, 보정 2에 따라 insight ───────────
    { id: "style.insight.b8_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.stamp 원문 그대로 (b8 폴백)", evidenceKeys: [...B8],
      text: "할 수 있습니다" },
    { id: "style.insight.b8_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.door 원문 그대로 (b8 폴백)", evidenceKeys: [...B8],
      text: "고민이 딱히 안 떠오르셨다면 — 문제가 없는 게 아니라, 뭘 해도 되는 머리라서 그래요." },
    { id: "style.insight.b8_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.aha 원문 그대로 (b8 폴백)", evidenceKeys: [...B8],
      text: "이런 베이스는 생각보다 드뭅니다. 지금이 뭐든 제일 예쁘게 나오는 시기예요." },
    { id: "style.insight.b8_detail", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.detail 원문 그대로 (b8 폴백 · 범용 총평이라 특정 블록 주제 아님)", evidenceKeys: [...B8],
      text: "스타일이 안 사는 이유가 모질에 없으면 답은 디테일에 있습니다. 끝선 처리, 앞머리 라인, 컬 크기 같은 것들이요. 고르신 스타일 그대로 진행하셔도 됩니다. 다만 시술이 쌓이면 선택지가 줄어드니까, 지금 폭이 넓은 걸 즐기시되 간격은 두시는 게 좋아요." },
    { id: "style.insight.b8_tip", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.tip 원문 그대로 (b8 폴백 · 범용 조언)", evidenceKeys: [...B8],
      text: "지금 루틴을 굳이 바꾸실 필요는 없습니다. 잘 하고 계신 거예요. 미뤄두셨던 스타일이 있다면 지금이 제일 좋은 타이밍이고요. 하나만 챙기신다면 열보호제입니다. 고데기나 드라이 쓰실 때 한 번 뿌려주는 것만으로 지금 이 컨디션이 훨씬 오래갑니다." },
    { id: "style.insight.b8_procedure", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.procedure 원문 그대로 (b8 폴백 · 범용 조언)", evidenceKeys: [...B8],
      text: "고르신 스타일 그대로 가시면 됩니다. 무리한 설계가 필요 없는 머리예요." },

    // ── 갈래10 · 숱많음+얇음+직모 ──────────────────────────────────────────
    { id: "style.insight.b10_stamp", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b10.stamp 원문 그대로 (갈래10)", evidenceKeys: [...B10],
      text: "할 수 있습니다 — 무게 배분이 관건이에요" },
    { id: "style.insight.b10_door", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b10.door 원문 그대로 (갈래10)", evidenceKeys: [...B10],
      text: "숱은 많다는 소리를 듣는데 정작 정수리는 눌려 있고 중간만 무겁게 느껴진 적 있다면 — 바로 이 머리 성질 때문이에요." },
    { id: "style.insight.b10_aha", status: "approved", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b10.aha 원문 그대로 (갈래10 · 모질 판단 원본. hair-structure가 refId로 재사용)", evidenceKeys: [...B10],
      text: "숱이 많아 중간 부피는 큰데, 한 올이 가늘어서 정수리를 세울 힘이 없습니다." },
  ],
};
export default insight;
