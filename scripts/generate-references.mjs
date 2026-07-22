// ============================================================================
// scripts/generate-references.mjs
// A-Beauty 헤어 레퍼런스 파일럿 생성기 (FLUX.2 Pro / Replicate, text-to-image)
//
// 하는 일: 조합별 프롬프트 → FLUX.2 Pro 호출 → 세로 초상 JPEG 다운로드 →
//          references_pilot_v6/<조합 경로>/{seed-0N,bangs-0N}.jpg + preview.html
//
// 특징
//   · 조합(COMBOS)만 고르면 되게 파라미터화 — 다음 버전은 프롬프트 블록만 교체
//   · FLUX.2 Pro에는 negative_prompt 입력이 없어 NEG는 프롬프트 내 "Avoid:" 절로 접음
//   · 폴더 경로는 lib/styleReference.ts taxonomy(group_2040/length/wave/layer)와 1:1
//
// 사용법
//   node scripts/generate-references.mjs                 # 전체(기본 references_pilot_v6)
//   node scripts/generate-references.mjs --only short    # 특정 조합만
//   node scripts/generate-references.mjs --out references_pilot_v7 --version v7
//   node scripts/generate-references.mjs --dry           # 프롬프트만 출력(호출 안 함)
//
// 환경변수(.env.local): REPLICATE_API_TOKEN (필수)
//   REPLICATE_FLUX_MODEL 로 모델 오버라이드 가능(기본 black-forest-labs/flux-2-pro)
// ============================================================================

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// ─── 인자 파싱 ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const OUT_DIR  = getArg("out", "references_pilot_v6");
const VERSION  = getArg("version", "v6");
const ONLY     = getArg("only", null);        // 조합 key 필터
const DRY      = argv.includes("--dry");

