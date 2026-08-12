// ============================================================================
// lib/referencePick.ts
// 빌드타임 manifest(referencesManifest.json) 기반 레퍼런스 후보 해석 + 폴백 체인.
// 런타임 fs 접근 없음(번들된 JSON import) → Vercel 서버리스에서 안전.
//
// 슬롯키·폴백 후보는 전부 allowlist(styleReference)에서만 생성 → 경로 traversal 불가.
// 실제 랜덤 픽·URL 조립은 호출부(route)가 한다(랜덤/baseUrl은 라우트 책임).
// ============================================================================
import type { StyleAnswers } from "@/app/style/surveyData";
import {
  getReferenceSlotKey,
  ALL_WEIGHTS,
  ALL_CURLS,
  isMatureAge,
  MATURE_SET_PREFIX,
} from "@/lib/styleReference";
import manifestJson from "@/lib/referencesManifest.json";

type Manifest = Record<string, string[]>;
const MANIFEST = manifestJson as Manifest;

export type ReferenceResolution = {
  slot: string;        // 실제 채택된 슬롯키 "<len>/<weight>/<curl>" (폴백 시 원 슬롯과 다를 수 있음)
  files: string[];     // 그 슬롯의 파일 목록(결정적 정렬). 비어있지 않음.
  isFallback: boolean; // 원 슬롯이 아니라 폴백 체인에서 찾았는가
};

// 폴백 체인 순서(각 세트 내부):
// 1) 정확 슬롯
// 2) 같은 기장·같은 weight, 다른 컬
// 3) 같은 기장, 아무 weight·컬  ← 숏 기장은 여기서 light 슬롯을 만난다(설문이 숏은 층 미질문 →
//    exact가 medium이라 비고, weight 순회 heavy→medium→light 중 light에서 채워짐 = "기존처럼").
// 나이 세트: 50·60대(mature)는 위 체인을 "mature/" 접두로 먼저 훑고, 전부 비면 같은 체인의 young
//   슬롯으로 폴백한다(mature를 부분만 채워도 데드엔드 없이 안전 롤아웃). 40대 이하·미상은 young만.
// 파일이 있는 첫 슬롯을 반환. 전부 비면 null(호출부가 DEFAULT_REFERENCE_PATH로).
export function resolveReference(answers: StyleAnswers): ReferenceResolution | null {
  const exact = getReferenceSlotKey(answers);
  const [len, weight] = exact.split("/");

  const base: string[] = [exact];
  // 2) 같은 len·weight, 다른 curl
  for (const c of ALL_CURLS) {
    const k = `${len}/${weight}/${c}`;
    if (!base.includes(k)) base.push(k);
  }
  // 3) 같은 len, 아무 weight·curl
  for (const w of ALL_WEIGHTS) {
    for (const c of ALL_CURLS) {
      const k = `${len}/${w}/${c}`;
      if (!base.includes(k)) base.push(k);
    }
  }

  // 나이 픽: mature 우선(접두) → young 폴백. young/미상은 base 그대로.
  const order = isMatureAge(answers)
    ? [...base.map((k) => `${MATURE_SET_PREFIX}/${k}`), ...base]
    : base;

  for (let i = 0; i < order.length; i++) {
    const files = MANIFEST[order[i]];
    if (files && files.length > 0) {
      return { slot: order[i], files, isFallback: i > 0 };
    }
  }
  return null;
}

// 파일명을 URL 경로로 안전 조립(공백·괄호 등 인코딩). slot은 allowlist 산물이라 그대로 둔다.
export function buildReferenceUrl(baseUrl: string, slot: string, file: string): string {
  const encFile = encodeURIComponent(file);
  return `${baseUrl.replace(/\/$/, "")}/references/${slot}/${encFile}`;
}
