// ============================================================================
// verify-sourcing-tsv.mjs — 소싱 후보 TSV 실존 검증 (오프라인 CLI)
//
// 배경: 소싱 검색을 AI에 시키면 URL·가격을 지어내는(할루시네이션) 사고가 있었다.
//   인세인서치는 실제 페이지를 가져오지만, 그 결과를 표로 옮기는 단계에서 다시
//   지어낼 수 있다. 그래서 "기계가 실제 페이지와 대조하는 단계"를 끼운다.
//
// 하는 일:
//   sourcing/inbox/*.tsv 를 읽어 각 행의 product_url에 실제 HTTP 요청을 보내고,
//   응답코드/최종 도착지/페이지 제목(title·h1)/가격·상품명 존재 여부를 대조한다.
//   통과분만 sourcing/verified/<이름>.verified.tsv 로 내보내고, 전 행 판정을
//   sourcing/verified/<이름>.report.tsv 로 남긴다. 확인 안 된 가격 칸은 비운다.
//
// 경계(이 스크립트가 하지 않는 것):
//   - DB 접근 없음. sourcing_candidates 신설 없음. cron 없음. 순수 파일 in/out.
//   - 통과분도 "붙여넣기 후보"일 뿐 — 저장은 사람이 /admin/sourcing에서 한다.
//   - 출력 디렉터리 symlink 검사(realpath/lstat), 전역 per-origin rate limiter,
//     429/503 Retry-After 준수는 의도적으로 넣지 않았다. 사업주가 자기 inbox에
//     1회 돌리는 로컬 CLI라 로컬 적대자·대규모 크롤링 가정이 성립하지 않는다.
//     (DNS-rebinding TOCTOU 한계와 동일한 수용 판단.)
//
// 안전/예의:
//   - SSRF 방어: 요청 직전 호스트를 DNS 조회해 사설/루프백/링크로컬 IP면 차단
//     (초기 URL·리다이렉트 매 hop·robots.txt 모두). ※ 로컬 1회성 CLI라
//     완전한 DNS-rebinding 방어(연결시점 IP 고정)까지는 범위 밖 — 조회-차단으로 갈음.
//   - robots.txt 존중: 매 hop의 host+path를 검사. User-agent 그룹(우리 토큰 + `*`),
//     `*`/`$` 와일드카드, query 포함 경로 매칭. 못 읽으면 표준대로 허용(fail-open).
//   - 본문 크기: 스트림을 읽으며 바이트 상한에서 중단(+Content-Length 사전 검사).
//   - 순차 + 모든 HTTP 요청 사이 딜레이. User-Agent 명시. 네트워크 실패는 재시도 1회.
//
// 사용법:
//   node scripts/verify-sourcing-tsv.mjs                 # sourcing/inbox/*.tsv 전부
//   node scripts/verify-sourcing-tsv.mjs path/to/one.tsv # 특정 파일
// ============================================================================

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ─── 설정 ────────────────────────────────────────────────────────────────────
const USER_AGENT =
  "AbeautySourcingVerifier/1.0 (+offline sourcing verification; respects robots.txt)";
const UA_TOKEN = "abeautysourcingverifier"; // robots User-agent 매칭용(소문자)
const REQUEST_TIMEOUT_MS = 15_000; // fetch + 본문 읽기 전체를 덮는 마감(헤더 이후 무한 스트림 방어)
const DNS_TIMEOUT_MS = 5_000;     // DNS 조회 자체의 마감(느린 리졸버로 CLI가 멈추지 않게)
const DELAY_MS = 1_500;           // 요청 사이 간격(대상 사이트 부담 최소화)
const HOP_DELAY_MS = 500;         // 리다이렉트/robots 등 부수 요청 사이 간격
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 2_000_000; // 분석용 본문 바이트 상한(스트림 중단)
const MAX_BODY_CHARS = 1_000_000; // 문자 상한(정규식 방어)
const MAX_RETRIES = 1;            // 네트워크 실패 시 재시도 횟수
const MAX_ROBOTS_RULES = 2_000;   // robots 규칙 총량 상한(CPU/메모리 방어)
const MAX_ROBOTS_PATTERN = 2_000; // robots 단일 패턴 길이 상한

