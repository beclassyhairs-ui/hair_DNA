// ============================================================================
// GET /api/admin/funnel?range=today|7d|30d — 퍼널 집계
//
// 목적: "조회수 1만당 구매 N건" 계수를 관리자 화면에서 바로 읽는 것.
// 5단계 퍼널(landing_view → diagnosis_start → diagnosis_complete →
// product_clicked → purchase_click)의 고유 유저 수·단계 전환율과,
// utm_source / utm_campaign별 분해를 서버에서 계산해 "집계 결과만" 내려준다.
//
// ⚠️ 원본 이벤트 행은 절대 응답에 넣지 않는다 — 집계는 관리자 게이트 안쪽에서만
//    수행하고, 개별 유저 식별자(anonymous_id 등)는 서버 밖으로 나가지 않는다.
// 보안: middleware.ts의 /api/admin/:path* 매처로 ADMIN_SECRET 게이트 뒤에 있다.
// 집계 수식 자체는 lib/funnelAggregate.ts(순수 함수, 단위 검증 대상)에 있다.
// ============================================================================

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  stagesFrom,
  breakdownBy,
  purchasesPer10kViews,
  kstTodayStart,
  type FunnelRow,
} from "../../../../lib/funnelAggregate";

// 화면 필터와 1:1 대응하는 기간 옵션.
// (route.ts는 Next가 허용하는 export만 둬야 하므로 밖으로 내보내지 않는다)
const RANGE_DAYS = { today: 1, "7d": 7, "30d": 30 } as const;
type FunnelRange = keyof typeof RANGE_DAYS;

const PAGE_SIZE = 1000;   // Supabase 한 번에 읽을 수 있는 상한
const MAX_PAGES = 25;     // 최대 25,000행 — 넘으면 truncated로 화면에 알린다(조용히 자르지 않음)

/** 집계에 필요한 컬럼만 읽는다(답변 페이로드·내부 필드는 가져오지 않음).
 *  id는 값 자체를 쓰진 않지만 정렬 tie-breaker로 필요하다 — 아래 페이지네이션 주석 참고. */
const SELECT_COLUMNS = "id, event_name, anonymous_id, event_time, source, utm_campaign";

