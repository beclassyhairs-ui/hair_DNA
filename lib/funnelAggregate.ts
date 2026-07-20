// ============================================================================
// 어뷰티 — 퍼널 집계 순수 함수
//
// /api/admin/funnel이 Supabase에서 읽어온 이벤트 행을 단계별 숫자로 접는다.
// DB 접근 없이 입력 → 출력만 하는 순수 함수라, 합성 데이터로 그대로 검증할 수 있다.
// (라우트 안에 두면 supabaseAdmin 초기화 때문에 단독 테스트가 불가능해 분리했다)
//
// 집계 단위는 "고유 유저(anonymous_id)"다 — 이벤트 건수가 아니다. 한 사람이 상품을
// 5번 클릭해도 상품클릭 1로 센다. 퍼널 전환율을 사람 기준으로 읽기 위한 것.
// ============================================================================

import { EVENT_NAMES } from "./eventTracking";

/** 퍼널 5단계 — 배열 순서가 곧 퍼널 순서다. */
export const FUNNEL_STAGE_DEFS = [
  { key: EVENT_NAMES.LANDING_VIEW,       label: "유입" },
  { key: EVENT_NAMES.DIAGNOSIS_START,    label: "진단 시작" },
  { key: EVENT_NAMES.DIAGNOSIS_COMPLETE, label: "진단 완료" },
  { key: EVENT_NAMES.PRODUCT_CLICKED,    label: "상품 클릭" },
  { key: EVENT_NAMES.PURCHASE_CLICK,     label: "구매 클릭" },
] as const;

/**
 * 한국 시간(KST, UTC+9 고정·서머타임 없음) 기준 오늘 자정을 UTC Date로 반환한다.
 * Date의 setHours()는 서버 로컬 시간대라, Vercel(UTC)에 배포하면 한국 사용자가 보는
 * "오늘"과 9시간 어긋난다. (Codex 검수 지적)
 */
export function kstTodayStart(nowMs: number): Date {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const kstMidnight = Math.floor((nowMs + KST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(kstMidnight - KST_OFFSET_MS);
}

/** 집계에 필요한 최소 필드만 담은 행 — 내부 필드·페이로드는 읽지 않는다. */
export interface FunnelRow {
  /** 값 자체는 집계에 쓰지 않지만, 조회 시 정렬 tie-breaker로 필요하다. */
  id?: number;
  event_name: string;
  anonymous_id: string | null;
  event_time: string;
  source: string | null;
  utm_campaign: string | null;
}

export interface StageStat {
  key: string;
  label: string;
  users: number;
  /** 직전 단계 대비 전환율(%). 첫 단계는 null. */
  stepRate: number | null;
  /** 최초 유입 대비 전환율(%). 첫 단계는 null. */
  overallRate: number | null;
}

export interface Breakdown {
  key: string;
  views: number;
  completes: number;
  productClicks: number;
  purchases: number;
  /** 조회수 1만당 구매 건수 — 사업 계수. 유입이 0이면 null. */
  purchasesPer10k: number | null;
}

/** UTM이 없는 직접/오가닉 유입도 빠뜨리지 않고 한 줄로 모으기 위한 라벨. */
export const UNSET_KEY = "(미지정)";

/** 단계별 고유 유저 수 + 전환율. */
export function stagesFrom(rows: FunnelRow[]): StageStat[] {
  const sets = FUNNEL_STAGE_DEFS.map(() => new Set<string>());

  for (const r of rows) {
    if (!r.anonymous_id) continue;
    const idx = FUNNEL_STAGE_DEFS.findIndex((s) => s.key === r.event_name);
    if (idx >= 0) sets[idx].add(r.anonymous_id);
  }

  const first = sets[0].size;
  return FUNNEL_STAGE_DEFS.map((s, i) => {
    const users = sets[i].size;
    const prev = i > 0 ? sets[i - 1].size : 0;
    return {
      key: s.key,
      label: s.label,
      users,
      stepRate:    i === 0 ? null : prev  > 0 ? (users / prev)  * 100 : 0,
      overallRate: i === 0 ? null : first > 0 ? (users / first) * 100 : 0,
    };
  });
}

/** utm_source / utm_campaign 등 임의 키로 분해한 표. 유입 많은 순 정렬. */
export function breakdownBy(rows: FunnelRow[], pick: (r: FunnelRow) => string | null): Breakdown[] {
  const groups = new Map<string, FunnelRow[]>();

  for (const r of rows) {
    const key = pick(r) ?? UNSET_KEY;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }

  const out: Breakdown[] = [];
  for (const [key, list] of Array.from(groups.entries())) {
    const stats = stagesFrom(list);
    const views = stats[0].users;
    const purchases = stats[4].users;
    out.push({
      key,
      views,
      completes: stats[2].users,
      productClicks: stats[3].users,
      purchases,
      purchasesPer10k: views > 0 ? (purchases / views) * 10000 : null,
    });
  }

  return out.sort((a, b) => b.views - a.views || b.purchases - a.purchases);
}

/** 조회수 1만당 구매 건수. 유입이 0이면 null(0으로 표기하면 "구매 없음"과 구분이 안 됨). */
export function purchasesPer10kViews(stages: StageStat[]): number | null {
  const views = stages[0]?.users ?? 0;
  const purchases = stages[4]?.users ?? 0;
  return views > 0 ? (purchases / views) * 10000 : null;
}
