"use client";

// ============================================================================
// ConsultChannel — 문의 창구(카카오 채널) 진입 블록. 홈·결과지 공용.
//   문구(title/body)는 화면 맥락에 맞게 호출부에서 넣는다. 링크·가드·새탭·트래킹은 공통.
//   CONSULT_CHANNEL.enabled && href 아니면 렌더 자체를 안 함("갈 곳 없음" 차단).
//   ★ 새 탭(target=_blank, rel=noopener)으로 열어 앱에서 이탈하지 않게 한다.
// ============================================================================

import { CONSULT_CHANNEL } from "@/lib/consultChannel";
import { trackEvent } from "@/lib/trackEvent";

export default function ConsultChannel({
  title,
  body,
  source,
}: {
  title: string;
  body: string;
  /** 클릭 트래킹 구분용(홈/결과지 등 진입점 식별). 이벤트명은 consult_channel_click 공통. */
  source: string;
}) {
  if (!CONSULT_CHANNEL.enabled || !CONSULT_CHANNEL.href) return null;

  return (
    <a
      href={CONSULT_CHANNEL.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("consult_channel_click", { source })}
      className="block rounded-2xl bg-soft p-4 transition-colors active:opacity-80"
    >
      <p className="text-emphasis font-bold text-ink">{title}</p>
      <p className="mt-1 text-body leading-snug text-sub">{body}</p>
      <span className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-ink px-5 py-2.5 text-body font-semibold text-white">
        카카오톡으로 문의하기 →
      </span>
    </a>
  );
}
