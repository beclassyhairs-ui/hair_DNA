# PROJECT MASTER CODE — A-Beauty (어뷰티)
> 최종 업데이트: 2026-06-25  
> 목적: AI 코딩 작업 시 기억 저장소 (전체 코드 + 아키텍처 백업)

---

## 📁 1. 프로젝트 아키텍처 및 폴더 구조

```
dongan/  (Next.js 14 App Router, Tailwind CSS, TypeScript)
├── app/
│   ├── page.tsx                        ← 루트 랜딩 (/) — 메인 CTA
│   ├── layout.tsx                      ← 전역 레이아웃 + 폰트
│   ├── globals.css                     ← 전역 스타일
│   │
│   ├── style/                          ★ 핵심 서비스 퍼널
│   │   ├── page.tsx                    ← /style 랜딩 (세션 초기화 후 설문으로)
│   │   ├── layout.tsx
│   │   ├── constants.ts                ← sessionStorage 키 상수 모음
│   │   ├── surveyData.ts               ← 8문항 설문 데이터 (Q1~Q8)
│   │   ├── recommend.ts                ← 스타일 추천 엔진 + 케어 처방 + 제품 매핑
│   │   ├── survey/
│   │   │   └── page.tsx                ← Q1~Q8 설문 UI
│   │   ├── upload/
│   │   │   └── page.tsx                ← 셀카 촬영/업로드 + 크롭 UI
│   │   ├── loading/
│   │   │   └── page.tsx                ★ AI 합성 호출 + 15초 광고 로딩
│   │   └── result/
│   │       └── page.tsx                ★ Before/After + 결과지 + 카카오 잠금
│   │
│   ├── my-diary/
│   │   └── page.tsx                    ← 내 다이어리 (UUID 배열 누적 저장)
│   │
│   ├── api/
│   │   ├── hair-transform/
│   │   │   └── route.ts                ★ Replicate Face-Swap 백엔드 API
│   │   ├── submit-diagnosis/
│   │   │   └── route.ts                ← Google Sheets + Blob 저장
│   │   ├── track/
│   │   │   └── route.ts                ← 이벤트 트래킹
│   │   └── style/generate/
│   │       └── route.ts                ← (레거시)
│   │
│   ├── mbti/                           미끼 랜딩 #1 — 헤어 MBTI
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── result/
│   │       └── page.tsx
│   │
│   ├── bangs/                          미끼 랜딩 #2 — 앞머리 추천
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── bangRecommend.ts
│   │   ├── constants.ts
│   │   ├── surveyData.ts
│   │   ├── survey/page.tsx
│   │   ├── upload/page.tsx
│   │   └── result/page.tsx
│   │
│   ├── diagnosis/                      미끼 랜딩 #3 — 모발 진단
│   │   ├── page.tsx
│   │   ├── Illustrations.tsx
│   │   └── surveyData.ts
│   │
│   ├── result/                         (레거시 결과지)
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── masterData.ts
│   │   └── recommend.ts
│   │
│   ├── upload/                         (레거시 업로드)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   │
│   └── components/
│       └── Analytics.tsx               ← GA4 이벤트
│
├── lib/
│   ├── styleReference.ts               ★ 설문값 → /references/ 폴더 매핑 + 프롬프트 빌더
│   ├── sheets.ts                       ← Google Sheets 연동
│   ├── storage.ts                      ← Vercel Blob 연동
│   ├── analytics.ts
│   ├── faceAnalysis.ts
│   ├── imageMatch.ts
│   └── referral.ts
│
├── public/
│   ├── references/                     ★ AI 합성용 레퍼런스 헤어 이미지
│   │   ├── default_style.jpg           ← 폴백 이미지 (폴더 비었을 때)
│   │   ├── group_2040/                 ← 20~40대 그룹
│   │   │   ├── short/                  ← 숏 (1.jpg ~ 5.jpg)
│   │   │   ├── short_bob/              ← 숏단발
│   │   │   ├── bob/                    ← 단발
│   │   │   ├── shoulder/               ← 어깨선
│   │   │   ├── collarbone/             ← 쇄골선
│   │   │   └── chest/                  ← 가슴선
│   │   │       └── [wave]/[layer]/     ← c_curl, s_curl, straight, wave / none, soft, rich
│   │   └── group_5060/                 ← 50~60대 그룹 (동일 구조)
│   ├── images/guide/
│   │   └── guide-full.png              ← 촬영 가이드 이미지
│   └── icons/                          ← 각종 아이콘
│
├── memory/                             ← Claude 자동 메모리
│   ├── MEMORY.md
│   └── project_dongan.md
│
├── .env.local                          ← REPLICATE_API_TOKEN, NEXT_PUBLIC_SITE_URL 등
├── next.config.mjs
├── package.json
└── tailwind.config (globals.css 내 inline)
```

---

## 🧠 2. 핵심 비즈니스 로직 및 퍼널 요약

### 전체 유저 퍼널 흐름

```
/ (루트 랜딩)
  └→ 세션 초기화 (answers, photo, generated, unlocked 전부 삭제)
  └→ [나의 맞춤 스타일 분석하기] 클릭
     └→ /style/survey (Q1~Q8 설문)
        └→ answers를 sessionStorage["style:answers"]에 저장
        └→ /style/upload (셀카 촬영/업로드)
           └→ canvas.toDataURL("image/jpeg", 0.9) → Base64
           └→ sessionStorage["style:photo"]에 저장
           └→ /style/loading (★ 핵심 로딩 페이지)
              └→ Promise.allSettled([15초 타이머, AI API 호출]) 병렬 실행
                 ├→ [15초 타이머] — Google AdSense 노출 보장
                 └→ [AI API] — POST /api/hair-transform
                    └→ 성공: sessionStorage["style:generated"] = imageUrl
                    └→ 실패: sessionStorage["style:debugError"] = 에러메시지
              └→ 둘 다 완료되면 /style/result 로 이동
                 └→ Before/After 이미지 표시
                 └→ 카카오 로그인 잠금 (결과 언락)
                 └→ 스타일명 + 케어 처방 + 추천 제품 표시
                 └→ [다이어리 저장] → /my-diary
```

### 상태 관리 (sessionStorage 키)

| 키 | 내용 | 저장 시점 |
|---|---|---|
| `style:answers` | 설문 답변 JSON | 설문 완료 시 |
| `style:photo` | 셀카 Base64 dataURL | 사진 확정 시 |
| `style:generated` | AI 합성 결과 이미지 URL | loading 페이지 API 성공 시 |
| `style:unlocked` | 카카오 잠금 해제 여부 | 카카오 로그인 완료 시 |
| `style:debugError` | API 에러 메시지 | API 실패 시 (디버그용) |
| `abeauty:kakaoLoggedIn` | 카카오 세션 여부 | localStorage |
| `abeauty:diaryEntries` | 다이어리 배열 | localStorage |

### 레퍼런스 이미지 랜덤 픽 + Fallback 로직

```
pickReferenceUrl(answers, baseUrl):
  1. getStyleDirectoryPath(answers) 로 폴더 경로 계산
     - q1_age  → group_2040 or group_5060
     - q11_length → short / short_bob / bob / shoulder / collarbone / chest
     - q13_design → straight / c_curl / s_curl / wave
     - q14_layer  → none / soft / rich
     결과 예: "/references/group_2040/bob/c_curl/soft/"

  2. Math.random() 으로 1~5 중 startIdx 결정
  3. {startIdx}.jpg 파일이 public/ 에 존재하는지 fs.access() 체크
  4. 없으면 다음 인덱스로 순환 (최대 5회)
  5. 5장 전부 없으면 → baseUrl + "/references/default_style.jpg" 폴백

  로컬(localhost): Replicate 서버가 접근 불가 → LOCAL_DEV_REFERENCE_URL 고정
  프로덕션(Vercel): 정상 동작
```

