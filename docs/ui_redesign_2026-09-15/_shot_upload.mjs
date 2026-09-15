// [미커밋 tooling] /style/upload 전용 캡처.
// 동의 게이트(hasOverseasConsent→/api/auth/me)를 route mock 으로 통과시켜 PhotoGuide·선택화면을 렌더한다.
// 앱/lib 코드는 건드리지 않는다(네트워크 응답만 모킹 — sessionStorage 주입과 동일 성격).
// 사용: MSYS_NO_PATHCONV=1 node docs/ui_redesign_2026-09-15/_shot_upload.mjs <guidePng> <chooserPng> [width] [height]
import { chromium } from "playwright";

const [guideOut = "guide.png", chooserOut = "chooser.png", width = "390", height = "1500"] = process.argv.slice(2);
const w = parseInt(width, 10) || 390;
const h = parseInt(height, 10) || 1500;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", () => {});
page.on("pageerror", () => {});

// 동의 보유 로그인 사용자로 응답 모킹 → gateOk=true.
await page.route("**/api/auth/me", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ loggedIn: true, consent: { overseas_transfer: true, policy_version: "2026-08-08" } }),
  }),
);

await page.goto("http://localhost:3000/style/upload", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => console.log("goto err", e.message));
await page.waitForTimeout(2500);
await page.innerText("body").catch(() => "");
await page.screenshot({ path: guideOut, fullPage: false });
console.log("saved", guideOut);

// PhotoGuide CTA 클릭 → 선택화면(showChooser)
const cta = await page.getByText("사진 찍으러 가기").first();
await cta.click({ timeout: 5000 }).catch((e) => console.log("cta err", e.message));
await page.waitForTimeout(1500);
await page.innerText("body").catch(() => "");
await page.screenshot({ path: chooserOut, fullPage: false });
console.log("saved", chooserOut);

await browser.close();
