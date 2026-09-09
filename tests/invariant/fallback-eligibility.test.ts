// ============================================================================
// tests/invariant/fallback-eligibility.test.ts
//   ⑤ 루카타코 폴백 "경과시간 자격 판정"의 회귀 방어 하네스.
//
// 왜 있나(2026-09-08 회귀): 폴백은 클라 트리거(FALLBACK_TRIGGER_MS=290s, /style/loading)와
//   서버 자격 문턱(FALLBACK_MIN_ELAPSED_MS, lib/fallbackEligibility)의 "정합"으로만 동작한다.
//   과거 트리거를 8분→4:50으로 당길 때 문턱(7분)을 함께 안 내려 정상 콜드미스 폴백이 전건
//   거부됐다(사람 눈으로 못 잡음). 이 하네스가 아래를 기계로 박제한다:
//     ① 판정식 4개 경계 (정상 콜드미스 통과 / 즉시 3종 차단)
//     ② now() 평가 시점 계약 (원본과 동일: 비종결·비성공 상태에서·created 파싱 뒤에만 호출)
//     ③ 서버 문턱·클라 트리거 회귀 (★ Phase1: 둘 다 실값 import → 양쪽 자동 감시).
//   ★ Phase1 승격(2026-09-09): 클라 트리거를 plain 모듈 hairJobConstants 로 옮겨, 예전 "수동 미러"를
//      실제 import 로 바꿨다. 이제 서버 문턱이든 클라 트리거든 한쪽이 정합을 깨면 이 하네스가
//      자동으로 잡는다(useHairTransformJob 훅도 같은 상수를 import — 하네스가 훅과 같은 값을 본다).
//
// 실행: npm run test:fallback  (TS→CJS 컴파일 후 node — 프레임워크·네트워크·DB 무설치)
// ============================================================================

import * as assert from "node:assert";
import { isFallbackElapsed, FALLBACK_MIN_ELAPSED_MS } from "../../lib/fallbackEligibility";
// ★ 클라 폴백 트리거 — 훅(useHairTransformJob)이 import 하는 바로 그 상수를 하네스도 실제로 import.
import { FALLBACK_TRIGGER_MS as CLIENT_FALLBACK_TRIGGER_MS } from "../../app/style/hairJobConstants";

const NOW = 1_000_000_000_000;           // 고정 기준시각(ms)
const nowFn = () => NOW;                  // 라우트가 넘기는 Date.now 를 흉내낸 공급 함수
const iso = (ms: number) => new Date(ms).toISOString();
const createdBefore = (elapsedMs: number) => iso(NOW - elapsedMs);

// ─── 초경량 러너 ──────────────────────────────────────────────────────────────
let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void): void {
  try { fn(); passed += 1; }
  catch (e) { failures.push(`  ✗ ${name}\n      ${(e as Error).message.replace(/\n/g, "\n      ")}`); }
}

// ============================================================================
// ① 4개 경계 박제 (판정식)
// ============================================================================