// ─── 토큰 로드(값 출력 금지) ──────────────────────────────────────────────────
function loadToken() {
  const env = readFileSync(join(REPO, ".env.local"), "utf8");
  const raw = env.match(/^REPLICATE_API_TOKEN=(.*)$/m)?.[1] ?? "";
  return raw.trim().replace(/^["']|["']$/g, "");
}
const TOKEN = DRY ? "" : loadToken();
if (!DRY && !TOKEN) { console.error("✗ REPLICATE_API_TOKEN 없음(.env.local)"); process.exit(1); }

const MODEL = process.env.REPLICATE_FLUX_MODEL || "black-forest-labs/flux-2-pro";
const ENDPOINT = `https://api.replicate.com/v1/models/${MODEL}/predictions`;

// ─── 공통 블록 (모든 장 공통) ─────────────────────────────────────────────────
// 세로 초상 · 흰 무지 상의 · 흐린 날 빛 · 민무늬 밝은 벽 + 리얼리즘 블록 v6
const SUBJECT =
  "photorealistic vertical portrait photograph of a Korean woman in her early 30s, " +
  "natural bare-faced makeup, calm neutral expression, looking at the camera";

const COMMON_POS =
  "natural dimensional soft brown hair, ashy natural brown base with subtle lighter " +
  "highlights and darker lowlights woven through, multi-tonal balayage-like depth, " +
  "NOT a single flat color; individual hair strands clearly separated, natural baby " +
  "hairs along the hairline, a few soft flyaways, soft natural sheen not glossy plastic; " +
  "realistic skin with visible pores and natural fine texture, real human skin not " +
  "airbrushed; shot on a professional DSLR portrait lens, natural depth of field, subtle " +
  "fine film grain, photorealistic editorial photograph; plain smooth off-white wall no " +
  "wall texture, soft even overcast lighting, plain white t-shirt; hair styled by a top " +
  "Korean salon, hair campaign quality, haircut symmetric and even";

const COMMON_NEG =
  "wig, wig-like helmet hair, plastic doll hair, uniform solid flat hair color, overly " +
  "glossy plastic sheen, hair as one solid glossy mass, 3D render, CGI, airbrushed " +
  "poreless skin, waxy plastic skin, over-smoothed, artificial doll look, beige top, " +
  "cream colored shirt, harsh direct sunlight, textured wall";

// ─── 앞머리 절 ────────────────────────────────────────────────────────────────
const BANGS = {
  seed:  "no fringe, no bangs, forehead exposed, hair swept away from the forehead",
  bangs: "soft wispy see-through bangs, thin airy see-through fringe across the forehead",
};

// ─── 조합 정의 (조합만 고르면 되게) ───────────────────────────────────────────
const COMBOS = [
  {
    key:   "short",
    title: "① 숏컷 (pixie)",
    dir:   "group_2040/short/straight/soft",
    note:  "숏컷: 귀 위로 올라간 픽시, 뿌리 볼륨·가벼운 컷라인·끝 텍스처 / 각도 3/4 25~30°(양눈 노출)",
    angle: "three-quarter view portrait, head turned 25 to 30 degrees, both eyes clearly visible",
    pos:   "short pixie cut, hair above the ears, ears fully exposed, lightweight airy cut line, " +
           "soft rounded silhouette with natural root volume, wispy textured ends",
    neg:   "bob, hair covering the ears, hair touching the neck, heavy solid cap of hair, chin-length hair",
    seedBase: 610000,
  },
  {
    key:   "bob_wave",
    title: "② 단발 + 웨이브",
    dir:   "group_2040/bob/wave/soft",
    note:  "단발웨이브: 턱선~어깨 위(어깨 안 닿음), 미드~끝 풍성한 살롱 빅웨이브 / 각도 정면~살짝",
    angle: "front-facing portrait, very slight turn of the head",
    pos:   "bob with ends between the jawline and just above the shoulders, ends hang ABOVE the " +
           "shoulders must NOT touch shoulders; clearly defined abundant glossy waves flowing from " +
           "mid-lengths to ends, voluminous salon-finished big waves",
    neg:   "shoulder-length hair, hair touching shoulders, long hair, straight flat hair, tight small curls",
    seedBase: 620000,
  },
  {
    key:   "chest_ccurl",
    title: "③ 가슴선 + C컬",
    dir:   "group_2040/chest/c_curl/soft",
    note:  "가슴선C컬: 가슴선 길이, 뿌리~미드 실키 직모, 끝만 안쪽 C 한 번(아웃플립 금지) / 각도 정면~살짝",
    angle: "front-facing portrait, very slight turn of the head",
    pos:   "long hair ending at the chest line, reaching the top of the bust; silky pin-straight " +
           "smooth body from roots through mid-lengths, ONLY the very tips curve INWARD toward the " +
           "face once in a soft C-shaped bend, ends tucked in; no wave or bend in the body",
    neg:   "outward flipped ends, ends flicking out, S-shaped waves, wavy mid-lengths, waist-length hair, hair past the chest",
    seedBase: 630000,
  },
];

// 각 조합당 5장: seed-01~03(무앞머리) + bangs-01~02(시스루뱅)
const SHOTS = [
  { file: "seed-01",  bangs: "seed",  seedOff: 1 },
  { file: "seed-02",  bangs: "seed",  seedOff: 2 },
  { file: "seed-03",  bangs: "seed",  seedOff: 3 },
  { file: "bangs-01", bangs: "bangs", seedOff: 11 },
  { file: "bangs-02", bangs: "bangs", seedOff: 12 },
];

// ─── 프롬프트 조립 ────────────────────────────────────────────────────────────
function buildPrompt(combo, shot) {
  const pos = [
    SUBJECT,
    combo.pos,
    BANGS[shot.bangs],
    combo.angle,
    COMMON_POS,
  ].join(", ");
  const neg = `${combo.neg}, ${COMMON_NEG}`;
  return `${pos}. Avoid: ${neg}.`;
}

// ─── Replicate 호출 (생성 → 폴링 → URL) ───────────────────────────────────────
async function generate(prompt, seed) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=55",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio:   "3:4",
        output_format:  "jpg",
        output_quality: 90,
        seed,
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  let data = await res.json();

  // 아직 안 끝났으면 폴링
  while ((data.status === "starting" || data.status === "processing") && data.urls?.get) {
    await new Promise(r => setTimeout(r, 2000));
    data = await (await fetch(data.urls.get, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
  }
  if (data.status === "failed" || data.error) throw new Error(`prediction failed: ${data.error ?? data.status}`);
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!url) throw new Error(`no output: ${JSON.stringify(data).slice(0, 200)}`);
  return url;
}

async function download(url, absPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, buf);
  return buf.length;
}

// ─── 동시성 풀 ────────────────────────────────────────────────────────────────
async function pool(items, size, worker) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}

