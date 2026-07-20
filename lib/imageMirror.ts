import "server-only";

// ============================================================================
// 어뷰티 — 공급사 이미지 자체 스토리지 복사(미러링) 공용 로직
//
// 문제: products.image_url이 공급사(도매꾹 등) 이미지를 핫링크하고 있어, 공급사가
//       이미지를 내리거나 경로를 바꾸면 우리 상품 카드가 통째로 깨진다.
// 해결: 관리자 게이트 안쪽에서 서버가 해당 이미지를 직접 fetch → Vercel Blob에
//       업로드 → 자체 URL을 반환한다. 이후 상품에는 자체 URL만 저장한다.
//
// ⚠️ 이 모듈은 "서버가 임의 URL을 fetch한다"는 전형적인 SSRF 표면이다. 다음 방어를
//    전부 통과해야만 요청이 나간다:
//      1) https 스킴만 허용 (http/file/gopher/data 등 차단)
//      2) 호스트 allowlist — 등록된 공급사·CDN 도메인만
//      3) 연결 시점 DNS 검증 — 사설/루프백/링크로컬/메타데이터 IP면 연결 자체를 거부
//      4) 리다이렉트 미추종 — allowlist 도메인이 내부 주소로 302를 쏘는 우회 차단
//      5) Content-Type allowlist + 매직바이트 검증 + 스트리밍 용량 상한
//
// 📌 (3)은 node:https의 `lookup` 훅으로 구현한다. 전역 fetch()를 쓰면 "미리 조회한
//    IP"와 "실제 연결에 쓰이는 IP"가 분리돼 DNS 리바인딩 창이 생기지만, 커넥션이
//    실제로 사용하는 lookup 자체를 가로채면 검증한 주소로만 연결이 성립한다.
//    (Codex 검수 지적 반영 — 사전 조회 방식에서 교체)
// ============================================================================

import https from "node:https";
import { lookup as dnsLookup, type LookupAddress, type LookupOneOptions } from "node:dns";
import type { LookupFunction } from "node:net";

/** 미러링을 허용하는 호스트 — 정확히 일치하거나 `.` 하위 도메인이면 통과. */
const BASE_ALLOWED_HOSTS = [
  // 국내 도매/사입 플랫폼
  "domeggook.com",
  "domeme.com",
  "ownerclan.com",
  // 쇼핑몰 솔루션 / 커머스 CDN
  "cafe24img.com",
  "cdn.shopify.com",
  "shop-phinf.pstatic.net",
  "phinf.pstatic.net",
  "shopping-phinf.pstatic.net",
  // 해외 소싱
  "alicdn.com",
  // 우리 자체 스토리지(이미 미러된 이미지의 재처리 대비)
  "public.blob.vercel-storage.com",
];

/**
 * 공용 접미사(public suffix) 수준 항목 — 이걸 allowlist에 넣으면 그 아래 도메인이
 * 통째로 열리므로 거부한다.
 *
 * ⚠️ 이건 **전수 검사가 아니다**(Public Suffix List 전체가 아니라 흔한 실수 방지용
 *    부분 목록). `github.io`, `appspot.com`, `com.sg` 같은 항목은 여기 없어서 통과한다.
 *    PSL 전수 검증(psl 패키지 등)을 도입하지 않은 이유: 이 환경변수는 외부 입력이
 *    아니라 **사업주가 Vercel 대시보드에서 직접 넣는 값**이고, 잘못 넣어도 영향은
 *    "이미지 복사 허용 도메인이 넓어지는 것"까지다(내부망 접근은 연결 시점 IP 검증이
 *    별도로 막는다). 의존성을 늘리는 비용이 이득보다 크다고 판단했다.
 *    — Codex 2차 검수의 PSL 도입 권고에 대한 결론. 공급사가 늘어 관리자가 여럿이
 *      되면 재검토할 것.
 */
const PUBLIC_SUFFIX_LIKE = new Set([
  "co.kr", "or.kr", "ne.kr", "go.kr", "pe.kr", "re.kr", "com.cn", "co.jp",
  "co.uk", "org.uk", "com.au", "com.br", "com.tw", "co.in", "co.nz", "com.sg",
  "github.io", "appspot.com", "vercel.app", "netlify.app", "web.app",
]);

/**
 * 환경변수 항목이 "구체적인 호스트"인지 검증한다.
 * 통과 조건: 소문자 도메인 라벨 2개 이상 · IP 리터럴 아님 · 포트/경로/와일드카드 없음 ·
 *            TLD 단독("com")이나 공용 접미사("co.kr")가 아님.
 * ⚠️ 넓은 호스트를 열면 allowlist 방어가 통째로 무력해지므로 의도적으로 빡빡하다.
 *    (Codex 검수 지적 반영)
 */
