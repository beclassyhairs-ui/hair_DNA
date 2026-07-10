// ============================================================================
// 어뷰티 — 통합 헤어 프로필(abeauty_user_profile) 재생성 공용 유틸
//
// 여러 진단 랜딩(/style, /damage-check, /bangs, /hair-quiz)이 각자
// abeauty_user_profile을 "단독으로" 덮어쓰면, 나중에 저장한 진단의 태그만 남고
// 먼저 저장했던 더 중요한 진단(/style)의 태그가 사라지는 문제가 생긴다.
//
// 그래서 원본은 항상 abeauty:diaryEntries(누적 배열)에만 쌓고, 홈 화면이 읽는
// abeauty_user_profile은 "diaryEntries 전체를 우선순위대로 다시 합산한 요약본"으로
// 매번 재생성한다. 어떤 랜딩도 profile을 직접 최종 저장하지 않는다.
//
// 우선순위: /style(1) > /damage-check(2) > /bangs(3) > /hair-quiz(4)
// ============================================================================

const DIARY_KEY   = "abeauty:diaryEntries";
const PROFILE_KEY = "abeauty_user_profile";

export type DiagnosisKind = "style" | "damage" | "bangs" | "hairquiz";

const PRIORITY_ORDER: DiagnosisKind[] = ["style", "damage", "bangs", "hairquiz"];

const KIND_LABEL: Record<DiagnosisKind, string> = {
  style:    "AI 헤어 분석",
  damage:   "손상도 자가진단",
  bangs:    "인생 앞머리 찾기",
  hairquiz: "헤어 성향 진단",
};

// 각 진단 결과지가 diaryEntries에 실제로 저장하는 필드 중, 이 유틸이 읽는 것만
// 최소한으로 선언한다. 그 외 도메인별 필드(answers, resultImages 등)는
// /my-diary가 별도로 읽으므로 여기서는 unknown 인덱스로 남겨둔다.
export interface DiaryEntryLike {
  id?: string;
  kind?: string;
  savedAt?: number;
  createdAt?: string;
  hairTags?: string[];
  diagnosisSummary?: string;
  headline?: string;
  styleName?: string;
  [key: string]: unknown;
}

export interface BeautyUserProfile {
  name: string;
  hairTags: string[];
  lastDiagnosis: string;
  lastDiagnosisDate: string;
  mainConcern: string;
  latestResultSummary: string;
}

const DEFAULT_NAME = "고객";
const MAX_TAGS = 10;

// kind 필드가 없는 엔트리는 기존 /style 저장 방식(kind 미부여)과 같다 — /my-diary의
// isDamageEntry/isBangsEntry 판별 규칙("그 외 = 기본 DiaryCard")과 동일한 기준.
function classifyKind(entry: DiaryEntryLike): DiagnosisKind {
  if (entry.kind === "damage")   return "damage";
  if (entry.kind === "bangs")    return "bangs";
  if (entry.kind === "hairquiz") return "hairquiz";
  return "style";
}

