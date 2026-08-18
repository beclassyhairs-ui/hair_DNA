"use client";

// ============================================================================
// 어뷰티 공용 하단 탭바 (WORKORDER-02 토큰화).
// 홈(/home) · 발견템(/items) · 나의 헤어(/my-diary) 3대 메뉴.
//   (2026-08-15 구조 개편: AI진단 허브·고민상담소 탭 제거 — 홈이 진단 랜딩 2장을 직접 품고,
//    상담 창구는 카카오 채널 개설 후 홈 블록으로 노출. /diagnosis 허브는 직접 URL 접근용으로만 존치.)
// 변경: 이모지 → Lucide 단색 1세트(stroke 1.8), 무지개·골드 폐지 →
//       비활성 --ink-2 / 활성만 --ink(색이 아니라 명도로 구분).
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingBag,
  FileText,
  type LucideIcon,
} from "lucide-react";

// 🟡-⑥: '나의 헤어' 아이콘을 사람(User)에서 결과지 카드(FileText)로 교체 — 사람 실루엣이 아래
//   랜딩 사진(얼굴·헤어)과 겹쳐 헷갈리던 문제. 홈의 '지난 진단 기록 보기'도 같은 FileText 를 써서
//   "내 결과지"라는 연결을 시각적으로 통일한다.
const NAV_ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/home", icon: Home, label: "홈" },
  { href: "/items", icon: ShoppingBag, label: "발견템" },
  { href: "/my-diary", icon: FileText, label: "나의 헤어" }, // 실체(진짜 기록) 페이지. 구 /myhair(더미)는 /my-diary로 리다이렉트.
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 rounded-btn px-1 py-1.5 text-center"
            >
              <Icon
                size={22}
                strokeWidth={1.8}
                className={active ? "text-ink" : "text-ink-2"}
                aria-hidden
              />
              <span
                className={`text-[12px] ${active ? "font-medium text-ink" : "font-normal text-ink-2"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
