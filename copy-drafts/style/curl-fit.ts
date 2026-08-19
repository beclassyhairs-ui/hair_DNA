// style/curl-fit — 곱슬기 × 희망 디자인 적합도 카피. §7-1 저장 구조.
//
// 담는 것(현 단계): 갈래2 예언의 디자인별 분기.
//   FIX-C②에서 만들어진 구조다 — 원래 door가 "C컬 해달라고 했는데…" 하나뿐이라
//   웨이브를 고른 손님에게도 C컬 문구가 나갔다. 기본(C컬)은 BRANCH_COPY.b2.door가
//   그대로 쓰고, wave·s_curl만 아래 문장으로 대체한다.
//   → 갈래 하나에서만 하던 "디자인별 분기"를 블록 차원으로 일반화하는 자리다.
//
// ⚠️ b2의 기본 door(C컬)는 아직 여기 없다. b1~b8·b10 원고의 블록 분해는 §6-3~6-6
//   규정이 필요해 보류 중이다(파일 하단 주석 참조).
import type { StyleCopyBlockModule } from "../types";

// b2 발동 축: isWavyPlus(q3_curl) && wantsCurl(q13_design). 분기 자체는 q13_design.
const CURL_KEYS = ["q3_curl", "q13_design"] as const;

const curlFit: StyleCopyBlockModule = {
  domain: "style",
  block: "curl-fit",
  entries: [
    {
      id: "style.curl_fit.b2_door_wave",
      text: "웨이브 넣었는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "B2_DOOR_BY_DESIGN.wave 원문 그대로 (FIX-C② 디자인별 door 분기)",
      evidenceKeys: [...CURL_KEYS],
    },
    {
      id: "style.curl_fit.b2_door_s_curl",
      text: "S웨이브 넣었는데 부스스하고 지저분하게 나온 적 있다면 — 바로 이것 때문이에요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "B2_DOOR_BY_DESIGN.s_curl 원문 그대로 (FIX-C② 디자인별 door 분기)",
      evidenceKeys: [...CURL_KEYS],
    },
  ],
};
export default curlFit;

// ─────────────────────────────────────────────────────────────────────────────
// 보류 중 — b1~b8·b10 원고 63슬롯의 블록 분해
//
// 갈래 원고 9개 × 7필드를 volume/hair-structure/curl-fit/cut 중 어디에 넣을지는
// 지시서 §6-3(Primary Insight)·§6-5(b분해·absorbed)·§6-6(b9 해체)이 규정한다.
// 그 원문이 아직 작업방에 없어 임의 배치하지 않는다. 특히 다음이 §6 없이는 못 정한다:
//   · stamp(판정 문장)·door(훅)의 소속 블록 — §7-1의 5블록에 대응 항목이 없다
//   · Primary Insight가 aha에서 오는지, 별도 신규 카피인지
//   · absorbed(비주력 갈래) 카피를 어느 블록에 어떤 등급으로 넣는지
// §6를 받으면 이어서 채운다.