const INBOX_DIR = "sourcing/inbox";
const OUT_DIR = "sourcing/verified";

// 200을 주지만 실제로는 "상품이 없는" 소프트-404 / 파킹 페이지를 잡는 문구.
// ⚠️ 품절·판매종료 같은 "재고 상태"는 넣지 않는다 — 상품 페이지는 실존하므로 탈락 대상 아님.
const UNAVAILABLE_PHRASES = [
  "페이지를 찾을 수 없", "존재하지 않는 상품", "존재하지 않는 페이지", "삭제된 상품",
  "찾으시는 상품", "상품이 존재하지", "상품을 찾을 수 없",
  "page not found", "404 error",
  "domain is for sale", "buy this domain", "parked domain",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── TSV/CSV 파싱 (따옴표 안의 개행·구분자 보존) ───────────────────────────────
function detectDelimiter(raw) {
  const firstLine = raw.split(/\r\n|\r|\n/, 1)[0] ?? "";
  return firstLine.split("\t").length >= firstLine.split(",").length ? "\t" : ",";
}

function tokenize(raw, delimiter) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\r") { row.push(cell); rows.push(row); cell = ""; row = []; if (raw[i + 1] === "\n") i++; }
    else if (ch === "\n") { row.push(cell); rows.push(row); cell = ""; row = []; }
    else cell += ch;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function parseTable(raw) {
  const delimiter = detectDelimiter(raw);
  const tokenized = tokenize(raw, delimiter);
  if (tokenized.length === 0) return { headers: [], rows: [], delimiter };
  const headers = (tokenized[0] ?? []).map((h) => h.trim());
  const rows = tokenized.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows, delimiter };
}

function serializeCell(v, delimiter) {
  const s = v ?? "";
  return /["\r\n]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

function serializeTable(headers, rows, delimiter) {
  const lines = [headers.map((h) => serializeCell(h, delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(headers.map((h) => serializeCell(row[h] ?? "", delimiter)).join(delimiter));
  }
  return lines.join("\n") + "\n";
}

// ─── SSRF 방어 ────────────────────────────────────────────────────────────────
// 핵심 원칙: IP 문자열을 먼저 표준 바이트(v4=4, v6=16)로 파싱한 뒤 대역을 판정한다.
// 텍스트 prefix 비교(startsWith 등)는 fe80::/10을 fe80만 잡거나 ::ffff:7f00:1 같은
// hex-word IPv4-mapped를 놓치는 우회가 있어 쓰지 않는다.

function ipv4ToBytes(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(parts[i])) return null;
    const n = Number(parts[i]);
    if (n > 255) return null;
    out[i] = n;
  }
  return out;
}

function ipv6ToBytes(ip) {
  let s = ip;
  const pct = s.indexOf("%");
  if (pct >= 0) s = s.slice(0, pct); // zone id 제거
  // 마지막 그룹이 점표기 IPv4면(::ffff:1.2.3.4, 64:ff9b::1.2.3.4) 두 hex 워드로 환산
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = ipv4ToBytes(tail);
    if (!v4) return null;
    const w1 = ((v4[0] << 8) | v4[1]).toString(16);
    const w2 = ((v4[2] << 8) | v4[3]).toString(16);
    s = s.slice(0, lastColon + 1) + w1 + ":" + w2;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const back = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : null;
  let words;
  if (back === null) {
    if (head.length !== 8) return null; // '::' 없으면 정확히 8워드
    words = head;
  } else {
    const missing = 8 - (head.length + back.length);
    if (missing < 0) return null;
    words = [...head, ...Array(missing).fill("0"), ...back];
  }
  const out = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(words[i])) return null;
    const n = parseInt(words[i], 16);
    out[i * 2] = n >> 8;
    out[i * 2 + 1] = n & 0xff;
  }
  return out;
}

