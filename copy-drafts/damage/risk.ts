// damage/risk — 위험 예고(예언) 카피. §7-1 저장 구조.
//
// 예언 14종 × (door·aha·tip) = 42 entry. **2026-08-13 지시서 원문 그대로**이므로
//   전량 sourceGrade "재배치"이고 **문장 재작성·요약·다듬기 금지**다.
//   door/aha/tip을 각각 별도 entry로 쪼갠 이유: V2 블록 조립에서 세 덩어리가 서로
//   다른 슬롯에 놓일 수 있어야 하기 때문(현행은 한 섹션에 3연속 고정).
//
// ⚠️ 예언 11~14는 단독 매칭과 폴백을 겸한다("다른 시술 없음" 조건이 제거됨).
//   riskFamily 태깅 시 primary와 중복될 수 있으니 dedupe 설계에서 이 4건을 반드시
//   따로 취급한다(V2_PRECHECK §5 주의).
//
// ⚠️ 예언 8번은 길이 문항 부재로 match=() => false — 구조상 도달 불가다. 문구는
//   보존하되 unreachable이라 production 승인 게이트(reachable 기준)에도 걸리지 않는다.
//   손상 엔진 v2에서 길이 문항이 신설되면 부활 대상.
//
// ⚠️ 9번 aha의 "복구 매직"은 시술 명칭이라 그대로 둔다. 화장품법 금지어 규칙은
//   "제품 칸에서 이 제품이 ○○해준다"고 말할 때만 걸리며(docs/damagecheckworkorder.md:14),
//   여기는 시술 설명이고 원문 보존 대상이다. 금지어 grep 시 이 건은 예외로 판단할 것.
import type { DamageCopyBlockModule } from "../types";

const P = "2026-08-13 지시서 예언";

