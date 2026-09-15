// [미커밋 tooling] UI 개편 before/after 스크린샷 헬퍼.
// 사용: node docs/ui_redesign_2026-09-15/_shot.mjs <path> <width> <outPng> [injectJson] [height]
//   injectJson = {"session":{k:v},"local":{k:v}} — 설문/결과지 렌더용 세션 주입.
//   height = 뷰포트 높이(기본 900). 결과지 등 긴 화면은 크게(예: 3200).
// ⚠️ headless 에서 background-attachment:fixed 조합은 캡처 직전 innerText 로 레이아웃을 강제해야
//    본문이 페인트된다. non-fullPage(뷰포트=화면높이) 로 캡처한다. (diag 로 검증된 방식)
import { chromium } from "playwright";

let [path = "/", width = "390", out = "shot.png", injectJson, height = "900"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 900;

// ⚠️ Git Bash(MSYS)는 선행 슬래시 인자('/style/survey')를 'C:/.../Git/style/survey'로 바꾼다.
//    호출은 반드시 MSYS_NO_PATHCONV=1 + 슬래시 없는 경로('style/survey')로 넘긴다.
//    여기서는 남은 선행 슬래시만 정리해 라우트를 만든다.
const route = "/" + path.replace(/^\/+/, "");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});

if (injectJson) {
  const data = JSON.parse(injectJson);
  await page.addInitScript((d) => {
    try { for (const [k, v] of Object.entries(d.session || {})) sessionStorage.setItem(k, v); } catch { /**/ }
    try { for (const [k, v] of Object.entries(d.local || {})) localStorage.setItem(k, v); } catch { /**/ }
  }, data);
}

const resp = await page.goto("http://localhost:3000" + route, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => ({ _err: e.message }));
await page.waitForTimeout(2500);
const txt = await page.innerText("body").catch(() => "");
console.log("status:", resp && resp.status ? resp.status() : resp, "bodyLen:", txt.length);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log("saved", out, `(w=${w} h=${h})`);