function ipToBytes(ip) {
  if (net.isIPv4(ip)) return ipv4ToBytes(ip);
  if (net.isIPv6(ip)) return ipv6ToBytes(ip);
  return null;
}

function isPrivateIPv4(b) {
  const a = b[0], c = b[1];
  if (a === 0 || a === 10 || a === 127) return true;       // this-net / private / loopback
  if (a === 169 && c === 254) return true;                 // 링크로컬 + 메타데이터(169.254.169.254)
  if (a === 172 && c >= 16 && c <= 31) return true;        // private
  if (a === 192 && c === 168) return true;                 // private
  if (a === 100 && c >= 64 && c <= 127) return true;       // CGNAT 100.64/10
  if (a === 192 && c === 0 && b[2] === 0) return true;     // 192.0.0.0/24 (특수목적)
  if (a === 198 && (c === 18 || c === 19)) return true;    // 198.18.0.0/15 (벤치마킹)
  if (a >= 224) return true;                               // 멀티캐스트/예약(224.0.0.0/4 이상)
  return false;
}

// 파싱된 바이트(4 또는 16)로 사설/특수 대역을 판정. 파싱 실패는 '알 수 없음'이라 안전하게 차단.
function isPrivateAddr(bytes) {
  if (!bytes) return true;
  if (bytes.length === 4) return isPrivateIPv4(bytes);
  const b = bytes;
  // IPv4-mapped ::ffff:0:0/96 → 뒤 4바이트를 IPv4로 재판정
  const mapped = b[0]===0&&b[1]===0&&b[2]===0&&b[3]===0&&b[4]===0&&b[5]===0&&
                 b[6]===0&&b[7]===0&&b[8]===0&&b[9]===0&&b[10]===0xff&&b[11]===0xff;
  if (mapped) return isPrivateIPv4(b.slice(12));
  // NAT64 64:ff9b::/96 → 앞 96비트(바이트 0..11)가 정확히 프리픽스일 때만 내장 IPv4 재판정.
  // (바이트 4..11도 0인지 확인 — 공인 IPv6 64:ff9b:xxxx.. 오차단 방지)
  const nat64 = b[0]===0x00&&b[1]===0x64&&b[2]===0xff&&b[3]===0x9b&&
                b[4]===0&&b[5]===0&&b[6]===0&&b[7]===0&&b[8]===0&&b[9]===0&&b[10]===0&&b[11]===0;
  if (nat64) return isPrivateIPv4(b.slice(12));
  // ::  (미지정),  ::1 (루프백)
  if (b.every((x) => x === 0)) return true;
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true;
  if ((b[0] & 0xfe) === 0xfc) return true;                 // fc00::/7 ULA
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 링크로컬(전체)
  if (b[0] === 0xff) return true;                          // ff00::/8 멀티캐스트
  return false;
}

