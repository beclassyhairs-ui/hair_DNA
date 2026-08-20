// style/safety — 시술 가능 여부·주의 카피. §7-1 저장 구조.
//
// 담는 것: 게이트 caution 안내줄 + 갈래9(게이트 차단) 원고 전체.
//   갈래9는 다른 갈래와 성격이 다르다 — 모질을 설명하는 갈래가 아니라 "지금은
//   시술할 때가 아니다"라는 안전 판정이라, 7필드가 통째로 safety 소관이다.
//   (현행은 b9가 결과지 전체를 덮는 구조이고, §6-6에서 그 덮기를 해체한다.)
//
// ⚠️ styleGate.ts는 Phase 1.0 동결(§8-6·§10-10). 이 블록은 게이트의 **판정을
//   바꾸지 않고** 그 결과를 문장으로 표현만 한다. 게이트 구조 변경이 필요해지면
//   작업을 멈추고 보고한다.
//
// 갈래9 products는 빈 배열이다 — 제품 대신 손상도 진단 CTA로 보낸다(원문 설계).
import type { StyleCopyBlockModule } from "../types";

const GATE_KEYS = ["q8a_recent", "q8b_prev", "q8c_more", "q8_bleach_2plus"] as const;

const safety: StyleCopyBlockModule = {
  domain: "style",
  block: "safety",
  entries: [
    {
      id: "style.safety.caution_notice",
      text: "컬펌 유지력이 짧을 수 있는 상태예요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "CAUTION_NOTICE 원문 그대로 (지시서 A-2 게이트 주의 노란 안내줄)",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.b9_stamp",
      text: "지금은 만들 때가 아니라 살릴 때입니다",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b9.stamp 원문 그대로 (갈래9 게이트 차단)",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.b9_door",
      text: "최근에 한 시술이 생각보다 예쁘게 안 나온 적 있다면 — 약이나 손 문제가 아니라, 머리가 버틸 힘이 없어서예요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b9.door 원문 그대로",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.b9_aha",
      text: "여기서부터는 잘라내는 게 최고의 트리트먼트입니다.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b9.aha 원문 그대로",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.b9_detail",
      text: "시술이 쌓인 머리는 색이 생각보다 어둡게 먹고, 컬은 예쁘게 나와도 오래 안 갑니다. 새로 뭘 얹는 것보다 정리하면서 기르는 쪽이 결국 빠릅니다. 고르신 스타일은 지운 게 아니라 미뤄둔 거예요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b9.detail 원문 그대로",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.b9_tip",
      // 오너 빨간펜(2026-08-20): "얹지 않는 게 관리의 전부입니다" → 자제 권유 톤으로 완화.
      //   단정형이 지시처럼 읽혀 손님이 위축된다는 지적. 라이브 원본(branchCopy.ts)은
      //   건드리지 않고 레지스트리 카피만 고친다.
      text: "지금은 새 시술을 조금 미뤄두시는 게 가장 확실한 관리예요. 고데기나 드라이 온도를 한 단계만 낮춰도 남은 머리가 훨씬 버텨줍니다. 끝부터 조금씩 정리해 가면서 기르시면 생각보다 빨리 돌아와요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b9.tip + 오너 빨간펜 2026-08-20 (자제 톤으로 완화)",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.blocked_procedure_prefix",
      // 바로 위 safety(b9_tip)가 이미 자제를 권하고 있어 "자제를 권해드리지만"을 다시 쓰면
      //   같은 말이 두 번 읽힌다(PM 빨간펜). 조건부 프레임만 남긴다.
      text: "머릿결이 돌아온 뒤에 하시게 된다면, 이렇게 잡으시면 됩니다.",
      status: "approved",
      sourceGrade: "신규",
      sourceRef:
        "PM 확정 2026-08-20 — 게이트 차단 시 procedure(시술 지시)를 숨기지 않고 조건부로 전환하는 전제 문구. safety의 '자제 권유'와 궁합/커트의 '시술 설계'가 같은 화면에서 충돌하던 문제 해소 / PM 빨간펜 2026-08-20 — 자제 문구 중복 제거",
      evidenceKeys: [...GATE_KEYS],
    },
    {
      id: "style.safety.b9_procedure",
      text: "지금 상태에서 무리하게 시술하면 원하는 그림도 안 나오고 머리만 더 상합니다. 얼마나 상했고 뭘 쓰면 되는지는 손상도 진단에서 정확히 봐드려요.",
      status: "approved",
      sourceGrade: "재배치",
      sourceRef: "BRANCH_COPY.b9.procedure 원문 그대로 (손상도 진단 송객 CTA)",
      evidenceKeys: [...GATE_KEYS],
    },
  ],
};
export default safety;
