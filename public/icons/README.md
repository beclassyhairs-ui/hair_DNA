# 문진 일러스트 아이콘

`app/diagnosis/Illustrations.tsx` 가 next/image로 불러오는 아이콘 파일을 여기에 넣습니다.
미니멀·세련된 라인아트 무드 권장. 정사각형(권장 256×256 이상, 투명 배경 PNG).

## 필요한 파일 목록

### Q13 헤어 디자인
- `q13_straight.png` — 생머리
- `q13_curl.png` — C컬·S컬
- `q13_wave.png` — 웨이브

### Q14 층 / 레이어
- `q14_none.png` — 층 없음(원랭스)
- `q14_soft.png` — 약한 레이어
- `q14_rich.png` — 풍성한 레이어
- `q14_face.png` — 얼굴 라인 레이어

### Q15 볼륨 위치
- `q15_crown.png` — 정수리
- `q15_all.png` — 전체
- `q15_front.png` — 앞머리
- `q15_back.png` — 뒤통수

> 파일이 없으면 해당 위치의 이미지는 깨져 보이지만, 페이지 동작에는 문제 없습니다.
> 파일명을 바꾸려면 `Illustrations.tsx` 의 `ICON_SRC` 매핑을 함께 수정하세요.
