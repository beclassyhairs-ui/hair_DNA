// style/hair-structure — 모발 구조(굵기×숱, 곱슬 modifier) 카피. §7-1 저장 구조.
//
// §6-5(1): "b3/b6/b10의 모질 판단 이동. Phase 1.0은 기존 원문에 존재하는 조합만,
//   없는 칸은 생략."
//
// ★ §6 보정 1(2026-08-19 PM) — 문장을 복사하지 않는다.
//   b3/b6/b10의 모질 판단은 각 갈래의 aha이고, 그 aha 원본은 §6-3에 따라
//   style/insight에 산다. 여기서는 같은 문장을 두 벌 만들지 않고 **refId로 가리킨다.**
//   복사본을 두면 원문 대조가 두 벌이 되고, 사장님이 한쪽만 빨간펜을 넣었을 때
//   화면에 서로 다른 문장이 나가게 된다.
//
// "Phase 1.0은 기존 원문에 존재하는 조합만" — 그래서 굵기×숱 매트릭스의 빈칸은
//   채우지 않는다. 아래 3건이 원문에 실재하는 조합의 전부다:
//     · b3  숱많음 × 얇음 (+곱슬기)
//     · b6  숱많음 × 굵음
//     · b10 숱많음 × 얇음 (직모)
//   숱적음 계열(b4·b5)의 모질 판단은 원문에서 볼륨 서술과 분리돼 있지 않아 생략한다.
import type { StyleCopyBlockModule } from "../types";

const hairStructure: StyleCopyBlockModule = {
  domain: "style",
  block: "hair-structure",
  entries: [
    {
      id: "style.hair_structure.b3_aha_ref",
      refId: "style.insight.b3_aha",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b3.aha 참조 (원본=style.insight.b3_aha · §6-5(1) 모질 판단, §6 보정 1 refId 재사용)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl", "q13_design"],
    },
    {
      id: "style.hair_structure.b6_aha_ref",
      refId: "style.insight.b6_aha",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b6.aha 참조 (원본=style.insight.b6_aha · §6-5(1) 모질 판단, §6 보정 1 refId 재사용)",
      evidenceKeys: ["q8_density", "q7_thickness"],
    },
    {
      id: "style.hair_structure.b10_aha_ref",
      refId: "style.insight.b10_aha",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b10.aha 참조 (원본=style.insight.b10_aha · §6-5(1) 모질 판단, §6 보정 1 refId 재사용)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl"],
    },
  ],
};
export default hairStructure;
