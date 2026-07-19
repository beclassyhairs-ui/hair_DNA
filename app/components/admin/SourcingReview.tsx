"use client";

// ============================================================================
// 어뷰티 어드민 — 소싱 후보 검수(Sourcing Review)
// Gemini가 만든 raw_candidates TSV/CSV 표를 붙여넣으면 자동 파싱 + 검수 플래그 +
// admin_import 미리보기를 보여준다.
//
// ⚠️ 저장 규칙: "채택(keep)" 선택 자체로는 아무것도 저장하지 않는다. 아래
// "draft로 저장하기" 버튼을 명시적으로 눌러야만 keep 후보가 products에 저장된다.
// 저장은 /api/admin/sourcing/import로 가며, 서버가 status='draft',
// image_status='needs_review'를 강제한다(이 화면은 그 값을 정하지 않는다).
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  buildAdminImportPreview,
  getCandidateRowKey,
  parseRawCandidatesTable,
  validateCandidates,
  RAW_CANDIDATE_COLUMNS,
  REQUIRED_COLUMNS,
  type AdminImportPreviewRow,
  type Decision,
  type ParsedCandidate,
} from "../../../lib/sourcing";

const DECISION_LABEL: Record<Decision, string> = { keep: "채택", maybe: "보류", drop: "제외" };
const DECISION_ORDER: Decision[] = ["keep", "maybe", "drop"];

const DECISION_ACTIVE_CLASS: Record<Decision, string> = {
  keep: "bg-emerald-500/20 text-emerald-300",
  maybe: "bg-amber-500/20 text-amber-300",
  drop: "bg-red-500/20 text-red-300",
};

const SAMPLE_HEADER = RAW_CANDIDATE_COLUMNS.join("\t");

function FlagBadges({ candidate }: { candidate: ParsedCandidate }) {
  const { flags } = candidate;
  const badges: { key: string; label: string; className: string }[] = [];

  if (flags.missingRequired.length > 0) {
    badges.push({
      key: "missing",
      label: `필수값 누락: ${flags.missingRequired.join(", ")}`,
      className: "bg-red-500/15 text-red-300",
    });
  }
  if (flags.isDuplicateUrl) {
    badges.push({ key: "dup", label: "중복 URL", className: "bg-orange-500/15 text-orange-300" });
  }
  if (flags.urlConfidenceUncertain) {
    badges.push({ key: "uncertain", label: "URL 확신도 낮음", className: "bg-amber-500/15 text-amber-300" });
  }
  if (flags.overseasRisk) {
    badges.push({ key: "overseas", label: "해외수입 리스크", className: "bg-purple-500/15 text-purple-300" });
  }

  if (badges.length === 0) {
    return <span className="text-[11px] text-cream/25">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.key} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.className}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

