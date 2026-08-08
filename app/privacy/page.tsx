// ============================================================================
// /privacy — 개인정보처리방침 (시행 2026-08-08)
// 보호책임자·시행일 확정, noindex 해제(2026-08-05 Phase A). 색인 허용.
//
// 📌 셀카 미저장(A안): 우리 서버/Blob에 원본을 저장하지 않는다. 실동작 근거 —
//    app/api/submit-diagnosis(셀카 미저장, 답변만 Sheets) +
//    app/api/hair-transform(셀카를 data URI로만 실어 Replicate faceswap 요청 안에서만 사용, 미저장).
//    이 문서 문구는 그 실동작과 일치해야 하며, 되돌릴 때는 코드부터 바꿀 것.
//    (2026-08-08 개정: 합성 수탁사 OpenAI→Replicate 재전환에 맞춰 §3·§4·§5 값 교체.)
//
// 📌 삭제권: 현재 셀프 삭제기능 없음 → 보호책임자 이메일 접수·처리 방식으로 고지.
//    삭제기능(Phase B) 배포 시 이 문단 갱신 + CONSENT_POLICY_VERSION 상향.
//    (법률 자문 아님 — 최종 문안은 사업주 검토 전제)
// ============================================================================

import type { Metadata } from "next";
import Link from "next/link";
import { KAKAO_LOGIN_ENABLED } from "@/lib/loginGate";

