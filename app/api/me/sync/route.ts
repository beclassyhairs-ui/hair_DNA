// ============================================================================
// POST /api/me/sync — 로컬(localStorage) 프로필·진단 이력을 서버에 올린다(push)
//
// B-2 데이터 통합: 지금까지 진단은 localStorage에만 쌓였다. 로그인한 유저에 한해
// Supabase(users/profiles/diagnoses)를 정본으로 삼고, 로컬은 캐시로 둔다.
//
// 멱등성: 같은 진단을 여러 기기에서 올려도 (user_id, client_id) 유니크 인덱스와
// onConflict upsert로 중복 행이 생기지 않는다.
//
// 보안:
//   - userId는 쿠키 세션에서만 얻는다(본문의 user_id 류는 아예 읽지 않는다).
//   - 배치 상한/본문 크기 상한으로 남용을 막는다.
// ============================================================================
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUserId } from "@/lib/userSession";

const MAX_ENTRIES = 200;           // 한 번에 올릴 수 있는 진단 수
const MAX_BODY_BYTES = 512 * 1024; // 512KB — 진단 답변 JSON 기준 넉넉한 상한
const MAX_CLIENT_ID_LEN = 128;     // uuid(36)보다 넉넉하되 무한정은 아니게
// 계정당 진단 행 상한. ⚠️ best-effort다(하드 쿼터 아님):
// 아래 count 조회와 upsert가 한 트랜잭션이 아니라, 같은 유저가 동시에 여러 요청을
// 보내면 상한을 조금 넘길 수 있다. 정확한 강제가 필요해지면 hair_usage의
// bump_hair_usage처럼 원자적 RPC로 옮겨야 한다(지금은 MVP라 도입하지 않음).
// 블라스트 반경도 "로그인한 본인 계정의 저장 공간"으로 한정된다.
const MAX_ROWS_PER_USER = 500;
const ALLOWED_KINDS = new Set(["style", "damage", "bangs", "hairquiz"]);

type IncomingEntry = Record<string, unknown> & { id?: unknown; kind?: unknown };

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "login_required" }, { status: 401 });
  }

  // 본문 크기 방어 — 파싱 전에 막는다. 문자 수가 아니라 실제 바이트로 잰다
  // (한글은 UTF-8에서 3바이트라 length로 재면 상한을 크게 넘길 수 있다).
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "payload_too_large" }, { status: 413 });
  }

  let body: { profile?: unknown; entries?: unknown; expectedUserId?: unknown };
  try {
    const parsed = JSON.parse(raw || "{}");
    // "null"·배열·원시값도 JSON.parse는 통과시킨다 — 객체가 아니면 아래 필드 접근에서
    // 터져 500이 되므로 여기서 400으로 정직하게 거른다.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }

  // 계정 일관성 assertion — 인증 수단이 아니라 "클라가 의도한 계정"과 실제 세션이
  // 같은지 확인하는 장치다. 동기화 도중 로그아웃/계정 전환으로 쿠키가 갈리면
  // 이전 계정의 데이터가 새 계정에 저장돼 버리므로, **DB를 건드리기 전에** 막는다.
  // (값이 틀려도 남의 데이터에 접근할 수는 없다 — 저장 대상은 언제나 세션의 userId다.)
  // 누락·비문자열도 거부한다 — 선택 항목으로 두면 필드를 빼는 것만으로 검사를
  // 통과할 수 있어 assertion이 강제되지 않는다.
  if (typeof body.expectedUserId !== "string" || body.expectedUserId !== userId) {
    return NextResponse.json({ ok: false, reason: "account_mismatch" }, { status: 409 });
  }

  const entriesIn = Array.isArray(body.entries) ? (body.entries as IncomingEntry[]) : [];
  if (entriesIn.length > MAX_ENTRIES) {
    return NextResponse.json({ ok: false, reason: "too_many_entries" }, { status: 413 });
  }

  // kind 누락은 style로 본다 — lib/beautyProfile.classifyKind와 같은 규칙.
  const rowsRaw = entriesIn
    .filter(
      (e) =>
        typeof e?.id === "string" &&
        (e.id as string).length > 0 &&
        (e.id as string).length <= MAX_CLIENT_ID_LEN,
    )
    .map((e) => {
      const kind = typeof e.kind === "string" && ALLOWED_KINDS.has(e.kind) ? e.kind : "style";
      const { answers, ...rest } = e as { answers?: unknown };
      return {
        user_id: userId,
        client_id: e.id as string,
        kind,
        answers: answers ?? null,
        result: rest, // 클라 엔트리 원본(답변 제외) 그대로 보관 → 복원 시 그대로 되돌림
      };
    });

  // 같은 요청 안에 중복 client_id가 있으면 Postgres upsert가
  // "ON CONFLICT DO UPDATE command cannot affect row a second time"로 실패한다.
  // 신규 행 수 계산도 부풀려지므로, 마지막 값만 남기고 중복을 제거한다.
  const byClientId = new Map<string, (typeof rowsRaw)[number]>();
  for (const row of rowsRaw) byClientId.set(row.client_id, row);
  const rows = Array.from(byClientId.values());

  try {
    if (rows.length > 0) {
      // 계정당 저장 행 상한 — 인증된 유저가 매번 새 client_id로 무한히 쌓는 것을 막는다.
      // "현재 행 수 + 이번에 새로 생길 행 수"로 판정해야 한다:
      //   - 단순히 현재 수만 보면 450행에 100건을 밀어넣어 550행이 되는 걸 못 막고,
      //   - 500행에 도달한 뒤 기존 행만 갱신하는 요청까지 막아버린다.
      const incomingIds = rows.map((r) => r.client_id);
      const [{ count: totalCount, error: countErr }, { data: existing, error: existErr }] =
        await Promise.all([
          supabaseAdmin
            .from("diagnoses")
            .select("client_id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabaseAdmin
            .from("diagnoses")
            .select("client_id")
            .eq("user_id", userId)
            .in("client_id", incomingIds),
        ]);
      if (countErr) throw countErr;
      if (existErr) throw existErr;

      const existingIds = new Set((existing ?? []).map((r) => r.client_id));
      const newRowCount = incomingIds.filter((id) => !existingIds.has(id)).length;
      if ((totalCount ?? 0) + newRowCount > MAX_ROWS_PER_USER) {
        return NextResponse.json({ ok: false, reason: "quota_exceeded" }, { status: 409 });
      }

      const { error } = await supabaseAdmin
        .from("diagnoses")
        .upsert(rows, { onConflict: "user_id,client_id" });
      if (error) throw error;
    }

    if (body.profile && typeof body.profile === "object") {
      const profile = body.profile as Record<string, unknown>;
      const hairTags = Array.isArray(profile.hairTags) ? profile.hairTags : null;
      const { error } = await supabaseAdmin.from("profiles").upsert(
        {
          user_id: userId,
          profile,
          hair_tags: hairTags,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    }

    // userId를 함께 돌려준다 — 클라가 "내가 의도한 계정에 저장됐는지" 확인할 수 있게.
    return NextResponse.json({ ok: true, userId, saved: rows.length });
  } catch (err) {
    console.error("[/api/me/sync] 저장 실패:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
