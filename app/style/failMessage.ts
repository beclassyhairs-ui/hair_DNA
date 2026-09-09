// ============================================================================
// app/style/failMessage.ts — 합성 실패 사유 코드 → 손님 안내(5종) 단일 출처.
//   접수 페이지(kickoff 실패)·결과지 PhotoSlot(생성 실패)가 같은 문구를 쓴다(드리프트 방지).
//   🟡-11: 사유마다 title·hint·button(다음 행동)이 실제로 달라야 한다. 한국어 평서문·에러코드/영어 없음.
// ============================================================================

export function failMessage(reason: string | null): { title: string; hint: string; button: string } {
  // ① 얼굴/사진 내용 문제 — 사진을 바꿔야 풀린다(재시도만으론 안 됨).
  if (reason === "content_flagged" || reason === "face_not_detected") {
    return {
      title:  "얼굴이 잘 안 보여요",
      hint:   "밝은 곳에서 얼굴이 정면으로 크게 나오게, 앞머리로 눈·이마를 가리지 않고 다시 찍어주세요.",
      button: "사진 다시 찍기",
    };
  }
  // ② 사진 파일 자체 문제(누락·형식·용량) — 다른 사진을 고르면 된다.
  if (reason === "missing_photo" || reason === "invalid_photo_format") {
    return {
      title:  "사진을 다시 선택해 주세요",
      hint:   "사진이 제대로 안 올라갔어요. 다른 사진으로 다시 골라주세요.",
      button: "사진 다시 선택",
    };
  }
  // ③ 네트워크 끊김 — 손님 쪽 연결 문제.
  if (reason === "network") {
    return {
      title:  "연결이 잠깐 끊겼어요",
      hint:   "와이파이나 데이터 연결을 확인하신 뒤 다시 시도해 주세요.",
      button: "다시 시도",
    };
  }
  // ④ 시간 초과(콜드스타트) — 첫 요청이 GPU를 깨우느라 오래 걸린 경우.
  if (reason === "poll_timeout") {
    return {
      title:  "준비에 시간이 너무 오래 걸렸어요",
      hint:   "다시 눌러주시면 이번엔 금방 나와요. 잠깐만 기다려 주세요.",
      button: "다시 시도",
    };
  }
  // ⑤ 그 외 일시/서버 문제.
  return {
    title:  "지금 잠시 붐볐어요",
    hint:   "잠시 후 다시 시도하면 정상적으로 완성돼요.",
    button: "다시 시도",
  };
}
