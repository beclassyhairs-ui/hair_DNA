// style/insight — 대표 판정(Primary Insight) 카피.
//
// 2026-09-15 원고 전면 교체 라운드(사장님 구술 9갈래):
//   stamp = 각 갈래 첫 줄 판정, door = "혹시, 이런 적 있다면", aha = "왜 그런가요".
//   전부 사장님 구술 원고로 교체 → sourceGrade "구술"(원문 대조 대상 아님).
//   door 없는 갈래(b5·b8)는 구 door를 retired 로 보존(삭제 금지).
//   b8(폴백) detail·tip·procedure 도 새 구조(스탬프+왜+집에서는)엔 없어 retired.
//   시술 설명은 style.procedure, 집에서 하는 건 style.care 로 분리(별 파일).
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
const B8: readonly string[] = [];

const ORAL = "2026-09-15 사장님 구술";

const insight: StyleCopyBlockModule = {
  domain: "style",
  block: "insight",
  entries: [
    // ── 갈래1 · 곱슬 매직(펴기) ────────────────────────────────────────────
    { id: "style.insight.b1_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B1],
      text: "가능합니다 — 시술 주기가 중요해요" },
    { id: "style.insight.b1_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B1],
      text: "매직하고 얼마 안 됐는데 뿌리가 조금 자라니까 머리 전체가 지저분해 보인 적 있으시죠." },
    { id: "style.insight.b1_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B1],
      text: "곱슬이 심해서 매직하시는 분들은 뿌리가 조금만 자라도 그 뿌리 때문에 전체가 다 지저분해 보여요. 그렇다고 전체 매직을 자꾸 하면 손상이 쌓여서, 나중에 컬을 걸고 싶어도 안 걸리는 경우가 많습니다." },

    // ── 갈래2 · 곱슬인데 C컬·S컬·웨이브 희망 ───────────────────────────────
    { id: "style.insight.b2_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B2],
      text: "가능합니다 — 시술자가 곱슬기를 확실히 잡아야 해요" },
    { id: "style.insight.b2_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B2],
      text: "곱슬머리에 C컬이나 S컬 넣었는데 생각한 깔끔한 컬이 아니라 부스스한 웨이브처럼 나온 적 많으시죠." },
    { id: "style.insight.b2_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B2],
      text: "곱슬머리는 이미 지저분한 웨이브가 걸려 있는 상태예요. 그 위에 웨이브를 더 걸면 웨이브와 웨이브가 겹쳐서 지저분하고 부스스하게 나옵니다." },

    // ── 갈래3 · 숱많고 가는 곱슬 × 펴기 ────────────────────────────────────
    { id: "style.insight.b3_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B3],
      text: "가능합니다 — 정수리 볼륨을 남기고 펴야 해요" },
    { id: "style.insight.b3_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B3],
      text: "머리는 떠 보이고 지저분해 보이는데, 펴면 정수리까지 다 가라앉을까 봐 망설이신 적 있으시죠." },
    { id: "style.insight.b3_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B3],
      text: "숱 많고 가는 곱슬은 머리가 떠 보이고 지저분해 보여서 펴주는 게 맞아요. 단, 전체 매직을 들어가면 생각보다 훨씬 심하게 가라앉습니다." },

    // ── 갈래4 · 가늘고 숱 적음 × 길게 ─────────────────────────────────────
    { id: "style.insight.b4_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B4],
      text: "추천하지 않아요 — 기르시려면 층을 많이 줘야 해요" },
    { id: "style.insight.b4_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B4],
      text: "머리를 기를수록 처지고, 숱이 더 없어 보인 적 있으시죠." },
    { id: "style.insight.b4_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B4],
      text: "가늘다는 건 머리에 힘이 없어서 잘 처진다는 거예요. 거기에 길이까지 더해지면 더 처져 보이고, 더 처져 보인다는 건 숱이 더 없어 보인다는 뜻입니다." },

    // ── 갈래5 · 가늘고 숱 적음 × 짧게 (door 없음) ─────────────────────────
    { id: "style.insight.b5_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B5],
      text: "가능합니다 — 짧을수록 좋아요" },
    // b5 door: 새 구조(§5)엔 "혹시" 없음 → 구 원문 보존한 채 retired.
    { id: "style.insight.b5_door", status: "retired", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b5.door 원문 그대로 (갈래5) · 2026-09-15 새 구조에서 door 미사용 → retired", evidenceKeys: [...B5],
      text: "볼륨을 넣어도 몇 시간이면 가라앉고, 가르마 쪽이 휑해 보여 신경 쓰인 적 있다면 — 바로 이 머리 성질 때문이에요." },
    { id: "style.insight.b5_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B5],
      text: "가늘고 숱 적은 머리는 짧을수록 볼륨감이 많이 살아요. 특히 정수리가 짧을수록요." },

    // ── 갈래6 · 숱많고 굵음 ───────────────────────────────────────────────
    { id: "style.insight.b6_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B6],
      text: "가능합니다 — 너무 짧은 머리만 피하세요" },
    { id: "style.insight.b6_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B6],
      text: "옆으로 많이 떠서 실제보다 머리가 커 보인 적 있으시죠." },
    { id: "style.insight.b6_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B6],
      text: "숱 많고 굵으면 곱슬이 아니어도 뜨는 머리로 가요. 특히 옆이 커져요. 옆으로 많이 떠서 올라와 보이고 실제보다 머리가 커 보입니다." },

    // ── 갈래7 · 가는 직모 × 컬 ────────────────────────────────────────────
    { id: "style.insight.b7_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B7],
      text: "가능합니다 — 생각보다 두 배 세게 말아야 해요" },
    { id: "style.insight.b7_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B7],
      text: "펌을 했는데 컬이 생각보다 안 나온 적 있으시죠." },
    { id: "style.insight.b7_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B7],
      text: "가늘다는 건 애초에 힘이 없다는 거고, 직모라는 건 볼륨감도 없다는 거예요. 그래서 볼륨을 살려줘야 하는데, 길이감도 있지만 컬감을 같이 넣어줘야 합니다. 가는 곱슬은 컬이 지저분하게 나오는데, 가는 직모는 컬이 생각보다 안 나올 확률이 높아요." },

    // ── 갈래8 · 특별한 문제 없는 머리(폴백) — stamp+aha 만, door/detail/tip/procedure retired ──
    { id: "style.insight.b8_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B8],
      text: "가능합니다 — 하고 싶은 거 다 하셔도 돼요" },
    { id: "style.insight.b8_door", status: "retired", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.door 원문 그대로 (b8 폴백) · 2026-09-15 새 구조에서 door 미사용 → retired", evidenceKeys: [...B8],
      text: "고민이 딱히 안 떠오르셨다면 — 문제가 없는 게 아니라, 뭘 해도 되는 머리라서 그래요." },
    { id: "style.insight.b8_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B8],
      text: "크게 걱정할 게 없어요. 모든 게 가능합니다. 얼굴형이나 하고 싶은 스타일이 있으면 거기에 맞게 조절해서 하시면 돼요." },
    { id: "style.insight.b8_detail", status: "retired", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.detail 원문 그대로 (b8 폴백) · 2026-09-15 retired", evidenceKeys: [...B8],
      text: "스타일이 안 사는 이유가 모질에 없으면 답은 디테일에 있습니다. 끝선 처리, 앞머리 라인, 컬 크기 같은 것들이요. 고르신 스타일 그대로 진행하셔도 됩니다. 다만 시술이 쌓이면 선택지가 줄어드니까, 지금 폭이 넓은 걸 즐기시되 간격은 두시는 게 좋아요." },
    { id: "style.insight.b8_tip", status: "retired", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.tip 원문 그대로 (b8 폴백) · 2026-09-15 retired", evidenceKeys: [...B8],
      text: "지금 루틴을 굳이 바꾸실 필요는 없습니다. 잘 하고 계신 거예요. 미뤄두셨던 스타일이 있다면 지금이 제일 좋은 타이밍이고요. 하나만 챙기신다면 열보호제입니다. 고데기나 드라이 쓰실 때 한 번 뿌려주는 것만으로 지금 이 컨디션이 훨씬 오래갑니다." },
    { id: "style.insight.b8_procedure", status: "retired", sourceGrade: "재배치", sourceRef: "BRANCH_COPY.b8.procedure 원문 그대로 (b8 폴백) · 2026-09-15 retired", evidenceKeys: [...B8],
      text: "고르신 스타일 그대로 가시면 됩니다. 무리한 설계가 필요 없는 머리예요." },

    // ── 갈래9(엔진 b10) · 숱많고 가는 직모 ────────────────────────────────
    { id: "style.insight.b10_stamp", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B10],
      text: "가능합니다 — 정수리 볼륨만 살려주세요" },
    { id: "style.insight.b10_door", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B10],
      text: "머리는 많아 보이는데 정수리는 약해 보인 적 있으시죠." },
    { id: "style.insight.b10_aha", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B10],
      text: "숱이 많다는 건 양감이고, 직모에 가늘다는 건 정수리 볼륨이 없다는 뜻이에요. 전체적으로 머리가 많아 보여도 정수리가 약해 보입니다." },
  ],
};
export default insight;