export function isValidAllowlistHost(raw: string): boolean {
  const h = raw.trim().toLowerCase();
  if (!h || h.length > 253) return false;
  if (h.includes("*") || h.includes("/") || h.includes(":") || h.includes("@")) return false;
  if (/^\d+(\.\d+)*$/.test(h)) return false;                  // IPv4 리터럴
  if (!/^[a-z0-9.-]+$/.test(h)) return false;                 // 허용 문자만(퓨니코드는 xn--로 입력)
  const labels = h.split(".");
  if (labels.length < 2) return false;                        // TLD 단독("com") 거부
  if (labels.some((l) => l.length === 0 || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) return false;
  if (PUBLIC_SUFFIX_LIKE.has(h)) return false;
  return true;
}

/**
 * 코드 수정 없이 공급사를 추가할 수 있게 환경변수로 확장한다.
 * `IMAGE_MIRROR_EXTRA_HOSTS="img.example.com,cdn.example.co.kr"`
 * 형식이 어긋난 항목은 조용히 버리고 서버 로그에 남긴다(잘못된 값 때문에 열리지 않도록).
 */
export function getAllowedHosts(): string[] {
  const extra: string[] = [];
  for (const entry of (process.env.IMAGE_MIRROR_EXTRA_HOSTS ?? "").split(",")) {
    const h = entry.trim().toLowerCase();
    if (!h) continue;
    if (isValidAllowlistHost(h)) extra.push(h);
    else console.warn(`[imageMirror] IMAGE_MIRROR_EXTRA_HOSTS 항목 무시(형식 불가): ${h}`);
  }
  return [...BASE_ALLOWED_HOSTS, ...extra];
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — 상품 썸네일 기준 충분히 넉넉한 상한
const IDLE_TIMEOUT_MS  = 15_000; // 소켓 무활동 상한
const TOTAL_TIMEOUT_MS = 30_000; // 요청 시작~완료 전체 상한(느린 드립 공급 차단)

export class ImageMirrorError extends Error {
  /** 클라이언트에 그대로 보여줘도 되는 메시지만 담는다(내부 경로/원문 오류 노출 금지). */
  constructor(message: string, readonly status: number = 400) {
    super(message);
    this.name = "ImageMirrorError";
  }
}

// ─── SSRF 방어 ───────────────────────────────────────────────────────────────

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return getAllowedHosts().some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
}

/** "10.0.0.1" → [10,0,0,1]. 형식이 어긋나면 null. */
function parseIPv4(s: string): number[] | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

/**
 * IPv6 문자열을 16바이트로 정규화한다. 축약형(`::1`)·확장형(`0:0:…:1`)·
 * IPv4-mapped(`::ffff:10.0.0.1`, `::ffff:a00:1`)를 모두 같은 바이트열로 만든다.
 * ⚠️ 문자열 패턴 매칭만으로는 이 표기 변형들이 전부 우회된다(Codex 2차 검수 지적).
 */
export function parseIPv6(input: string): number[] | null {
  let s = input.toLowerCase();
  const zone = s.indexOf("%");           // 링크로컬 zone id(fe80::1%eth0) 제거
  if (zone >= 0) s = s.slice(0, zone);
  if (!s.includes(":")) return null;

  // 끝이 점표기 IPv4면(::ffff:10.0.0.1) 두 개의 hextet으로 바꿔치기
  const lastColon = s.lastIndexOf(":");
  const tailText = s.slice(lastColon + 1);
  if (tailText.includes(".")) {
    const v4 = parseIPv4(tailText);
    if (!v4) return null;
    const h1 = ((v4[0] << 8) | v4[1]).toString(16);
    const h2 = ((v4[2] << 8) | v4[3]).toString(16);
    s = `${s.slice(0, lastColon + 1)}${h1}:${h2}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : null;

  let groups: string[];
  if (tail === null) {
    groups = head;
  } else {
    // `::`는 "1개 이상"의 0 그룹을 축약한 표기다 — gap이 0 이하면 문법 위반이므로
    // 파싱 실패로 본다(fail-closed). 예: "1:2:3:4:5:6:7:8::" (Codex 3차 검수 지적)
    const gap = 8 - head.length - tail.length;
    if (gap <= 0) return null;
    groups = [...head, ...Array(gap).fill("0"), ...tail];
  }
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  return bytes;
}

/** IPv4 옥텟이 사설/루프백/링크로컬/메타데이터 대역인지. */
function isPrivateIPv4(o: number[]): boolean {
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127) return true;        // 미지정 / 사설 / 루프백
  if (a === 172 && b >= 16 && b <= 31) return true;         // 172.16.0.0/12
  if (a === 192 && b === 168) return true;                  // 192.168.0.0/16
  if (a === 192 && b === 0) return true;                    // 192.0.0.0/24 (IETF 프로토콜 할당)
  if (a === 169 && b === 254) return true;                  // 링크로컬 + 클라우드 메타데이터(169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true;        // 100.64.0.0/10 CGNAT
  if (a >= 224) return true;                                // 멀티캐스트 / 예약
  return false;
}

/**
 * 사설/루프백/링크로컬/메타데이터 대역이면 true — 연결을 차단해야 하는 주소.
 * 판단 불가(파싱 실패)는 안전하게 true(차단)로 본다.
 */
export function isPrivateAddress(ip: string): boolean {
  const addr = ip.trim().toLowerCase();

  const v4 = parseIPv4(addr);
  if (v4) return isPrivateIPv4(v4);

  const b = parseIPv6(addr);
  if (!b) return true; // IPv4도 IPv6도 아님 → 차단

  const allZero = b.every((x) => x === 0);
  if (allZero) return true;                                          // :: 미지정
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true; // ::1 루프백

  // IPv4-mapped(::ffff:a.b.c.d) / IPv4-compatible(::a.b.c.d) / NAT64(64:ff9b::/96)
  // — 전부 실제로는 IPv4로 연결되므로 내장된 IPv4 주소로 판정한다.
  const first10Zero = b.slice(0, 10).every((x) => x === 0);
  if (first10Zero && b[10] === 0xff && b[11] === 0xff) return isPrivateIPv4(b.slice(12));
  if (first10Zero && b[10] === 0 && b[11] === 0) return true;         // ::a.b.c.d (폐기된 표기) → 차단
  // NAT64는 64:ff9b::/96 — 앞 4바이트만 보면 사실상 /32라 정상 공인 IPv6를 과잉 차단한다.
  const isWellKnownNat64 =
    b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b &&
    b.slice(4, 12).every((x) => x === 0);
  if (isWellKnownNat64) return isPrivateIPv4(b.slice(12));

  if ((b[0] & 0xfe) === 0xfc) return true;                           // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true;          // fe80::/10 link-local
  if (b[0] === 0xff) return true;                                    // ff00::/8 멀티캐스트
  return false;
}

/** URL을 검증하고 통과하면 파싱된 URL을 반환한다. 실패 시 ImageMirrorError.
 *  ⚠️ IP 검증은 여기서 하지 않는다 — 연결 시점(fetchImage의 lookup 훅)에 강제한다. */
export function assertSafeImageUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImageMirrorError("올바른 URL이 아닙니다.");
  }

  if (url.protocol !== "https:") {
    throw new ImageMirrorError("https:// 이미지 주소만 복사할 수 있습니다.");
  }
  if (url.username || url.password) {
    throw new ImageMirrorError("인증 정보가 포함된 URL은 사용할 수 없습니다.");
  }
  if (!hostAllowed(url.hostname)) {
    throw new ImageMirrorError(
      `허용되지 않은 도메인입니다: ${url.hostname} — 공급사 도메인을 허용 목록에 먼저 추가해야 합니다.`,
    );
  }

  return url;
}

// ─── 다운로드 + 검증 ─────────────────────────────────────────────────────────

/** 매직바이트로 실제 이미지 포맷을 판별한다(Content-Type이 거짓말할 수 있으므로). */
export function sniffImageType(buf: Uint8Array): string | null {
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b);

  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  // RIFF....WEBP
  if (startsWith(0x52, 0x49, 0x46, 0x46) && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return "image/webp";
  }
  // ISO-BMFF: ....ftypavif
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

export interface MirroredImage {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

/**
 * node:https가 커넥션을 맺을 때 쓰는 lookup 훅. 여기서 거부하면 연결 자체가 성립하지
 * 않으므로, "검증한 주소 ≠ 연결한 주소"(DNS 리바인딩)가 원천적으로 불가능하다.
 */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  // net.LookupFunction의 콜백은 all 여부에 따라 string | LookupAddress[] 두 형태를
  // 모두 받는다 — dns.lookup의 결과를 그대로 통과시키되 주소만 검사한다.
  dnsLookup(hostname, options as LookupOneOptions, (err, address, family) => {
    if (err) return callback(err, "", 0);

    const addresses: string[] = Array.isArray(address)
      ? (address as unknown as LookupAddress[]).map((a) => a.address)
      : [String(address)];

    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
      const blocked: NodeJS.ErrnoException = new Error("BLOCKED_PRIVATE_ADDRESS");
      blocked.code = "BLOCKED_PRIVATE_ADDRESS";
      return callback(blocked, "", 0);
    }

    (callback as (e: NodeJS.ErrnoException | null, a: unknown, f?: number) => void)(null, address, family);
  });
};

/**
 * 검증된 URL에서 이미지를 내려받아 타입·용량을 검증한 결과를 반환한다.
 *
 * 전역 fetch() 대신 node:https를 쓰는 이유 두 가지:
 *   1) 커넥션이 실제 사용하는 lookup을 가로채 사설 IP 연결을 차단하기 위해
 *   2) 응답을 스트리밍으로 읽으며 상한 초과 즉시 소켓을 끊기 위해 — arrayBuffer()는
 *      Content-Length가 없거나 거짓이면 무제한으로 메모리에 적재된다(Codex 지적)
 * node:https는 리다이렉트를 자동 추종하지 않으므로 3xx는 직접 거부한다.
 */
export function fetchImage(url: URL): Promise<MirroredImage> {
  return new Promise<MirroredImage>((resolve, reject) => {
    let settled = false;

    // req.setTimeout()은 "무활동" 타임아웃이라 서버가 조금씩 계속 흘려보내면 영원히
    // 끝나지 않는다 — 전체 작업 시간 상한을 따로 건다. (Codex 2차 검수 지적)
    const deadline = setTimeout(() => {
      req.destroy();
      fail(new ImageMirrorError("이미지를 가져오지 못했습니다(시간 초과).", 502));
    }, TOTAL_TIMEOUT_MS);

    const fail = (err: ImageMirrorError) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      reject(err);
    };
    const succeed = (img: MirroredImage) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve(img);
    };

    const req = https.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        headers: { Accept: "image/*", "User-Agent": "abeauty-image-mirror/1.0" },
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400) {
          res.destroy();
          return fail(new ImageMirrorError("이미지 주소가 리다이렉트됩니다. 최종 이미지 주소를 직접 넣어주세요.", 502));
        }
        if (status < 200 || status >= 300) {
          res.destroy();
          return fail(new ImageMirrorError(`공급사 서버가 이미지를 주지 않았습니다(HTTP ${status}).`, 502));
        }

        const headerType = String(res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (headerType && !ALLOWED_CONTENT_TYPES.has(headerType)) {
          res.destroy();
          return fail(new ImageMirrorError(`이미지 파일이 아닙니다(${headerType}).`));
        }

        // 헤더상 이미 상한 초과면 본문을 받지 않고 끊는다
        const declared = Number(res.headers["content-length"] ?? "");
        if (Number.isFinite(declared) && declared > MAX_BYTES) {
          res.destroy();
          return fail(new ImageMirrorError(`이미지가 너무 큽니다(${Math.round(declared / 1024 / 1024)}MB, 상한 10MB).`));
        }

        const chunks: Buffer[] = [];
        let received = 0;

        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          // Content-Length가 없거나 거짓인 응답도 상한에서 즉시 끊는다
          if (received > MAX_BYTES) {
            res.destroy();
            req.destroy();
            return fail(new ImageMirrorError("이미지가 너무 큽니다(상한 10MB)."));
          }
          chunks.push(chunk);
        });

        res.on("error", () => fail(new ImageMirrorError("이미지를 내려받는 중 연결이 끊겼습니다.", 502)));

        res.on("end", () => {
          if (settled) return;
          const buffer = Buffer.concat(chunks);
          if (buffer.byteLength === 0) return fail(new ImageMirrorError("빈 파일입니다."));

          const sniffed = sniffImageType(buffer);
          if (!sniffed) return fail(new ImageMirrorError("이미지 파일로 인식되지 않습니다(형식 확인 실패)."));

          succeed({ buffer, contentType: sniffed, ext: EXT_BY_TYPE[sniffed] });
        });
      },
    );

    // 소켓 무활동 상한(전체 상한은 위 deadline이 담당)
    req.setTimeout(IDLE_TIMEOUT_MS, () => {
      req.destroy();
      fail(new ImageMirrorError("이미지를 가져오지 못했습니다(응답 없음).", 502));
    });

    req.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "BLOCKED_PRIVATE_ADDRESS") {
        return fail(new ImageMirrorError("내부 주소를 가리키는 도메인은 사용할 수 없습니다."));
      }
      fail(new ImageMirrorError("이미지를 가져오지 못했습니다(네트워크 오류).", 502));
    });

    req.end();
  });
}
