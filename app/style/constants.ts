export const STYLE_ANSWERS_KEY    = "style:answers";
export const STYLE_PHOTO_KEY      = "style:photo";
export const STYLE_UNLOCKED_KEY   = "style:unlocked";
export const STYLE_GENERATED_KEY  = "style:generated"; // AI 생성 이미지 (Replicate faceswap, data URI)
export const STYLE_DEBUG_ERROR_KEY = "style:debugError"; // AI 합성 실패 시 실제 에러 메시지 (로그/Sentry용 — 손님 화면 미노출)
export const STYLE_FAIL_REASON_KEY = "style:failReason"; // AI 합성 실패 사유 코드 (손님 안내 문구 분기용)
export const STYLE_LIMIT_KEY       = "style:limit";      // 서버 일일 호출 제한 초과 시 친절 안내 문구
export const STYLE_JOB_KEY         = "style:job";        // 진행 중 비동기 합성 작업 {id, token, startedAt} — 새로고침 시 폴링 재개용
export const STYLE_PREWARM_KEY     = "style:prewarmed";  // faceswap GPU 선점 예열 "직전 발사 시각(ms)". 주발사(survey 마운트)=세션 1회, 보조발사(upload 마운트)=직전 180초 초과 시 재점화
// (Phase B에서 가짜 카카오 로그인 플래그 KAKAO_LOGGED_IN_KEY 제거 — 실제 세션은 서버 쿠키 abeauty_session)