### Replicate API 통신 규격

```
모델:     lucataco/faceswap
해시:     9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d
엔드포인트: POST https://api.replicate.com/v1/predictions

헤더:
  Authorization: Bearer {REPLICATE_API_TOKEN}
  Content-Type: application/json
  Prefer: wait=55   ← 55초 동기 대기

바디:
{
  "version": "9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d",
  "input": {
    "target_image": "https://...절대URL/references/group_2040/bob/c_curl/soft/3.jpg",
    "swap_image":   "data:image/jpeg;base64,/9j/4AAQ..."
  }
}

응답 케이스:
  - succeeded (동기): data.output[0] = 결과 이미지 URL
  - processing:       data.urls.get = 폴링 URL → 2.5초 간격 폴링 (최대 50초)
  - error:            data.error = 에러 문자열
```

### 수익화 구조

1. **Google AdSense** — loading 페이지 300×250 영역 (15초 강제 노출)
2. **쿠팡 파트너스** — 결과지 맞춤 제품 2개 + 다이어리 재구매 링크
3. **알림 신청** — 결과지 하단 CTA (이메일 수집 → 추후 마케팅)

---

## 💻 3. 데이터 구조 원본 — `surveyData.ts`

```typescript
// ============================================================================
// 어뷰티 스타일 서비스 — 4×4 마이크로 설문 데이터
// STEP 1: 희망 스타일 결정 (4문항)
// STEP 2: 모질 및 시술 상태 파악 (4문항)
// ============================================================================

export type StyleAnswers = Record<string, string>;

export interface StyleOption {
  id:    string;
  label: string;
  desc?: string;
}

export interface StyleQuestion {
  id:      string;
  no:      string;
  title:   string;
  hint?:   string;
  options: StyleOption[];
}

export interface StyleStep {
  label:     string;
  questions: StyleQuestion[];
}

export const STYLE_SURVEY: StyleStep[] = [
  {
    label: "STEP 1 · 희망 스타일",
    questions: [
      {
        id:    "q1_age",
        no:    "Q1",
        title: "연령대를 선택해 주세요",
        hint:  "나이대에 맞는 최적의 스타일을 추천해 드려요",
        options: [
          { id: "age_20", label: "20대" },
          { id: "age_30", label: "30대" },
          { id: "age_40", label: "40대" },
          { id: "age_50", label: "50대" },
          { id: "age_60plus", label: "60대 이상" },
        ],
      },
      {
        id:    "q11_length",
        no:    "Q2",
        title: "원하는 머리 기장을 골라주세요",
        options: [
          { id: "short",      label: "숏",    desc: "귀 위로 올라오는 길이" },
          { id: "short_bob",  label: "숏단발", desc: "귀 아래~턱 선" },
          { id: "bob",        label: "단발",   desc: "턱~어깨 선" },
          { id: "shoulder",   label: "어깨선", desc: "어깨 선" },
          { id: "collarbone", label: "쇄골선", desc: "쇄골 선" },
          { id: "chest",      label: "가슴선", desc: "쇄골 아래" },
        ],
      },
      {
        id:    "q14_layer",
        no:    "Q3",
        title: "레이어드 정도를 선택해 주세요",
        hint:  "층을 얼마나 넣을지 결정해요",
        options: [
          { id: "heavy", label: "무거움 (일자)",  desc: "층 없이 무게감 있는 스타일" },
          { id: "medium", label: "중간 (소프트)", desc: "자연스럽게 가벼운 레이어" },
          { id: "light",  label: "가벼움 (허쉬)", desc: "허쉬컷처럼 각도 있는 레이어" },
        ],
      },
      {
        id:    "q13_design",
        no:    "Q4",
        title: "원하는 웨이브를 골라주세요",
        options: [
          { id: "straight", label: "생머리",  desc: "자연스럽고 깔끔한 직모" },
          { id: "c_curl",   label: "C컬",    desc: "부드럽게 안으로 말리는 컬" },
          { id: "s_curl",   label: "S컬",    desc: "S자로 흐르는 자연 웨이브" },
          { id: "wave",     label: "웨이브",  desc: "굵고 풍성한 웨이브" },
        ],
      },
    ],
  },
  {
    label: "STEP 2 · 모질 파악",
    questions: [
      {
        id:    "q8_density",
        no:    "Q5",
        title: "모발 숱은 어느 정도인가요?",
        options: [
          { id: "thick_density", label: "많음",  desc: "숱이 많아 볼륨감 있는 편" },
          { id: "medium_density", label: "보통", desc: "평균적인 숱" },
          { id: "thin_density",   label: "적음",  desc: "숱이 적어 볼륨이 부족한 편" },
        ],
      },
      {
        id:    "q7_thickness",
        no:    "Q6",
        title: "모발 굵기는 어떤가요?",
        options: [
          { id: "coarse",  label: "두꺼움",  desc: "모발이 굵고 강한 편" },
          { id: "medium_thickness", label: "보통", desc: "일반적인 굵기" },
          { id: "fine",    label: "얇음",   desc: "모발이 가늘고 약한 편" },
        ],
      },
      {
        id:    "q3_curl",
        no:    "Q7",
        title: "곱슬기가 있나요?",
        options: [
          { id: "straight_hair", label: "직모",    desc: "곱슬기 없이 매끈한 편" },
          { id: "wavy_hair",     label: "반곱슬",  desc: "습하면 약간 부스스해지는 편" },
          { id: "curly_hair",    label: "악성곱슬", desc: "뻣뻣하거나 곱슬이 강한 편" },
        ],
      },
      {
        id:    "q10_history_count",
        no:    "Q8",
        title: "1년에 헤어 시술을 몇 번 받으세요?",
        hint:  "펌, 염색, 탈색 등 전체 시술 횟수",
        options: [
          { id: "count_1_2",   label: "1~2회",    desc: "전체 펌·염색 위주" },
          { id: "count_3_4",   label: "3~4회",    desc: "주기적인 전체 시술" },
          { id: "count_5_6",   label: "5~6회",    desc: "잦은 스타일 체인지" },
          { id: "count_7plus", label: "7회 이상", desc: "⚠️ 잦은 새치·뿌리 염색" },
        ],
      },
    ],
  },
];

export const ALL_STYLE_QUESTIONS: StyleQuestion[] = STYLE_SURVEY.flatMap(
  (s) => s.questions,
);
export const STYLE_TOTAL = ALL_STYLE_QUESTIONS.length; // 8
```

---

## 💻 4. 핵심 페이지 & API 전체 코드 원본

### 4-1. `/app/page.tsx` — 루트 랜딩

