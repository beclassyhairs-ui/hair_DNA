// ============================================================================
// /privacy — 개인정보처리방침 (초안)
// ⚠️ 초안이다. 상호·보호책임자·연락처 등 [ ] 표기는 사업주 확정 후 채운다.
//    플레이스홀더가 색인되지 않도록 noindex 처리.
//
// 📌 셀카 보유기간은 확정됨: "합성 완료 즉시 파기".
//    실동작 근거 — app/api/submit-diagnosis(셀카 미저장, 답변만 Sheets) +
//    app/api/hair-transform(합성 직후 finally에서 원본 즉시삭제). 이 문서 문구는
//    반드시 그 실동작과 일치해야 하며, 되돌릴 때는 코드부터 바꿀 것.
//    (법률 자문 아님 — 최종 문안은 사업주 검토 전제)
// ============================================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 어뷰티(A-Beauty)",
  description: "어뷰티(A-Beauty)의 개인정보 수집·이용·처리위탁·국외이전 및 이용자 권리 안내(초안).",
  robots: { index: false, follow: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-bold text-[#2F2A22]">{title}</h2>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-[#4A443A]">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-5 py-10">
      <div className="rounded-xl border border-[#E4B84A]/40 bg-[#FBF3DC] px-4 py-3 text-[13px] font-semibold text-[#8A6D2F]">
        초안 — 사업주 검토 전입니다. 상호·연락처·개인정보 보호책임자 등 [ ] 표기 항목은 확정 후 반영됩니다.
      </div>

      <h1 className="mt-6 text-[22px] font-bold tracking-tight text-[#2F2A22]">개인정보처리방침</h1>
      <p className="mt-2 text-[13px] text-[#9A927F]">
        어뷰티(A-Beauty)(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요하게 생각하며,
        「개인정보 보호법」 등 관련 법령을 준수합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>진단 답변</b>: 헤어 진단 설문 응답(모발 타입·고민·습관 등).</li>
          <li><b>셀카 이미지</b>: AI 헤어 변신을 위해 이용자가 업로드한 얼굴 사진.</li>
          <li><b>이벤트·이용 로그</b>: 페이지 조회·진단·상품 클릭 등 행동 이벤트, 유입 경로(UTM), 기기·브라우저 정보.</li>
        </ul>
      </Section>

      <Section title="2. 수집·이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>AI 헤어 진단 및 헤어스타일 합성 미리보기 제공</li>
          <li>진단 결과 기반 상품(발견템) 매칭·추천</li>
          <li>서비스 이용 통계·품질 개선 및 유입 경로 분석</li>
        </ul>
      </Section>

      <Section title="3. 보유 및 이용기간">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>셀카 이미지</b>: <b>합성 완료 즉시 파기</b>합니다. 업로드한 사진은 AI 헤어스타일
            합성 처리에만 사용되며, 처리가 끝나는 즉시 서버에서 삭제되고 원본을 영구 보관하지
            않습니다.
          </li>
          <li>
            <b>진단 답변·이벤트 로그</b>: 수집·이용 목적을 달성할 때까지 보관하며, 목적 달성 후
            지체 없이 파기합니다.
          </li>
          <li>관련 법령이 별도 보존을 요구하는 경우 해당 기간 동안 보관합니다.</li>
        </ul>
      </Section>

      <Section title="4. 개인정보 처리위탁">
        <p>서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁합니다.</p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-black/10 text-left text-[#9A927F]">
                <th className="py-2 pr-4 font-semibold">수탁업체</th>
                <th className="py-2 font-semibold">위탁 업무</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-black/[0.05] [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              <tr><td>Supabase</td><td>진단·이벤트 데이터 저장·관리</td></tr>
              <tr><td>Vercel</td><td>서비스 호스팅 및 이미지(셀카) 임시 저장</td></tr>
              <tr><td>Replicate</td><td>AI 헤어스타일 합성 처리(얼굴 이미지 포함)</td></tr>
              <tr><td>Google</td><td>이용 통계·분석</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="5. 개인정보 국외이전">
        <p>
          AI 합성을 위해 이용자의 <b>얼굴 이미지</b>가 <b>Replicate(미국)</b>로 이전되어 처리됩니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>이전 항목: 셀카(얼굴) 이미지</li>
          <li>이전 국가/업체: 미국 / Replicate, Inc.</li>
          <li>이전 목적: AI 헤어스타일 합성</li>
          <li>이전 방법: 합성 처리 시점에 네트워크를 통해 전송</li>
          <li>보유·이용기간: 합성 완료 즉시 파기(위 3항과 동일 — 영구 보관하지 않음)</li>
        </ul>
        <p className="text-[13px] text-[#9A927F]">
          ※ Vercel·Supabase·Google 등 다른 수탁업체의 서버 소재지에 따라 추가 국외이전이 발생할 수 있으며,
          구체적 리전은 확정 후 반영합니다.
        </p>
      </Section>

      <Section title="6. 이용자의 권리와 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다.
          요청은 아래 개인정보 보호책임자에게 연락하시면 지체 없이 처리합니다.
        </p>
      </Section>

      <Section title="7. 만 14세 미만 아동의 개인정보">
        <p>
          서비스는 <b>만 14세 미만 아동의 개인정보를 수집하지 않습니다.</b>
          만 14세 미만임이 확인되는 경우 해당 정보를 지체 없이 파기합니다.
        </p>
      </Section>

      <Section title="8. 개인정보 보호책임자">
        <ul className="list-disc space-y-1 pl-5">
          <li>성명: [사업주 기재 필요]</li>
          <li>연락처: [사업주 기재 필요]</li>
          <li>이메일: [사업주 기재 필요]</li>
        </ul>
      </Section>

      <Section title="9. 고지의 의무">
        <p>
          본 방침의 내용 추가·삭제·수정이 있을 경우 시행일 전에 서비스 내 공지를 통해 안내합니다.
          본 방침의 시행일: [사업주 기재 필요].
        </p>
      </Section>

      <p className="mt-10 text-[13px]">
        <Link href="/terms" className="font-semibold text-[#8A6D2F] underline underline-offset-2">이용약관 보기 →</Link>
      </p>
    </main>
  );
}