// 정상 콜드미스: 진행 중(processing)·경과 290s → 통과
test("① processing·290s 경과 → eligible (정상 콜드미스 통과)", () => {
  const ok = isFallbackElapsed(
    { status: "processing", created_at: createdBefore(290_000) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, true, "정상 콜드미스가 거부되면 폴백이 죽는다(이번 회귀의 본체)");
});

// 즉시 우회 시도: 진행 중·경과 100s(문턱 미만) → 차단
test("② processing·100s 경과 → not eligible (즉시 우회 차단)", () => {
  const ok = isFallbackElapsed(
    { status: "processing", created_at: createdBefore(100_000) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, false, "문턱 미만인데 통과하면 즉시-우회로 미화모델을 태울 수 있다");
});

// 즉시 cancel 우회: 종결(canceled)이지만 "생성→종결" 0s → 영원히 차단
test("③ canceled·(completed−created)=0s → not eligible (즉시 cancel 우회 차단)", () => {
  const created = NOW - 500_000; // 취소 자체는 오래 전이라도
  const ok = isFallbackElapsed(
    { status: "canceled", created_at: iso(created), completed_at: iso(created) }, // 생성 직후 취소
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, false, "즉시 cancel 은 completed−created≈0 이라 시간이 지나도 자격 없음이어야 한다");
});

// 진짜 콜드미스 뒤 종결: 종결이지만 "생성→종결" 290s → 통과
test("④ canceled·(completed−created)=290s → eligible", () => {
  const created = NOW - 600_000;
  const ok = isFallbackElapsed(
    { status: "canceled", created_at: iso(created), completed_at: iso(created + 290_000) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, true, "생성→종결이 문턱 이상이면 진짜 콜드미스이므로 통과해야 한다");
});

// ============================================================================
// ② now() 평가 시점 계약 (원본 verifyFallbackEligibility 와 동일해야 한다)
//    원본은 현재시각을 오직 processing 분기·created 파싱 뒤에만 구했다. 값으로 미리 받으면
//    모든 분기에서 평가돼 극단 환경(now 가 던짐)·경계 미세시점에서 동작이 갈린다.
//    → now 를 "호출되면 던지는" 함수로 넣어, 종결/성공/파싱불가 분기에서는 호출조차 안 됨을 박제.
// ============================================================================

const throwingNow = () => { throw new Error("now() 가 호출되면 안 되는 분기에서 호출됐다"); };

test("계약: succeeded 는 now() 를 호출하지 않는다", () => {
  assert.strictEqual(
    isFallbackElapsed({ status: "succeeded", created_at: createdBefore(600_000) }, throwingNow, FALLBACK_MIN_ELAPSED_MS),
    false,
  );
});
test("계약: created_at 누락은 now() 를 호출하지 않는다", () => {
  assert.strictEqual(isFallbackElapsed({ status: "processing" }, throwingNow, FALLBACK_MIN_ELAPSED_MS), false);
});
test("계약: 존재하지만 무효한 created_at(not-a-date)도 now() 를 호출하지 않는다", () => {
  // 존재하지만 무효한 문자열 — Number.isFinite 검사에서 걸러진다. now() 를 파싱/유효성 검사보다
  // 먼저 부르는 회귀가 생기면 이 케이스가 throwingNow 로 터진다(Codex 2026-09-08 제안).
  assert.strictEqual(
    isFallbackElapsed({ status: "processing", created_at: "not-a-date" }, throwingNow, FALLBACK_MIN_ELAPSED_MS),
    false,
  );
});
test("계약: failed/canceled 는 now() 를 호출하지 않는다(completed 기준)", () => {
  const created = NOW - 600_000;
  assert.strictEqual(
    isFallbackElapsed({ status: "canceled", created_at: iso(created), completed_at: iso(created + 290_000) }, throwingNow, FALLBACK_MIN_ELAPSED_MS),
    true, // completed−created 로 판정, now() 미호출
  );
});
test("계약: 비종결·비성공 상태(processing 등)는 now() 를 호출한다(호출돼 throw)", () => {
  // ★ 원본과 동일: succeeded/failed/canceled 가 아닌 모든 상태(starting·processing·미상·상태누락 포함)에서
  //   유효한 created 뒤에 now() 를 부른다. 여기선 대표로 processing 을 검증한다.
  assert.throws(
    () => isFallbackElapsed({ status: "processing", created_at: createdBefore(290_000) }, throwingNow, FALLBACK_MIN_ELAPSED_MS),
    /now\(\) 가 호출/,
    "이 분기에서 now() 가 호출되지 않으면 원본과 평가 시점이 달라진 것",
  );
});

// ============================================================================
// ③ 두 상수의 정합 — 이번 회귀가 정확히 여기였다 (서버 문턱은 실값 import → 자동 감시)
// ============================================================================

test("★ 정합: 서버 문턱 < 클라 트리거 (안 지키면 정상 폴백이 죽는다)", () => {
  assert.ok(
    FALLBACK_MIN_ELAPSED_MS < CLIENT_FALLBACK_TRIGGER_MS,
    `서버 문턱(${FALLBACK_MIN_ELAPSED_MS}ms)이 클라 트리거(${CLIENT_FALLBACK_TRIGGER_MS}ms) 이상이면 ` +
      `클라가 트리거 시점에 보낸 정상 콜드미스 폴백을 서버가 전건 거부한다(2026-09-08 회귀 재발).`,
  );
});

test("★ 정합: 클라 트리거 경과로 온 processing 폴백은 반드시 통과", () => {
  // created_at == 트리거 이전(=클라 최소 경과)만 잡아도 통과해야 정상 콜드미스가 산다.
  const ok = isFallbackElapsed(
    { status: "processing", created_at: createdBefore(CLIENT_FALLBACK_TRIGGER_MS) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, true, "클라 트리거 경과로 온 정상 콜드미스 폴백이 서버 문턱을 넘어야 한다");
});

// ============================================================================
// ④ 서버 문턱 경계(±1ms) — 문턱값이 바뀌면 이 경계가 흔들려 잡힌다.
// ============================================================================

test("경계: processing·문턱 정확히(>=) → 통과", () => {
  const ok = isFallbackElapsed(
    { status: "processing", created_at: createdBefore(FALLBACK_MIN_ELAPSED_MS) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, true, "경과 == 문턱이면 통과(>=)");
});
test("경계: processing·문턱 1ms 미만 → 차단", () => {
  const ok = isFallbackElapsed(
    { status: "processing", created_at: createdBefore(FALLBACK_MIN_ELAPSED_MS - 1) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(ok, false, "경과 < 문턱이면 차단");
});

// ============================================================================
// ⑤ 4:50 race 전제(판정③) — 4:50 직전 원본(primary)이 성공했는데 클라 status timeout 으로
//    못 받은 경우, 클라는 폴백을 요청한다. 서버는 succeeded 원본을 폴백대상으로 안 잡아
//    fallback_not_eligible 을 준다(=아래 succeeded→false). 그래서 훅은 원본 status 를 1회
//    재확인(recheckOriginalOnce)해 성공 이미지를 회수해야 한다(성공 유실 방지).
//    ※ 재확인 자체는 훅(React·fetch)이라 이 node 하네스로는 못 돌린다 — 여기선 "서버가 왜
//       거절하는지"의 순수 전제만 박는다. 통합 검증은 Phase4 dev 완주.
// ============================================================================

test("4:50 race 전제: 트리거 직전 성공한(succeeded) 원본은 폴백대상 아님 → 훅이 원본 재확인해야", () => {
  const justSucceeded = isFallbackElapsed(
    // 트리거 근처(±수초)에 성공: created 는 트리거보다 조금 전, status 는 succeeded.
    { status: "succeeded", created_at: createdBefore(CLIENT_FALLBACK_TRIGGER_MS - 3_000) },
    nowFn, FALLBACK_MIN_ELAPSED_MS,
  );
  assert.strictEqual(justSucceeded, false,
    "succeeded 원본을 폴백으로 재시도하면 안 된다(서버 거절) → 훅의 원본 재확인이 성공을 회수하는 근거");
});

// ─── 결과 출력 ────────────────────────────────────────────────────────────────
const total = passed + failures.length;
if (failures.length > 0) {
  console.error(`\n❌ fallback-eligibility FAIL — ${passed}/${total} passed\n`);
  console.error(failures.join("\n\n"));
  console.error("");
  process.exit(1);
}
console.log(`\n✅ fallback-eligibility PASS — ${passed}/${total}\n`);
