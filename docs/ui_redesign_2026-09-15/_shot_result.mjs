// [미커밋 tooling] /style/result(결과지) 캡처 — 상태·폭 지정.
// 로직 무변경. 세션 주입(+필요시 poll mock)으로 PhotoSlot 상태별/폭별 렌더.
// 사용: MSYS_NO_PATHCONV=1 node _shot_result.mjs <out.png> [width] [height] [mode]
//   mode: done(기본)|generating|limit|failed
import { chromium } from "playwright";

const [out = "result.png", width = "390", height = "3200", mode = "done"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 3200;
const IMG = "data:image/svg+xml;base64," + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#cbb9a6"/><circle cx="150" cy="150" r="70" fill="#a08b74"/><rect x="70" y="230" width="160" height="200" rx="80" fill="#a08b74"/></svg>'
).toString("base64");
const ANSWERS = { q1_age: "age_50", q11_length: "shoulder", q14_layer: "medium", q13_design: "c_curl", q8_density: "medium_density", q7_thickness: "medium_thickness", q3_curl: "wavy_hair", q10_history_count: "count_1_2" };

const session = { "style:answers": JSON.stringify(ANSWERS), "style:photo": IMG };
if (mode === "done") session["style:generated"] = IMG;
if (mode === "limit") session["style:limit"] = "오늘 무료 횟수를 모두 사용했어요. 내일 다시 만나요.";
if (mode === "failed") session["style:failReason"] = "network";
if (mode === "generating") session["style:job"] = JSON.stringify({ id: "mock-job", token: "mock-token", startedAt: Date.now() });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});
// generating: 폴링 응답을 늦춰 '준비 중' 유지.
await page.route("**/api/hair-transform/**", async (r) => { await new Promise((res) => setTimeout(res, 30000)); r.abort(); });
await page.addInitScript((s) => { try { for (const [k, v] of Object.entries(s)) sessionStorage.setItem(k, v); } catch { /**/ } }, session);

await page.goto("http://localhost:3000/style/result", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto", e.message));
await page.waitForTimeout(2800);
const txt = await page.innerText("body").catch(() => "");
console.log("bodyLen:", txt.length, "mode:", mode, "w:", w);
await page.screenshot({ path: out, fullPage: false });
console.log("saved", out);
await browser.close();
