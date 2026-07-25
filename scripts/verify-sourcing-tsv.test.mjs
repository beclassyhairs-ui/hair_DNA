// ============================================================================
// verify-sourcing-tsv.test.mjs — 실존검증 CLI의 보안 핵심 로직 회귀 가드
//
// 이 방어(SSRF 차단·robots·가격 대조)는 소싱 할루시네이션 방어의 본체다.
// 순수 함수만 검증한다(네트워크 없음). 실행: node scripts/verify-sourcing-tsv.test.mjs
// ============================================================================

import {
  ipToBytes, isPrivateAddr, priceConfirmed, parseRobots, robotsAllows,
} from "./verify-sourcing-tsv.mjs";

let pass = 0, fail = 0;
const t = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++;
  else { fail++; console.log(`  x ${name}: got ${JSON.stringify(got)} exp ${JSON.stringify(exp)}`); }
};
const priv = (ip) => isPrivateAddr(ipToBytes(ip));

// ─── SSRF: 사설/특수 대역은 차단(true) ────────────────────────────────────────
for (const ip of [
  "127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1",
  "0.0.0.0", "192.0.0.1", "198.18.0.1", "224.0.0.1",
  "::1", "::", "fe80::1", "fe90::1", "fea0::1", "febf::1", "fc00::1", "fd12::1", "ff02::1",
  "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1",
]) t(`private ${ip}`, priv(ip), true);

// ─── SSRF: 공인 IP는 허용(false) ─────────────────────────────────────────────
for (const ip of [
  "8.8.8.8", "1.1.1.1", "203.0.113.5", "172.32.0.1",
  "2606:4700:4700::1111", "::ffff:8.8.8.8", "64:ff9b::808:808", "64:ff9b:1::1",
]) t(`public ${ip}`, priv(ip), false);

// ─── 가격 대조 ────────────────────────────────────────────────────────────────
t("price empty->null", priceConfirmed("", "x 12000"), null);
t("price spaces->null", priceConfirmed("   ", "x"), null);
t("price nonnumeric->false", priceConfirmed("문의", "가격 12000"), false);
t("price match->true", priceConfirmed("12,000원", "특가 12000 원"), true);
t("price boundary block->false", priceConfirmed("12300", "이건 123000원"), false);
t("price boundary ok->true", priceConfirmed("12300", "가격 12,300 원"), true);
t("price range both->true", priceConfirmed("10000~20000", "10000 부터 20000 까지"), true);
t("price range missing->false", priceConfirmed("10000~20000", "10000 만"), false);

// ─── robots: 그룹/우선순위/UA 매칭 ────────────────────────────────────────────
const r1 = parseRobots("User-agent: *\nDisallow: /admin\nAllow: /admin/public");
t("robots disallow", robotsAllows(r1, "/admin/secret"), false);
t("robots allow more specific", robotsAllows(r1, "/admin/public/x"), true);
t("robots unrelated", robotsAllows(r1, "/products/1"), true);
t("robots empty UA ignored",
  robotsAllows(parseRobots("User-agent:\nDisallow: /\nUser-agent: *\nAllow: /"), "/anything"), true);
t("robots non-prefix UA n/a",
  robotsAllows(parseRobots("User-agent: beauty\nDisallow: /"), "/x"), true);
t("robots prefix UA applies",
  robotsAllows(parseRobots("User-agent: abeauty\nDisallow: /no"), "/no/path"), false);

// ─── robots: 선형 glob matcher(*, $, 흩어진 와일드카드) ───────────────────────
const g = parseRobots("User-agent: *\nDisallow: /a*b\nAllow: /a*b/ok");
t("glob spread match", robotsAllows(g, "/axxxb"), false);
t("glob spread nomatch", robotsAllows(g, "/axxx"), true);
t("glob allow overrides", robotsAllows(g, "/axxxb/ok"), true);
t("glob mid wildcard",
  robotsAllows(parseRobots("User-agent: *\nDisallow: /p/*/secret"), "/p/1/secret"), false);
const dollar = parseRobots("User-agent: *\nDisallow: /*.pdf$");
t("glob $ anchor match", robotsAllows(dollar, "/x/y.pdf"), false);
t("glob $ anchor not-end", robotsAllows(dollar, "/x/y.pdf?a=1"), true);

// ─── robots ReDoS 안전성: 흩어진 * 대량 + 긴 불일치 경로가 즉시 끝나야 ───────────
{
  const evil = parseRobots(`User-agent: *\nDisallow: /${"*a".repeat(50)}b`);
  const start = process.hrtime.bigint();
  const res = robotsAllows(evil, "/" + "a".repeat(5000));
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  t("ReDoS evil resolves", res, true);
  t("ReDoS under 100ms", ms < 100, true);
  console.log(`  · 흩어진 * 50개 × 5000자 경로: ${ms.toFixed(1)}ms`);
}

console.log(`\n결과: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