async function lookupWithTimeout(hostname) {
  let timer;
  try {
    return await Promise.race([
      lookup(hostname, { all: true }),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("dns_timeout")), DNS_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(timer); // race 승패와 무관하게 타이머 정리(불필요한 5s 잔여 타이머 방지)
  }
}

async function assertSafeHost(hostname) {
  const host = hostname.replace(/^\[/, "").replace(/\]$/, ""); // IPv6 리터럴 대괄호 정규화
  if (net.isIP(host)) {
    if (isPrivateAddr(ipToBytes(host))) throw new Error("blocked_private_ip");
    return;
  }
  let results;
  try {
    results = await lookupWithTimeout(host);
  } catch {
    throw new Error("dns_error");
  }
  if (!results || results.length === 0) throw new Error("dns_error");
  for (const r of results) {
    if (isPrivateAddr(ipToBytes(r.address))) throw new Error("blocked_private_ip");
  }
}

// ─── HTTP (타임아웃 + 스트림 본문 캡) ─────────────────────────────────────────
// 중요: 타임아웃(controller)은 fetch가 헤더를 돌려준 뒤에도 살아 있어야 한다.
// 서버가 헤더만 보내고 본문을 안 보내거나 아주 천천히 흘리면 reader.read()가
// 무한 대기할 수 있기 때문. 그래서 release()를 본문 읽기까지 끝난 뒤 호출한다.
async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,*/*", ...(opts.headers || {}) },
    });
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
  // release()를 호출할 때까지 REQUEST_TIMEOUT_MS 마감이 본문 읽기에도 계속 적용된다.
  return { res, release: () => clearTimeout(timer) };
}

/** 응답 본문을 바이트 상한에서 끊어 읽는다(대용량/무한 스트림 방어).
 *  { body, complete } 반환:
 *   - complete=true : 끝까지 읽음 OR 바이트/문자 상한 도달로 우리가 의도적으로 끊음(정상 부분읽기).
 *   - complete=false: 타임아웃 abort·스트림 오류·Content-Length 초과로 온전히 못 읽음 → 미검증 처리용.
 *  (온전히 못 읽은 본문으로 상품이 '실존 확인'되는 새 우회를 막기 위해 구분한다.) */
async function readBodyCapped(res) {
  const cl = Number(res.headers.get("content-length"));
  if (Number.isFinite(cl) && cl > MAX_BODY_BYTES) { try { await res.body?.cancel(); } catch {} return { body: "", complete: false }; }
  if (!res.body) {
    try { const t = await res.text(); return { body: t.slice(0, MAX_BODY_CHARS), complete: true }; }
    catch { return { body: "", complete: false }; }
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = "", bytes = 0, complete = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      bytes += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (bytes >= MAX_BODY_BYTES || out.length >= MAX_BODY_CHARS) {
        try { await reader.cancel(); } catch {}
        complete = true; // 상한 도달은 "의도한" 정상 부분읽기
        break;
      }
    }
  } catch { /* abort(타임아웃)·스트림 오류 → complete=false 유지 */ }
  return { body: out.slice(0, MAX_BODY_CHARS), complete };
}

/**
 * 리다이렉트를 직접 따라가며 최종 status/URL/본문을 얻는다.
 * 매 hop마다 SSRF 검사 + robots 검사를 한다(리다이렉트로 안전경계 우회 방지).
 */
async function fetchFinal(startUrl) {
  let current = startUrl;
  const seen = new Set();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (seen.has(current)) return { ok: false, error: "redirect_loop", finalUrl: current };
    seen.add(current);

    let u;
    try { u = new URL(current); } catch { return { ok: false, error: "bad_url", finalUrl: current }; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "non_http_url", finalUrl: current };

    try { await assertSafeHost(u.hostname); }
    catch (e) { return { ok: false, error: e.message || "unsafe_host", finalUrl: current }; }

    // 이 hop의 경로가 robots에서 막혀 있으면 더 가지 않는다.
    const rules = await loadRobots(u.origin);
    if (!robotsAllows(rules, u.pathname + u.search)) {
      return { ok: false, error: "robots_disallowed", finalUrl: current };
    }

    if (hop > 0) await sleep(HOP_DELAY_MS);
    const { res, release } = await fetchWithTimeout(current, { redirect: "manual" });
    try {
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        try { await res.body?.cancel(); } catch {}
        if (!loc) return { status: res.status, finalUrl: current, body: "", redirected: hop > 0 };
        current = new URL(loc, current).toString();
        continue; // finally에서 release() 실행됨
      }
      const { body, complete } = await readBodyCapped(res);
      // 본문을 온전히 못 읽었으면(타임아웃/스트림 오류) 부분본문으로 '실존 확인'하지 않는다 → 미검증.
      if (!complete) return { ok: false, error: "body_read_incomplete", finalUrl: current };
      return { status: res.status, finalUrl: current, body, redirected: hop > 0 };
    } finally {
      release();
    }
  }
  return { ok: false, error: "too_many_redirects", finalUrl: current };
}

