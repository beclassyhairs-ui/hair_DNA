// 얼굴형 판정 임계값 튜닝용 배치 테스트 스크립트
// test-faces/ 폴더의 사진들을 실제 /bangs/upload → /bangs/result 플로우로 돌려서
// jaw/forehead/length 비율과 최종 판정 얼굴형을 CSV로 뽑아낸다.
//
// 사용법: node scripts/test-face-shapes.mjs
// 사전조건: `npm run dev` 서버가 http://localhost:3000 에서 실행 중이어야 함

import { chromium } from "playwright";
import { readdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE_URL   = "http://localhost:3000";
const FACES_DIR  = join(process.cwd(), "test-faces");
const OUT_CSV    = join(process.cwd(), "test-faces-results.csv");
const OUT_LM     = join(process.cwd(), "test-faces-landmarks.json");

const SHAPE_LABELS = {
  square: "각진형", oblong: "긴형", round: "둥근형", peanut: "땅콩형",
  heart: "하트형", diamond: "다이아몬드형", hexagon: "육각형", oval: "계란형",
};

// 파일명이 "shape_NN.ext" 패턴인 것만 정답 라벨이 있는 테스트셋으로 취급
const LABEL_RE = new RegExp(`^(${Object.keys(SHAPE_LABELS).join("|")})_\\d+\\.(jpg|jpeg|png|webp)$`, "i");
const files = readdirSync(FACES_DIR).filter((f) => LABEL_RE.test(f));

if (files.length === 0) {
  console.error(`test-faces/ 폴더에 "shape_NN.jpg" 형식의 라벨된 사진이 없습니다. (${FACES_DIR})`);
  process.exit(1);
}

const browser = await chromium.launch();
const results = [];
const landmarkDump = {};

for (const file of files) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/bangs/upload`, { waitUntil: "networkidle" });

    // 갤러리에서 선택 → 숨은 파일 인풋에 직접 주입
    await page.locator('input[type="file"]').setInputFiles(join(FACES_DIR, file));

    // "이 사진으로 분석하기" 버튼 대기 후 클릭
    const analyzeBtn = page.getByRole("button", { name: "이 사진으로 분석하기" });
    await analyzeBtn.waitFor({ state: "visible", timeout: 10_000 });
    await analyzeBtn.click();

    // 결과 페이지 이동 대기 (Fake loading 10초 + 분석 시간)
    await page.waitForURL("**/bangs/result", { timeout: 30_000 });

    // 디버그 비율 텍스트 파싱: "[디버그] jaw 0.xxx · forehead 0.xxx · length 0.xxx"
    const debugText = await page.locator("text=/\\[디버그\\]/").first().textContent({ timeout: 10_000 }).catch(() => null);
    // "Face Shape" 라벨 바로 다음 <p>가 실제 판정 타이틀 (ScanCard 하단, 클릭 없이 항상 보임)
    const shapeTitle = await page.locator('p:text-is("Face Shape") + p').first().textContent({ timeout: 10_000 }).catch(() => null);

    // 36점 oval 전체 랜드마크 원본 좌표 — 커스텀 비율 재계산용
    const landmarkJson = await page.evaluate(() => sessionStorage.getItem("bangs:landmarks")).catch(() => null);
    if (landmarkJson) landmarkDump[file] = JSON.parse(landmarkJson);

    let jaw = null, forehead = null, length = null;
    if (debugText) {
      const m = debugText.match(/jaw ([\d.]+).*forehead ([\d.]+).*length ([\d.]+)/);
      if (m) [, jaw, forehead, length] = m;
    }

    const expectedKey = file.match(LABEL_RE)[1].toLowerCase();
    const expectedLabel = SHAPE_LABELS[expectedKey];
    const trimmedTitle = shapeTitle?.trim() ?? "?";
    const predictedKey = Object.entries(SHAPE_LABELS).find(([, label]) => trimmedTitle.includes(label))?.[0] ?? "?";
    const correct = predictedKey === expectedKey;

    results.push({ file, expectedKey, predictedKey, correct, jaw, forehead, length });
    console.log(`${correct ? "✅" : "❌"} ${file} → 예측:${predictedKey} / 정답:${expectedKey} (jaw=${jaw} forehead=${forehead} length=${length})`);
  } catch (e) {
    console.error(`${file} 실패:`, e.message);
    const expectedKey = file.match(LABEL_RE)[1].toLowerCase();
    results.push({ file, expectedKey, predictedKey: "ERROR", correct: false, jaw: null, forehead: null, length: null });
  } finally {
    await page.close();
  }
}

await browser.close();

const csv = ["file,expectedKey,predictedKey,correct,jaw,forehead,length",
  ...results.map(r => `${r.file},${r.expectedKey},${r.predictedKey},${r.correct},${r.jaw},${r.forehead},${r.length}`)].join("\n");
writeFileSync(OUT_CSV, csv, "utf-8");
writeFileSync(OUT_LM, JSON.stringify(landmarkDump), "utf-8");

const accuracy = results.filter(r => r.correct).length / results.length;
console.log(`\n정확도: ${results.filter(r => r.correct).length}/${results.length} (${(accuracy * 100).toFixed(1)}%)`);
console.log(`결과 저장: ${OUT_CSV}`);