export async function GET(req: Request) {
  const rangeParam = new URL(req.url).searchParams.get("range") ?? "7d";
  const range: FunnelRange = rangeParam in RANGE_DAYS ? (rangeParam as FunnelRange) : "7d";

  const nowMs = Date.now();
  // today = 한국 시간 오늘 자정부터, 그 외는 지금 기준 N일 전부터(롤링)
  const since = range === "today"
    ? kstTodayStart(nowMs)
    : new Date(nowMs - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  // 조회 상한을 "시각"이 아니라 "id"로 잡는다.
  // event_time은 클라이언트가 만들어 보내는 값이라, 조회 중 도착한 이벤트가 과거 시각을
  // 달고 상한 안으로 들어올 수 있다 — 시각 상한으로는 집합이 고정되지 않는다.
  // id는 서버(DB)가 증가 순으로 발급하므로, 조회 시작 시점의 최대 id를 상한으로 박으면
  // 그 뒤에 들어온 행은 event_time과 무관하게 전부 제외된다. (Codex 검수 지적)
  // ⚠️ 완전한 트랜잭션 스냅샷은 아니다 — id는 커밋이 아니라 삽입 시점에 발급되므로,
  //    조회 시작 전에 id를 받았지만 아직 커밋되지 않은 행이 이후 페이지에 나타날 수 있다.
  //    그 시간 창의 길이는 보장되지 않는다(오래 열린 트랜잭션이면 길어질 수 있음).
  //    대시보드 용도로는 감수하고, 정확한 스냅샷이 필요해지면 집계를 DB 함수(RPC) 한 번의
  //    트랜잭션 안으로 옮겨야 한다.
  const { data: maxRow, error: maxError } = await supabaseAdmin
    .from("events")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (maxError) {
    console.error("[api/admin/funnel] 상한 id 조회 실패:", maxError.message);
    return NextResponse.json({ ok: false, error: maxError.message }, { status: 500 });
  }
  // id 컬럼은 PostgreSQL bigint라 JS number로 안전하지 않은 값이 될 수 있다(현 규모에선
  // 불가능하지만, 넘어간 걸 모른 채 틀린 상한으로 집계하는 것보다 명시적으로 실패하는 게 낫다).
  const rawMaxId = (maxRow?.[0] as { id: number } | undefined)?.id ?? null;
  if (rawMaxId !== null && !Number.isSafeInteger(rawMaxId)) {
    console.error("[api/admin/funnel] event id가 안전한 정수 범위를 벗어남:", rawMaxId);
    return NextResponse.json(
      { ok: false, error: "이벤트 id가 처리 가능한 범위를 넘었습니다. 집계 방식 전환이 필요합니다." },
      { status: 500 },
    );
  }
  const maxId: number | null = rawMaxId;

  const rows: FunnelRow[] = [];
  let truncated = false;

  // ⚠️ offset(.range) 기반 페이지네이션은 쓰지 않는다.
  //    event_time은 **클라이언트가 만들어 보내는 값**이라(lib/eventTracking.ts), 조회를
  //    시작한 뒤 도착한 이벤트도 과거 시각을 달고 상한 안으로 들어올 수 있다. 그러면 앞
  //    페이지에 행이 끼어들어 뒤 페이지의 offset이 밀리고, 행이 중복되거나 통째로 빠진다.
  //    → (event_time, id) 커서 기반 keyset 페이지네이션으로 앞 페이지 변화와 무관하게
  //      "직전 페이지 마지막 행 다음"부터 읽는다. (Codex 검수 지적)
  let cursor: { eventTime: string; id: number } | null = null;

  const pageQuery = (limit: number) => {
    let q = supabaseAdmin
      .from("events")
      .select(SELECT_COLUMNS)
      .gte("event_time", sinceIso)
      .lte("id", maxId as number);

    if (cursor) {
      // event_time < 커서  OR  (event_time = 커서 AND id < 커서id)
      // 값에 +/: 가 들어가므로 PostgREST 규칙대로 큰따옴표로 감싼다.
      q = q.or(
        `event_time.lt."${cursor.eventTime}",` +
        `and(event_time.eq."${cursor.eventTime}",id.lt.${cursor.id})`,
      );
    }

    return q
      .order("event_time", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
  };

  // 이벤트가 한 건도 없으면(신규 프로젝트/테이블 초기화) 상한이 없으므로 조회를 건너뛴다.
  for (let page = 0; maxId !== null && page < MAX_PAGES; page++) {
    const { data, error } = await pageQuery(PAGE_SIZE);

    if (error) {
      console.error("[api/admin/funnel] 조회 실패:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const batch = (data ?? []) as unknown as FunnelRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;

    const last = batch[batch.length - 1];
    if (last.id === undefined) {
      // id 없이는 커서를 못 만든다 — 조용히 잘린 것처럼 보이지 않게 명시적으로 알린다.
      console.error("[api/admin/funnel] 커서 생성 실패: id 누락");
      truncated = true;
      break;
    }
    cursor = { eventTime: last.event_time, id: last.id };

    if (page === MAX_PAGES - 1) {
      // 마지막 페이지가 꽉 찼다고 바로 "잘렸다"고 하면 정확히 상한과 같을 때 오탐이다.
      // 커서 다음 1건이 실제로 있는지 확인한다(offset 순회 없이 저렴하게).
      const { data: probe, error: probeError } = await pageQuery(1);
      if (probeError) {
        // probe 실패를 무시하면 truncated=false인 잘못된 "성공" 응답이 나간다.
        console.error("[api/admin/funnel] 잔여 행 확인 실패:", probeError.message);
        return NextResponse.json({ ok: false, error: probeError.message }, { status: 500 });
      }
      truncated = (probe?.length ?? 0) > 0;
    }
  }

  const stages = stagesFrom(rows);

  return NextResponse.json(
    {
      ok: true,
      range,
      since: sinceIso,
      /** 조회 시각(표시용). 실제 집계 상한은 아래 asOfEventId다. */
      asOf: new Date(nowMs).toISOString(),
      /** 조회 시작 시 확인한 이벤트 id 상한. 실제 집계 포함 여부는 기간 조건과 truncated 상태를 따른다. */
      asOfEventId: maxId,
      eventCount: rows.length,
      truncated,
      stages,
      purchasesPer10kViews: purchasesPer10kViews(stages),
      bySource:   breakdownBy(rows, (r) => r.source),
      byCampaign: breakdownBy(rows, (r) => r.utm_campaign),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