function entrySortTime(entry: DiaryEntryLike): number {
  if (typeof entry.savedAt === "number") return entry.savedAt;
  if (typeof entry.createdAt === "string") {
    const t = Date.parse(entry.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function entrySummary(entry: DiaryEntryLike, kind: DiagnosisKind): string {
  if (typeof entry.diagnosisSummary === "string" && entry.diagnosisSummary) return entry.diagnosisSummary;
  if (typeof entry.headline === "string" && entry.headline) return entry.headline;
  if (typeof entry.styleName === "string" && entry.styleName) return entry.styleName;
  return KIND_LABEL[kind];
}

/**
 * diaryEntries + 기존 profile(이름 보존용)을 받아 통합 profile을 "순수 계산"한다.
 * localStorage를 직접 만지지 않으므로 테스트하기 쉽다.
 */
export function buildBeautyUserProfileFromDiary(
  entries: DiaryEntryLike[],
  previousProfile?: Partial<BeautyUserProfile> | null,
): BeautyUserProfile {
  const byKind: Record<DiagnosisKind, DiaryEntryLike[]> = { style: [], damage: [], bangs: [], hairquiz: [] };
  for (const entry of entries) {
    byKind[classifyKind(entry)].push(entry);
  }

  // hairTags — 우선순위 순서(style→damage→bangs→hairquiz)로 이어붙이고 중복 제거.
  // 각 진단의 "몇 번째 저장인지"는 안 따진다 — 같은 kind 안에서는 최신이든 과거든
  // 전부 합산 대상(태그는 쌓일수록 풍부해지는 게 맞다).
  const rawTags: string[] = [];
  for (const kind of PRIORITY_ORDER) {
    for (const entry of byKind[kind]) {
      if (!Array.isArray(entry.hairTags)) continue;
      for (const tag of entry.hairTags) {
        if (typeof tag === "string" && tag.trim()) rawTags.push(tag.trim());
      }
    }
  }
  const dedupedTags: string[] = [];
  for (const tag of rawTags) {
    if (!dedupedTags.includes(tag)) dedupedTags.push(tag);
  }
  // 새로 계산한 태그가 하나도 없으면(과거 저장 형식 등) 기존 프로필의 태그를 보존한다 —
  // "덮어써서 더 나빠지지 않기" 원칙.
  const hairTags = dedupedTags.length > 0
    ? dedupedTags.slice(0, MAX_TAGS)
    : (previousProfile?.hairTags ?? []);

  // 최신 저장 결과 = 전체 엔트리 중 시간이 가장 최근인 것 (우선순위 무관)
  let latest: DiaryEntryLike | null = null;
  let latestKind: DiagnosisKind = "style";
  let latestTime = -Infinity;
  for (const kind of PRIORITY_ORDER) {
    for (const entry of byKind[kind]) {
      const t = entrySortTime(entry);
      if (t > latestTime) { latestTime = t; latest = entry; latestKind = kind; }
    }
  }

  // mainConcern = "가장 우선순위 높은 진단"의 요약. 최신 결과가 아니라 우선순위
  // 최상단 기준으로 고정해야 /bangs를 방금 했다고 /style 메인 고민이 밀리지 않는다.
  let topPriorityEntry: DiaryEntryLike | null = null;
  let topPriorityKind: DiagnosisKind = "style";
  for (const kind of PRIORITY_ORDER) {
    if (byKind[kind].length === 0) continue;
    topPriorityEntry = byKind[kind].reduce((a, b) => (entrySortTime(b) > entrySortTime(a) ? b : a));
    topPriorityKind = kind;
    break;
  }

  const name = (previousProfile && typeof previousProfile.name === "string" && previousProfile.name)
    ? previousProfile.name
    : DEFAULT_NAME;

  return {
    name,
    hairTags,
    lastDiagnosis:       latest ? KIND_LABEL[latestKind] : (previousProfile?.lastDiagnosis ?? ""),
    lastDiagnosisDate:   latest ? "오늘" : (previousProfile?.lastDiagnosisDate ?? ""),
    mainConcern:         topPriorityEntry ? entrySummary(topPriorityEntry, topPriorityKind) : (previousProfile?.mainConcern ?? ""),
    latestResultSummary: latest ? entrySummary(latest, latestKind) : (previousProfile?.latestResultSummary ?? ""),
  };
}

// ─── localStorage I/O ─────────────────────────────────────────────────────────

export function readDiaryEntries(): DiaryEntryLike[] {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readBeautyUserProfile(): Partial<BeautyUserProfile> | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** diaryEntries 배열 맨 앞에 entry를 추가(같은 id가 있으면 교체)하고 그대로 저장한다. */
export function appendDiaryEntry(entry: DiaryEntryLike): DiaryEntryLike[] {
  const current = readDiaryEntries();
  const withoutDuplicate = entry.id ? current.filter((e) => e.id !== entry.id) : current;
  const next = [entry, ...withoutDuplicate];
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(next));
  } catch { /**/ }
  return next;
}

/**
 * diaryEntries 전체를 다시 읽어 abeauty_user_profile을 재생성하고 저장한다.
 * 반드시 appendDiaryEntry()로 새 진단을 먼저 적재한 "다음"에 호출해야 한다 —
 * 그래야 방금 저장한 결과까지 포함해서 우선순위 합산이 이루어진다.
 */
export function refreshBeautyUserProfileFromDiary(): BeautyUserProfile {
  const entries  = readDiaryEntries();
  const previous = readBeautyUserProfile();
  const profile  = buildBeautyUserProfileFromDiary(entries, previous);
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch { /**/ }
  return profile;
}
