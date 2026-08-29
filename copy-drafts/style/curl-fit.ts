// style/curl-fit — 스타일 궁합(곱슬 × q13_design) 카피. §7-1 저장 구조.
//
// §6-5(2): "b1/b2/b7의 판단 이동. C컬/S컬/웨이브는 door 치환이 아니라 내용이 실제로
//   달라야 함(시작점·크기·순서). 원문에 없는 구분은 신규 등급."
//
// 담은 것: b1·b2·b7의 detail·tip·procedure(9) + B2_DOOR_BY_DESIGN 디자인 분기(2).
//   b1/b2/b7의 aha·door·stamp는 §6-3에 따라 Primary Insight 소관이라 여기 없다
//   (다만 그 저장 위치가 미규정 — 파일 하단 참조).
//
// §6-5(2) "C컬/S컬/웨이브 내용 차등" — [PHASE2] 블록에서 충족(draft). 사장님 채굴 답변
//   2026-08-21 기준, 차등 축은 **롯드 바퀴 수**(C=반·S=두~두반·웨이브=두반↑)다. 옛 door
//   한 줄 분기(B2_DOOR_BY_DESIGN)는 유지하되, 실제 내용 차등은 아래 [PHASE2] 참조.
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
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b1.detail 원문 그대로 (갈래1 곱슬 펴기)",
      evidenceKeys: [...B1_KEYS],
    },
    {
      id: "style.curl_fit.b1_tip",
      text: "말릴 때 앞머리를 한쪽으로만 넘기면 그쪽으로 들뜹니다. 좌우로 번갈아 넘기면서 뿌리부터 눌러 말려보세요. 다 마르기 직전에 찬바람으로 한 번 닫아주면 오후까지 버티는 정도가 확실히 달라집니다. 그래도 올라오는 잔머리는 스틱으로 그 자리만 눌러 잡으시면 돼요 — 전체에 뭘 바르면 머리만 무거워집니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b1.tip 원문 그대로 (갈래1 곱슬 펴기)",
      evidenceKeys: [...B1_KEYS],
    },
    {
      id: "style.curl_fit.b1_procedure",
      text: "주기를 앞당겨 자주 하실 거면 전체매직보다 뿌리매직이 낫습니다. 이미 편 부분에 또 얹는 게 제일 상해요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b1.procedure 원문 그대로 (갈래1 · 펴기 시술 설계)",
      evidenceKeys: [...B1_KEYS],
    },

    // ── 갈래2 · 곱슬인데 컬 희망 ───────────────────────────────────────────
    {
      id: "style.curl_fit.b2_detail",
      text: "곱슬이 남아 있는 채로 컬이 들어가면 원래 곱슬과 새 컬이 섞입니다. 머릿결이 나빠서도, 펌약이 싸구려여서도 아니에요. 곱슬을 잡는 단계가 빠진 겁니다. 곱슬기를 먼저 정리하고 그 위에 컬을 얹으면 같은 머리에서도 컬 선이 살아납니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b2.detail 원문 그대로 (갈래2 곱슬인데 컬 희망)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_tip",
      text: "컬이 있는 머리는 브러시로 빗어 내리는 순간 부스스해집니다. 말릴 때는 컬 방향대로 손으로 감아쥐고 말리는 게 기본이에요. 습한 날은 나가기 전에 얼굴 주변에만 크림을 살짝 발라주세요. 앞머리랑 헤어라인이 제일 먼저 부스스해지는 자리라서요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b2.tip 원문 그대로 (갈래2 곱슬인데 컬 희망)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_procedure",
      text: "이 머리는 곱슬을 먼저 정리하고 컬을 얹는 순서로 설계해야 합니다. 순서를 아는 곳이면 한 번 방문으로도 됩니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b2.procedure 원문 그대로 (갈래2 · 곱슬×컬 순서 설계)",
      evidenceKeys: [...B2_KEYS],
    },

    // ── 갈래7 · 가는 직모 × 컬 ─────────────────────────────────────────────
    {
      id: "style.curl_fit.b7_detail",
      text: "약하게 걸면 아예 안 나오고, 세게 걸면 부해 보입니다. 그래서 차라리 뽀글이라도 해야 하나까지 고민이 가게 되는 거예요. 답은 그 사이에 있습니다. 원하는 컬보다 한 단계 강하게, 풀릴 걸 감안해서 잡는 겁니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b7.detail 원문 그대로 (갈래7 가는 직모×컬)",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.b7_tip",
      text: "말릴 때 컬 에센스를 바르고 컬 방향대로 감아쥐고 말리세요. 다 마르기 전에 빗어버리면 그날 컬은 거기서 끝납니다. 마무리는 찬바람으로 해주세요 — 열이 남은 채로 두면 컬이 자기 무게에 풀려요. 그리고 이 머리는 속을 채워야 컬이 삽니다. 단백질 앰플로 힘을 보충해주면 유지되는 정도가 달라져요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b7.tip 원문 그대로 (갈래7 가는 직모×컬)",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.b7_procedure",
      text: "컬을 원하는 것보다 한 단계 이상 강하게, 풀릴 걸 감안해서 잡는 설계가 맞습니다. 펌 전에 모발과 같은 단백질 성분을 채워 넣고 마는 방식이면 컬이 버틸 바탕이 생겨요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b7.procedure 원문 그대로 (갈래7 · 컬 강도 설계)",
      evidenceKeys: [...B7_KEYS],
    },

    // ── 걸침 배치 (§6 보정 2) — 주된 목적으로 한 곳, sourceRef에 걸침 명시 ──
    {
      id: "style.curl_fit.b3_procedure",
      text: "편다면 정수리는 빼고 펴는 설계가 답입니다. 전체 매직은 이 머리의 최악수예요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef:
        "BRANCH_COPY.b3.procedure 원문 그대로 (갈래3) · 걸침: 펴기 시술 설계가 주(主), 정수리 볼륨은 부수 — §6 보정 2에 따라 curl-fit 배치",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl", "q13_design"],
    },

    // ── 디자인별 door 분기 (FIX-C②) ────────────────────────────────────────
    {
      id: "style.curl_fit.b2_door_wave",
      text: "웨이브 넣었는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "B2_DOOR_BY_DESIGN.wave 원문 그대로 (FIX-C② 디자인별 door 분기)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_door_s_curl",
      text: "S웨이브 넣었는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "B2_DOOR_BY_DESIGN.s_curl 원문 그대로 (FIX-C② 디자인별 door 분기)",
      evidenceKeys: [...B2_KEYS],
    },

    // ════════════════════════════════════════════════════════════════════════
    // [PHASE2] 디자인별 차등 — 사장님 채굴 답변 2026-08-21 기준 전면 재작성.
    //   ★ 컬 크기 차이는 "시작점/롯드 굵기"가 아니라 **롯드를 몇 바퀴 더 감느냐**다
    //     (C=반 바퀴 / S=두~두반 / 웨이브=두반↑). 기존 AI 초안(시작점·롯드 굵기)은 근거
    //     없어 폐기. · 곱슬 정리는 별도 방문이 아니라 **같은 시술 안의 순서**. · 웨이브만
    //     축이 다르다 — 곱슬 정리보다 **뿌리 균일성**. · 가는 직모는 속을 채우고(펌 전처리
    //     단백질① — 성분명·수치 노출 금지, "속 채움" 체감어) 직모라 잘 풀리니 **1.5~2배**
    //     세게. 뿌리가 특히 안 걸려 **뿌리 사전처리**로 부위 컨디션을 고르게 맞춘다.
    //   전건 draft. sourceGrade=재배치(사장님 원문 직접 답변).
    // ════════════════════════════════════════════════════════════════════════
    // ── 갈래2 · 곱슬 있는 머리 × 컬 희망 — 바퀴 수 차등 ──────────────────────
    {
      id: "style.curl_fit.b2_c_curl",
      text: "C컬은 셋 중 가장 완만한 컬이에요. 곱슬을 약으로 정리한 다음, 중간쯤부터 롯드를 반 바퀴만 감아 안쪽으로 살짝 말아주면 됩니다. 곱슬을 잡는 것과 컬을 마는 게 따로가 아니라 같은 시술 안에서 순서대로 이어지는 거라, 한 번 방문으로 끝나요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — C컬=반 바퀴(중간부터), 곱슬 정리는 같은 시술 내 순서",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_s_curl",
      text: "S컬은 C컬과 방식이 같고, 롯드를 더 감는 것만 달라요. 곱슬을 정리한 뒤 두 바퀴에서 두 바퀴 반 정도로 감으면 굴곡이 한 번 더 생기면서 S자로 흐릅니다. 컬을 조금 더 세게 잡는 것뿐이라, 다른 특별한 방식이 있는 게 아니에요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — S컬=두~두반 바퀴, C컬과 차이는 '더 마는 것뿐'",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.b2_wave",
      text: "웨이브는 두 바퀴 반 이상 여러 번 감아 풍성하게 흐르는 컬이에요. 여기서는 곱슬 정리보다 뿌리까지 컬이 고르게 들어가느냐가 더 중요합니다. 뿌리 쪽 약 처리가 확실해야 뿌리부터 컬이 살아서, 풍성한 웨이브도 균일하게 나와요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 웨이브=두반 바퀴↑(3~4, 4~5+=히피펌), 관건은 뿌리 균일성·뿌리 약 강하게",
      evidenceKeys: [...B2_KEYS],
    },
    // ── 갈래7 · 가는 직모 × 컬 희망 — 속 채움 + 1.5~2배 + 뿌리 ────────────────
    {
      id: "style.curl_fit.b7_c_curl",
      text: "가는 직모는 속이 비어 컬을 붙잡을 힘이 약해요. 그래서 속을 먼저 채워 심지를 세운 다음 컬을 마는데, 직모라 잘 풀리는 걸 감안해서 생각하시는 것보다 1.5배에서 2배까지 세게 잡습니다. 그렇게 해야 다 끝났을 때 자연스러운 C컬로 떨어져요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 가는직모: 속 채움(단백질① 체감어)+직모라 잘 풀림→1.5~2배 세게(확정값)",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.b7_s_curl",
      text: "S컬도 속을 먼저 채운 뒤, C컬보다 조금 더 감아 굴곡을 두 번 줍니다. 가는 직모는 잘 풀리니 여기서도 원하시는 것보다 세게 잡아야 다 마른 뒤에 원하는 만큼 남아요. 속이 채워져 있어야 그 세기를 버팁니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 가는직모 S컬: 속 채움+더 감기+세게(1.5~2배 틀)",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.b7_wave",
      text: "웨이브처럼 크게 가려면 특히 뿌리가 관건이에요. 가는 직모는 컬이 있던 부분엔 잘 걸려도 뿌리 쪽엔 잘 안 걸려서, 뿌리를 먼저 손봐 모발 상태를 고르게 맞춰 둔 다음 말아야 합니다. 속을 채우고 뿌리부터 균일하게 잡아야 풍성한 웨이브가 뿌리까지 살아요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 가는직모 웨이브: 뿌리 안 걸림→뿌리 사전처리(부위 컨디션 균일)+속 채움",
      evidenceKeys: [...B7_KEYS],
    },
    // ── [PHASE2] §4 2단 미용실 주문 멘트 — 겉(손님이 그대로 할 말) + 더보기(원장 이유) ──
    //   렌더: 겉(_say)은 궁합 카드에 항상 보이고, 더보기(_why)는 FadePreview 안으로 접힌다.
    {
      id: "style.curl_fit.order_b2_say",
      text: "곱슬 먼저 펴고, 그 위에 원하는 컬로 말아주세요",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] §4 2단 겉(주문 멘트) — 곱슬 있는 머리×컬. 사장님 원문(곱슬 정리→컬 순서)",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.order_b2_why",
      text: "곱슬을 약으로 정리하는 건 따로 받는 시술이 아니라, 컬을 마는 그 시술 안에서 같이 이뤄져요. 이 순서를 알고 주문하시면, 원래 곱슬과 새 컬이 섞여 지저분해지는 일 없이 컬 선이 깔끔하게 나옵니다.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] §4 2단 더보기(이유) — 곱슬 정리=같은 시술 내 순서",
      evidenceKeys: [...B2_KEYS],
    },
    {
      id: "style.curl_fit.order_b7_say",
      text: "속을 채우고, 뿌리부터 세게 말아주세요",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] §4 2단 겉(주문 멘트) — 가는직모×컬",
      evidenceKeys: [...B7_KEYS],
    },
    {
      id: "style.curl_fit.order_b7_why",
      text: "가는 직모는 속이 비어 컬을 못 붙잡고, 특히 뿌리 쪽이 잘 안 걸려요. 그래서 속을 먼저 채워 심지를 세우고, 뿌리를 먼저 손봐 상태를 고르게 맞춘 다음 세게 말아야 컬이 뿌리까지 오래갑니다.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] §4 2단 더보기(이유) — 가는직모 속 채움+뿌리 사전처리",
      evidenceKeys: [...B7_KEYS],
    },
  ],
};
export default curlFit;
