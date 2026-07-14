# /style 뒤 4문항 케어 문구 — v3 검수 보관소

## 목적
`/style` 결과지 뒤 4문항(density/thickness/curl/historyCount) 기반으로 생성한
108개 모질 진단 문구를 검수하기 위한 보관 폴더입니다.

## 현재 방향
`primaryConcern`(손상도 중심 8버킷) 구조를 폐기하고, **모질 중심 구조**로 전환했습니다.

## 우선순위
1. **curl** — 곱슬기 (직모 / 반곱슬 / 강한 곱슬)
2. **thickness** — 모발 굵기 (굵음 / 보통 / 얇음)
3. **density** — 모발 숱 (많음 / 보통 / 적음)
4. **historyCount** — 시술 횟수/손상도 (modifier)

기본 타입은 `curl × thickness × density = 27개`이며, 여기에 `historyCount` 4단계가
모디파이어로 붙어 총 `27 × 4 = 108개` 조합이 됩니다.

## 핵심 원칙
**손상도는 결과 제목을 결정하지 않습니다.**
손상도(`historyCount`)는 `hairTypeKey`/`hairTypeTitle`을 절대 바꾸지 않고,
오직 시술 가능성(`procedureHint`), 케어 강도(`homeCare`), 주의사항(`damageCaution`)을
조절하는 보정값으로만 사용됩니다. 같은 모질 타입이면 시술 이력이 몇 회든
제목과 모질 설명은 동일하게 유지됩니다.

## 생성 파일 설명
| 파일 | 설명 |
|---|---|
| `care_matrix_v3.json` | 원본 데이터 (108행, 전체 필드) |
| `care_matrix_v3.csv` | 엑셀/구글시트로 열어 검수하는 용도 |
| `care_matrix_v3.md` | Markdown 표 (108행 전체) |
| `care_matrix_review_v3.html` | 브라우저에서 필터링하며 검수하는 standalone HTML |
| `gen_care_matrix_v3.mjs` | 108개 조합 데이터를 생성하는 스크립트 (문구 수정 시 여기를 고치고 재실행) |
| `gen_review_html_v3.mjs` | 위 JSON을 읽어 `care_matrix_review_v3.html`을 만드는 스크립트 |

두 스크립트는 이 폴더 안에서 `node gen_care_matrix_v3.mjs` → `node gen_review_html_v3.mjs`
순서로 실행하면 같은 폴더에 있는 `care_matrix_v3.json`을 읽고 결과물을 그대로
재생성합니다(경로 의존성 없음, 이 폴더 밖의 파일을 참조하지 않습니다).

## 브라우저에서 여는 방법
`care_matrix_review_v3.html` 파일을 더블클릭하거나, 크롬 주소창에 아래처럼
`file:///` 경로를 직접 입력해서 열면 됩니다. 데이터가 파일 안에 그대로 들어있어
인터넷 연결 없이도 바로 동작합니다.

## 다음 작업
사용자가 27개 기본 모질 타입(`hairTypeTitle`/`textureSummary`/`styleDirection`)과
108개 손상도 modifier 문구(`procedureHint`/`damageModifier`/`damageCaution`/`homeCare`/
`avoid`/`salonRequest`/`recommendedCareTags`)를 이 폴더의 HTML/CSV로 검수한 뒤,
확정된 문구만 골라서 `app/style/recommend.ts`와 `app/style/result/page.tsx`에
반영할 예정입니다. 이 폴더의 파일들은 검수 전용이며, 아직 실제 서비스 코드에는
반영되지 않았습니다.
