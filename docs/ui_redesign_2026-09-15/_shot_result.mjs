// [미커밋 tooling] /style/result(결과지) 캡처.
// 로직 무변경. 세션(answers·generated·photo)만 주입해 done 상태를 폴링 없이 렌더한다.
// 사용: MSYS_NO_PATHCONV=1 node _shot_result.mjs <out.png> [width] [height]
import { chromium } from "playwright";

const [out = "result.png", width = "390", height = "7000"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 7000;
// 단색 세로 초상 더미(before/after 슬롯 채움용) — 3:4 비율 느낌의 회색 PNG data URI.
const IMG = "data:image/svg+xml;base64," + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#cbb9a6"/><circle cx="150" cy="150" r="70" fill="#a08b74"/><rect x="70" y="230" width="160" height="200" rx="80" fill="#a08b74"/></svg>'
).toString("base64");

const ANSWERS = {
  q1_age: "age_50", q11_length: "shoulder", q14_layer: "medium", q13_design: "c_curl",
  q8_density: "medium_density", q7_thickness: "medium_thickness", q3_curl: "wavy_hair",
  q10_history_count: "count_1_2",
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});

await page.addInitScript((d) => {
  try {
    sessionStorage.setItem("style:answers", JSON.stringify(d.answers));
    sessionStorage.setItem("style:photo", d.img);
    sessionStorage.setItem("style:generated", d.img);
  } catch { /**/ }
}, { answers: ANSWERS, img: IMG });

await page.goto("http://localhost:3000/style/result", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto", e.message));
await page.waitForTimeout(2800);
const txt = await page.innerText("body").catch(() => "");
console.log("bodyLen:", txt.length);
await page.screenshot({ path: out, fullPage: false });
console.log("saved", out);
await browser.close();
