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
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b3.aha 참조 (원본=style.insight.b3_aha · §6-5(1) 모질 판단, §6 보정 1 refId 재사용)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl", "q13_design"],
    },
    {
      id: "style.hair_structure.b6_aha_ref",
      refId: "style.insight.b6_aha",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b6.aha 참조 (원본=style.insight.b6_aha · §6-5(1) 모질 판단, §6 보정 1 refId 재사용)",
      evidenceKeys: ["q8_density", "q7_thickness"],
    },
    {
      id: "style.hair_structure.b10_aha_ref",
      refId: "style.insight.b10_aha",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b10.aha 참조 (원본=style.insight.b10_aha · §6-5(1) 모질 판단, §6 보정 1 refId 재사용)",
      evidenceKeys: ["q8_density", "q7_thickness", "q3_curl"],
    },

    // ════════════════════════════════════════════════════════════════════════
    // [PHASE2] 모질 매트릭스 — 굵기(q7) × 숱(q8) 9칸 + 곱슬(q3) modifier.
    //   전건 draft(사장님 빨간펜 전 라이브 차단). 갈래(b3/b6/b10)가 못 덮는 6칸까지
    //   전 손님의 hair-structure 블록을 채운다(현행: 갈래 손님만 aha-ref 1줄, 나머진 빈칸).
    //   틀: "숱은 양이고, 버티는 힘은 한 올의 굵기"(b3_aha 논리)를 9칸에 일반화.
    //   ⚠️ 갈래 손님(fine×많음=b3/b10, coarse×많음=b6, fine×적음=b4/b5)은 승인된 aha-ref와
    //      매트릭스 칸이 같은 화면에 겹친다 → 승인 시 aha-ref 유지 vs 매트릭스 대체를 정한다
    //      (리뷰 파일에 명시). production은 draft 차단이라 지금은 aha-ref만 나가 회귀 없음.
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "style.hair_structure.m_coarse_thick",
      text: "한 올 한 올이 굵은 데다 숱까지 많은 머리예요. 양도 많고 버티는 힘도 세니까, 가만 둬도 옆으로 크게 부풀어요. 힘이 없어서가 아니라 힘이 넘쳐서 생기는 부피라, 눌러주는 설계가 관건입니다.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] 매트릭스 굵음×많음 — BRANCH_COPY.b6.aha(숱+굵기=옆으로 뜸) 논리 확장",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_coarse_med",
      text: "굵은 머리칼에 숱은 보통이라, 실제보다 숱이 많아 보이는 머리예요. 힘이 있고 쉽게 눌리지 않아서 웬만한 스타일은 다 소화하는, 선택의 폭이 넓은 모질입니다. 굵은 결이 살아 있으니 그 장점을 살리는 방향으로 가면 됩니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 굵음×보통: 숱 많아 보임·선택폭 넓음·할 수 있는 방향이 넓음(가능성 톤)",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_coarse_thin",
      text: "한 올이 굵어 심지는 튼튼한데 숱은 많지 않은 편이에요. 그래서 이 머리는 숱을 더 많아 보이게, 볼륨을 살려주는 방향이 잘 어울립니다. 굵은 결 자체가 힘이 있어서, 볼륨만 받쳐주면 한결 풍성해 보입니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 굵음×적음: 숱 많아 보이게·볼륨 살려주는 경우 많음(가능성 톤)",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_med_thick",
      text: "굵기는 평균인데 숱이 많아 양감이 넉넉한 머리예요. 볼륨이 잘 살고 스타일이 오래 가는 게 강점입니다. 숱이 너무 많다 싶을 때만 속에서 양감을 살짝 덜어주면 되고, 웬만해선 그대로도 충분히 풍성하게 예뻐요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 §3-1(숱=양감/질감) — 보통×많음: 숱이 곧 볼륨, 너무 많을 때만 속 양감 조절(덮는 머리는 안 침)",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_med_med",
      text: "굵기도 숱도 평균에 가까운, 균형 잡힌 머리예요. 특별히 불리한 구석이 없어서 고르실 수 있는 스타일의 폭이 가장 넓습니다. 끝선·앞머리·컬 크기 같은 디테일만 맞추면 원하시는 스타일이 거의 다 나와요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 보통×보통: 선택지가 많다(가능성 톤)",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_med_thin",
      text: "굵기는 평균인데 숱이 적은 편이라, 볼륨을 살려주는 게 이 머리의 열쇠예요. 뿌리를 세우는 손질이나 볼륨을 더하는 시술로 받쳐주고, 제품으로 채워주면 한결 풍성해 보입니다. 방법이 분명한 머리예요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 보통×적음: 볼륨 많이 살려줘야·다른 시술 보완·제품으로 채움(가능성 톤)",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_fine_thick",
      text: "숱은 많은데 한 올 한 올이 가는 머리예요. 양은 넘치는데 그 양을 세워줄 기둥이 약하다 보니, 중간은 부풀고 정수리는 눌립니다. 숱을 덜어내기보다 무게를 어디에 두느냐가 핵심이에요.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] 매트릭스 얇음×많음 — BRANCH_COPY.b3/b10.aha(양은 많은데 기둥 없음) 논리 확장",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_fine_med",
      text: "한 올이 가늘고 숱은 평균인 머리예요. 볼륨을 살려주는 방향이 잘 맞아서, 뿌리를 세우고 가볍게 가면 얼마든지 살아납니다. 가는 결은 손질과 제품으로 충분히 받쳐줄 수 있어요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21 — 얇음×보통: 보통×적음과 동일 방향(볼륨 보완, 가능성 톤)",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },
    {
      id: "style.hair_structure.m_fine_thin",
      text: "가늘고 숱도 적은 머리예요. 한 올의 힘도 약하고 양도 적어서, 통째로 가라앉기 쉽습니다. 이 머리는 길이가 곧 무게라, 길수록 위가 눌리고 끝이 비어 보여요.",
      status: "draft",
      sourceGrade: "파생",
      sourceRef: "[PHASE2] 매트릭스 얇음×적음 — BRANCH_COPY.b4/b5.aha(통째로 가라앉음, 길이=무게) 논리 확장",
      evidenceKeys: ["q7_thickness", "q8_density"],
    },

    // ── 곱슬 modifier — 매트릭스 칸 뒤에 붙는 곱슬기 보정 한 줄(q3_curl) ──────────
    {
      id: "style.hair_structure.curlmod_wavy",
      text: "반곱슬은 사실 유리한 모질이에요. 커트만 잘 해놔도 형태가 예쁘게 잡히는 경우가 많아서, 고르실 수 있는 스타일의 폭이 넓습니다. 다만 펌이나 컬을 넣을 때는 반곱슬기 때문에 부스스하고 지저분해지기 쉬우니, 그 부분만 잡아주면 커트만으로도 스타일이 오래갑니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21(2차) — 반곱슬: 유리(커트만으로 예쁨·선택폭 넓음)·단 컬 시 부스스 주의",
      evidenceKeys: ["q3_curl"],
    },
    {
      id: "style.hair_structure.curlmod_mid",
      text: "곱슬은 그대로 두면 지저분해 보이기 쉬워서, 있는 그대로 예쁘게 살리기가 쉽진 않아요. 대신 곱슬을 펌처럼 하나의 스타일로 잡으면 잘 어울립니다. 이때 숱이 많은지 적은지가 방향을 크게 가르니, 숱에 맞춰 설계하는 게 중요해요.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21(2차) — 곱슬: 펌처럼 스타일로 잡으면 OK, 숱과 교차",
      evidenceKeys: ["q3_curl"],
    },
    {
      id: "style.hair_structure.curlmod_strong",
      text: "곱슬기가 강한 편이라, 이 정도면 펴는 시술을 전제로 스타일을 설계하는 게 일반적이에요. 결을 먼저 정리하고 나면 원하시는 스타일의 폭이 훨씬 넓어집니다.",
      status: "draft",
      sourceGrade: "재배치",
      sourceRef: "[PHASE2] 사장님 채굴 답변 2026-08-21(2차) — 악성곱슬: 매직(펴는 시술) 전제. 부정 톤 금지",
      evidenceKeys: ["q3_curl"],
    },
  ],
};
export default hairStructure;
