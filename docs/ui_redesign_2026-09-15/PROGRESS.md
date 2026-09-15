# UI 개편 라운드 진행 (재개용) — 2026-09-15~

> 매 단계 갱신. 재개 시 이 파일부터 읽고 "다음 할 일"로 이어간다.

## 불가침(수정 금지) — 세션마다 재확인
app/api/** · lib/**(훅·폴링·폴백·계측·quota·게이트·세션핑·loginGate·attestation·coupangCards 데이터) ·
useHairTransformJob · hairJobConstants · verifyFallbackEligibility · resolver/** · copy-drafts/**(text·id·status) ·
결과지 선공개 구조(접수→즉시 결과지·PhotoSlot 5상태·sticky 띠·본문 기본펼침·무점프) ·
계측 이벤트(이름·meta·발화시점) · 법적 문구·링크 · 로그인/동의 게이트 순서 · 확정106 금지어 · copy:check · 하네스(fallback14·invariant9).
**문장 무변경**(고치고 싶으면 COPY_SUGGESTIONS.md에 적기만).

## 현재 상태
- **Phase 0 진행 중.**
  - [x] 0-1 벤치마크 리서치(WebSearch·WebFetch). 퀸잇=큰 글씨·화면당 1상품·저밀도·큰 결제버튼·터치최소. 마메드네=사진1장→전/후→예약·디자이너 포트폴리오 신뢰. ⚠️ 스토어 스크린샷 이미지 추출 불가(마크다운 변환) — 문서화 UX+리뷰 근거.
  - [x] 0-3 PRINCIPLES.md(원칙 10 + 강제 5060 기본선).
  - [x] 0-5 frontend-design SKILL.md 읽음 → 절제·의도적 토큰·스크린샷 자기비평 반영(단 5060·기존브랜드·무로직/무카피 우선).
  - [ ] 0-4 SCREENS.md(화면 인벤토리 + 390px before 스크린샷).
- 기존 토큰: `app/globals.css`(:root SSOT) + `tailwind.config.ts`(var 참조). body=16·aux=14(→5060 위반: body≥17·보조≥15로 상향 예정). 포인트=차콜 CTA, 배경 아이보리. 구 팔레트(gold/brown/accent) 잔존.

## 다음 할 일
1. Phase 0-4: SCREENS.md — dev(390px) 스크린샷으로 화면 인벤토리.
2. Phase 1: 토큰 갱신(body17·aux15·터치56·대비 AA·구팔레트 정리) + 공통 컴포넌트(AppHeader/BottomCTA/SectionCard/ProgressDots/ChoiceButton/ProductCard/Notice). 커밋 1(화면변화 0). tsc 0.
3. Phase 2: 화면별 교체(①style랜딩 → ⑩items). 화면당 커밋1 + before/after 캡처.
4. Phase 3: Codex 3그룹(A style랜딩~접수 / B style결과지+home / C damage+login).
5. Phase 4: 회귀(fallback14·invariant9·tsc0·copy:check·lint변동0) + 5폭상태 캡처 + PROJECT_STATE + 보고. push 전 멈춤.

## 커밋 로그(이 라운드)
- (없음 — Phase 0 문서만, 아직 미커밋)

## 미해결/메모
- 스토어 스크린샷 이미지 미확보 → 원칙은 문서화 UX 근거. 필요 시 사장님이 두 앱 실제 화면 공유하면 보강.
