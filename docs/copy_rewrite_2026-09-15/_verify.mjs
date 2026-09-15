// [미커밋] 원고 이식 정합 검증 — 9갈래 대표 원답으로 resolveStyle 실행, 칸별 텍스트 덤프.
import { resolveStyle } from "../../copy-drafts/.build/copy-drafts/resolver/index.js";

const CASES = {
  "b1 곱슬 펴기":        { q3_curl: "curly_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob" },
  "b2 곱슬 컬":          { q3_curl: "curly_hair_mid", q13_design: "c_curl", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "collarbone" },
  "b3 숱많가는곱슬 펴기": { q3_curl: "wavy_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thick_density", q11_length: "bob" },
  "b4 가늘숱적 길게":    { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thin_density", q11_length: "chest" },
  "b5 가늘숱적 짧게":    { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thin_density", q11_length: "short" },
  "b6 숱많굵음":         { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "coarse", q8_density: "thick_density", q11_length: "bob" },
  "b6 숱많굵음+곱슬":    { q3_curl: "curly_hair_mid", q13_design: "straight", q7_thickness: "coarse", q8_density: "thick_density", q11_length: "bob" },
  "b7 가는직모 컬":      { q3_curl: "straight_hair", q13_design: "c_curl", q7_thickness: "fine", q8_density: "medium_density", q11_length: "collarbone" },
  "b8 무난":            { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "medium_thickness", q8_density: "medium_density", q11_length: "bob" },
  "b10 숱많가는직모":    { q3_curl: "straight_hair", q13_design: "straight", q7_thickness: "fine", q8_density: "thick_density", q11_length: "bob" },
  "차단(bleach2)":       { q3_curl: "straight_hair", q13_design: "c_curl", q7_thickness: "fine", q8_density: "thin_density", q11_length: "chest", q8a_recent: "bleach", q8_bleach_2plus: "1" },
};

for (const [name, ans] of Object.entries(CASES)) {
  const r = resolveStyle(ans, "development");
  console.log(`\n========== ${name}  (primary=${r.primary} fired=${r.firedBranches} gate=${r.gateLevel}) ==========`);
  for (const b of r.blocks) {
    if (b.entries.length === 0) continue;
    console.log(`  [${b.block}]`);
    for (const e of b.entries) console.log(`    · ${e.id}${e.conditional ? " (conditional)" : ""}: ${e.text.slice(0, 40)}…`);
  }
}