function DecisionPicker({
  candidate,
  value,
  onChange,
}: {
  candidate: ParsedCandidate;
  value: Decision | null;
  onChange: (d: Decision) => void;
}) {
  const locked = candidate.flags.missingRequired.length > 0;
  const effective = locked ? "drop" : value;

  return (
    <div className="flex gap-1">
      {DECISION_ORDER.map((d) => (
        <button
          key={d}
          type="button"
          disabled={locked}
          onClick={() => onChange(d)}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            effective === d ? DECISION_ACTIVE_CLASS[d] : "bg-white/[0.04] text-cream/40 hover:text-cream/70"
          } ${locked ? "cursor-not-allowed opacity-40" : ""}`}
        >
          {DECISION_LABEL[d]}
        </button>
      ))}
    </div>
  );
}

type SaveResult = { inserted: number; skipped: number };

export default function SourcingReview() {
  const [raw, setRaw] = useState("");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  // 이미 저장된 후보의 row key — 같은 배치를 다시 눌러 중복 생성하는 것을 막는다.
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());

  // 입력 표가 바뀌면 이전 배치의 keep/maybe/drop 선택이 새 배치에 잘못
  // 이어붙지 않도록 결정 상태를 통째로 초기화한다 (row key도 내용 기반이라
  // 이중으로 안전하지만, 완전히 새 붙여넣기에서는 항상 깨끗하게 시작해야 한다).
  useEffect(() => {
    setDecisions({});
    setSaveResult(null);
    setSaveError(null);
    setSavedKeys(new Set());
  }, [raw]);

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    const table = parseRawCandidatesTable(raw);
    const candidates = validateCandidates(table.rows);
    return { ...table, candidates };
  }, [raw]);

  const candidates = parsed?.candidates ?? [];

  const summary = useMemo(() => {
    if (!parsed) return null;
    const rows = parsed.candidates;
    return {
      total: rows.length,
      missingRequired: rows.filter((c) => c.flags.missingRequired.length > 0).length,
      duplicateUrl: rows.filter((c) => c.flags.isDuplicateUrl).length,
      uncertain: rows.filter((c) => c.flags.urlConfidenceUncertain).length,
      overseasRisk: rows.filter((c) => c.flags.overseasRisk).length,
    };
  }, [parsed]);

  function decisionFor(candidate: ParsedCandidate): Decision | null {
    if (candidate.flags.missingRequired.length > 0) return "drop";
    const key = getCandidateRowKey(candidate.raw);
    return decisions[key] ?? candidate.recommendedDecision;
  }

  function setDecision(candidate: ParsedCandidate, decision: Decision) {
    const key = getCandidateRowKey(candidate.raw);
    setDecisions((prev) => ({ ...prev, [key]: decision }));
  }

  const keepRows = candidates.filter((c) => decisionFor(c) === "keep");
  // 아직 저장하지 않은 keep 후보만 실제 저장 대상 — 재클릭 중복 생성 방지.
  const unsavedKeepRows = keepRows.filter((c) => !savedKeys.has(getCandidateRowKey(c.raw)));

  async function handleSaveDrafts() {
    if (unsavedKeepRows.length === 0 || saving) return;
    if (
      !window.confirm(
        `"채택"으로 결정한 ${unsavedKeepRows.length}건을 products에 draft로 저장합니다.\n` +
          `(status=draft, image_status=needs_review로 저장되며 공개 노출되지 않습니다)\n계속할까요?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveResult(null);

    // 저장 대상은 아직 저장 안 된 keep 후보의 admin_import 변환값만 보낸다.
    // status/image_status는 서버가 강제하므로 여기서 정하지 않는다.
    const batch = unsavedKeepRows;
    const items = batch.map((c) => buildAdminImportPreview(c));

    try {
      const res = await fetch("/api/admin/sourcing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      // 저장 성공한 배치의 키를 기록해 같은 후보를 다시 저장하지 못하게 한다.
      setSavedKeys((prev) => {
        const next = new Set(prev);
        for (const c of batch) next.add(getCandidateRowKey(c.raw));
        return next;
      });
      setSaveResult({ inserted: body.inserted ?? 0, skipped: body.skipped ?? 0 });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="font-serif text-2xl font-bold text-cream">소싱 후보 검수</h1>
          <p className="mt-1 text-sm text-cream/40">
            Gemini가 만든 raw_candidates 표를 붙여넣으면 자동 파싱 + 검수 플래그 + admin_import 미리보기까지 보여줍니다.
            이 화면은 어떤 저장도 하지 않습니다.
          </p>
        </div>

        {/* 입력 */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cream/50">raw_candidates TSV/CSV 붙여넣기</span>
            <button
              type="button"
              onClick={() => setRaw("")}
              className="text-xs text-cream/40 hover:text-cream/70"
            >
              지우기
            </button>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            placeholder={`헤더 예시(탭 구분):\n${SAMPLE_HEADER}`}
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 font-mono text-[11px] text-cream placeholder:text-cream/25 focus:border-gold/40 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-cream/30">
            필수 컬럼: {REQUIRED_COLUMNS.join(", ")} — 하나라도 비면 해당 행은 자동으로 &ldquo;제외&rdquo;로 잠깁니다.
          </p>
        </div>

        {parsed && parsed.missingRequiredHeaders.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            필수 헤더를 찾지 못했습니다: {parsed.missingRequiredHeaders.join(", ")}
          </div>
        )}
        {parsed && parsed.missingOptionalHeaders.length > 0 && (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-cream/40">
            선택 헤더 없음(참고용, 오류 아님): {parsed.missingOptionalHeaders.join(", ")}
          </div>
        )}
        {parsed && parsed.unknownHeaders.length > 0 && (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-cream/40">
            알 수 없는 컬럼(무시됨): {parsed.unknownHeaders.join(", ")}
          </div>
        )}

        {/* 요약 */}
        {summary && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryStat label="총 후보" value={summary.total} />
            <SummaryStat label="필수값 누락" value={summary.missingRequired} tone="red" />
            <SummaryStat label="중복 URL" value={summary.duplicateUrl} tone="orange" />
            <SummaryStat label="URL 확신도 낮음" value={summary.uncertain} tone="amber" />
            <SummaryStat label="해외수입 리스크" value={summary.overseasRisk} tone="purple" />
          </div>
        )}

        {/* 검수 테이블 */}
        {candidates.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-cream/50">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">상품명(한글)</th>
                  <th className="px-3 py-2.5 font-medium">플랫폼</th>
                  <th className="px-3 py-2.5 font-medium">URL</th>
                  <th className="px-3 py-2.5 font-medium">검수 플래그</th>
                  <th className="px-3 py-2.5 font-medium">결정</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={getCandidateRowKey(candidate.raw)} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2.5 text-cream/40">{candidate.raw.rowIndex}</td>
                    <td className="px-3 py-2.5 text-cream">{candidate.raw.korean_display_name || "—"}</td>
                    <td className="px-3 py-2.5 text-cream/70">{candidate.raw.source_platform || "—"}</td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-cream/50">
                      {candidate.raw.product_url || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <FlagBadges candidate={candidate} />
                    </td>
                    <td className="px-3 py-2.5">
                      <DecisionPicker
                        candidate={candidate}
                        value={decisionFor(candidate)}
                        onChange={(d) => setDecision(candidate, d)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* admin_import 전체 변환 미리보기 (keep/maybe/drop 전부 포함) */}
        {candidates.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-cream/85">admin_import 미리보기 (전체)</h2>
            <p className="mt-1 text-[11px] text-cream/30">
              products 테이블에 들어갈 형태로 변환한 전체 미리보기입니다 — 실제 등록/저장은 이 화면에서 일어나지 않습니다.
            </p>
            <AdminImportTable candidates={candidates} />
          </div>
        )}

        {/* 실제 import 대상 — 결정이 "채택"인 후보만 */}
        {candidates.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-cream/85">실제 import 대상 (채택만) — {keepRows.length}건</h2>
            <p className="mt-1 text-[11px] text-cream/30">
              결정이 &ldquo;채택&rdquo;인 후보만 모은 목록입니다. 여기도 저장/등록은 하지 않습니다 — 다음 단계에서
              /admin/products draft 전송을 연결할 때 이 목록을 기준으로 삼을 예정입니다.
            </p>
            {keepRows.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-xs text-cream/40">
                아직 &ldquo;채택&rdquo;으로 결정된 후보가 없습니다.
              </div>
            ) : (
              <AdminImportTable candidates={keepRows} />
            )}
          </div>
        )}

        {/* draft로 저장 — "채택" 후보만, 명시적 버튼 클릭 시에만 저장 */}
        {candidates.length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-cream/40">
                &ldquo;채택&rdquo; {keepRows.length}건 중 <span className="text-cream/70">미저장 {unsavedKeepRows.length}건</span>을 products에 <span className="text-gold-light/80">draft</span>로 저장합니다.
                저장 시 <span className="text-cream/60">status=draft · image_status=needs_review</span>로 들어가며 공개 노출되지 않습니다.
              </p>
              <button
                type="button"
                onClick={handleSaveDrafts}
                disabled={saving || unsavedKeepRows.length === 0}
                className="shrink-0 rounded-xl border border-gold/30 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "저장 중…"
                  : unsavedKeepRows.length === 0 && savedKeys.size > 0
                    ? "모두 저장됨"
                    : `draft로 저장하기${unsavedKeepRows.length > 0 ? ` (${unsavedKeepRows.length})` : ""}`}
              </button>
            </div>

            {saveError && <p className="mt-3 text-xs text-red-300">저장 실패: {saveError}</p>}
            {saveResult && (
              <p className="mt-3 text-xs text-emerald-300">
                {saveResult.inserted}건을 draft로 저장했습니다
                {saveResult.skipped > 0 ? ` (product_name 없음 등 ${saveResult.skipped}건 건너뜀)` : ""}.
                {" "}
                <a href="/admin/products" className="underline hover:text-emerald-200">/admin/products에서 확인</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminImportTable({ candidates }: { candidates: ParsedCandidate[] }) {
  const previews: [string, AdminImportPreviewRow][] = candidates.map((candidate) => [
    getCandidateRowKey(candidate.raw),
    buildAdminImportPreview(candidate),
  ]);

  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[960px] text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03] text-cream/50">
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">product_name</th>
            <th className="px-3 py-2.5 font-medium">category</th>
            <th className="px-3 py-2.5 font-medium">buy_link</th>
            <th className="px-3 py-2.5 font-medium">status</th>
            <th className="px-3 py-2.5 font-medium">sales_type</th>
            <th className="px-3 py-2.5 font-medium">fit_hair_types</th>
            <th className="px-3 py-2.5 font-medium">sourcing_note</th>
          </tr>
        </thead>
        <tbody>
          {previews.map(([key, preview]) => (
            <tr key={key} className="border-b border-white/5 last:border-0">
              <td className="px-3 py-2.5 text-cream/40">{preview.rowIndex}</td>
              <td className="px-3 py-2.5 text-cream">{preview.product_name ?? "—"}</td>
              <td className="px-3 py-2.5 text-cream/70">{preview.category ?? "—"}</td>
              <td className="max-w-[200px] truncate px-3 py-2.5 text-cream/50">{preview.buy_link ?? "—"}</td>
              <td className="px-3 py-2.5">
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] text-gold-light">
                  {preview.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-cream/70">{preview.sales_type ?? "—"}</td>
              <td className="px-3 py-2.5 text-cream/70">
                {preview.fit_hair_types.length > 0 ? preview.fit_hair_types.join(", ") : "—"}
              </td>
              <td className="max-w-[260px] truncate px-3 py-2.5 text-cream/40">{preview.sourcing_note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "orange" | "amber" | "purple";
}) {
  const toneClass = tone
    ? {
        red: "text-red-300",
        orange: "text-orange-300",
        amber: "text-amber-300",
        purple: "text-purple-300",
      }[tone]
    : "text-cream";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] text-cream/40">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
