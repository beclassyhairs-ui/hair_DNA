// ============================================================================
// copy-drafts/env.ts — 환경별 렌더 게이트 (지시서 §7-1 환경 규칙)
//
//   development/preview : draft · owner_reviewed 카피 렌더 허용
//                         (검수용 화면·덤프 생성에 필요)
//   production          : approved 만 렌더
//
// → 사장님 검수 전 화면은 볼 수 있되, 실수로 라이브에는 못 나가는 구조.
//
// ⚠️ 클라이언트 컴포넌트(결과지)에서도 호출된다. Next.js는 process.env를
//    빌드타임 인라인하므로 클라에서 읽히는 건 NODE_ENV와 NEXT_PUBLIC_* 뿐이다.
//    Vercel은 NEXT_PUBLIC_VERCEL_ENV를 자동 주입하므로 그걸 1순위로 본다.
// ============================================================================

export type CopyEnv = "development" | "preview" | "production";

/** 현재 카피 렌더 환경. 판정 불가 시 가장 안전한 쪽(production)으로 fail-closed. */
export function currentCopyEnv(): CopyEnv {
  const raw =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? // 클라·서버 공통(Vercel 자동 주입)
    process.env.VERCEL_ENV ?? // 서버 전용
    "";

  if (raw === "production" || raw === "preview" || raw === "development") return raw;

  // Vercel 밖(로컬·CI). NODE_ENV=production 이면 프로덕션 빌드로 취급한다.
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/** 이 환경에서 렌더 가능한 status 집합 (§7-1). */
export function renderableStatuses(env: CopyEnv): readonly ("draft" | "owner_reviewed" | "approved")[] {
  return env === "production"
    ? (["approved"] as const)
    : (["draft", "owner_reviewed", "approved"] as const);
}

/** 이 status가 이 환경에서 렌더 가능한가. */
export function isRenderable(
  status: "draft" | "owner_reviewed" | "approved",
  env: CopyEnv = currentCopyEnv(),
): boolean {
  return env === "production" ? status === "approved" : true;
}
