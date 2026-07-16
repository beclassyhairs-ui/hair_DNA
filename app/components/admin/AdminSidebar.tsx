"use client";

// ============================================================================
// 어뷰티 어드민 — 좌측 사이드 네비게이션
// [대시보드] /admin, [제품 관리] /admin/products, [소싱 검수] /admin/sourcing
// 세 탭을 라우트로 분리한다.
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "대시보드",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className="h-5 w-5">
        <path d="M4 19V10M10 19V5M16 19V13M22 19H2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "제품 관리",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className="h-5 w-5">
        <path
          d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5v-7Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3.5 8.5 12 13l8.5-4.5M12 13v7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/sourcing",
    label: "소싱 검수",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} className="h-5 w-5">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-gold/15 text-gold-light shadow-[inset_0_0_0_1px_rgba(200,168,107,0.35)]"
                : "text-cream/55 hover:bg-white/[0.04] hover:text-cream/85"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* 데스크톱: 좌측 고정 사이드바 */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-60 md:flex-col md:border-r md:border-white/[0.06] md:bg-[#141210] md:px-4 md:py-6">
        <div className="px-2 pb-6">
          <p className="font-serif text-lg font-bold text-cream">어뷰티</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-cream/35">Admin Console</p>
        </div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto px-2 pt-6 text-[11px] leading-relaxed text-cream/25">
          헤어 고민 해결 커머스
          <br />
          어뷰티 관리자 전용
        </div>
      </aside>

      {/* 모바일: 상단 탭 바 */}
      <div className="sticky top-0 z-30 flex items-center gap-1 border-b border-white/[0.06] bg-[#141210]/95 px-3 py-2.5 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-gold/15 text-gold-light" : "text-cream/50"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
