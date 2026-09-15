# UI 개편 라운드 진행 (재개용) — 2026-09-15~

> 매 단계 갱신. 재개 시 이 파일부터 읽고 "다음 할 일"로 이어간다.

## 불가침(수정 금지) — 세션마다 재확인
app/api/** · lib/**(훅·폴링·폴백·계측·quota·게이트·세션핑·loginGate·attestation·coupangCards 데이터) ·
useHairTransformJob · hairJobConstants · verifyFallbackEligibility · resolver/** · copy-drafts/**(text·id·status) ·
결과지 선공개 구조(접수→즉시 결과지·PhotoSlot 5상태·sticky 띠·본문 기본펼침·무점프) ·
계측 이벤트(이름·meta·발화시점) · 법적 문구·링크 · 로그인/동의 게이트 순서 · 확정106 금지어 · copy:check · 하네스(fallback14·invariant9).
**문장 무변경**(고치고 싶으면 COPY_SUGGESTIONS.md에 적기만).

## 현재 상태 (2026-09-15 재개)
- **Phase 2 진행 중: ①②완료, 다음 ③ /style 업로드.**
- **스크린샷 도구 필수 사용법(중요)**: `MSYS_NO_PATHCONV=1 node docs/ui_redesign_2026-09-15/_shot.mjs <route-슬래시없이> <width> <out.png> "" <height>`
  예: `MSYS_NO_PATHCONV=1 node docs/ui_redesign_2026-09-15/_shot.mjs style/survey 390 docs/ui_redesign_2026-09-15/shots/03_x.png "" 1200`
  - ⚠️ Git Bash가 `/style`을 `C:/.../Git/style`로 변환 → 반드시 슬래시 없이 넘기고 MSYS_NO_PATHCONV=1.
  - 출력 로그의 `bodyLen>0` + 파일 `>50KB` 여야 정상(수백 바이트/7KB=blank).
  - before 샷: 화면 편집 **전에** 캡처하거나, 커밋된 경우 `git show <commit>~1:파일 > 파일`로 임시 교체 후 캡처→`git checkout -- 파일` 복원.
- **명령 권한**: `npx`/`npm run`은 이 세션에서 거부됨 → tsc는 `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`, copy:check는 `node .../tsc -p copy-drafts/tsconfig.check.json && node copy-drafts/.build/copy-drafts/check.js`로 직접 실행.
- **temp 미정리(rm 차단)**: `docs/ui_redesign_2026-09-15/_diag.mjs`, `shots/_diag_full.png`, `shots/_diag_viewport.png` — 사장님 수동 삭제.

### 이전 상태
- **Phase 0 완료·커밋 `dddceab`** / **Phase 1 토큰 완료(커밋 예정).**
  - Phase 1-1 토큰(tailwind.config·globals): body 16→17·aux 14→15·h1 22→24·h2 18→19·emphasis 16→17 / --ink-3 #b7b0a5→#7a7268(WCAG AA). tsc 0. /style 랜딩 390 렌더 확인(새 토큰 반영).
  - Phase 1-2 컴포넌트: **기존 세트가 요청 역할을 이미 커버**(TestHeader≈AppHeader·BottomStickyCTA≈BottomCTA·RoundedOptionButton≈ChoiceButton·ProgressBar≈ProgressDots·GlassCard≈SectionCard·CoupangCardList≈ProductCard). 라운드 원칙("갈아엎지 말고 스타일만·props 유지")+"Phase1 화면변화 0" 정합 위해 **컴포넌트 restyle은 화면 바뀌는 Phase 2에서 화면별 before/after와 함께** 수행(신규 컴포넌트는 필요 시 그때 신설). → 설계 선택지 표 참조.
  - ⚠️ **스크린샷 파일 워크플로**: 브라우저 도구 스크린샷은 인라인(내가 봄)이라 shots/*.png **파일 저장 불가**. Phase 2 before/after PNG는 playwright 헬퍼로 저장 예정(프로젝트에 playwright 있음) — 권장안. 이번 토큰 diff는 인라인 확인으로 대체.
- **(구) Phase 0 진행 중.**
  - [x] 0-1 벤치마크 리서치(WebSearch·WebFetch). 퀸잇=큰 글씨·화면당 1상품·저밀도·큰 결제버튼·터치최소. 마메드네=사진1장→전/후→예약·디자이너 포트폴리오 신뢰. ⚠️ 스토어 스크린샷 이미지 추출 불가(마크다운 변환) — 문서화 UX+리뷰 근거.
  - [x] 0-3 PRINCIPLES.md(원칙 10 + 강제 5060 기본선).
  - [x] 0-5 frontend-design SKILL.md 읽음 → 절제·의도적 토큰·스크린샷 자기비평 반영(단 5060·기존브랜드·무로직/무카피 우선).
  - [ ] 0-4 SCREENS.md(화면 인벤토리 + 390px before 스크린샷).
- 기존 토큰: `app/globals.css`(:root SSOT) + `tailwind.config.ts`(var 참조). body=16·aux=14(→5060 위반: body≥17·보조≥15로 상향 예정). 포인트=차콜 CTA, 배경 아이보리. 구 팔레트(gold/brown/accent) 잔존.

## 다음 할 일
1. **⑥ /home·/my-hair** — 시각만. before/after → tsc0 → 커밋.
2. 이어서 ⑦ damage 랜딩·설문 → ⑧ damage 결과지 → ⑨ login/consent → ⑩ items.
   - 게이트/상태 화면은 route mock(`_shot_upload/_loading/_result.mjs` 참고)로 캡처.
3. Phase 3: Codex 3그룹(A style랜딩~접수 / B style결과지+home / C damage+login).
4. Phase 4: 회귀(fallback14·invariant9·tsc0·copy:check·lint변동0) + 5폭상태 캡처 + PROJECT_STATE + 보고. **push 전 멈춤**.

## 커밋 로그(이 라운드)
- `dddceab` Phase 0 문서(PRINCIPLES/SCREENS/PROGRESS)
- `6c8f2ee` Phase 1 토큰(body17·aux15·h1 24·h2 19·ink-3 AA)
- `65fb35e` ① /style 랜딩(P5 하단고정 CTA·P10)
- `acb30c2` 스크린샷 헬퍼 경로버그 수정 + ① 샷 재캡처(blank→정상)
- `55c5d78` ② /style 설문(P2 선택지 크게·P7 뒤로 좌상단·P3 저밀도)
- `c162fe5` PROGRESS 갱신
- `4f66536` ③ /style 업로드(P2 선택버튼 크게·P7 PhotoGuide 뒤로) — 카메라 뷰파인더 대상 외
- `70ced5f` PROGRESS 갱신
- `45a21ce` ④ /style 접수(P2 에러버튼 터치56·17) — 접수/킥오프 로직 무변경
- `377cfd8` PROGRESS 갱신
- `1797630` ⑤ /style 결과지(P2 본문17·보조15) — 선공개/PhotoSlot/계측/문장 무변경

## 미해결/메모
- 스토어 스크린샷 이미지 미확보 → 원칙은 문서화 UX 근거. 필요 시 사장님이 두 앱 실제 화면 공유하면 보강.
