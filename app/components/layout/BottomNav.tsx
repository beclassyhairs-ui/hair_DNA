"use client";

// ============================================================================
// 어뷰티 — 밝은 웰니스앱 홈 계열 페이지 공용 하단 탭바.
// AI진단(/diagnosis) · 고민상담소(/consulting) · 오늘케어(/home) · 발견템(/items) ·
// 마이헤어(/myhair) 5대 메뉴를 라우팅한다.
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/diagnosis", icon: "🔍", label: "AI진단" },
  { href: "/consulting", icon: "💬", label: "고민상담소" },
  { href: "/home", icon: "🏠", label: "오늘케어" },
  { href: "/items", icon: "🎁", label: "발견템" },
  { href: "/myhair", icon: "👤", label: "마이헤어" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/90 shadow-[0_-12px_32px_-14px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-stretch justify-between px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center"
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span
                className={`text-[12px] font-medium ${active ? "text-[#C8A96A]" : "text-gray-500"}`}
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