// Sentry(오류 모니터링) 고지는 실제 활성 상태에만 노출한다 — DSN 미설정 시 Sentry는 완전
// no-op(enabled:false)이라 오류 데이터가 어디로도 전송되지 않으므로, 그때 고지를 띄우면
// 실동작과 어긋난다. DSN이 설정되면(사업주가 Vercel env 등록 후 재배포) 수탁·국외이전 고지가
// 함께 노출된다. (KAKAO_LOGIN_ENABLED로 카카오 문구를 게이팅하는 것과 동일한 패턴.)
const SENTRY_ENABLED = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export const metadata: Metadata = {
  title: "개인정보처리방침 | 어뷰티(A-Beauty)",
  description: "어뷰티(A-Beauty)의 개인정보 수집·이용·처리위탁·국외이전 및 이용자 권리 안내.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-h2 text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-body leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-5 py-10">
      <h1 className="text-h1 text-ink">개인정보처리방침</h1>
      <p className="mt-2 text-[13px] text-ink-2">
        어뷰티(A-Beauty)(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요하게 생각하며,
        「개인정보 보호법」 등 관련 법령을 준수합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>진단 답변</b>: 헤어 진단 설문 응답(모발 타입·고민·습관 등).</li>
          <li><b>셀카 이미지</b>: AI 헤어 변신을 위해 이용자가 업로드한 얼굴 사진.</li>
          <li><b>이벤트·이용 로그</b>: 페이지 조회·진단·상품 클릭 등 행동 이벤트, 유입 경로(UTM), 기기·브라우저 정보.</li>
          {/* 카카오 로그인 수집항목 — 로그인 기능(Phase B, KAKAO_LOGIN_ENABLED) 활성화 시에만 노출한다.
              기능이 꺼진 지금은 손님에게 보이지 않는다(문구가 실동작과 어긋나지 않게 함).
              ⚠️ KAKAO_LOGIN_ENABLED를 true로 켜기 전 이 문안을 사업주가 검토·확정할 것. */}
          {KAKAO_LOGIN_ENABLED && (
            <li>
              <b>카카오 로그인 정보</b>(로그인 이용 시): 카카오 회원번호, (이용자 동의 시) 닉네임·프로필 이미지.
            </li>
          )}
        </ul>
      </Section>

      <Section title="2. 수집·이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>AI 헤어 진단 및 헤어스타일 합성 미리보기 제공</li>
          <li>진단 결과 기반 상품(발견템) 매칭·추천</li>
          <li>서비스 이용 통계·품질 개선 및 유입 경로 분석</li>
          {/* 카카오 로그인 활성화(KAKAO_LOGIN_ENABLED) 시에만 노출 */}
          {KAKAO_LOGIN_ENABLED && (
            <li>카카오 로그인 이용 시: 회원 식별·로그인 유지, 진단 결과의 계정 저장·연동</li>
          )}
        </ul>
      </Section>

      <Section title="3. 보유 및 이용기간">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>셀카 이미지</b>: AI 헤어스타일 합성 처리에만 사용하며, <b>우리 서버에는 저장하지 않습니다</b>.
            합성 처리를 위해 Replicate(미국)로 전송되며(아래 5항 국외이전 참조), 원본을 별도로 보관하거나
            다른 목적으로 이용하지 않습니다.
          </li>
          <li>
            <b>진단 답변·이벤트 로그</b>: 수집·이용 목적을 달성할 때까지 보관하며, 목적 달성 후
            지체 없이 파기합니다. 서비스 개선을 위한 진단 답변은 <b>이름·연락처·사진 없이</b>{" "}
            보관하며, 특정 개인을 식별할 목적으로 이용하지 않습니다.
          </li>
          {/* 카카오 로그인 활성화(KAKAO_LOGIN_ENABLED) 시에만 노출 */}
          {KAKAO_LOGIN_ENABLED && (
            <li>
              <b>카카오 로그인 정보</b>: 회원 탈퇴 또는 로그인 기능 종료 시까지 보관 후 지체 없이 파기.
            </li>
          )}
          <li>관련 법령이 별도 보존을 요구하는 경우 해당 기간 동안 보관합니다.</li>
        </ul>
      </Section>

      <Section title="4. 개인정보 처리위탁">
        <p>서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁합니다.</p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-2">
                <th className="py-2 pr-4 font-semibold">수탁업체</th>
                <th className="py-2 font-semibold">위탁 업무</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-black/[0.05] [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">
              <tr><td>Supabase</td><td>진단·이벤트 데이터 저장·관리</td></tr>
              <tr><td>Vercel</td><td>서비스 호스팅</td></tr>
              <tr><td>Replicate, LLC (미국)</td><td>AI 헤어스타일 합성 처리(얼굴 이미지 포함)</td></tr>
              <tr><td>Google (Google Sheets)</td><td>개인식별정보를 제외한 진단 답변 집계·분석</td></tr>
              {SENTRY_ENABLED && (
                <tr><td>Sentry</td><td>오류 모니터링(에러 로그·요청 경로·기기/브라우저 정보)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="5. 개인정보 국외이전">
        <p>
          AI 합성을 위해 이용자의 <b>얼굴 이미지</b>가 <b>Replicate(미국)</b>로 이전되어 처리됩니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>이전받는 자: Replicate, LLC (미국 / 101 Townsend Street, San Francisco, CA 94107, USA)</li>
          <li>이전받는 자의 연락처: privacy@replicate.com</li>
          <li>
            이전받는 자의 개인정보 처리방침:{" "}
            <a href="https://replicate.com/privacy" target="_blank" rel="noreferrer"
              className="font-medium underline underline-offset-2">
              replicate.com/privacy
            </a>
          </li>
          <li>이전 항목: 셀카(얼굴) 이미지</li>
          <li>이전 목적: AI 헤어스타일 합성</li>
          <li>이전 방법: 합성 처리 시점에 네트워크를 통해 전송</li>
          <li>이전받는 자의 데이터 처리: Replicate은 원본 입력·출력을 모델 학습에 사용하지 않으며, 서비스 개선에는 익명·집계된 이용 통계만 사용합니다(생성 결과물의 권리는 이용자에게 귀속). 출처: replicate.com/terms.</li>
          <li>보유·이용기간: 서비스는 원본 사진을 서버에 저장하지 않습니다(위 3항). 전송받은 Replicate는 API 예측의 입력·출력·로그를 기본적으로 1시간 후 자동 삭제합니다(출처: replicate.com/docs/topics/predictions/data-retention. 법령이 요구하는 경우 연장될 수 있습니다).</li>
          <li>
            국외이전 거부 방법 및 효과: 로그인 시 동의 화면의 필수 항목(개인정보·약관·사진의 국외이전)은 각각 선택할 수 있으나,{" "}
            <b>국외이전에 동의하지 않으면 진행 버튼이 활성화되지 않아 다음 단계로 넘어갈 수 없습니다.</b>{" "}
            국외이전에 동의하지 않는 것이 거부 방법이며, 이 경우 얼굴 사진을 이용하는 AI 헤어스타일 합성 기능을 이용할 수 없습니다(서버도 합성 요청을 거부합니다). 다만 얼굴 사진이 필요 없는 진단 설문·결과 안내 등은 이용하실 수 있습니다.
          </li>
        </ul>
        <p className="text-[13px] text-ink-2">
          ※ Vercel·Supabase·Google 등 다른 수탁업체의 서버 소재지에 따라 추가 국외이전이 발생할 수 있으며,
          구체적 리전은 확정 후 반영합니다.
        </p>
        {SENTRY_ENABLED && (
          <>
            <p>
              서비스 오류 모니터링을 위해 이용자의 <b>오류 정보</b>가 <b>Sentry(미국)</b>로 이전되어 처리됩니다.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>이전받는 자: Functional Software, Inc. (d/b/a Sentry)</li>
              <li>이전 국가: 미국</li>
              <li>
                이전 항목: 서비스 오류 발생 시의 오류 메시지, 스택 트레이스, 브라우저·기기 정보, 오류 발생 페이지 주소
                <ul className="mt-1 list-none space-y-0.5 pl-0 text-[13px] text-ink-2">
                  <li>※ 얼굴 이미지는 전송하지 않습니다</li>
                  <li>※ IP주소·쿠키는 전송하지 않도록 설정되어 있습니다(sendDefaultPii=false)</li>
                </ul>
              </li>
              <li>이전 목적: 서비스 오류 감지 및 안정성 개선</li>
              <li>이전 일시 및 방법: 오류 발생 시점에 네트워크를 통한 자동 전송</li>
              <li>보유·이용 기간: Sentry 보관정책에 따른 기간(최대 90일) 또는 이용목적 달성 시까지</li>
            </ul>
            <p className="text-[13px] text-ink-2">
              ※ 쿼리스트링·쿠키·인증정보는 제거되나, 오류 메시지·스택 내용까지 완전한 제거를 보장하지는 못합니다.
            </p>
          </>
        )}
      </Section>

      <Section title="6. 이용자의 권리와 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다.
          현재 서비스 내 자동 삭제(회원 탈퇴) 기능은 제공하지 않으며, 아래 개인정보 보호책임자
          이메일로 요청하시면 <b>접수일로부터 10일 이내</b>에 조치 여부와 그 결과를 알려드립니다.
        </p>
        <p className="text-[13px] text-ink-2">
          ※ 다만 다음은 삭제 대상에서 제외될 수 있습니다: 관련 법령상 보존이 필요한 정보,
          동의 사실을 입증하기 위한 동의 기록, 그리고 개인을 식별할 수 있는 정보를 제외한 집계·분석 자료.
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
          <li>성명: 김진성</li>
          <li>이메일: beclassyhairs@gmail.com</li>
        </ul>
      </Section>

      <Section title="9. 고지의 의무">
        <p>
          본 방침의 내용 추가·삭제·수정이 있을 경우 시행일 전에 서비스 내 공지를 통해 안내합니다.
          본 방침의 시행일: 2026년 8월 8일 (개정: AI 합성 수탁사를 Replicate로 변경).
        </p>
      </Section>

      <p className="mt-10 text-[13px]">
        <Link href="/terms" className="font-semibold text-ink underline underline-offset-2">이용약관 보기 →</Link>
      </p>
    </main>
  );
}
