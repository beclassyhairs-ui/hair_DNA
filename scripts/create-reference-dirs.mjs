// ============================================================================
// scripts/create-reference-dirs.mjs
// public/references/ 아래 /style 레퍼런스 84개 leaf 폴더를 새 기준으로 생성한다.
//
// 경로 규칙: public/references/{age}/{length}/{layer}/{design}/
//
// - age:    group_2040, group_5060
// - length: short, short_bob, bob, collarbone, chest
// - short / short_bob      → layer: light only            / design: 3개(straight, c_curl, wave)
// - bob / collarbone / chest → layer: heavy, medium, light / design: 4개(straight, c_curl, s_curl, wave)
//
// 조합 수: (2×3) + (3×3×4) = 6 + 36 = 42 (연령 그룹당) × 2 = 84
//
// 이 스크립트는 폴더 생성 + 빈 폴더 보존용 .gitkeep 추가만 한다.
// - 기존 public/references 안의 파일/폴더는 절대 지우지 않는다(mkdir는 있으면 그냥 통과).
// - 이미지 파일은 넣지 않는다.
// - /style API·설문 로직에는 관여하지 않는다.
// ============================================================================

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const REFERENCES_ROOT = join(PROJECT_ROOT, "public", "references");

const AGE_GROUPS = ["group_2040", "group_5060"];

const LENGTH_RULES = {
  short:      { layers: ["light"],                    designs: ["straight", "c_curl", "wave"] },
  short_bob:  { layers: ["light"],                    designs: ["straight", "c_curl", "wave"] },
  bob:        { layers: ["heavy", "medium", "light"], designs: ["straight", "c_curl", "s_curl", "wave"] },
  collarbone: { layers: ["heavy", "medium", "light"], designs: ["straight", "c_curl", "s_curl", "wave"] },
  chest:      { layers: ["heavy", "medium", "light"], designs: ["straight", "c_curl", "s_curl", "wave"] },
};

const leafDirs = [];
for (const age of AGE_GROUPS) {
  for (const [length, rule] of Object.entries(LENGTH_RULES)) {
    for (const layer of rule.layers) {
      for (const design of rule.designs) {
        leafDirs.push(join(REFERENCES_ROOT, age, length, layer, design));
      }
    }
  }
}

let createdDirs = 0;
let existedDirs = 0;
let createdKeep = 0;
let existedKeep = 0;

for (const dir of leafDirs) {
  if (existsSync(dir)) {
    existedDirs++;
  } else {
    mkdirSync(dir, { recursive: true });
    createdDirs++;
  }

  const keepFile = join(dir, ".gitkeep");
  if (existsSync(keepFile)) {
    existedKeep++;
  } else {
    writeFileSync(keepFile, "");
    createdKeep++;
  }
}

console.log(`대상 leaf 폴더 총합: ${leafDirs.length}`);
console.log(`새로 생성된 폴더: ${createdDirs} / 이미 존재하던 폴더: ${existedDirs}`);
console.log(`새로 생성된 .gitkeep: ${createdKeep} / 이미 존재하던 .gitkeep: ${existedKeep}`);