async function fetchFinalWithRetry(url) {
  let last;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r = await fetchFinal(url);
      // 안전 차단·robots 같은 "확정 실패"는 재시도하지 않는다(네트워크 오류만 재시도).
      if (r.ok === false && !/^(network|dns_error)/.test(r.error)) return r;
      if (r.ok !== false) return r;
      last = r;
    } catch (e) {
      last = { ok: false, error: `network:${e?.name || "error"}`, finalUrl: url };
    }
    if (attempt < MAX_RETRIES) await sleep(DELAY_MS);
  }
  return last ?? { ok: false, error: "network:error", finalUrl: url };
}

// ─── robots.txt (User-agent 그룹 + `*`/`$` 와일드카드, 최장 일치 우선) ─────────
const robotsCache = new Map(); // origin → { disallow:[], allow:[] } | null(허용)

async function loadRobots(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let rules = null;
  try {
    const u = new URL(`${origin}/robots.txt`);
    await assertSafeHost(u.hostname);
    await sleep(HOP_DELAY_MS);
    // robots는 리다이렉트를 따르지 않는다(다른 호스트로 새면 안전경계 우회).
    const { res, release } = await fetchWithTimeout(u.toString(), { redirect: "manual" });
    try {
      if (res.status === 200) {
        const { body, complete } = await readBodyCapped(res);
        // robots를 온전히 못 읽었으면 규칙을 신뢰할 수 없다 → null(표준대로 fail-open).
        rules = complete ? parseRobots(body) : null;
      } else { try { await res.body?.cancel(); } catch {} }
    } finally {
      release();
    }
  } catch { /* robots 못 읽으면 표준대로 허용(fail-open) */ }
  robotsCache.set(origin, rules);
  return rules;
}

function parseRobots(text) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!lastWasAgent || !cur) { cur = { agents: [], disallow: [], allow: [] }; groups.push(cur); }
      if (value) cur.agents.push(value.toLowerCase()); // 빈 User-agent는 무시(항상-매치 방지)
      lastWasAgent = true;
    } else if (field === "disallow" || field === "allow") {
      if (!cur) { cur = { agents: ["*"], disallow: [], allow: [] }; groups.push(cur); }
      if (value) cur[field].push(value);
      lastWasAgent = false;
    } else lastWasAgent = false;
  }
  // 우리에게 적용되는 그룹: 우리 product-token이 robots UA의 접두로 매칭되는 그룹이 있으면
  // 그것만(예: robots "abeauty" ⊂ 우리 "abeautysourcingverifier"), 없으면 `*` 그룹.
  // (과거 UA_TOKEN.includes(a)는 "beauty"·빈문자 같은 우연한 부분일치로 오매칭됐다.)
  const uaGroups = groups.filter((g) =>
    g.agents.some((a) => a && a !== "*" && UA_TOKEN.startsWith(a)));
  const applicable = uaGroups.length > 0 ? uaGroups : groups.filter((g) => g.agents.includes("*"));

  // 패턴은 여기서 1회만 컴파일한다(요청마다 RegExp 생성 → CPU 소모 방지). 총량·길이 상한.
  let budget = MAX_ROBOTS_RULES;
  const compileList = (list) => {
    const out = [];
    for (const pat of list) {
      if (budget-- <= 0) break;
      const c = compileRobotsPattern(pat);
      if (c) out.push(c);
    }
    return out;
  };
  return {
    disallow: compileList(applicable.flatMap((g) => g.disallow)),
    allow: compileList(applicable.flatMap((g) => g.allow)),
  };
}

/** robots 패턴 1개를 {pattern, specificity}로 준비. 길이 상한 + 연속 `*` 축약만.
 *  매칭은 정규식이 아니라 선형 glob matcher(robotsMatch)로 하므로 ReDoS/백트래킹이 원천적으로 없다.
 *  specificity는 와일드카드/말미 `$` 제외 실문자 수(최장 일치 우선용). */
