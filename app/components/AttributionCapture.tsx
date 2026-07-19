"use client";

// ============================================================================
// 어뷰티 — UTM 어트리뷰션 캡처 (앱 전역, 마운트 시 1회)
//
// 유저가 처음 들어올 때 URL의 utm_source/utm_medium/utm_campaign을 first-touch로
// localStorage에 고정 저장한다(lib/eventTracking.captureAttribution). 이후 내부 이동으로
// URL에서 utm이 사라져도 이 유저의 모든 이벤트에 같은 유입 출처가 실려간다.
// layout.tsx에서 <AttributionCapture /> 한 줄로 사용한다. 렌더 결과는 없다(null).
// ============================================================================

import { useEffect } from "react";
import { captureAttribution } from "../../lib/eventTracking";

export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
