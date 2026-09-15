// [미커밋 tooling] /style/loading(접수) 캡처.
// 로직 무변경. 세션(셀카·답변) 주입 + /api 응답 route mock 으로 접수/에러 상태를 렌더한다.
// 사용: MSYS_NO_PATHCONV=1 node _shot_loading.mjs <mode: submitting|error> <out.png> [width] [height]
import { chromium } from "playwright";

const [mode = "submitting", out = "loading.png", width = "390", height = "844"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 844;
const PX = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});

await page.addInitScript(() => {
  try {
    sessionStorage.setItem("style:photo", "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
    sessionStorage.setItem("style:answers", JSON.stringify({ q1_age: "50s" }));
  } catch { /**/ }
});

await page.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json",
  body: JSON.stringify({ loggedIn: true, consent: { overseas_transfer: true, policy_version: "2026-08-08" } }) }));
await page.route("**/api/submit-diagnosis", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await page.route("**/api/hair-transform", async (r) => {
  if (mode === "error") {
    return r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, reason: "network" }) });
  }
  // submitting: 응답을 늦춰 접수 대기 화면을 유지
  await new Promise((res) => setTimeout(res, 20000));
  return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: false, reason: "network" }) });
});

await page.goto("http://localhost:3000/style/loading", { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log("goto", e.message));
await page.waitForTimeout(mode === "error" ? 2500 : 2000);
await page.innerText("body").catch(() => "");
await page.screenshot({ path: out, fullPage: false });
console.log("saved", out, "mode", mode);
await browser.close();
void PX;