// ─── preview.html 생성 ────────────────────────────────────────────────────────
function buildPreview(combos) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const sections = combos.map((c) => {
    const figs = SHOTS.map((s) => {
      const isBangs = s.bangs === "bangs";
      return `<figure class="${isBangs ? "bangs" : ""}"><a href="./${c.dir}/${s.file}.jpg" target="_blank">` +
        `<img loading="lazy" src="./${c.dir}/${s.file}.jpg" alt="${s.file}.jpg"></a>` +
        `<figcaption>${s.file} · <b>${isBangs ? "시스루뱅" : "무앞머리"}</b></figcaption></figure>`;
    }).join("");
    return `<section><h2>${esc(c.title)}</h2><p class="meta">${esc(c.note)}<br>` +
      `<code>${OUT_DIR}/${c.dir}/</code></p><div class="grid">${figs}</div></section>`;
  }).join("");

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>어뷰티 레퍼런스 파일럿 ${VERSION} 검수</title>
<style>:root{color-scheme:light}body{font-family:-apple-system,"Segoe UI","Malgun Gothic",sans-serif;margin:0;background:#faf8f4;color:#2f2a22}
header{padding:24px 20px;background:#fff;border-bottom:1px solid #eee;position:sticky;top:0;z-index:2}h1{font-size:19px;margin:0 0 6px}.sub{font-size:12px;color:#8a8474;margin:0 0 10px}
ol.crit{margin:0;padding-left:20px;font-size:13px;color:#5f5848;line-height:1.7}ol.crit b{color:#8a6d2f}
section{padding:20px}h2{font-size:16px;margin:0 0 4px}.meta{font-size:12px;color:#8a8474;margin:0 0 14px;line-height:1.5}code{background:#f0ece2;padding:1px 6px;border-radius:4px;font-size:11px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}figure{margin:0}
figure.bangs figcaption b{color:#a15c8a}figure.bangs img{border-color:#e2b8d4}
img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;border:1px solid #e7dfc9;background:#eee;display:block}figcaption{font-size:11px;color:#8a8474;text-align:center;margin-top:4px}</style></head><body>
<header><h1>어뷰티 레퍼런스 파일럿 <b>${VERSION}</b> — 검수용 (리얼리즘 블록 v6 · 입체 염색·피부결·필름감 · ${MODEL})</h1>
<p class="sub">분홍=시스루뱅. 조합당 5장(무앞머리 3 + 시스루뱅 2). 이전 버전은 references_pilot_v* 에 보관.</p>
<ol class="crit"><li><b>리얼리즘</b>: 위그/플라스틱 광택·단색 평면 없이, 입체 염색(하이라이트·로우라이트)·모발 가닥 분리·잔머리·피부 모공/필름 그레인이 살았는가</li>
<li><b>기장/컬</b>: ①귀 위 픽시 ②턱선~어깨 위(어깨 안 닿음) 빅웨이브 ③가슴선 직모+끝만 안쪽 C</li>
<li><b>감성 톤</b>: 흰 무지 상의·오프화이트 벽·흐린 날 필름 톤</li></ol></header>
${sections}
<footer style="padding:20px;font-size:12px;color:#8a8474;">조합·앞머리별 베스트 + 피드백 주시면 핑퐁. 검수 통과 전 public/references 반입·커밋 안 함.</footer></body></html>`;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const combos = ONLY ? COMBOS.filter((c) => c.key === ONLY) : COMBOS;
  if (!combos.length) { console.error(`✗ --only ${ONLY}: 해당 조합 없음`); process.exit(1); }

  // 작업 목록 평탄화
  const jobs = [];
  for (const combo of combos)
    for (const shot of SHOTS)
      jobs.push({ combo, shot, prompt: buildPrompt(combo, shot), seed: combo.seedBase + shot.seedOff });

  console.log(`▶ ${VERSION} | 모델 ${MODEL} | 조합 ${combos.length} × 5 = ${jobs.length}장 → ${OUT_DIR}/`);

  if (DRY) {
    for (const j of jobs) console.log(`\n[${j.combo.key}/${j.shot.file}] seed=${j.seed}\n${j.prompt}`);
    console.log(`\n(dry) 호출 없이 프롬프트만 출력. 총 ${jobs.length}장 예정.`);
    return;
  }

  const errors = [];
  let ok = 0, bytes = 0;
  await pool(jobs, 3, async (j) => {
    const absPath = join(REPO, OUT_DIR, j.combo.dir, `${j.shot.file}.jpg`);
    try {
      const url = await generate(j.prompt, j.seed);
      const size = await download(url, absPath);
      ok++; bytes += size;
      console.log(`  ✓ ${j.combo.key}/${j.shot.file}.jpg  (${(size / 1024).toFixed(0)}KB)`);
    } catch (e) {
      errors.push(`${j.combo.key}/${j.shot.file}: ${e.message}`);
      console.error(`  ✗ ${j.combo.key}/${j.shot.file}: ${e.message}`);
    }
  });

  // 리포트 + preview.html
  writeFileSync(join(REPO, OUT_DIR, "_pilot_report.json"),
    JSON.stringify({ ok, fail: errors.length, model: MODEL, version: VERSION, errors }, null, 2));
  writeFileSync(join(REPO, OUT_DIR, "preview.html"), buildPreview(combos));

  console.log(`\n■ 완료: ${ok}/${jobs.length}장 (${(bytes / 1024 / 1024).toFixed(1)}MB) | 실패 ${errors.length}`);
  console.log(`  preview: ${OUT_DIR}/preview.html`);
  if (errors.length) process.exitCode = 1;
}

main().catch((e) => { console.error("치명적 오류:", e); process.exit(1); });
