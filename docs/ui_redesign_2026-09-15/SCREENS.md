# 화면 인벤토리 (2026-09-15)

> 화면별 적용 원칙(PRINCIPLES.md P1~P10)·바꿀 것·유지할 것. **before 스크린샷은 Phase 2 각 화면 시작 시 390px dev로 `shots/{화면}_before.png` 저장**(중복 캡처 회피). after는 교체 후.
> 유지 = 불가침(로직·문장·선공개 구조·계측·법적). 바꿀 것 = 위치·크기·여백·카드형태·CTA 배치뿐.

| # | 화면 | 파일 | 적용 원칙 | 바꿀 것(시각만) | 유지(불가침) |
|---|---|---|---|---|---|
| ① | /style 랜딩 | app/style/page.tsx | P2 P5 P8 P10 | 히어로 신뢰배지 크게·CTA 하단고정 56·본문 17·첫화면 "무료 진단" 명확 | 워드마크·문구·무료횟수 계측·CTA 링크 |
| ② | /style 설문(8문항+시술이력) | app/style/survey/page.tsx | P1 P2 P6 P7 | 선택지 카드형(라벨 큼+desc15+)·진행 n/8 상단고정·이전 좌상단·터치56 | 자동진행 로직·pending 가드·설문 스키마·문항/선택지 문구 |
| ③ | /style 업로드(가이드·카메라·크롭) | app/style/upload/page.tsx | P2 P5 P7 P10 | 가이드 아이콘+라벨·촬영 버튼 56 하단·크롭 안내 17 | 동의 게이트·셀카 미저장 안내·업로드 로직 |
| ④ | /style 접수 | app/style/loading/page.tsx | P2 P10 | 스피너+"결과지 준비" 17·에러/한도 카드 크게 | kickoff·게이트·429→결과지·폴링 0(단일 poller) |
| ⑤ | /style 결과지 | app/style/result/page.tsx | P1 P2 P3 P4 P8 | 카드 여백·라벨 크기·PhotoSlot 전후 대비·제품카드 형태·CTA 우선순위·FadePreview 접힘 첫3줄17 | 선공개 5상태·sticky 띠·헤더순서·본문 기본펼침·무점프·계측·resolver 텍스트 |
| ⑥ | /home·/my-hair | app/home/page.tsx · app/my-diary(나의 헤어) | P1 P3 P7 | 카드 밀도↓·완성도 게이지·나의 스타일 카드 여백·하단탭 라벨 | 카드 링크(빈→/style·채움→/my-diary)·저장 스키마·완성도 로직 |
| ⑦ | /damage-check 랜딩·설문 | app/damage-check/page.tsx · survey/page.tsx | P2 P5 P6 P7 P8 | 히어로 결견본·CTA 하단·선택지 카드형·진행표시·시술이력 렌더러 카드화 | 히어로 이미지·설문 로직·TreatmentHistoryStep 로직·문구 |
| ⑧ | /damage-check 결과지 | app/damage-check/result/page.tsx | P1 P2 P3 P8 | 레벨 스탬프 히어로 크게·예언 door/aha/tip 세 덩어리 시각구분·흰머리 접힘·제품카드 | 선공개 구조·resolver 텍스트·게이트·계측 |
| ⑨ | /login/consent | app/login/consent/page.tsx | P1 P2 P7 | 동의 항목 카드·전체동의 버튼 56·전문보기 라벨 | 동의 항목·법적 문구·국외이전 고지·게이트 순서·카카오 로그인 로직 |
| ⑩ | /items(있으면) | app/items/page.tsx | P1 P2 P3 | 상품 카드 저밀도·큰 이름·구매버튼 56 | purchase_click·product_clicked 계측·allowlist·링크 |

## 공통(모든 화면)
- AppHeader(뒤로 좌상단 아이콘+라벨 / 제목 / 우측 최대 1개) — P7.
- BottomCTA(하단 고정, 주 행동 1개) — P1 P5.
- 본문 17 / 보조 15 / 터치 56 / 대비 AA — 강제 기본선.
- 구 팔레트(gold/brown/accent/champagne) 사용처 제거·아이보리+차콜로 — P9.

## 캡처 계획
- 각 화면 Phase 2 진입 시: `resize 390` → dev 렌더(설문·결과지는 sessionStorage 주입) → `shots/{화면}_before.png`. 교체 후 `_after.png`.
- Phase 4에서 360·390·430 3폭 전화면 재캡처.
