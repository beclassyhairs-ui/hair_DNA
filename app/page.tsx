import { redirect } from "next/navigation";

// ============================================================================
// 미알팁 — 루트 랜딩 (/)
//
// 첫 화면은 /home(로그인 상태 무관). /home 자체의 로그인 게이트는 그대로 둔다.
// 진입점이 바뀌면 이 한 줄만 바꾸면 된다.
// ⚠️ redirect 는 쿼리(?utm_...)를 물고 가지 않는다 — 마케팅 링크는 루트가 아니라
//    /style·/damage-check·/home 에 직접 UTM 을 붙인다(docs/UTM_RULES.md §1).
// ============================================================================

export default function RootPage() {
  redirect("/home");
}
