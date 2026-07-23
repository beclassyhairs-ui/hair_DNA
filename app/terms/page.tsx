// ============================================================================
// /terms — 이용약관 (초안)
// ⚠️ 초안이다. 상호·관할 등 [ ] 표기는 사업주 확정 후 채운다. noindex.
// ============================================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | 어뷰티(A-Beauty)",
  description: "어뷰티(A-Beauty) 서비스 이용약관(초안).",
  robots: { index: false, follow: false },
};

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-h2 text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-body leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[720px] px-5 py-10">
      <div className="rounded-btn border border-line bg-surface px-4 py-3 text-aux font-medium text-ink-2">
        초안 — 사업주 검토·확정 전입니다.
      </div>

      <h1 className="mt-6 text-h1 text-ink">이용약관</h1>

      <Article title="제1조 (목적)">
        <p>
          본 약관은 어뷰티(A-Beauty)(이하 &ldquo;회사&rdquo;)가 제공하는 AI 헤어 진단 및
          커머스 서비스(이하 &ldquo;서비스&rdquo;)의 이용 조건과 절차, 회사와 이용자의 권리·의무를
          규정함을 목적으로 합니다.
        </p>
      </Article>

      <Article title="제2조 (정의)">
        <ul className="list-disc space-y-1 pl-5">
          <li>&ldquo;이용자&rdquo;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
          <li>&ldquo;진단&rdquo;이란 이용자의 설문·사진을 바탕으로 제공되는 AI 헤어 분석·합성 결과를 말합니다.</li>
          <li>&ldquo;발견템&rdquo;이란 진단 결과에 따라 매칭·소개되는 상품을 말합니다.</li>
        </ul>
      </Article>

      <Article title="제3조 (약관의 효력 및 변경)">
        <p>
          본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 회사는 관련 법령을 위반하지 않는
          범위에서 약관을 변경할 수 있으며, 변경 시 시행일과 변경 내용을 사전에 공지합니다.
        </p>
      </Article>

      <Article title="제4조 (서비스의 내용)">
        <ul className="list-disc space-y-1 pl-5">
          <li>AI 헤어 진단 및 헤어스타일 합성 미리보기 제공</li>
          <li>진단 결과 기반 상품(발견템) 매칭·소개</li>
          <li>기타 회사가 정하는 서비스</li>
        </ul>
      </Article>

      <Article title="제5조 (AI 진단·합성 결과의 성격)">
        <p>
          진단 및 합성 결과는 <b>참고용 미리보기</b>이며, 실제 시술 결과·효능을 보장하지 않습니다.
          시술·제품 구매의 최종 판단과 책임은 이용자에게 있습니다.
        </p>
      </Article>

      <Article title="제6조 (이용자의 의무)">
        <ul className="list-disc space-y-1 pl-5">
          <li>타인의 사진 등 권리를 침해하는 자료를 업로드하지 않습니다.</li>
          <li>서비스의 정상적 운영을 방해하는 행위를 하지 않습니다.</li>
        </ul>
      </Article>

      <Article title="제7조 (개인정보 보호)">
        <p>
          회사는 이용자의 개인정보를 관련 법령과{" "}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">개인정보처리방침</Link>
          에 따라 보호합니다.
        </p>
      </Article>

      <Article title="제8조 (면책)">
        <p>
          회사는 천재지변, 이용자의 귀책, 제3자 서비스(AI 처리 등)의 장애 등 회사의 통제를 벗어난
          사유로 인한 손해에 대해 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.
        </p>
      </Article>

      <Article title="제9조 (준거법 및 관할)">
        <p>
          본 약관은 대한민국 법령에 따르며, 서비스 이용과 관련한 분쟁의 관할 법원은
          관련 법령이 정하는 바에 따릅니다. (회사 상호·주소: [사업주 기재 필요])
        </p>
      </Article>

      <p className="mt-10 text-[13px]">
        <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">개인정보처리방침 보기 →</Link>
      </p>
    </main>
  );
}