```tsx
"use client";

// ============================================================================
// 어뷰티(A-Beauty) — 루트 랜딩 (/)
//
// ★ 어떤 상태(로그인 여부, 진단 이력, 세션 잔류, 새로고침)에도
//   화면은 무조건 동일한 3가지 요소만 렌더링:
//   1. 메인 타이틀
//   2. [나의 맞춤 스타일 분석하기] 버튼
//   3. [이미 분석받으셨나요? 내 다이어리 보기] 링크
//
//   ⛔ 제품 추천(PersonalizedBanner), 진단 이력 체크, localStorage 읽기
//      전부 삭제 — 조건부 렌더링 0건
// ============================================================================

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "./style/constants";

export default function HomePage() {
  // 마운트 시 이전 스타일 서비스 세션 초기화
  // → 뒤로가기·새로고침·재진입 모두 동일 화면 보장
  useEffect(() => {
    try {
      sessionStorage.removeItem(STYLE_ANSWERS_KEY);
      sessionStorage.removeItem(STYLE_PHOTO_KEY);
      sessionStorage.removeItem(STYLE_GENERATED_KEY);
      sessionStorage.removeItem(STYLE_UNLOCKED_KEY);
    } catch { /**/ }
  }, []);

  return (
    <main className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0C0B0A] px-6 text-cream">

      {/* 배경 그리드 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }}
      />

      {/* 컨텐츠 — 정중앙 고정, 조건 없음 */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        {/* 브랜드 배지 */}
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · Hair Style AI
          <span className="h-px w-6 bg-gold/40" />
        </span>

        {/* 1. 메인 타이틀 */}
        <h1 className="mt-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-cream sm:text-4xl">
          AI가 분석해주는<br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}
          >
            내 인생 헤어스타일
          </span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-cream/50 sm:text-base">
          나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
        </p>

        {/* 2 + 3. CTA 버튼 묶음 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 w-full space-y-3"
        >
          {/* 2. 메인 CTA */}
          <Link
            href="/style/survey"
            className="flex h-16 w-full items-center justify-center rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
            style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
          >
            나의 맞춤 스타일 분석하기 →
          </Link>

          <p className="text-center text-[11px] text-cream/22">
            개인정보 미저장 · 약 2분 소요 · 무료
          </p>

          {/* 3. 재방문 다이어리 링크 — 메인 버튼과 동일 체급 */}
          <Link
            href="/my-diary"
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/[0.1] bg-transparent text-base font-semibold text-cream/45 underline underline-offset-[5px] transition-all duration-200 hover:border-white/20 hover:text-cream/70 active:scale-[0.98]"
          >
            이미 분석받으셨나요? · 내 다이어리 보기
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
```

---

### 4-2. `/app/style/page.tsx` — 스타일 서비스 랜딩

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  STYLE_ANSWERS_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "./constants";

export default function StyleLandingPage() {
  // ★ 마운트 시 이전 세션 데이터 전체 초기화 — 어떤 경로로 진입해도 동일 화면 보장
  useEffect(() => {
    try {
      sessionStorage.removeItem(STYLE_ANSWERS_KEY);
      sessionStorage.removeItem(STYLE_PHOTO_KEY);
      sessionStorage.removeItem(STYLE_GENERATED_KEY);
      sessionStorage.removeItem(STYLE_UNLOCKED_KEY);
    } catch { /**/ }
  }, []);

  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#0C0B0A] px-6 text-cream">

      {/* 배경 그리드 */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(200,168,107,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,107,1) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }} />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle,rgba(200,168,107,1) 0%,transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        {/* 브랜드 배지 */}
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.38em] text-gold/55">
          <span className="h-px w-6 bg-gold/40" />
          A-Beauty · Hair Style AI
          <span className="h-px w-6 bg-gold/40" />
        </span>

        {/* 메인 타이틀 */}
        <h1 className="mt-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-tight text-cream sm:text-4xl">
          AI가 분석해주는<br />
          <span className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)" }}>
            내 인생 헤어스타일
          </span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-cream/50 sm:text-base">
          나의 모질과 희망 스타일을 분석해 최적의 헤어를 처방합니다.
        </p>

        {/* CTA 버튼 2개 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 w-full space-y-3"
        >
          <Link
            href="/style/survey"
            className="flex h-16 w-full items-center justify-center rounded-2xl text-base font-black text-charcoal shadow-[0_8px_30px_rgba(200,168,107,0.38)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(200,168,107,0.55)] active:scale-[0.98]"
            style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)" }}
          >
            나의 맞춤 스타일 분석하기 →
          </Link>

          <p className="text-center text-[11px] text-cream/22">
            개인정보 미저장 · 약 2분 소요 · 무료
          </p>

          {/* 재방문 다이어리 링크 — 메인 버튼과 동일 체급 */}
          <Link
            href="/my-diary"
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/[0.1] bg-transparent text-base font-semibold text-cream/45 underline underline-offset-[5px] transition-all duration-200 hover:border-white/20 hover:text-cream/70 active:scale-[0.98]"
          >
            이미 분석받으셨나요? · 내 다이어리 보기
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
```

---

### 4-3. `/app/style/loading/page.tsx` — AI 합성 로딩 + 광고

```tsx
"use client";

// ============================================================================
// /style/loading — 비동기 AI 헤어 합성 로딩 페이지
// - 마운트 즉시 /api/hair-transform 호출 (가짜 타이머 없음)
// - API 응답 완료 즉시 /style/result 로 라우팅
// - 대기 중 구글 AdSense 플레이스홀더 노출
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { STYLE_ANSWERS_KEY, STYLE_DEBUG_ERROR_KEY, STYLE_GENERATED_KEY, STYLE_PHOTO_KEY } from "../constants";
import { toSheetAnswers } from "../recommend";
import type { StyleAnswers } from "../surveyData";

const STEPS = [
  "AI가 고객님의 두상과 8가지 모질 데이터를 정밀 결합 중입니다...",
  "두상 구조와 희망 스타일 데이터를 정밀 매칭하고 있습니다...",
  "전문가 헤어 데이터베이스에서 최적 스타일을 도출하고 있습니다...",
  "맞춤 케어 처방전과 스타일을 최종 생성하고 있습니다...",
  "마지막 세부 조정 중입니다. 결과지가 곧 완성됩니다...",
];