const risk: DamageCopyBlockModule = {
  domain: "damage",
  block: "risk",
  entries: [
    // ── 1. 펌 × 뿌리염색 ────────────────────────────────────────────────────
    { id: "damage.risk.p01_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 1번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "펌한 지 얼마 안 되셨는데, 뿌리 쪽 볼륨이 먼저 가라앉는 느낌이 들지 않던가요?" },
    { id: "damage.risk.p01_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 1번 aha — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "염색약이 뿌리에 닿으면 펌으로 잡아둔 결합이 느슨해집니다. 그래서 컬 전체가 늘어져 보이고, 약이 닿은 부분은 펌 유지력이 약해질 수 있어요." },
    { id: "damage.risk.p01_tip", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 1번 tip 마지막 문장 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "펌을 먼저 하고 염색을 하면 염색약이 닿은 부분이 가라앉을 수 있고, 염색을 먼저 하고 펌을 하면 색이 퇴색될 수 있습니다. 가장 좋은 건 두 시술 사이에 기간을 두는 거예요. 너무 자주 겹쳐서 하시면 두 가지 시술 모두 만족스러운 결과물이 나올 확률이 줄어들어요." },

    // ── 2. 매직 × 뿌리염색 ──────────────────────────────────────────────────
    { id: "damage.risk.p02_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 2번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "매직을 하셔서 겉보기엔 매끈한데, 감을 때나 말릴 때 보면 부스스하고 손에 많이 걸리지 않던가요?" },
    { id: "damage.risk.p02_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 2번 aha — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "매직은 결을 펴서 정돈돼 보이게 하는 거지, 머릿결이 진짜 좋아진 건 아니에요. 새치 염색이 반복되면 속은 계속 상하는데 겉이 매끈해서 헷갈리게 만듭니다." },
    { id: "damage.risk.p02_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 2번 tip — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "젖었을 때 손으로 만져보시고 상했다는 느낌이 드시면, 머릿결 관리는 필수고 잦은 시술은 자제하시는 게 좋습니다. 머릿결이 좋아진 것 같아서 시술을 또 하시면 위험해요." },

    // ── 3. 뿌리염색 × 전체염색 ──────────────────────────────────────────────
    { id: "damage.risk.p03_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 3번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "염색하고 나서, 생각보다 색이 빨리 빠지고 금방 밝아지지 않던가요?" },
    { id: "damage.risk.p03_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 3번 aha — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "손상된 머리는 색은 잘 들어갑니다. 색감도 잘 잡히고요. 다만 원래 색으로 돌아오는 시간이 빨라져요. 상할수록 유지 기간이 짧아집니다." },
    { id: "damage.risk.p03_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 3번 tip — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "색을 오래 두시려고 염색을 자주 하시면, 그럴수록 유지 기간이 더 짧아지는 쪽으로 갑니다. 차라리 컬러 샴푸나 보색 샴푸로 색상 유지력을 늘려가시는 게 효과적이에요." },

    // ── 4. 염색 × 열펌 ──────────────────────────────────────────────────────
    { id: "damage.risk.p04_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 4번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "펌하고 났더니 머리색이 오히려 밝아 보이거나 상해 보이지 않던가요?" },
    { id: "damage.risk.p04_aha", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 4번 aha 습성→성향)", evidenceKeys: ["h_recent", "h_prev"],
      text: "가장 마지막에 한 시술이 이전 시술에 영향을 끼칩니다. 염색 후에 열펌을 하면 색이 퇴색돼서 원래 가지고 있던 밝기로 돌아가려는 성향이 있어요. 머리색이 밝아지면 컬도 부스스해 보일 수 있습니다." },
    { id: "damage.risk.p04_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 4번 tip — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "두 시술을 같이 하셔야 한다면, 열펌을 먼저 하시고 나중에 염색으로 색감만 입혀주는 게 좋습니다. 색감만 넣는 토닝 염색으로 조절하시면 손상을 줄이면서 색을 낼 수 있어요." },

    // ── 5. 염색 × 매직 ──────────────────────────────────────────────────────
    { id: "damage.risk.p05_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 5번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "매직하고 났는데 결은 매끈해졌는데, 색이 더 밝아 보이고 상해 보이지 않던가요?" },
    { id: "damage.risk.p05_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 5번 aha — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "매직은 퇴색이 심합니다. 색이 빠져서 상해 보이는 건 감출 수가 없어요." },
    { id: "damage.risk.p05_tip", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 5번 tip '이 경우도' 삭제)", evidenceKeys: ["h_recent", "h_prev"],
      text: "매직을 먼저 하시고 나중에 색감만 입혀주는 순서가 낫습니다. 밝기를 조절하는 염색보다 색감을 넣어주는 토닝 쪽이 부담이 적어요." },

    // ── 6. 셀프염색 × 미용실 염색 ───────────────────────────────────────────
    { id: "damage.risk.p06_door", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 6번 door 도입부 교체)", evidenceKeys: ["h_self_dye", "h_recent", "h_prev"],
      text: "집에서 셀프로 하시고 샵에서 염색했을 때, 원하는 색감이 나오지 않던 적이 있지 않나요?" },
    { id: "damage.risk.p06_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 6번 aha — 원문 그대로`, evidenceKeys: ["h_self_dye", "h_recent", "h_prev"],
      text: "뿌리 염색을 직접 하시거나 여기저기 다른 미용실에서 받으시면, 레벨 톤이 한두 톤씩 어긋나면서 얼룩이 쌓이게 됩니다." },
    { id: "damage.risk.p06_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 6번 tip — 원문 그대로`, evidenceKeys: ["h_self_dye", "h_recent", "h_prev"],
      text: "자기 레벨을 기억해두시는 편이 가장 편해요. 평소 8레벨로 하셨다면 직접 쓰시는 약도 8레벨로 맞추시는 게 좋고, 미용실에서도 미리 말씀해두시면 얼룩질 확률이 많이 줄어듭니다. 혹시 블랙을 하신다면, 그 부분은 다시 밝아지지 않습니다." },

    // ── 7. 열펌 × 매직 ──────────────────────────────────────────────────────
    { id: "damage.risk.p07_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 7번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "펌을 하시고 나중에 매직을 하셨는데, 끝머리가 지저분하거나 유난히 엉키는 느낌이 들지 않던가요?" },
    { id: "damage.risk.p07_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 7번 aha — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev"],
      text: "잦은 열펌과 화학 시술은 결합을 많이 끊기게 합니다. 매직으로 깔끔하게 펴도 끝머리는 부스스하게 올라올 확률이 있어요." },
    { id: "damage.risk.p07_tip", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-29 사장님 구술(예언 열펌×매직 tip '회색빛' 삭제)", evidenceKeys: ["h_recent", "h_prev"],
      text: "그렇게 부스스해지는 부분은 어느 정도 정리해주면서 다듬어 가셔야 합니다. 매직을 하셔서 머리가 깔끔해 보인다고 다시 컬을 넣으시면, 기존 시술에 영향을 받아 좋은 결과가 안 나올 수 있어요." },

    // ── 8. 긴 길이 × 반복 시술 — ⚠️ match=false, 구조상 미노출(문구 보존) ────
    { id: "damage.risk.p08_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 8번 door — 원문 보존. 길이 문항 부재로 현재 도달 불가`, evidenceKeys: [],
      text: "기를수록 끝이 더 상해 보이고 얇아 보이지 않던가요?" },
    { id: "damage.risk.p08_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 8번 aha — 원문 보존. 길이 문항 부재로 현재 도달 불가`, evidenceKeys: [],
      text: "긴 머리 끝은 몇 년치 시술이 쌓인 자리예요." },
    { id: "damage.risk.p08_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 8번 tip — 원문 보존. 길이 문항 부재로 현재 도달 불가`, evidenceKeys: [],
      text: "어느 정도 정리해주면서 지저분한 부분을 다듬고 가셔야 오히려 효과적으로 기를 수 있습니다." },

    // ── 9. 탈색 × 매직 ──────────────────────────────────────────────────────
    { id: "damage.risk.p09_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 9번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "탈색하고 매직을 하셨는데, 오히려 매직 효과가 잘 안 났던 적 있지 않던가요?" },
    { id: "damage.risk.p09_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 9번 aha — 원문 그대로("복구 매직"은 시술 명칭, 제품 칸 금지어 규칙 대상 아님)`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "탈색모에 하는 매직은 복구 매직이라고 하는 고난도 시술입니다. 디자이너에 따라 결과 차이가 크고, 약이 잘못 들어가면 되돌릴 수 없는 결과가 나올 수 있어요." },
    { id: "damage.risk.p09_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 9번 tip — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "하시게 된다면 pH를 잘 아는 분께 받으셔야 합니다." },

    // ── 10. 탈색 × 열펌 ─────────────────────────────────────────────────────
    { id: "damage.risk.p10_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 10번 door — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "탈색한 머리에 펌을 하셨다면, 컬이 아예 안 나오거나 부스스해지지 않던가요?" },
    { id: "damage.risk.p10_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 10번 aha — 원문 그대로`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "탈색모에 열펌은 사실상 불가능합니다. 컬을 걸어둘 뼈대가 남아 있지 않아서요." },
    { id: "damage.risk.p10_tip", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-29 사장님 구술(예언 탈색×열펌 tip 교체 · 탈색만 tip도 이 문장 공유→refId)", evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "새로울 스타일에 도전하기보다 현재 머릿결을 다듬으면서 복구해야 되는 시기예요." },

    // ── 11. 펌만 (단독 + 폴백 겸용) ─────────────────────────────────────────
    { id: "damage.risk.p11_door", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-29 사장님 구술(예언 펌만 door 전체 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "펌하고 나면 부스스해지는 경우가 있으신가요?" },
    { id: "damage.risk.p11_aha", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-29 사장님 구술(예언 펌만 aha 전체 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "이럴 땐 곱슬머리에 컬이 걸리거나 지난 펌의 주기가 빠르다면, 컬들이 겹치면서 부스스해 보일 수 있어요." },
    { id: "damage.risk.p11_tip", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-29 사장님 구술(예언 펌만 tip 전체 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "한 달쯤 지나서 컬이 늘어지거나 부하게 올라온다면, 다시 펌하는 것보다 머릿결의 결을 관리해준다면 탄력과 깔끔함을 유지할 수 있습니다." },

    // ── 12. 매직만 (단독 + 폴백 겸용) ───────────────────────────────────────
    { id: "damage.risk.p12_door", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 12번 매직만 — door 전체 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "매직하고 몇 개월 지나면 전체적으로 부스스해 보이지 않으신가요?" },
    { id: "damage.risk.p12_aha", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 12번 매직만 — aha 전체 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "의외로 뿌리 쪽에 자란 곱슬머리 때문에 전체적으로 지저분해 보이는 경우가 많아요." },
    { id: "damage.risk.p12_tip", status: "approved", sourceGrade: "구술", sourceRef: "2026-09-20 사장님 구술(예언 12번 매직만 — tip 전체 교체)", evidenceKeys: ["h_recent", "h_prev"],
      text: "손상도가 걱정되신다면 뿌리 쪽에만 매직을 해주셔도 전체적으로 깔끔해지는 효과를 볼 수 있어요. 그 사이에는 곱슬기를 완화해주는 케라틴 미스트 같은 제품을 쓰시는 것도 좋은 방법입니다." },

    // ── 13. 염색만 (단독 + 폴백 겸용) ───────────────────────────────────────
    { id: "damage.risk.p13_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 13번 door — 원문 그대로. 단독매칭+폴백 겸용(dedupe 주의)`, evidenceKeys: ["h_recent", "h_prev"],
      text: "염색하고 두세 주 지나면 색이 확 빠져 보이지 않던가요?" },
    { id: "damage.risk.p13_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 13번 aha — 원문 그대로. 단독매칭+폴백 겸용(dedupe 주의)`, evidenceKeys: ["h_recent", "h_prev"],
      text: "색은 감을 때마다 조금씩 빠져나갑니다." },
    { id: "damage.risk.p13_tip", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 13번 tip — 원문 그대로. 단독매칭+폴백 겸용(dedupe 주의)`, evidenceKeys: ["h_recent", "h_prev"],
      text: "염색을 다시 하시는 것보다 컬러 샴푸로 사이를 버티시는 게 머릿결에는 훨씬 낫습니다." },

    // ── 14. 탈색만 (단독 + 폴백 겸용) ───────────────────────────────────────
    { id: "damage.risk.p14_door", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 14번 door — 원문 그대로. 단독매칭+폴백 겸용(dedupe 주의)`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "탈색하고 나서 머리가 유난히 잘 엉키고, 젖으면 늘어나지 않던가요?" },
    { id: "damage.risk.p14_aha", status: "approved", sourceGrade: "재배치", sourceRef: `${P} 14번 aha — 원문 그대로. 단독매칭+폴백 겸용(dedupe 주의)`, evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"],
      text: "탈색은 색소를 빼내면서 머리 속을 비워냅니다. 비워진 자리는 다시 채워지지 않아요." },
    // 탈색만 tip = 탈색×열펌 tip과 동일 문장(사장님 구술). 문장 복사 대신 refId로 p10_tip 상속 —
    //   resolver가 예언 문자열을 text로 역매칭하므로, 같은 문장이 두 entry에 있으면 모호해진다(refId는 index에서 제외).
    { id: "damage.risk.p14_tip", refId: "damage.risk.p10_tip", sourceGrade: "구술", sourceRef: "2026-09-29 사장님 구술(탈색만 tip = p10_tip과 동일 → refId)", evidenceKeys: ["h_recent", "h_prev", "h_bleach_2plus"] },
  ],
};
export default risk;
