// style/care — "집에서는" (2026-09-15 사장님 구술). 집에서 하는 관리 행동.
//   b1·b2·b3·b4·b5·b7·b8 만 본문이 있다. b6 은 "집에서는"이 없고, b10(§9)은 본문 없이
//   정수리 드라이 카드만 나가므로(resolver 가 scalp 조각을 care 섹션에 이어 붙임) 본문 entry 없음.
import type { StyleCopyBlockModule } from "../types";

const B1 = ["q3_curl", "q13_design"] as const;
const B2 = ["q3_curl", "q13_design"] as const;
const B3 = ["q8_density", "q7_thickness", "q3_curl", "q13_design"] as const;
const B4 = ["q7_thickness", "q8_density", "q11_length"] as const;
const B5 = ["q7_thickness", "q8_density", "q11_length"] as const;
const B7 = ["q7_thickness", "q3_curl", "q13_design"] as const;
const B8: readonly string[] = [];

const ORAL = "2026-09-15 사장님 구술";

const care: StyleCopyBlockModule = {
  domain: "style",
  block: "care",
  entries: [
    { id: "style.care.b1", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B1],
      text: "뿌리가 자라 지저분해 보이면 보이는 곳 위주로만 손보세요. 정수리는 매직기로 드라이하고, 헤어라인 잔머리는 스틱으로 꼬불거리는 곱슬만 잡아주면 일시적으로 덜 보입니다." },
    { id: "style.care.b2", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B2],
      text: "곱슬에 컬을 걸면 관리할 때 문제가 생기기 쉬워요. 덜 말려서 자연건조되거나, 습해서 자연건조되거나, 상해서 부스스해지거나. 100% 말려주시고, 트리트먼트·클리닉·헤어오일을 적절히 써서 부스스함을 잡아주는 게 효과적입니다." },
    { id: "style.care.b3", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B3],
      text: "얇은 곱슬은 정수리 볼륨을 살리는 데 중점을 두세요. 다 펴고 나서 정수리를 살리는 드라이 방법을 더하시면 됩니다." },
    { id: "style.care.b4", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B4],
      text: "볼륨 살리는 드라이를 더하시면 좋아요." },
    { id: "style.care.b5", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B5],
      text: "여기에 볼륨 살리는 드라이를 더하시면 좋아요." },
    { id: "style.care.b7", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B7],
      text: "그 단백질을 꾸준히 채워줘야 유지력도 높아져요." },
    { id: "style.care.b8", status: "approved", sourceGrade: "구술", sourceRef: ORAL, evidenceKeys: [...B8],
      text: "열보호제 같은 걸 채워주면서 더 상하지 않게 해주는 게 좋아요." },
  ],
};
export default care;