export default function StyleLoadingPage() {
  const router     = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const calledRef  = useRef(false); // 중복 호출 방지

  // 텍스트 스텝 로테이션 (시각 연출 — API 와 독립)
  useEffect(() => {
    const t = setInterval(() => setStepIdx(i => (i + 1) % STEPS.length), 3_000);
    return () => clearInterval(t);
  }, []);

  // ── 마운트 즉시 API 호출 ────────────────────────────────────────────────────
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function analyze() {
      try {
        const photo   = sessionStorage.getItem(STYLE_PHOTO_KEY);
        const raw     = sessionStorage.getItem(STYLE_ANSWERS_KEY);
        const answers: StyleAnswers = raw ? JSON.parse(raw) : {};

        if (!photo) { router.replace("/style/upload"); return; }

        // 이전 디버그 에러 초기화
        try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }

        // Sheets/Blob 저장 — fire-and-forget
        void fetch("/api/submit-diagnosis", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            photoDataUrl: photo,
            answers:      toSheetAnswers(answers),
            treatmentCounts: {},
          }),
        });

        // ★ Promise.allSettled — 두 작업을 병렬 실행, 둘 다 끝났을 때만 결과지로 이동
        // [1] 최소 15초 대기 (광고 노출 + AdSense 수익 보장)
        // [2] Replicate AI 합성 (62초 타임아웃)
        // → API가 15초보다 빠르면 15초 채운 뒤 이동, 느리면 API 완료 시 이동
        await Promise.allSettled([
          new Promise<void>(resolve => setTimeout(resolve, 15_000)),
          (async () => {
            try {
              console.log("[AI] /api/hair-transform 호출 시작...");
              const res  = await fetch("/api/hair-transform", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ userPhoto: photo, answers }),
                signal:  AbortSignal.timeout(62_000),
              });
              const data = await res.json() as { ok: boolean; imageUrl?: string; reason?: string; debugError?: string };

              // ★ 콘솔 디버그 — 어떤 URL이 돌아오는지 확인
              console.log("[AI] 응답 전체:", data);
              if (data.ok && data.imageUrl) {
                console.log("[AI] ✅ 최종 AI 이미지 URL:", data.imageUrl);
                try { sessionStorage.setItem(STYLE_GENERATED_KEY, data.imageUrl); } catch { /**/ }
                try { sessionStorage.removeItem(STYLE_DEBUG_ERROR_KEY); } catch { /**/ }
              } else {
                const errMsg = data.debugError ?? `reason: ${data.reason ?? "unknown"} (debugError 없음)`;
                console.warn("[AI] ⚠️ 이미지 생성 실패 —", errMsg);
                // 결과 페이지에서 붉은 글씨로 표시할 실제 에러 저장
                try { sessionStorage.setItem(STYLE_DEBUG_ERROR_KEY, errMsg); } catch { /**/ }
              }
            } catch (e) {
              console.error("[AI] ❌ API 호출 예외:", e);
            }
          })(),
        ]);
      } catch { /**/ } finally {
        // 15초 + API 모두 완료 → 결과지 이동 (결과지에서 이중 로딩 없음)
        router.push("/style/result");
      }
    }

    analyze();
  }, [router]);

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#0C0B0A] text-cream">

      {/* ── 상단 40% — 브랜드 배지 + 스피너 + 텍스트 ── */}
      <div className="flex flex-none flex-col items-center justify-center gap-5 px-6 pb-4 pt-10"
        style={{ flex: "0 0 40%" }}>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-wide text-gold">
          ✦ AI 스타일 합성 중
        </span>

        {/* 소형 골드 링 스피너 */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid transparent", borderTopColor: "rgba(200,168,107,0.95)", borderRightColor: "rgba(200,168,107,0.2)" }} />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full"
            style={{ border: "1.5px solid transparent", borderTopColor: "rgba(200,168,107,0.5)", borderLeftColor: "rgba(200,168,107,0.15)" }} />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-gold" />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="max-w-[260px] text-center text-sm font-medium leading-relaxed text-cream/75"
          >
            {STEPS[stepIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── 하단 60% — 구글 AdSense 전면 광고 영역 (300×250 이상) ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]"
          style={{ minHeight: "300px" }}>
          <div className="border-b border-white/[0.05] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold/35">
              Sponsored · A-Beauty
            </p>
          </div>
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-8 text-center">
            <div className="mb-3 h-8 w-8 rounded-full border border-gold/20 bg-gold/[0.06] flex items-center justify-center">
              <span className="text-gold/50 text-sm">A</span>
            </div>
            <p className="text-sm font-medium text-cream/22">
              맞춤형 뷰티 정보가 준비 중입니다
            </p>
            <p className="mt-2 text-[11px] text-cream/12">
              Google Ads 300×250 영역
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
```

---

### 4-4. `/app/style/result/page.tsx` — 결과지 + 카카오 잠금

```tsx
"use client";

// ============================================================================
// 결과지 — 이중 로딩 없음, 세션에서 즉시 렌더링
// 캡처 방지 + 알림 신청 버튼 + 배열 다이어리 저장
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  KAKAO_LOGGED_IN_KEY,
  STYLE_ANSWERS_KEY,
  STYLE_DEBUG_ERROR_KEY,
  STYLE_GENERATED_KEY,
  STYLE_PHOTO_KEY,
  STYLE_UNLOCKED_KEY,
} from "../constants";
import {
  getStyleEntry,
  buildCarePrescription,
  getStyleProduct,
  getSecondStyleProduct,
  buildAIDiagnosisText,
} from "../recommend";
import type { StyleAnswers } from "../surveyData";

// ─── 카카오 세션 헬퍼 ─────────────────────────────────────────────────────────
function isKakaoLoggedIn(): boolean {
  try { return localStorage.getItem(KAKAO_LOGGED_IN_KEY) === "1"; } catch { return false; }
}
function markKakaoLoggedIn() {
  try { localStorage.setItem(KAKAO_LOGGED_IN_KEY, "1"); } catch { /**/ }
}

// UUID 생성 (저장 시 고유 ID)
function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ─── Kakao 타입 ───────────────────────────────────────────────────────────────

type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: { sendDefault: (config: Record<string, unknown>) => void };
  Auth?: { login: (opts: { success: (a: unknown) => void; fail: (e: unknown) => void }) => void };
};
declare const kakaoWin: Window & { Kakao?: KakaoSDK };

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? "";
const KAKAO_SDK = "https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js";

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    const w = window as typeof kakaoWin;
    if (w.Kakao) { resolve(); return; }
    if (document.querySelector(`script[src="${KAKAO_SDK}"]`)) {
      const poll = setInterval(() => { if (w.Kakao) { clearInterval(poll); resolve(); } }, 80);
      return;
    }
    const s = document.createElement("script");
    s.src = KAKAO_SDK; s.onload = () => resolve(); s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

async function kakaoLogin(onSuccess: () => void) {
  try {
    await loadKakaoSDK();
    const K = (window as typeof kakaoWin).Kakao;
    if (K) {
      if (!K.isInitialized() && KAKAO_KEY) K.init(KAKAO_KEY);
      if (K.isInitialized() && K.Auth) {
        K.Auth.login({ success: () => onSuccess(), fail: () => setTimeout(onSuccess, 800) });
        return;
      }
    }
  } catch { /**/ }
  setTimeout(onSuccess, 1500);
}

// ─── 카카오 결과 잠금 모달 ────────────────────────────────────────────────────

