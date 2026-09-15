// [미커밋 tooling] /my-diary 진단 카드(채워진 상태) 캡처.
// 로직 무변경. localStorage 에 샘플 진단 1건만 주입해 DiaryCard 를 렌더한다.
// 사용: MSYS_NO_PATHCONV=1 node _shot_diary.mjs <out.png> [width] [height]
import { chromium } from "playwright";

const [out = "diary.png", width = "390", height = "2200"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 2200;

const ENTRY = {
  id: "sample-1", kind: "style", styleName: "빌드펌",
  answers: { q1_age: "age_50", q11_length: "shoulder", q13_design: "c_curl", q3_curl: "wavy_hair", q7_thickness: "medium_thickness", q8_density: "medium_density", q10_history_count: "count_1_2" },
  savedAt: Date.now(), generatedImageUrl: null,
  hairTags: ["#반곱슬", "#볼륨처짐"], summary: "반곱슬 · 끝에서 안으로 말리는 C컬 추천",
  isSevereDamage: false, isLowDensity: false, isFineHair: false, isCurly: false,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});
await page.addInitScript((e) => {
  try { localStorage.setItem("abeauty:diaryEntries", JSON.stringify([e])); } catch { /**/ }
}, ENTRY);

await page.goto("http://localhost:3000/my-diary", { waitUntil: "networkidle", timeout: 60000 }).catch((err) => console.log("goto", err.message));
await page.waitForTimeout(2500);
const txt = await page.innerText("body").catch(() => "");
console.log("bodyLen:", txt.length);
await page.screenshot({ path: out, fullPage: false });
console.log("saved", out);
await browser.close();