function compileRobotsPattern(pattern) {
  if (!pattern) return null;
  const p = pattern.slice(0, MAX_ROBOTS_PATTERN).replace(/\*{2,}/g, "*"); // 연속 * 축약(불필요 반복 제거)
  const specificity = p.replace(/\*/g, "").replace(/\$$/, "").length;
  return { pattern: p, specificity };
}

/** 선형 wildcard 매칭. robots 패턴(`*`=임의 시퀀스, 말미 `$`=경로 끝까지 일치)이 path의
 *  '접두'와 맞으면 true(`$`면 path 전체와 일치해야 함). 백트래킹 포인터 방식이라 최악도 O(n·m),
 *  지수 폭발이 없다(정규식 `.*a.*a...`의 파국적 백트래킹 제거). */
function robotsMatch(rawPattern, path) {
  let pat = rawPattern, anchored = false;
  if (pat.endsWith("$")) { anchored = true; pat = pat.slice(0, -1); }
  if (!anchored) pat += "*"; // 접두 일치: 패턴 이후의 경로 나머지는 흡수
  let p = 0, s = 0, star = -1, mark = 0;
  while (s < path.length) {
    if (p < pat.length && pat[p] === path[s]) { p++; s++; }
    else if (p < pat.length && pat[p] === "*") { star = p++; mark = s; }
    else if (star !== -1) { p = star + 1; s = ++mark; }
    else return false;
  }
  while (p < pat.length && pat[p] === "*") p++;
  return p === pat.length;
}

function robotsAllows(rules, pathAndQuery) {
  if (!rules) return true;
  // 매칭되는 것 중 가장 "구체적인"(specificity 큰) disallow vs allow 비교. tie면 allow 승.
  const best = (list) =>
    list.reduce((m, c) => (robotsMatch(c.pattern, pathAndQuery) ? Math.max(m, c.specificity) : m), -1);
  const d = best(rules.disallow);
  const a = best(rules.allow);
  return d < 0 || a >= d;
}

// ─── 분석 헬퍼 ────────────────────────────────────────────────────────────────
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ");
const stripCommas = (s) => (s || "").replace(/,/g, "");