function KakaoLockModal({ onUnlock }: { onUnlock: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    await kakaoLogin(() => {
      markKakaoLoggedIn();
      setLoading(false);
      onUnlock();
    });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-charcoal/85 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gold/25 bg-[#141210]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="px-7 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">A-Beauty</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-cream">결과지가 완성됐어요!</h2>
          <p className="mt-2 text-sm text-cream/50">맞춤 헤어스타일과 케어 처방전을 확인하세요.</p>
          <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-2xl">🔓</div>
          <button onClick={handleLogin} disabled={loading}
            className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70">
            {loading
              ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block text-lg">⏳</motion.span>
              : <><span className="text-xl">💬</span> 카카오 1초 로그인하고 결과 확인하기</>}
          </button>
          <p className="mt-2.5 text-[11px] text-cream/25">별도 가입 없이 카카오 계정으로 바로 확인</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 카카오 저장 → 다이어리 라우팅 모달 ─────────────────────────────────────

function KakaoSaveModal({
  answers, styleName, onClose,
}: { answers: StyleAnswers; styleName: string; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function executeSaveAndRoute() {
    try {
      const generatedImageUrl = sessionStorage.getItem(STYLE_GENERATED_KEY) ?? null;
      const id = uid();
      const entry = {
        id,
        answers,
        styleName,
        savedAt:           Date.now(),
        generatedImageUrl,
        isSevereDamage:    answers.q10_history_count === "count_7plus",
        isLowDensity:      answers.q8_density === "thin_density",
        isFineHair:        answers.q7_thickness === "fine",
        isCurly:           answers.q3_curl === "curly_hair",
      };
      // 배열에 누적 저장 (UUID로 중복 방지)
      let arr: typeof entry[] = [];
      try {
        const raw = localStorage.getItem("abeauty:diaryEntries");
        if (raw) arr = JSON.parse(raw);
      } catch { /**/ }
      // 중복 ID 방어
      arr = arr.filter(e => e.id !== id);
      arr.unshift(entry);
      localStorage.setItem("abeauty:diaryEntries", JSON.stringify(arr));
      // 최신 진단 단일 키도 유지 (하위 호환)
      localStorage.setItem("abeauty:savedDiagnosis", JSON.stringify(entry));
    } catch { /**/ }
    router.push("/my-diary");
  }

  async function handleSaveAndRoute() {
    if (loading) return;
    if (isKakaoLoggedIn()) { executeSaveAndRoute(); return; }
    setLoading(true);
    await kakaoLogin(() => { markKakaoLoggedIn(); executeSaveAndRoute(); });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-3xl border-t border-gold/20 bg-[#141210] px-6 pb-10 pt-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">A-Beauty Diary</p>
        <h3 className="mt-2 font-serif text-xl font-bold text-cream">내 다이어리에 저장하고 평생 소장하기</h3>
        <p className="mt-2 text-sm text-cream/45 leading-relaxed">
          진단 결과를 저장하면 나만의 맞춤 홈케어 제품과 스타일 히스토리가 보관됩니다.
        </p>
        <div className="mt-4 space-y-2">
          {["맞춤 홈케어 제품 상단 노출 (시술 이력 기반)", "내 헤어 스타일 히스토리 보관", "전문가 케어 처방전 저장"].map(b => (
            <div key={b} className="flex items-center gap-2.5 text-sm text-cream/65">
              <span className="text-gold text-xs">✦</span>{b}
            </div>
          ))}
        </div>
        <button onClick={handleSaveAndRoute} disabled={loading}
          className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70">
          {loading
            ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block text-lg">⏳</motion.span>
            : <><span className="text-xl">💬</span> 카카오 1초 로그인/가입으로 저장하기</>}
        </button>
        <button onClick={onClose} className="mt-2.5 flex h-11 w-full items-center justify-center rounded-xl text-sm text-cream/40 hover:text-cream/70">
          나중에 저장하기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Before / After 이미지 섹션 ───────────────────────────────────────────────
// ★ 폴링 없음 — sessionStorage에서 즉시 읽은 URL만 표시

function BeforeAfterSection({
  photo, locked, generatedUrl, debugError, onRetry,
}: {
  photo:        string | null;
  locked:       boolean;
  generatedUrl: string | null;
  debugError:   string | null;
  onRetry:      () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* BEFORE */}
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-all duration-700 ${locked ? "blur-sm" : ""}`}
        style={{ aspectRatio: "3/4" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="원본 사진" draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ objectPosition: "50% 10%", pointerEvents: "none", WebkitTouchCallout: "none" }} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[9px] uppercase tracking-widest text-cream/20">Your Photo</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cream/60">Before</span>
        </div>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-cream/40" stroke="currentColor" strokeWidth={1.5}>
              <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* AFTER */}
      <div className={`relative overflow-hidden rounded-2xl border border-gold/25 bg-black/40 transition-all duration-700 ${locked ? "blur-sm" : ""}`}
        style={{ aspectRatio: "3/4" }}>
        {generatedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={generatedUrl} alt="AI 변신 스타일" draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ pointerEvents: "none", WebkitTouchCallout: "none" }}
            onError={(e) => console.error("[Result] ❌ AI 이미지 로드 실패. src:", (e.target as HTMLImageElement).src)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center overflow-y-auto py-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-cream/25" stroke="currentColor" strokeWidth={1.2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] leading-snug text-cream/40">AI 합성에<br />실패했어요</p>
            {debugError && (
              <div className="w-full rounded-lg border border-red-500/40 bg-red-950/60 px-2 py-2 text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1">[개발자 디버그] 에러 원인:</p>
                <p className="text-[10px] leading-snug text-red-300 break-all">{debugError}</p>
              </div>
            )}
            <button onClick={onRetry}
              className="rounded-xl border border-gold/35 bg-gold/[0.08] px-3.5 py-1.5 text-[11px] font-bold text-gold transition-colors hover:bg-gold/15">
              다시 시도
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">After ✦</span>
        </div>
        {!locked && generatedUrl && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 1.5px rgba(200,168,107,0.3)" }} />
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-gold/40" stroke="currentColor" strokeWidth={1.5}>
              <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 케어 요약 ────────────────────────────────────────────────────────────────

function CareSummary({ answers }: { answers: StyleAnswers }) {
  const care = buildCarePrescription(answers);
  const lines = [
    care.historyNote,
    answers.q8_density === "thin_density" || answers.q7_thickness === "fine" ? care.densityNote : care.curlNote,
    care.thicknessNote,
  ];
  return (
    <div className={`space-y-3 ${care.isSevereDamage ? "rounded-xl border border-gold/15 bg-gold/[0.04] p-4" : ""}`}>
      {care.isSevereDamage && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gold/70">집중 케어 필요</p>}
      {lines.map((text, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="mt-2 h-1 w-1 flex-none rounded-full bg-gold/55" />
          <p className="text-sm leading-relaxed text-cream/70">{text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── 알림 신청 버튼 ───────────────────────────────────────────────────────────

type NotifyState = "idle" | "loading" | "done";

function NotifyButton() {
  const [state, setState] = useState<NotifyState>("idle");

  async function handleNotify() {
    if (state !== "idle") return;
    setState("loading");
    try {
      localStorage.setItem("abeauty:notifyConsent", JSON.stringify({ ts: Date.now(), src: "result" }));
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "notify_consent" }),
      });
      await new Promise(r => setTimeout(r, 700));
      setState("done");
    } catch { setState("done"); }
  }

  if (state === "done") {
    return (
      <div className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-gold/[0.1] text-base font-semibold text-gold-light">
        ✓ 알림 신청이 완료되었습니다!
      </div>
    );
  }
  return (
    <button onClick={handleNotify} disabled={state === "loading"}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-base font-bold text-charcoal shadow-gold transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60">
      {state === "loading"
        ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block">⏳</motion.span>
        : "🔔 새로운 AI 분석 서비스 오픈 알림 받기"}
    </button>
  );
}

// ============================================================================
// 메인 결과 페이지
// ============================================================================

export default function StyleResultPage() {
  const router = useRouter();

  const [photo,      setPhoto]      = useState<string | null>(null);
  const [generated,  setGenerated]  = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<StyleAnswers>({});
  const [locked,     setLocked]     = useState(true);
  const [ready,      setReady]      = useState(false);
  const [showSave,   setShowSave]   = useState(false);

  // 캡처 방지 viewport 설정
  useEffect(() => {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    return () => {
      if (vp) vp.setAttribute("content", "width=device-width, initial-scale=1.0");
    };
  }, []);

  // 세션 데이터 즉시 로드 (폴링 없음)
  useEffect(() => {
    try {
      const p = sessionStorage.getItem(STYLE_PHOTO_KEY);
      if (p) setPhoto(p);
      const a = sessionStorage.getItem(STYLE_ANSWERS_KEY);
      if (a) setAnswers(JSON.parse(a) as StyleAnswers);
      if (sessionStorage.getItem(STYLE_UNLOCKED_KEY) === "1") setLocked(false);
      const g = sessionStorage.getItem(STYLE_GENERATED_KEY);
      console.log("[Result] sessionStorage STYLE_GENERATED_KEY 값:", g ?? "(없음)");
      if (g) {
        setGenerated(g);
      } else {
        const dbgErr = sessionStorage.getItem(STYLE_DEBUG_ERROR_KEY);
        console.warn("[Result] ⚠️ AI 이미지 URL 없음. debugError:", dbgErr ?? "(없음)");
        if (dbgErr) setDebugError(dbgErr);
      }
    } catch { /**/ }
    setReady(true);
  }, []);

  function handleUnlock() {
    try { sessionStorage.setItem(STYLE_UNLOCKED_KEY, "1"); } catch { /**/ }
    setLocked(false);
  }

  function handleRetry() {
    try { sessionStorage.removeItem(STYLE_GENERATED_KEY); } catch { /**/ }
    router.push("/style/upload");
  }

  if (!ready) return <main className="min-h-screen bg-charcoal" />;

  const entry     = getStyleEntry(answers);
  const product   = getStyleProduct(answers);
  const product2  = getSecondStyleProduct(answers);
  const diagnosis = buildAIDiagnosisText(answers);

  const DESIGN_LABEL: Record<string, string> = { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" };
  const LAYER_LABEL:  Record<string, string> = { heavy: "일자", medium: "소프트", light: "허쉬컷" };
  const LENGTH_LABEL: Record<string, string> = { short: "숏", short_bob: "숏단발", bob: "단발", shoulder: "어깨선", collarbone: "쇄골선", chest: "가슴선" };

  return (
    <main className="min-h-screen bg-charcoal text-cream" style={{ touchAction: "pan-y" }}>

      <AnimatePresence>{locked && <KakaoLockModal onUnlock={handleUnlock} />}</AnimatePresence>
      <AnimatePresence>
        {showSave && <KakaoSaveModal answers={answers} styleName={entry.name} onClose={() => setShowSave(false)} />}
      </AnimatePresence>

      <div className="mx-auto max-w-lg px-4 py-6 pb-32 sm:px-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4">
          <Link href="/style/upload" className="flex items-center gap-1 text-sm font-medium text-cream/40 hover:text-cream transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            다시 찍기
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">스타일 결과지</span>
          <Link href="/style" className="text-sm font-medium text-cream/40 hover:text-cream transition-colors">처음부터</Link>
        </div>

        <BeforeAfterSection photo={photo} locked={locked} generatedUrl={generated} debugError={debugError} onRetry={handleRetry} />

        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-gold/60" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <p className="text-base font-medium text-cream/55">
            아래로 내려서 AI 맞춤 처방을 확인하세요 ⬇️
          </p>
        </div>

        <div className={`mt-5 space-y-4 transition-all duration-700 ${locked ? "blur-sm pointer-events-none select-none" : ""}`}>

          <div className="overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">추천 스타일</p>
              <h2 className="mt-1.5 font-serif text-2xl font-extrabold text-gold-light">{entry.name}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[LENGTH_LABEL[answers.q11_length], DESIGN_LABEL[answers.q13_design], LAYER_LABEL[answers.q14_layer]]
                  .filter(Boolean).map(tag => (
                    <span key={tag} className="rounded-full border border-gold/25 bg-gold/[0.08] px-3 py-0.5 text-xs font-semibold text-gold-light">{tag}</span>
                  ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">모발 케어 처방</p>
            <CareSummary answers={answers} />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">전문가 AI 진단 소견</p>
            <p className="text-sm leading-relaxed text-cream/70">{diagnosis}</p>
          </div>

          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-gold">맞춤 추천 제품</p>
            <div className="space-y-2.5">
              {[product, product2].map((p, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <div className="flex h-[72px] items-center justify-center border-b border-white/[0.05] bg-gradient-to-r from-gold/[0.05] to-transparent">
                    <span className="text-3xl">{p.emoji}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold/60">{p.category}</p>
                    <p className="mt-0.5 text-sm font-bold text-cream/85">{p.name}</p>
                    <p className="mt-0.5 text-xs text-cream/45">{p.tagline}</p>
                  </div>
                  <div className="px-4 pb-4">
                    <a href={p.coupangUrl} target="_blank" rel="noopener noreferrer sponsored"
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-xs font-bold text-charcoal transition-all hover:brightness-105 active:scale-[0.98]">
                      나의 맞춤 제품 구매하러 가기 →
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-cream/18">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button onClick={() => setShowSave(true)}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-gold/30 bg-gold/[0.08] text-base font-bold text-gold-light transition-all hover:bg-gold/15 active:scale-[0.98]">
              🤍 내 다이어리에 저장하고 평생 소장하기
            </button>
            <div className="flex gap-2.5">
              <Link href="/style/survey"
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-white/12 text-sm font-medium text-cream/50 transition-all hover:border-white/25 hover:text-cream">
                다시 진단하기
              </Link>
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/style` : "/style";
                  if (navigator.share) navigator.share({ title: "AI 헤어 변신 | 어뷰티", url }).catch(() => {});
                  else navigator.clipboard?.writeText(url).then(() => alert("링크가 복사됐어요!"));
                }}
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.06] text-sm font-semibold text-gold-light transition-all hover:bg-gold/12">
                🔗 공유하기
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-charcoal/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          {locked ? (
            <button
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] text-base font-bold text-[#191600] hover:brightness-95 active:scale-[0.98]"
              onClick={() => {/* 모달 자동 표시 */}}>
              <span className="text-lg">💬</span> 카카오 로그인하고 결과 보기
            </button>
          ) : (
            <NotifyButton />
          )}
        </div>
      </div>

    </main>
  );
}
```

---

### 4-5. `/app/api/hair-transform/route.ts` — Replicate 백엔드 API

```typescript
// ============================================================================
// POST /api/hair-transform
// 유저 셀카(swap_image) + 레퍼런스 헤어 사진(target_image) → Face Swap 합성
//
// 모델: lucataco/faceswap (codeplugtech/face-swap 기반)
//   - 엔드포인트: /v1/predictions  (커뮤니티 모델 → version hash 필수)
//   - 버전 해시:  9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d
//   - 1.6M 실행, CPU 동작, 평균 64초
//
// 파라미터:
//   target_image → 레퍼런스 헤어 사진 (얼굴이 교체될 캔버스, 공개 https URL)
//   swap_image   → 유저 셀카 (삽입할 얼굴, Base64 data URI 또는 공개 URL)
//
// 환경변수:
//   REPLICATE_API_TOKEN  — 필수
//   NEXT_PUBLIC_SITE_URL — 프로덕션 절대 URL (예: https://your-domain.com)
// ============================================================================

export const maxDuration = 60;

import { access } from "fs/promises";
import { join }   from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getStyleDirectoryPath,
  buildHairStylePrompt,
  DEFAULT_REFERENCE_PATH,
  MAX_IMG,
} from "@/lib/styleReference";
import type { StyleAnswers } from "@/app/style/surveyData";

const REPLICATE_VERSION =
  process.env.REPLICATE_VERSION ??
  "9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d";
const REPLICATE_ENDPOINT = "https://api.replicate.com/v1/predictions";

const LOCAL_DEV_REFERENCE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/" +
  "Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/" +
  "402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg";

function isPublicHttpsUrl(url: string): boolean {
  return (
    url.startsWith("https://") &&
    !url.includes("localhost") &&
    !url.includes("127.0.0.1")
  );
}

function getBaseUrl(req: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host  = req.headers.get("x-forwarded-host")
    ?? req.headers.get("host")
    ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function pickReferenceUrl(
  answers: StyleAnswers,
  baseUrl: string,
): Promise<{ url: string; isDefault: boolean }> {
  const dir    = getStyleDirectoryPath(answers);
  const relDir = dir.replace(/^\//, "");

  const startIdx = Math.floor(Math.random() * MAX_IMG) + 1;

  for (let i = 0; i < MAX_IMG; i++) {
    const idx     = ((startIdx - 1 + i) % MAX_IMG) + 1;
    const relPath = `${relDir}${idx}.jpg`;
    const absPath = join(process.cwd(), "public", relPath);
    try {
      await access(absPath);
      const url = `${baseUrl}/${relPath}`;
      console.log(`[hair-transform] ✅ 레퍼런스 픽: ${relPath} → ${url}`);
      return { url, isDefault: false };
    } catch { /* 파일 없음 → 다음 인덱스 */ }
  }

  const url = `${baseUrl}${DEFAULT_REFERENCE_PATH}`;
  console.warn(`[hair-transform] ⚠️ 빈 폴더(${dir}) → default_style.jpg 폴백`);
  return { url, isDefault: true };
}

function normalizeBase64(raw: string): string {
  if (raw.startsWith("data:image/") && raw.includes(";base64,")) return raw;
  if (raw.startsWith("data:")) {
    const b64 = raw.includes(",") ? raw.split(",")[1]! : raw.replace(/^data:[^,]*,?/, "");
    return `data:image/jpeg;base64,${b64}`;
  }
  return `data:image/jpeg;base64,${raw}`;
}

function buildReplicateInput(
  swapImage:   string,
  targetImage: string,
) {
  return {
    target_image: targetImage,
    swap_image:   swapImage,
  };
}

export async function POST(req: NextRequest) {

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    const msg = "REPLICATE_API_TOKEN이 환경변수에 없습니다. Vercel 대시보드 또는 .env.local을 확인하세요.";
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "no_token", debugError: msg },
      { status: 500 },
    );
  }

  let userPhoto: string;
  let answers: StyleAnswers;
  try {
    const body = await req.json();
    userPhoto = body.userPhoto as string;
    answers   = (body.answers ?? {}) as StyleAnswers;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad_request", debugError: "요청 JSON 파싱 실패" },
      { status: 400 },
    );
  }
  if (!userPhoto) {
    return NextResponse.json(
      { ok: false, reason: "missing_photo", debugError: "userPhoto 필드가 비어 있습니다" },
      { status: 400 },
    );
  }

  if (userPhoto.startsWith("blob:") || userPhoto.startsWith("http:")) {
    const msg = `userPhoto 포맷 오류 — blob:/http: URL은 Replicate 처리 불가. 받은 값: "${userPhoto.slice(0, 80)}"`;
    console.error("[hair-transform]", msg);
    return NextResponse.json(
      { ok: false, reason: "invalid_photo_format", debugError: msg },
      { status: 400 },
    );
  }
  const normalizedPhoto = normalizeBase64(userPhoto);

  const baseUrl = getBaseUrl(req);
  let targetImageUrl: string;

  if (!isPublicHttpsUrl(baseUrl)) {
    targetImageUrl = LOCAL_DEV_REFERENCE_URL;
    console.warn(`[hair-transform] ⚠️ 로컬 환경(${baseUrl}) — LOCAL_DEV_REFERENCE_URL 사용`);
  } else {
    const { url, isDefault } = await pickReferenceUrl(answers, baseUrl);
    if (!isPublicHttpsUrl(url)) {
      targetImageUrl = LOCAL_DEV_REFERENCE_URL;
    } else {
      targetImageUrl = url;
    }
    console.log(`[hair-transform] target_image: ${isDefault ? "[DEFAULT]" : ""} ${targetImageUrl}`);
  }

  const prompt = buildHairStylePrompt(answers);
  console.log(`[hair-transform] 프롬프트(참고): ${prompt}`);

  console.log("[hair-transform] → Replicate payload:", JSON.stringify({
    version:      REPLICATE_VERSION.slice(0, 8) + "...",
    target_image: targetImageUrl,
    swap_image:   `[base64 ${normalizedPhoto.length}chars]`,
  }));

  try {
    const res = await fetch(REPLICATE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer:         "wait=55",
      },
      body: JSON.stringify({
        version: REPLICATE_VERSION,
        input:   buildReplicateInput(normalizedPhoto, targetImageUrl),
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      const debugError = `Replicate HTTP ${res.status}: ${errText.slice(0, 500)}`;
      console.error("[hair-transform] Replicate 에러:", res.status, errText.slice(0, 300));
      return NextResponse.json({ ok: false, reason: "api_error", debugError });
    }

    const data = await res.json() as {
      output?: string | string[];
      error?:  string;
      status?: string;
      urls?:   { get?: string };
    };

    if (data.status === "processing" && data.urls?.get) {
      const pollResult = await pollUntilDone(data.urls.get, token);
      if (!pollResult) {
        return NextResponse.json({
          ok: false,
          reason: "poll_timeout",
          debugError: "Replicate 폴링 타임아웃: 50초 내에 이미지 생성 완료되지 않음",
        });
      }
      return NextResponse.json({ ok: true, imageUrl: pollResult });
    }

    if (data.error) {
      const debugError = `Replicate prediction error: ${data.error}`;
      console.error("[hair-transform] Prediction error:", data.error);
      return NextResponse.json({ ok: false, reason: "prediction_error", debugError });
    }

    const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!imageUrl) {
      const debugError = `output 없음. 응답 전체: ${JSON.stringify(data).slice(0, 400)}`;
      console.error("[hair-transform] No output:", data);
      return NextResponse.json({ ok: false, reason: "no_output", debugError });
    }

    console.log("[hair-transform] ✅ 합성 완료:", imageUrl);
    return NextResponse.json({ ok: true, imageUrl });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[hair-transform] 예외:", msg);
    return NextResponse.json({
      ok: false,
      reason: "exception",
      debugError: `예외 발생: ${msg}`,
    });
  }
}

