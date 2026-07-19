"use client";

// ============================================================================
// 공통 푸터 — 사업자 표시(전자상거래법) + 법적 문서 링크.
// 루트 레이아웃에 마운트되며, 관리자(/admin) 경로에서는 렌더하지 않는다.
// AppShell 페이지의 fixed 하단 탭바에 가려지지 않도록 넉넉한 하단 패딩을 준다.
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS_INFO_FIELDS, isBusinessInfoReady } from "../../lib/business";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null; // 관리자 화면엔 푸터 불필요

  return (
    <footer className="border-t border-black/[0.06] bg-[#F4F1EA] px-5 pb-28 pt-8 text-[#6B6355]">
      <div className="mx-auto max-w-[560px]">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-[#4A443A]">
          <Link href="/privacy" className="underline-offset-2 hover:underline">개인정보처리방침</Link>
          <span className="text-black/15" aria-hidden>|</span>
          <Link href="/terms" className="underline-offset-2 hover:underline">이용약관</Link>
        </nav>

        {/* 사업자 표시 블록 — 6항목 실값이 모두 채워졌을 때만 렌더(플레이스홀더 노출 방지) */}
        {isBusinessInfoReady() && (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12px] leading-relaxed sm:grid-cols-2">
            {BUSINESS_INFO_FIELDS.map((f) => (
              <div key={f.label} className="flex gap-1.5">
                <dt className="shrink-0 text-[#9A927F]">{f.label}</dt>
                <dd className="min-w-0 break-words text-[#6B6355]">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-5 text-[11px] text-[#A79E8B]">
          © {new Date().getFullYear()} 어뷰티(A-Beauty). All rights reserved.
        </p>
      </div>
    </footer>
  );
}