function extractTitle(body) {
  const m = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeBasic(m[1]).replace(/\s+/g, " ").trim().slice(0, 200) : "";
}
function extractH1(body) {
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? decodeBasic(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 200) : "";
}
function decodeBasic(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

function nameTokens(name) {
  return (name || "")
    .split(/[\s,·/()[\]{}|~\-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t))
    .slice(0, 8);
}

/** 상품명 핵심 토큰이 "제목/대표헤딩(title·h1)"에 하나라도 있으면 true. 본문 전체는 보지 않는다
 *  (추천상품·푸터·스크립트의 우연한 토큰으로 통과하는 것을 막기 위함). */
function nameFoundInHeading(name, title, h1) {
  const tokens = nameTokens(name);
  if (tokens.length === 0) return false; // 이름 토큰이 없으면 제목 대조 불가 → 통과시키지 않음
  const hay = norm(title + " " + h1);
  return tokens.some((t) => hay.includes(t.toLowerCase()));
}

/** price_range의 숫자군(2자리+)이 페이지에 "전부"(숫자 경계까지) 있으면 confirmed.
 *  - 빈 값: null (애초에 확인할 가격이 없음 → 원본 유지)
 *  - 값은 있는데 숫자 가격이 아님: false (미확인 → 칸 비움. "확인 안 된 가격은 비운다"와 정합)
 *  - 숫자군이 하나라도 없거나 경계 불일치: false (미확인 → 비움) */
function priceConfirmed(priceRange, body) {
  const raw = (priceRange || "").trim();
  if (raw === "") return null;
  const groups = stripCommas(raw).match(/\d{2,}/g) || [];
  if (groups.length === 0) return false; // 값은 있으나 숫자 가격 없음 → 미확인
  const hay = stripCommas(body);
  // (?<!\d)…(?!\d): 12300 이 123000·9912300 안에 우연히 걸치는 오탐 차단.
  return groups.every((g) => new RegExp(`(?<!\\d)${g}(?!\\d)`).test(hay));
}

function looksLikeHomeOrSearch(originalUrl, finalUrl) {
  let orig, fin;
  try { orig = new URL(originalUrl); fin = new URL(finalUrl); } catch { return null; }
  const finPathQuery = (fin.pathname + fin.search).toLowerCase();
  if (/[?&](q|query|keyword|keywords|search|searchword)=/.test(finPathQuery) ||
      /\/search|\/find|\/results?/.test(fin.pathname.toLowerCase())) {
    return "redirected_search";
  }
  const finIsRoot = fin.pathname === "/" || fin.pathname === "";
  const origHadPath = orig.pathname && orig.pathname !== "/" && orig.pathname !== "";
  if (finIsRoot && origHadPath) return "redirected_home";
  return null;
}

// ─── 한 행 검증 ───────────────────────────────────────────────────────────────
async function verifyRow(row, rowIndex) {
  const url = (row.product_url || "").trim();
  const name = row.korean_display_name || "";
  const base = { rowIndex, product_url: url, final_status: "", final_url: "", title: "", price_confirmed: "" };

  if (!url) return { ...base, verdict: "drop", reason: "no_url" };
  let parsed;
  try { parsed = new URL(url); } catch { return { ...base, verdict: "drop", reason: "bad_url" }; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ...base, verdict: "drop", reason: "non_http_url" };
  }

  const res = await fetchFinalWithRetry(url);
  if (res.ok === false) {
    // 안전 차단·robots·네트워크 실패는 "미검증(skip)" — 통과 출력에서 제외되고 리포트에만 남는다.
    return { ...base, verdict: "skip", reason: res.error, final_url: res.finalUrl || "" };
  }

  const finalStatus = res.status;
  const finalUrl = res.finalUrl;
  const body = res.body || "";
  const title = extractTitle(body);
  const h1 = extractH1(body);
  base.final_status = String(finalStatus);
  base.final_url = finalUrl;
  base.title = title;

  if (finalStatus !== 200) return { ...base, verdict: "drop", reason: `http_${finalStatus}` };

  const nav = looksLikeHomeOrSearch(url, finalUrl);
  if (nav) return { ...base, verdict: "drop", reason: nav };

  const hay = norm(title + " " + h1 + " " + body.slice(0, 20000));
  if (UNAVAILABLE_PHRASES.some((p) => hay.includes(p.toLowerCase()))) {
    return { ...base, verdict: "drop", reason: "page_unavailable" };
  }
  if (!nameFoundInHeading(name, title, h1)) {
    return { ...base, verdict: "drop", reason: "title_name_mismatch" };
  }

  const priceOk = priceConfirmed(row.price_range, body);
  base.price_confirmed = priceOk === null ? "no_price" : priceOk ? "y" : "n";
  const priceBlanked = priceOk === false; // 가격 있는데 확인 안 됨 → 통과시키되 칸은 비운다.
  return { ...base, verdict: "pass", reason: "ok", priceBlanked };
}

