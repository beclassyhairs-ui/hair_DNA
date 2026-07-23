"use client";

// ============================================================================
// 어뷰티 공용 하단 탭바 (WORKORDER-02 토큰화).
// AI진단(/diagnosis) · 고민상담소(/consulting) · 오늘케어(/home) · 발견템(/items) ·
// 마이헤어(/myhair) 5대 메뉴. 라우트·라벨은 기존과 동일(기능 회귀 없음).
// 변경: 이모지 → Lucide 단색 1세트(stroke 1.8), 무지개·골드 폐지 →
//       비활성 --ink-2 / 활성만 --ink(색이 아니라 명도로 구분).
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  MessageCircle,
  Home,
  ShoppingBag,
  User,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/diagnosis", icon: Sparkles, label: "AI진단" },
  { href: "/consulting", icon: MessageCircle, label: "고민상담소" },
  { href: "/home", icon: Home, label: "오늘케어" },
  { href: "/items", icon: ShoppingBag, label: "발견템" },
  { href: "/myhair", icon: User, label: "마이헤어" },
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
