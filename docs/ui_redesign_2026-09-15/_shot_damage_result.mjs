// [미커밋 tooling] /damage-check/result 캡처.
// 로직 무변경. 로그인 게이트(/api/auth/me) mock + DAMAGE_SURVEY_KEY 주입으로 렌더.
// 사용: MSYS_NO_PATHCONV=1 node _shot_damage_result.mjs <out.png> [width] [height]
import { chromium } from "playwright";

const [out = "damage_result.png", width = "390", height = "3400", answersJson] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 3400;

const DEFAULT_ANSWERS = {
  q1_pull: "snap", q2_friction: "rough", q3_dry: "slow",
  h_recent: "dye", h_prev: "perm", h_more: "none",
  h_bleach_2plus: false, h_root_gray: false, h_self_dye: false,
  h_root_interval: "", h_root_over6m: false,
};
const ANSWERS = answersJson ? { ...DEFAULT_ANSWERS, ...JSON.parse(answersJson) } : DEFAULT_ANSWERS;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});
await page.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ loggedIn: true, consent: { overseas_transfer: true, policy_version: "2026-08-08" } }) }));
await page.addInitScript((a) => {
  try { sessionStorage.setItem("damage:survey", JSON.stringify(a)); } catch { /**/ }
}, ANSWERS);

await page.goto("http://localhost:3000/damage-check/result", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto", e.message));
await page.waitForTimeout(2800);
const txt = await page.innerText("body").catch(() => "");
console.log("bodyLen:", txt.length, "url:", page.url());
await page.screenshot({ path: out, fullPage: false });
console.log("saved", out);
await browser.close();
