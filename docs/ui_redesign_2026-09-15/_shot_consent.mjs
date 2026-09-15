// [미커밋 tooling] /login/consent 동의 폼 캡처.
// 로직 무변경. /api/auth/me 를 미로그인으로 mock 해 동의 폼(phase="form")을 렌더한다.
// 사용: MSYS_NO_PATHCONV=1 node _shot_consent.mjs <out.png> [width] [height]
import { chromium } from "playwright";
const [out = "consent.png", width = "390", height = "1300"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 1300;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});
await page.route("**/api/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ loggedIn: false }) }));
await page.goto("http://localhost:3000/login/consent", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto", e.message));
await page.waitForTimeout(2500);
const txt = await page.innerText("body").catch(() => "");
console.log("bodyLen:", txt.length);
await page.screenshot({ path: out, fullPage: false });
console.log("saved", out);
await browser.close();
