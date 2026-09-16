// [미커밋] 눈금 정정 전/후 나란히 비교 이미지.
// 사용: node _compare.mjs <leftPng> <rightPng> <out> [leftLabel] [rightLabel]
import { chromium } from "playwright";
import { readFileSync } from "fs";
const [left, right, out, ll = "라운드 I (17/15)", rl = "라운드 C (15/13)"] = process.argv.slice(2);
const b64 = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");
const html = `<div style="display:flex;gap:16px;background:#f5f2ec;padding:20px;font-family:system-ui">
  <div><div style="text-align:center;font-weight:600;padding:6px;color:#6e665b">${ll}</div><img src="${b64(left)}" style="width:390px;border:1px solid #ddd"/></div>
  <div><div style="text-align:center;font-weight:600;padding:6px;color:#2a261f">${rl}</div><img src="${b64(right)}" style="width:390px;border:1px solid #ddd"/></div>
</div>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 1000 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const el = await page.$("div");
await el.screenshot({ path: out });
console.log("saved", out);
await browser.close();
