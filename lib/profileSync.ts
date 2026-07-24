// ============================================================================
// B-2 서버 동기화 — 로그인한 유저의 진단/프로필을 Supabase와 양방향으로 맞춘다.
//
// 왜 양방향인가:
//   - 새 기기에서 로그인하면 로컬은 비어 있다 → 서버에서 당겨와야(pull) 내 진단이 보인다.
//   - 로그인 전에 쌓은 로컬 진단은 서버에 없다 → 올려야(push) 다음 기기에서 보인다.
//   그래서 "합치고(merge) → 로컬에 쓰고 → 합친 결과를 서버에 올린다" 순서로 처리한다.
//
// 미로그인/오류일 때는 조용히 아무것도 하지 않는다(로컬만으로 기존처럼 동작).
// 로그인이 꺼져 있어도(env 미설정) /api/auth/me가 loggedIn:false를 주므로 안전하다.
// ============================================================================

import {
  buildBeautyUserProfileFromDiary,
  clearLocalUserData,
  readBeautyUserProfile,
  readDiaryEntries,
  setTreatmentHistory,
  writeDiaryEntries,
  type DiaryEntryLike,
  type TreatmentRecord,
} from "./beautyProfile";

// 네트워크가 응답하지 않을 때 동기화가 영원히 끝나지 않는 것을 막는다
// (끝나지 않으면 호출부의 실행 잠금도 영영 안 풀린다).
const REQUEST_TIMEOUT_MS = 10_000;

function timeoutSignal(): AbortSignal | undefined {
  try {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    }
  } catch { /**/ }
  return undefined; // 미지원 환경에선 타임아웃 없이 진행(기능은 그대로 동작)
}

