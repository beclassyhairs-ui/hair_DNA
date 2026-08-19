// ============================================================================
// copy-drafts/verbatim.ts — "원문 그대로" 주장의 기계 검증
//
// sourceRef에 "원문 그대로" / "원문 전문" / "원문 보존"이 적힌 entry는 기존 코드의
// 카피와 **한 글자도 다르지 않아야** 한다. 손으로 옮긴 이상 오타가 굳을 수 있으므로
// 주장에 그치지 않고 원본 파일과 문자열 대조한다.
//
// 방법: 원본 .ts 파일을 텍스트로 읽어 entry.text가 그 안에 그대로 들어 있는지 본다.
//   (PROPHECIES·TYPE_INFO·GRAY_HAIR_STORY·MANAGEMENT_TIP이 전부 module-private라
//    import할 수 없다. 엔진 파일에 export를 추가하는 건 이번 단계의 경계 밖이라
//    텍스트 대조를 택했다.)
//
// 한계(명시): 소스의 이스케이프(\" 등)를 되돌린 뒤 비교하므로, 원본이 여러 줄로
//   쪼개져 연결된 문자열이면 검출하지 못한다. 현재 대상 카피는 전부 한 줄 리터럴이다.
// ============================================================================

import { readFileSync } from "fs";
import { join } from "path";
import { allEntries } from "./registry";

/** 카피 원본이 살아 있는 파일들. 여기 없는 곳에서 옮겨왔다면 목록에 추가해야 한다. */
const SOURCE_FILES = [
  "app/damage-check/damageRecommend.ts",
  "app/damage-check/result/page.tsx",
  "app/style/branchCopy.ts",
];

const VERBATIM_MARKERS = ["원문 그대로", "원문 전문", "원문 보존"];

/** TS 문자열 리터럴 이스케이프를 되돌린다(비교용). */
function unescapeSource(src: string): string {
  return src
    .replace(/\\n/g, "\n") // b6.detail 등 문단 구분이 \n\n 으로 들어 있다
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

export interface VerbatimMismatch {
  id: string;
  sourceRef: string;
}

/** 원문 대조 실패 목록. 빈 배열이면 전건 일치. */
export function findVerbatimMismatches(repoRoot: string): {
  checked: number;
  mismatches: VerbatimMismatch[];
} {
  // ⚠️ 읽기 실패를 삼키지 않는다. 예전엔 catch로 ""를 돌려줬는데, 그러면 원본을 못 읽은
  //   상황이 "전건 불일치"로 위장돼 검사기 버그를 카피 문제로 오진하게 된다.
  const haystack = unescapeSource(
    SOURCE_FILES.map((f) => {
      const path = join(repoRoot, f);
      try {
        return readFileSync(path, "utf8");
      } catch (e) {
        throw new Error(
          `[verbatim] 카피 원본을 못 읽었습니다: ${path}\n` +
            `  repoRoot 계산이 틀렸거나 파일이 이동했습니다. 원인: ${(e as Error).message}`,
        );
      }
    }).join("\n"),
  );

  // refId entry는 본문을 갖지 않는다 — 원본 쪽에서 이미 대조되므로 여기서 제외한다.
  //   (참조를 따라가 또 검사하면 같은 문자열을 두 번 세면서 "검사 건수"만 부풀린다.
  //    참조가 끊기지 않았는지는 registry.assertRegistryShape()이 따로 본다.)
  const targets = allEntries().filter(
    (e) => e.text !== undefined && VERBATIM_MARKERS.some((m) => e.sourceRef.includes(m)),
  );

  const mismatches = targets
    .filter((e) => !haystack.includes(e.text as string))
    .map((e) => ({ id: e.id, sourceRef: e.sourceRef }));

  return { checked: targets.length, mismatches };
}