async function pollUntilDone(
  pollUrl: string,
  token:   string,
  maxMs  = 50_000,
): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2_500));
    try {
      const res  = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as {
        status?: string;
        output?: string | string[];
        error?:  string;
      };
      if (data.status === "succeeded") {
        return Array.isArray(data.output) ? (data.output[0] ?? null) : (data.output ?? null);
      }
      if (data.status === "failed" || data.error) {
        console.error("[hair-transform] 폴링 실패:", data.error ?? data.status);
        return null;
      }
    } catch { return null; }
  }
  return null;
}
```

---

### 4-6. `/app/my-diary/page.tsx` — 내 다이어리

```tsx
"use client";

// ============================================================================
// /my-diary — 내 헤어 다이어리 (UUID 배열 저장 + 리스트 + 모달 + 제품카드)
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const Q_LABELS: Record<string, string> = {
  q1_age:            "연령대",     q11_length:        "희망 기장",
  q14_layer:         "레이어드",   q13_design:        "웨이브",
  q8_density:        "모발 숱",    q7_thickness:      "모발 굵기",
  q3_curl:           "곱슬 유무",  q10_history_count: "연간 시술",
};
const A_LABELS: Record<string, Record<string, string>> = {
  q1_age:            { age_20: "20대", age_30: "30대", age_40: "40대", age_50: "50대", age_60plus: "60대 이상" },
  q11_length:        { short: "숏", bob: "숏단발", shoulder: "단발", collarbone: "중단발", chest: "긴머리" },
  q14_layer:         { heavy: "무거움", medium: "소프트", light: "허쉬" },
  q13_design:        { straight: "생머리", c_curl: "C컬", s_curl: "S컬", wave: "웨이브" },
  q8_density:        { thick_density: "많음", medium_density: "보통", thin_density: "적음" },
  q7_thickness:      { coarse: "두꺼움", medium_thickness: "보통", fine: "얇음" },
  q3_curl:           { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair: "악성곱슬" },
  q10_history_count: { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회 이상" },
};
const Q_ORDER = ["q1_age","q11_length","q14_layer","q13_design","q8_density","q7_thickness","q3_curl","q10_history_count"];

interface MiniProduct { emoji: string; category: string; name: string; url: string; }

function getProduct(answers: Record<string, string>): MiniProduct {
  if (answers.q10_history_count === "count_7plus")
    return { emoji: "🧴", category: "새치 케어", name: "약산성 새치 케어 샴푸", url: "https://link.coupang.com/a/eEoal2SxC8" };
  if (answers.q7_thickness === "fine" || answers.q8_density === "thin_density")
    return { emoji: "💊", category: "볼륨 케어", name: "뿌리 볼륨 에센스", url: "https://link.coupang.com/a/eEnDYZ4YEe" };
  if (answers.q3_curl === "curly_hair" || answers.q3_curl === "wavy_hair")
    return { emoji: "🌀", category: "컬 케어", name: "컬 유지 크림", url: "https://link.coupang.com/a/eEn6wxl4Oy" };
  return { emoji: "✨", category: "광택 케어", name: "글로시 헤어 세럼", url: "https://link.coupang.com/a/eEnlw9bAnQ" };
}

interface DiaryEntry {
  id:                string;
  answers:           Record<string, string>;
  styleName:         string;
  savedAt:           number;
  generatedImageUrl: string | null;
  isSevereDamage:    boolean;
  isLowDensity:      boolean;
  isFineHair:        boolean;
  isCurly:           boolean;
}

function ImageModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="relative max-h-[85dvh] max-w-sm overflow-hidden rounded-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="AI 변신 스타일" className="h-full w-full object-contain" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DiaryCard({ entry, index, onOpenModal }: { entry: DiaryEntry; index: number; onOpenModal: (url: string) => void; }) {
  const [expanded, setExpanded] = useState(false);
  const product = getProduct(entry.answers);
  const date    = new Date(entry.savedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(200,168,107,0.35), transparent)" }} />

      <div style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(200,168,107,0.55)" }}>
              Style {index + 1}
            </p>
            <p className="mt-0.5 font-serif text-base font-bold" style={{ color: "#FDFBFA" }}>
              {entry.styleName}
            </p>
          </div>
          <p className="text-xs" style={{ color: "rgba(253,251,250,0.35)" }}>{date}</p>
        </div>

        {entry.generatedImageUrl && (
          <button
            onClick={() => onOpenModal(entry.generatedImageUrl!)}
            className="mx-4 mb-3 block w-[calc(100%-2rem)] overflow-hidden rounded-xl active:scale-[0.98] transition-transform"
            style={{ border: "1px solid rgba(200,168,107,0.2)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.generatedImageUrl} alt="AI 변신 결과"
              className="h-48 w-full object-cover" />
            <div className="px-3 py-1.5 text-center" style={{ background: "rgba(200,168,107,0.06)" }}>
              <p className="text-[10px]" style={{ color: "rgba(200,168,107,0.7)" }}>탭하면 크게 볼 수 있어요</p>
            </div>
          </button>
        )}

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between px-4 pb-3 text-xs transition-colors"
          style={{ color: "rgba(253,251,250,0.4)" }}
        >
          <span>진단 데이터 {expanded ? "접기" : "보기"}</span>
          <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} stroke="currentColor" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded && (
          <div className="mx-4 mb-3 grid grid-cols-2 gap-1.5">
            {Q_ORDER.map(qId => {
              const val = entry.answers[qId] ?? "";
              return (
                <div key={qId} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-[9px]" style={{ color: "rgba(253,251,250,0.35)" }}>{Q_LABELS[qId]}</p>
                  <p className="text-xs font-semibold" style={{ color: "rgba(253,251,250,0.75)" }}>
                    {A_LABELS[qId]?.[val] ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mx-4 mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="text-2xl">{product.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(200,168,107,0.6)" }}>
                {product.category}
              </p>
              <p className="truncate text-xs font-semibold" style={{ color: "rgba(253,251,250,0.8)" }}>
                {product.name}
              </p>
            </div>
          </div>
          <a href={product.url} target="_blank" rel="noopener noreferrer sponsored"
            className="flex h-9 w-full items-center justify-center text-xs font-bold transition-all"
            style={{ background: "linear-gradient(90deg,#E4D2A8,#C8A86B,#A8884A)", color: "#0C0B0A" }}>
            재구매하러 가기 →
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function MyDiaryPage() {
  const [entries,    setEntries]    = useState<DiaryEntry[]>([]);
  const [ready,      setReady]      = useState(false);
  const [modalUrl,   setModalUrl]   = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("abeauty:diaryEntries");
      if (raw) {
        setEntries(JSON.parse(raw) as DiaryEntry[]);
      } else {
        const single = localStorage.getItem("abeauty:savedDiagnosis");
        if (single) {
          const data = JSON.parse(single) as DiaryEntry;
          if (!data.id) data.id = `legacy-${Date.now()}`;
          setEntries([data]);
        }
      }
    } catch { /**/ }
    setReady(true);
  }, []);

  if (!ready) return <main className="min-h-screen bg-[#0C0B0A]" />;

  return (
    <main className="min-h-screen bg-[#0C0B0A]" style={{ color: "#FDFBFA" }}>

      {modalUrl && <ImageModal url={modalUrl} onClose={() => setModalUrl(null)} />}

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0C0B0A]/90 px-5 py-4 backdrop-blur-md">
        <Link href="/" className="text-sm font-medium transition-colors" style={{ color: "rgba(253,251,250,0.4)" }}>
          ← 홈
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "#C8A86B" }}>
          내 다이어리
        </span>
        <Link href="/style/survey" className="text-xs font-medium transition-colors" style={{ color: "rgba(200,168,107,0.55)" }}>
          새 진단
        </Link>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-20 pt-6">

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ border: "1px solid rgba(200,168,107,0.2)", background: "rgba(200,168,107,0.05)" }}>
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="rgba(200,168,107,0.5)" strokeWidth={1.2}>
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mb-6 text-sm" style={{ color: "rgba(253,251,250,0.4)" }}>
              저장된 진단 결과가 없어요.
            </p>
            <Link
              href="/style"
              className="inline-flex h-14 items-center justify-center rounded-2xl px-8 text-base font-bold"
              style={{ background: "linear-gradient(108deg,#E4D2A8 0%,#C8A86B 50%,#A8884A 100%)", color: "#0C0B0A" }}
            >
              AI 헤어 분석 시작하기 →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "rgba(200,168,107,0.55)" }}>
                  A-Beauty Hair Diary
                </p>
                <p className="mt-0.5 text-sm" style={{ color: "rgba(253,251,250,0.5)" }}>
                  진단 이력 {entries.length}건
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {entries.map((entry, i) => (
                <DiaryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onOpenModal={setModalUrl}
                />
              ))}
            </div>

            <p className="mt-6 text-center text-[10px]" style={{ color: "rgba(253,251,250,0.2)" }}>
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
```

---

## 🔑 환경변수 체크리스트

| 변수명 | 필수 | 설명 |
|---|---|---|
| `REPLICATE_API_TOKEN` | ✅ | Replicate 계정 API 토큰 |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 프로덕션 절대 URL (예: `https://dongan.vercel.app`) |
| `NEXT_PUBLIC_KAKAO_APP_KEY` | ✅ | 카카오 JavaScript 앱키 |
| `VERCEL_URL` | 자동 | Vercel이 자동 주입 (별도 설정 불필요) |
| `REPLICATE_VERSION` | 선택 | 기본값 하드코딩됨, 변경 시 이 변수로 오버라이드 |

---

*이 파일은 A-Beauty 프로젝트의 전체 코드 백업입니다. AI 코딩 세션 시작 시 컨텍스트 로드용으로 활용하세요.*