// ─── 파일 하나 처리 ───────────────────────────────────────────────────────────
async function processFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  const { headers, rows, delimiter } = parseTable(raw);
  // 입력 확장자를 stem에 남겨 sample.tsv 와 sample.csv 의 출력이 겹치지 않게 한다.
  // (같은 basename 다른 확장자가 조용히 서로를 덮어쓰는 것 방지)
  const inExt = (path.extname(filePath).slice(1).toLowerCase()) || "tsv";
  const baseName = path.basename(filePath).replace(/\.(tsv|csv)$/i, "") + "." + inExt;

  if (headers.length === 0 || rows.length === 0) {
    console.log(`  ⚠ ${filePath}: 데이터 행이 없습니다. 건너뜁니다.`);
    return;
  }
  if (!headers.includes("product_url")) {
    console.log(`  ⚠ ${filePath}: product_url 헤더가 없어 검증할 수 없습니다. 건너뜁니다.`);
    return;
  }

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const r = await verifyRow(rows[i], i + 1);
    const mark = r.verdict === "pass" ? "✓" : r.verdict === "drop" ? "✗" : "•";
    console.log(`    ${mark} [${i + 1}/${rows.length}] ${r.verdict.toUpperCase()} (${r.reason})  ${r.product_url}`);
    results.push({ row: rows[i], result: r });
    if (i < rows.length - 1) await sleep(DELAY_MS); // 순차 + 딜레이
  }

  const passHeaders = headers.slice();
  const passRows = results
    .filter((x) => x.result.verdict === "pass")
    .map((x) => {
      const out = { ...x.row };
      if (x.result.priceBlanked && "price_range" in out) out.price_range = ""; // 미확인 가격 비움
      return out;
    });

  const reportHeaders = ["rowIndex", "verdict", "reason", "final_status", "final_url", "title", "price_confirmed", "product_url"];
  const reportRows = results.map((x) => ({
    rowIndex: String(x.result.rowIndex),
    verdict: x.result.verdict,
    reason: x.result.reason,
    final_status: x.result.final_status,
    final_url: x.result.final_url,
    title: x.result.title,
    price_confirmed: x.result.price_confirmed,
    product_url: x.result.product_url,
  }));

  await mkdir(OUT_DIR, { recursive: true });
  const verifiedPath = path.join(OUT_DIR, `${baseName}.verified.tsv`);
  const reportPath = path.join(OUT_DIR, `${baseName}.report.tsv`);
  await writeFile(verifiedPath, serializeTable(passHeaders, passRows, delimiter), "utf8");
  await writeFile(reportPath, serializeTable(reportHeaders, reportRows, "\t"), "utf8");

  const pass = passRows.length;
  const drop = results.filter((x) => x.result.verdict === "drop").length;
  const skip = results.filter((x) => x.result.verdict === "skip").length;
  console.log(`  → 통과 ${pass} / 탈락 ${drop} / 미검증 ${skip}`);
  console.log(`    통과분:  ${verifiedPath}`);
  console.log(`    리포트:  ${reportPath}`);
}

// ─── 엔트리 ───────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  let files = [];
  if (arg) {
    if (!existsSync(arg)) { console.error(`파일 없음: ${arg}`); process.exit(1); }
    files = [arg];
  } else {
    if (!existsSync(INBOX_DIR)) {
      console.log(`${INBOX_DIR} 폴더가 없습니다. 인세인서치 결과 TSV를 여기에 두고 다시 실행하세요.`);
      return;
    }
    const entries = await readdir(INBOX_DIR);
    files = entries.filter((f) => /\.(tsv|csv)$/i.test(f)).map((f) => path.join(INBOX_DIR, f));
  }

  if (files.length === 0) {
    console.log(`검증할 TSV가 없습니다 (${INBOX_DIR}/*.tsv).`);
    return;
  }

  console.log(`실존 검증 시작 — 파일 ${files.length}개 (요청 간격 ${DELAY_MS}ms, 타임아웃 ${REQUEST_TIMEOUT_MS}ms)`);
  console.log(`User-Agent: ${USER_AGENT}\n`);
  for (const f of files) {
    console.log(`■ ${f}`);
    await processFile(f);
    console.log("");
  }
  console.log("완료. 통과분(.verified.tsv)만 /admin/sourcing에 붙여넣으세요. DB 저장은 사람이 직접.");
}

// CLI로 직접 실행할 때만 동작. import(테스트)하면 순수 함수만 노출된다.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => { console.error("치명적 오류:", e); process.exit(1); });
}

export { ipToBytes, isPrivateAddr, priceConfirmed, parseRobots, robotsAllows, nameFoundInHeading };