function entryTime(entry: DiaryEntryLike): number {
  if (typeof entry.savedAt === "number") return entry.savedAt;
  if (typeof entry.createdAt === "string") {
    const t = Date.parse(entry.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/**
 * 두 엔트리 목록을 id 기준으로 합친다. 같은 id면 더 최근에 저장된 쪽을 남긴다.
 * id가 없는 과거 엔트리는 버리지 않고 그대로 살린다(중복 위험보다 유실이 더 나쁘다).
 *
 * ⚠️ 알려진 한계(의도): id 없는 과거 엔트리는 **서버로 동기화되지 않는다**.
 *    멱등 키(client_id)가 없어 올릴 때마다 행이 불어나기 때문. 해당 기기에서는
 *    로컬에 그대로 남아 계속 보이고, 이후 새로 저장하는 진단부터 id가 붙어 동기화된다.
 */
export function mergeDiaryEntries(
  local: DiaryEntryLike[],
  server: DiaryEntryLike[],
): DiaryEntryLike[] {
  const byId = new Map<string, DiaryEntryLike>();
  const idless: DiaryEntryLike[] = [];

  for (const entry of [...server, ...local]) {
    const id = typeof entry?.id === "string" ? entry.id : "";
    if (!id) { idless.push(entry); continue; }
    const existing = byId.get(id);
    if (!existing || entryTime(entry) >= entryTime(existing)) byId.set(id, entry);
  }

  // Array.from — tsconfig target이 낮아 Map 이터레이터 스프레드가 안 된다.
  return [...Array.from(byId.values()), ...idless].sort((a, b) => entryTime(b) - entryTime(a));
}

/** 시술 이력 합치기 — (date, type) 조합으로 중복 제거. 유저 입력이라 유실 금지가 우선. */
export function mergeTreatmentHistory(
  local: TreatmentRecord[],
  server: TreatmentRecord[],
): TreatmentRecord[] {
  const seen = new Set<string>();
  const out: TreatmentRecord[] = [];
  for (const rec of [...local, ...server]) {
    if (!rec || typeof rec !== "object") continue;
    const key = `${rec.date ?? ""}|${rec.type ?? ""}|${rec.memo ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rec);
  }
  return out;
}

// 이 기기의 로컬 캐시가 "어느 계정 것인지" 기록해 둔다.
// 공용 기기에서 A 로그아웃 → B 로그인 시, A의 로컬 진단이 B 계정으로 올라가는
// 교차 계정 오염을 막는 장치다(Codex 검수 지적 반영).
const SYNCED_USER_KEY = "abeauty:syncedUserId";

function readSyncedUserId(): string | null {
  try {
    return localStorage.getItem(SYNCED_USER_KEY);
  } catch {
    return null;
  }
}

/**
 * 소유자 기록. **성공 여부를 반환한다** — 저장에 실패했는데 그대로 진행하면
 * "서버 데이터를 내려받았는데 소유자는 비어 있는" 상태가 되고, 다음 계정 로그인 때
 * 그 데이터가 남의 계정으로 올라간다. 저장 후 다시 읽어 확인까지 한다.
 */
function writeSyncedUserId(userId: string): boolean {
  try {
    localStorage.setItem(SYNCED_USER_KEY, userId);
    return localStorage.getItem(SYNCED_USER_KEY) === userId;
  } catch {
    return false;
  }
}

/** 로그인 상태 확인 — httpOnly 쿠키라 서버에 물어봐야 한다. userId까지 받아온다. */
async function getLoggedInUserId(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store", signal: timeoutSignal() });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.loggedIn === true && typeof json.userId === "string" ? json.userId : null;
  } catch {
    return null;
  }
}

/**
 * 서버 push — 서버 배치 상한을 넘지 않도록 잘라서 보낸다. 실패하면 false.
 * expectedUserId: 서버가 실제로 저장한 계정이 내가 의도한 계정인지 검증한다
 * (동기화 도중 로그아웃/계정 전환으로 쿠키가 갈리는 경우를 잡는다).
 */
async function pushToServer(
  profile: unknown,
  entries: DiaryEntryLike[],
  expectedUserId: string,
): Promise<boolean> {
  // 프로필은 첫 요청에 함께 보낸다 — 엔트리가 많아도 프로필 저장이 막히지 않게.
  const chunks: DiaryEntryLike[][] = [];
  for (let i = 0; i < entries.length; i += PUSH_CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + PUSH_CHUNK_SIZE));
  }
  if (chunks.length === 0) chunks.push([]);

  for (let i = 0; i < chunks.length; i++) {
    try {
      const res = await fetch("/api/me/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // expectedUserId: 서버가 DB에 쓰기 전에 계정 일치를 검사하도록 하는 assertion.
        // 응답을 받고 나서 확인하면 이미 저장이 끝난 뒤라 늦다.
        body: JSON.stringify({
          entries: chunks[i],
          expectedUserId,
          ...(i === 0 ? { profile } : {}),
        }),
        signal: timeoutSignal(),
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json?.ok !== true) return false;
      // 저장된 계정이 내가 의도한 계정이 아니면 즉시 중단(도중 계정 전환).
      if (json?.userId !== expectedUserId) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const PUSH_CHUNK_SIZE = 100; // 서버 상한(200)보다 여유 있게

/**
 * 서버와 한 번 동기화한다. 로그인 상태가 아니면 false를 돌려주고 아무것도 하지 않는다.
 * 성공하면 localStorage가 "로컬 ∪ 서버" 결과로 갱신되고, 같은 결과가 서버에도 올라간다.
 */
export async function syncWithServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const userId = await getLoggedInUserId();
  if (!userId) return false;

  // 🔒 계정 전환 보호: 이 기기의 로컬 캐시가 "다른 계정" 것이면, 그 데이터를 새 계정에
  // 합치지 않고 먼저 비운다. (기록이 없으면 = 로그인 전 익명 데이터이므로 편입 허용)
  // ── 소유권 확정 단계 ──
  // 핵심 불변식: **서버 데이터를 로컬로 내려받기 전에, 로컬 캐시의 소유자가 반드시
  // 현재 로그인 계정으로 확정돼 있어야 한다.** 이 순서를 지키지 않으면
  // "A 데이터를 내려받았는데 소유자 기록은 실패로 비어 있는" 상태가 생기고,
  // 그 상태에서 B로 전환하면 A의 진단이 B 계정으로 섞여 올라간다.
  const cachedOwner = readSyncedUserId();

  if (cachedOwner && cachedOwner !== userId) {
    // 다른 계정의 캐시 → 비우고 즉시 새 소유자로 확정(지울 데이터가 없으니 손실 없음).
    // 삭제가 확인되지 않으면 소유자를 바꾸지 않고 중단한다 — 이전 사용자의 데이터가
    // 남은 채 새 계정 소유로 표시되는 상태를 만들지 않기 위해서다.
    if (!clearLocalUserData()) return false;
    if (!writeSyncedUserId(userId)) return false; // 기록 실패 시 진행 금지
  } else if (!cachedOwner) {
    // 로그인 전에 쌓인 익명 데이터를 이 계정으로 편입하는 경우.
    // 먼저 "올리기"만 해서 성공을 확인한 뒤 소유자를 기록한다.
    // (내려받기를 먼저 하면 위 불변식이 깨진다. 올리기 실패 시엔 아무것도 내려받지
    //  않고 그대로 종료 → 익명 데이터는 로컬에 온전히 남아 다음 실행에서 재시도된다.)
    const claimed = await pushToServer(readBeautyUserProfile(), readDiaryEntries(), userId);
    if (!claimed) return false;
    // 소유자 기록이 실제로 저장됐을 때만 아래 pull로 넘어간다.
    if (!writeSyncedUserId(userId)) return false;
  }

  try {
    // 1) 서버 데이터 당겨오기
    const res = await fetch("/api/me/data", { cache: "no-store", signal: timeoutSignal() });
    if (!res.ok) return false;
    const remote = await res.json();
    if (remote?.ok !== true) return false;
    // 내려받은 데이터가 내가 의도한 계정의 것인지 확인(도중 계정 전환 방어).
    // 다르면 로컬에 아무것도 반영하지 않고 종료한다.
    if (remote?.userId !== userId) return false;

    const serverEntries: DiaryEntryLike[] = Array.isArray(remote.entries) ? remote.entries : [];
    const serverProfile = remote.profile && typeof remote.profile === "object" ? remote.profile : null;

    // 2) 로컬과 병합 후 로컬에 반영
    const merged = mergeDiaryEntries(readDiaryEntries(), serverEntries);
    writeDiaryEntries(merged);

    // 3) 시술 이력(진단에서 파생되지 않는 유저 입력)은 따로 합쳐서 먼저 심어둔다 —
    //    아래 재합산이 previousProfile에서 이 값을 그대로 이어받는다.
    const localTreatment = readBeautyUserProfile()?.treatmentHistory ?? [];
    const serverTreatment = Array.isArray(serverProfile?.treatmentHistory)
      ? (serverProfile!.treatmentHistory as TreatmentRecord[])
      : [];
    setTreatmentHistory(mergeTreatmentHistory(localTreatment, serverTreatment));

    // 4) 병합된 엔트리로 프로필 재합산 (기존 순수 로직 재사용)
    const previous = readBeautyUserProfile();
    const profile = buildBeautyUserProfileFromDiary(merged, previous);
    try {
      localStorage.setItem("abeauty_user_profile", JSON.stringify(profile));
    } catch { /**/ }

    // 5) 합친 결과를 서버에 올린다(멱등 upsert). 실패를 성공으로 보고하지 않는다.
    //    실패해도 로컬은 병합된 상태로 남으므로 다음 실행에서 그대로 재시도된다(중복 없음).
    //    (소유자는 위 확정 단계에서 이미 기록됐다.)
    return await pushToServer(profile, merged, userId);
  } catch {
    return false;
  }
}
