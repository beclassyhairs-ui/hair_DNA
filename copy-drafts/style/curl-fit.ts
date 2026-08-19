// style/curl-fit — 스타일 궁합(곱슬 × q13_design) 카피. §7-1 저장 구조.
//
// §6-5(2): "b1/b2/b7의 판단 이동. C컬/S컬/웨이브는 door 치환이 아니라 내용이 실제로
//   달라야 함(시작점·크기·순서). 원문에 없는 구분은 신규 등급."
//
// 담은 것: b1·b2·b7의 detail·tip·procedure(9) + B2_DOOR_BY_DESIGN 디자인 분기(2).
//   b1/b2/b7의 aha·door·stamp는 §6-3에 따라 Primary Insight 소관이라 여기 없다
//   (다만 그 저장 위치가 미규정 — 파일 하단 참조).
//
// ⚠️ §6-5(2)가 요구하는 "C컬/S컬/웨이브 내용 차등"은 아직 미충족이다. 현행 원문은
//   door 한 줄만 디자인별로 갈릴 뿐(FIX-C②) 시작점·크기·순서가 같다. 이 차등 카피는
//   원문에 없으므로 신규 등급으로 새로 써야 하며, 아직 쓰지 않았다.
import type { StyleCopyBlockModule } from "../types";

// 발동 축(crossBranch.ts): b1 isCurlStrong&&wantsStraight / b2 isWavyPlus&&wantsCurl
//   / b7 isFine&&isStraightHair&&wantsCurl
const B1_KEYS = ["q3_curl", "q13_design"] as const;
const B2_KEYS = ["q3_curl", "q13_design"] as const;
const B7_KEYS = ["q7_thickness", "q3_curl", "q13_design"] as const;

const curlFit: StyleCopyBlockModule = {
  domain: "style",
  block: "curl-fit",
  entries: [
    // ── 갈래1 · 곱슬 펴기 ──────────────────────────────────────────────────
    {
      id: "style.curl_fit.b1_detail",
      text: "그래서 전체가 풀린 게 아닌데도 거울 앞에서는 \"다 풀렸네\" 싶어집니다. 실제로 풀린 건 얼굴 주변 몇 가닥이고요. 이 부분은 전체를 다시 펴서 해결할 일이 아니라, 그 자리만 잡아주는 게 훨씬 효율이 좋습니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b1.detail 원문 그대로 (갈래1 곱슬 펴기)",
      evidenceKeys: [...B1_KEYS],
    },
    {
      id: "style.curl_fit.b1_tip",
      text: "말릴 때 앞머리를 한쪽으로만 넘기면 그쪽으로 들뜹니다. 좌우로 번갈아 넘기면서 뿌리부터 눌러 말려보세요. 다 마르기 직전에 찬바람으로 한 번 닫아주면 오후까지 버티는 정도가 확실히 달라집니다. 그래도 올라오는 잔머리는 스틱으로 그 자리만 눌러 잡으시면 돼요 — 전체에 뭘 바르면 머리만 무거워집니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b1.tip 원문 그대로 (갈래1 곱슬 펴기)",
      evidenceKeys: [...B1_KEYS],
    },
    {
      id: "style.curl_fit.b1_procedure",
      text: "주기를 앞당겨 자주 하실 거면 전체매직보다 뿌리매직이 낫습니다. 이미 편 부분에 또 얹는 게 제일 상해요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b1.procedure 원문 그대로 (갈래1 · 펴기 시술 설계)",
      evidenceKeys: [...B1_KEYS],
    },

    // ── 갈래2 · 곱슬인데 컬 희망 ───────────────────────────────────────────
    {
      id: "style.curl_fit.b2_detail",
      text: "곱슬이 남아 있는 채로 컬이 들어가면 원래 곱슬과 새 컬이 섞입니다. 머릿결이 나빠서도, 펌약이 싸구려여서도 아니에요. 곱슬을 잡는 단계가 빠진 겁니다. 곱슬기를 먼저 정리하고 그 위에 컬을 얹으면 같은 머리에서도 컬 선이 살아납니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b2.detail 원문 그대로 (갈래2 곱슬인데 컬 희망)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_tip",
      text: "컬이 있는 머리는 브러시로 빗어 내리는 순간 부스스해집니다. 말릴 때는 컬 방향대로 손으로 감아쥐고 말리는 게 기본이에요. 습한 날은 나가기 전에 얼굴 주변에만 크림을 살짝 발라주세요. 앞머리랑 헤어라인이 제일 먼저 부스스해지는 자리라서요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b2.tip 원문 그대로 (갈래2 곱슬인데 컬 희망)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_procedure",
      text: "이 머리는 곱슬을 먼저 정리하고 컬을 얹는 순서로 설계해야 합니다. 순서를 아는 곳이면 한 번 방문으로도 됩니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b2.procedure 원문 그대로 (갈래2 · 곱슬×컬 순서 설계)",
      evidenceKeys: [...B2_KEYS],
    },

    // ── 갈래7 · 가는 직모 × 컬 ─────────────────────────────────────────────
    {
      id: "style.curl_fit.b7_detail",
      text: "약하게 걸면 아예 안 나오고, 세게 걸면 부해 보입니다. 그래서 차라리 뽀글이라도 해야 하나까지 고민이 가게 되는 거예요. 답은 그 사이에 있습니다. 원하는 컬보다 한 단계 강하게, 풀릴 걸 감안해서 잡는 겁니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b7.detail 원문 그대로 (갈래7 가는 직모×컬)",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.b7_tip",
      text: "말릴 때 컬 에센스를 바르고 컬 방향대로 감아쥐고 말리세요. 다 마르기 전에 빗어버리면 그날 컬은 거기서 끝납니다. 마무리는 찬바람으로 해주세요 — 열이 남은 채로 두면 컬이 자기 무게에 풀려요. 그리고 이 머리는 속을 채워야 컬이 삽니다. 단백질 앰플로 힘을 보충해주면 유지되는 정도가 달라져요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b7.tip 원문 그대로 (갈래7 가는 직모×컬)",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.b7_procedure",
      text: "컬을 원하는 것보다 한 단계 이상 강하게, 풀릴 걸 감안해서 잡는 설계가 맞습니다. 펌 전에 모발과 같은 단백질 성분을 채워 넣고 마는 방식이면 컬이 버틸 바탕이 생겨요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b7.procedure 원문 그대로 (갈래7 · 컬 강도 설계)",
      evidenceKeys: [...B7_KEYS],
    },

    // ── 걸침 배치 (§6 보정 2) — 주된 목적으로 한 곳, sourceRef에 걸침 명시 ──
    {
      id: "style.curl_fit.b3_procedure",
      text: "편다면 정수리는 빼고 펴는 설계가 답입니다. 전체 매직은 이 머리의 최악수예요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef:
        "BRANCH_COPY.b3.procedure 원문 그대로 (갈래3) · 걸침: 펴기 시술 설계가 주(主), 정수리 볼륨은 부수 — §6 보정 2에 따라 curl-fit 배치",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl", "q13_design"],
    },

    // ── 디자인별 door 분기 (FIX-C②) ────────────────────────────────────────
    {
      id: "style.curl_fit.b2_door_wave",
      text: "웨이브 넣었는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "B2_DOOR_BY_DESIGN.wave 원문 그대로 (FIX-C② 디자인별 door 분기)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_door_s_curl",
      text: "S웨이브 넣었는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "B2_DOOR_BY_DESIGN.s_curl 원문 그대로 (FIX-C② 디자인별 door 분기)",
      evidenceKeys: [...B2_KEYS],
    },
  ],
};
export default curlFit;
