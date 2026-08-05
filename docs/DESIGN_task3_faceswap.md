# Task 3 — faceswap 전환 설계 (구현·비용 前 확정본)

> 2026-08-05. flux-kontext 텍스트생성($0.04) → 옛 faceswap($≈0.01) 복원. Codex 3회 반론검증 반영.
> 🔒 §0 절대규칙: 레퍼런스 사진은 읽기만(이동·수정·재생성 0). 구현·비용발생은 사업주 승인 후.

## A. 확정 사실
1. 현재 = flux-kontext-pro(`/v1/models/.../predictions`, `input_image`+거대 prompt). **레퍼런스 미사용**(pickReferenceUrl dead). $0.04/run.
2. 옛 faceswap(git `e513e3e^`, 6/25) = codeplugtech/face-swap(`/v1/predictions`+version hash). 입력 `{target_image:레퍼런스 공개URL, swap_image:셀카}`. 레퍼런스가 스타일 캐리어(프롬프트 불필요). ※task는 lucataco/faceswap 지칭 — 마지막 동작본은 codeplugtech. **모델·해시 확정은 PM+사업주(Replicate 계정)**.
3. 가드레일(로그인401·동의403 fail-closed·일일한도429=비용상한)·예산·blob업로드·finally 셀카 즉시삭제 = 전부 faceswap 이후 추가 → 옛 route.ts엔 없음.
4. 경로 스킴 불일치(코드 group_2040·wave/layer·1.jpg vs 실제 무나이·len/weight/curl·UUID).
5. **60장 git 미추적(미배포)**. default_style.jpg 커밋됐으나 로컬삭제. group_2040 디스크 부재(이미 무나이).
6. 유저노출·/privacy에 모델명 없음. 국외이전=얼굴→Replicate 미국(faceswap도 동일).

## B. 설계 — 최소침습 그래프트 (Codex: revert 금지, 그래프트 옳음)
현재 가드된 handler 유지, **모델 호출부만 교체**:
1. 엔드포인트 `/v1/predictions`(+`REPLICATE_VERSION` immutable 해시, fail-fast, canary, 롤백절차). 과거 해시 재사용 금지 — 배포 직전 Replicate에서 유효성 확인.
2. `buildReplicateInput` → `{target_image, swap_image}`. prompt 제거(buildHairStylePrompt는 dead 보존).
3. **레퍼런스 해석 = 빌드타임 manifest**(Codex P0): Vercel 서버리스가 `public/`을 런타임 FS에 안 담을 수 있어 `fs.readdir` 불신뢰 → 빌드 시 `references-manifest.json`(slot→파일목록) 생성, 런타임은 manifest에서 정렬 후 랜덤 픽. 경로 traversal·대소문자·순서 문제 동시 제거.
4. 경로 매핑 재작성: `/references/<len>/<heavy|medium|light>/<curl>/`, age 제거, layer 항등(none/soft/rich remap 폐기), shoulder→collarbone 레거시. len/layer/curl은 **allowlist 검증**(survey 도메인) 후 사용.
5. target_image=manifest 픽 공개URL, swap_image=기존 blob 셀카URL.

## C. 커버리지 밖 폴백
- slot 파일≥1 → 랜덤. 빈/없음 → 체인: 같은 len·같은 layer 다른 curl → 같은 len 아무 slot → 최종 default.
- **default 부재** → 사업주가 대표 폴백 1장 지정(임의생성 금지). manifest에 포함·200 확인.
- localhost dev: Replicate 미접근 → 기존 LOCAL_DEV_REFERENCE_URL 패턴(프로덕션 미사용).

## D. 🔴 P0 출시 블로커 (Codex)
1. **60장 + 지정 default가 프로덕션에 배포·외부 공개URL 200**. (커밋은 내용보존이라 §0 위반 아님 — 사업주 승인下 파일단위.)
2. 빌드타임 manifest로 번들 추적성 확보(런타임 FS 의존 제거).
3. **유효 version hash 확정 + 실제 Replicate canary 1회 성공**.
4. len/layer/curl allowlist + 기준 디렉터리 containment(traversal 차단).
5. 배포 후 smoke test: 전 slot URL 200·MIME·크기, 각 설문조합이 exact/명시 fallback으로 해석, default 200, canary 1회.

## E. P1 회귀·품질
- `/v1/predictions` 비동기(starting/processing 폴링)·output·실패 응답을 현재 handler가 올바로 처리하는지 확인(엔드포인트 형식 다름).
- **faceswap 품질기대 불일치**(Codex P1): 얼굴만 스왑→레퍼런스의 헤어색·조명·피부톤 유지→"내 얼굴에 이 헤어" 기대 대비 flux보다 체감 열화 가능(특히 색차·측면 레퍼런스). 완화: 정면·조명 호환 레퍼런스 선별(Task 1에서 대부분 정면 확인됨), 품질 임계/폴백, UI "스타일 참고 합성" 고지 검토.
- 공개 target_image egress/hotlink/URL불변성 → 콘텐츠해시 불변URL·장기캐시·모니터링.
- 폴백 단계 관측성·exact-match 비율 metric, 픽한 reference ID 로깅.

## F. 가드레일 회귀 체크리스트 (배포 전 전수)
로그인401 / 동의403 fail-closed / 일일한도429(SERVER_DAILY_MAX=5=비용상한) / 예산·finally 즉시삭제 / 셀카 blob 업로드 — **한 줄도 훼손 없이 보존**.

## G. 문구·비용
/privacy·upload 무변경(모델명 미노출·국외이전 동일). UI "스타일 참고" 고지는 선택(품질 기대관리). $0.04→~$0.01, 일일한도로 상한 유지.

## H. Codex 판정
"방향은 맞지만 치명 구멍 있음 — 미배포 60장·default 부재·traversal 방어·version canary·faceswap 제품기대까지 P0로 닫혀야 안전." 최소침습 그래프트 자체엔 치명 구멍 없음(회귀 테스트 전제).
