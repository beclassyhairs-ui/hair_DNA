// ============================================================================
// copy-drafts/lint.ts — 카피 문체 lint (2026-09-10 역할표 규칙 2종)  npm run copy:lint
//
// ★ 경고는 빌드 실패가 아니다(리포트만). copy:check(게이트)와 분리한 이유: check 는 prebuild
//   에 걸린 pass/fail 관문이고, 이 lint 는 "다음 채굴방 라운드 작업 대상표"를 만드는 자문 도구다.
//
// 규칙(역할표 공통 2·4):
//   L1) 한 조각 text 가 4문장 이상이면 경고(상한 3문장). 문장 구분 = 마침표·물음표·느낌표
//       (+ 뒤따르는 닫는 따옴표). 말줄임표(…, ...)는 종결로 세지 않는다.
//   L2) 부정 선행 — 첫 문장이 "아니에요/아닙니다/아니라/때문이 아니"로 시작하거나 그 표현으로
//       끝나면 경고. 답이 같은 문장 안에 있어 긍정으로 끝나면 통과(예: "펌 탓이 아니라 …곱슬
//       탓입니다").
//
// 산출물: docs/copy_lint_2026-09-10.md (블록별 경고 표). refId entry(3)는 원본에서 검사되므로
//   본문 보유 entry만 대상으로 한다(그 사실을 리포트에 명시). retired 조각도 제외(렌더 안 됨).
// ============================================================================

import { writeFileSync } from "fs";
import { join } from "path";
import { ALL_BLOCKS } from "./registry";
import type { CopyEntry } from "./types";

const OUT_REL = "docs/copy_lint_2026-09-10.md";
const NEG_LEADS = ["아니에요", "아닙니다", "아니라", "때문이 아니"];
const CLOSERS = ["”", '"', "’", "'", "」", "』", ")"]; // 닫는 따옴표·괄호

/** text → 문장 배열. 종결부호(.?!)와 뒤따르는 닫는 따옴표에서 자른다. 연속 마침표(...)는 말줄임표로
 *  치환해 종결에서 제외한다("…"는 . 이 아니므로 자동으로 종결로 안 셈). */
function splitSentences(text: string): string[] {
  const s = text.replace(/\.{2,}/g, "…");
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    buf += ch;
    if (ch === "." || ch === "?" || ch === "!") {
      while (i + 1 < s.length && CLOSERS.includes(s[i + 1]!)) buf += s[++i];
      const seg = buf.trim();
      if (seg) out.push(seg);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

/** 종결부호·닫는 따옴표를 뗀 문장 본문(부정 선행 판정용). */
function core(sentence: string): string {
  return sentence.replace(/[.?!]+["”’'」』)]*\s*$/g, "").trim();
}

interface Warning { id: string; block: string; kinds: string[]; sentenceCount: number; first: string; }

const warnings: Warning[] = [];
let textEntryCount = 0;
let refCount = 0;
let retiredCount = 0;

for (const block of ALL_BLOCKS) {
  for (const entry of block.entries as CopyEntry[]) {
    if (entry.text === undefined) { refCount += 1; continue; } // refId — 원본에서 검사됨
    if (entry.status === "retired") { retiredCount += 1; continue; } // 은퇴 조각 — 렌더 안 됨
    textEntryCount += 1;

    const sentences = splitSentences(entry.text);
    const kinds: string[] = [];

    if (sentences.length >= 4) kinds.push(`L1 ${sentences.length}문장(상한 3)`);

    const first = core(sentences[0] ?? "");
    const startsNeg = NEG_LEADS.some((n) => first.startsWith(n));
    const endsNeg = /(아니에요|아닙니다|아니라)$/.test(first) || /때문이\s*아니(에요|ㅂ니다|라)?$/.test(first);
    if (startsNeg || endsNeg) kinds.push("L2 부정 선행");

    if (kinds.length > 0) {
      warnings.push({
        id: entry.id,
        block: `${block.domain}/${block.block}`,
        kinds,
        sentenceCount: sentences.length,
        first: (sentences[0] ?? "").slice(0, 60),
      });
    }
  }
}

// ─── 리포트 파일 ──────────────────────────────────────────────────────────────
const repoRoot = join(__dirname, "..", "..", "..");
const byBlock = new Map<string, Warning[]>();
for (const w of warnings) {
  const arr = byBlock.get(w.block) ?? [];
  arr.push(w);
  byBlock.set(w.block, arr);
}

const l1 = warnings.filter((w) => w.kinds.some((k) => k.startsWith("L1"))).length;
const l2 = warnings.filter((w) => w.kinds.some((k) => k.startsWith("L2"))).length;

let md = "";
md += "# 카피 문체 lint — 2026-09-10\n\n";
md += "> `npm run copy:lint` 산출물. 경고는 **빌드 실패가 아니라** 다음 채굴방 라운드 작업 대상표다.\n";
md += "> 규칙: **L1** 4문장 이상(상한 3) · **L2** 부정 선행(첫 문장이 아니에요/아닙니다/아니라/때문이 아니로 시작·종결).\n\n";
md += `- 검사 대상: 본문 보유 entry **${textEntryCount}건** (refId ${refCount}건은 원본에서 검사 · retired ${retiredCount}건 제외)\n`;
md += `- 경고: **${warnings.length}건** (L1 ${l1} · L2 ${l2})\n\n`;

for (const [block, ws] of [...byBlock.entries()].sort()) {
  md += `## ${block} (${ws.length})\n\n`;
  md += "| id | 경고 | 문장수 | 첫 문장 |\n|---|---|---|---|\n";
  for (const w of ws) {
    md += `| \`${w.id}\` | ${w.kinds.join(", ")} | ${w.sentenceCount} | ${w.first.replace(/\|/g, "\\|")}… |\n`;
  }
  md += "\n";
}
if (warnings.length === 0) md += "경고 0건.\n";

writeFileSync(join(repoRoot, OUT_REL), md, "utf8");

// ─── 콘솔 요약 ────────────────────────────────────────────────────────────────
console.log("\n📝 copy lint (역할표 문체 규칙)\n");
console.log(`  대상 ${textEntryCount}건 · 경고 ${warnings.length}건 (L1 4문장+ ${l1} · L2 부정선행 ${l2})`);
console.log("\n  블록별 경고:");
for (const [block, ws] of [...byBlock.entries()].sort()) console.log(`    ${block}: ${ws.length}`);
console.log(`\n  → ${OUT_REL} 저장 완료 (다음 채굴방 라운드 작업 대상표)\n`);
