// ============================================================================
// scripts/gen-references-manifest.mjs
// 빌드타임 레퍼런스 manifest 생성 — public/references/<len>/<weight>/<curl>/ 를
// 스캔해 slot→파일목록 JSON을 만든다. 런타임 fs.readdir 의존 제거(Vercel 서버리스가
// public/ 를 함수 FS에 안 담을 수 있음 → 번들에 포함되는 JSON을 import).
//
// ⚠️ 레퍼런스 파일을 수정/이동/생성하지 않는다(§0). 읽어서 목록만 만든다.
// 실행: node scripts/gen-references-manifest.mjs  (package.json prebuild에 연결)
// 출력: lib/referencesManifest.json  { "bob/heavy/c_curl": ["a.jpg", ...], ... }
// ============================================================================
import { readdir, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const REF_DIR = join(ROOT, "public", "references");
const OUT = join(ROOT, "lib", "referencesManifest.json");

const IMG_RE = /\.(jpe?g|png|webp)$/i;
// 슬롯 = <len>/<weight>/<curl> 정확히 3뎁스. allowlist로 잡음(오타 폴더·default_style.jpg 제외).
const LENGTHS = new Set(["short", "short_bob", "bob", "collarbone", "chest"]);
const WEIGHTS = new Set(["heavy", "medium", "light"]);
const CURLS   = new Set(["straight", "c_curl", "s_curl", "wave"]);

async function isDir(p) {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

async function main() {
  const manifest = {};
  let total = 0;
  const emptySlots = [];

  for (const len of LENGTHS) {
    for (const w of WEIGHTS) {
      for (const c of CURLS) {
        const slot = `${len}/${w}/${c}`;
        const dir = join(REF_DIR, len, w, c);
        if (!(await isDir(dir))) { emptySlots.push(slot + " (없음)"); continue; }
        let files = [];
        try {
          const entries = await readdir(dir, { withFileTypes: true });
          files = entries
            .filter((e) => e.isFile() && IMG_RE.test(e.name))
            .map((e) => e.name)
            .sort(); // 결정적 순서(런타임 랜덤픽은 이 목록 위에서)
        } catch { /* skip */ }
        if (files.length) { manifest[slot] = files; total += files.length; }
        else emptySlots.push(slot + " (빈폴더)");
      }
    }
  }

  await writeFile(OUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const slotCount = Object.keys(manifest).length;
  const gridTotal = LENGTHS.size * WEIGHTS.size * CURLS.size; // 5×3×4=60 격자
  console.log(`[manifest] 채워진 슬롯 ${slotCount}개, 이미지 ${total}장 → ${relative(ROOT, OUT)}`);
  console.log(`[manifest] 빈/없는 슬롯 ${emptySlots.length}개 (격자 ${gridTotal}칸 중)`);
}

main().catch((e) => { console.error("[manifest] 실패:", e); process.exit(1); });
