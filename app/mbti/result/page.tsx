"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

// ============================================================================
// 결과 데이터 타입
// ============================================================================
interface Product {
  name: string;
  link: string;
}

interface HairType {
  mbti: string;       // MBTI 4자리 코드 (화면 상단 크게 노출)
  nickname: string;   // 캐릭터 닉네임
  tagline: string;    // 서브타이틀
  emoji: string;
  gradA: string;
  gradB: string;
  description: string;
  product: Product;
}

// ============================================================================
// 16가지 결과 데이터
// 인덱스: e*8 + s*4 + t*2 + j  (e=0:E,1:I / s=0:S,1:N / t=0:T,1:F / j=0:J,1:P)
//  0=ESTJ  1=ESTP  2=ESFJ  3=ESFP
//  4=ENTJ  5=ENTP  6=ENFJ  7=ENFP
//  8=ISTJ  9=ISTP 10=ISFJ 11=ISFP
// 12=INTJ 13=INTP 14=INFJ 15=INFP
// ============================================================================
const HAIR_TYPES: Record<number, HairType> = {
  // 0 ─ ESTJ ──────────────────────────────────────────────────────────────
  0: {
    mbti: "ESTJ",
    nickname: "엄격한 원장님 빙의형",
    tagline: "\"내 머리에 한 치의 오차도 용납 못해.\"",
    emoji: "📐",
    gradA: "#0F766E", gradB: "#134E4A",
    description: "\"내 머리에 한 치의 오차도 용납 못해.\" 미용실 원장님보다 더 꼼꼼한 홈케어 마스터. 앞머리 볼륨부터 뒷머리 뻗침까지, 거울 앞에서 보내는 10분은 당신에게 신성한 의식이에요. 원하는 cm까지 정확하게 전달하는 당신을 원장님들은 제일 좋아하면서도 제일 긴장해요.",
    product: { name: "프리미엄 극손상 헤어 앰플", link: "https://link.coupang.com/a/eEmwZ607d6" },
  },
  // 1 ─ ESTP ──────────────────────────────────────────────────────────────
  1: {
    mbti: "ESTP",
    nickname: "인간 카멜레온",
    tagline: "\"머리색이 3주 이상 같으면 병나는 스타일.\"",
    emoji: "🦎",
    gradA: "#F97316", gradB: "#9A3412",
    description: "\"머리색이 3주 이상 같으면 병나는 스타일.\" 유행하는 스타일은 내 머리에 다 해봐야 직성이 풀림. 탈색? 당연히 해봤죠. 애쉬 브라운? 두 달 전 얘기예요. 헤어가 곧 자기표현인 당신에게 '저번이랑 머리색이 또 달라요?' 는 최고의 칭찬이에요.",
    product: { name: "컬러 유지 보색 샴푸", link: "https://link.coupang.com/a/eEngcjpS3M" },
  },
  // 2 ─ ESFJ ──────────────────────────────────────────────────────────────
  2: {
    mbti: "ESFJ",
    nickname: "리액션 봇 단골손님",
    tagline: "\"어머 원장님 너무 예뻐요!\"",
    emoji: "🌸",
    gradA: "#EC4899", gradB: "#9D174D",
    description: "\"어머 원장님 너무 예뻐요!\" 샵 분위기 메이커이자 미용실 원장님들의 최애 고객. 미용실에 들어서는 순간부터 분위기가 달라져요. 자연스러운 온기로 샵 전체를 훈훈하게 만들고, 머리 잘 나오면 지인 5명에게 바로 추천하는 살아있는 마케터예요.",
    product: { name: "윤기 코팅 실크 헤어 오일", link: "https://link.coupang.com/a/eEnlw9bAnQ" },
  },
  // 3 ─ ESFP ──────────────────────────────────────────────────────────────
  3: {
    mbti: "ESFP",
    nickname: "거울 앞의 팝스타",
    tagline: "\"내 머리가 제일 화려해야 해!\"",
    emoji: "🌟",
    gradA: "#FBBF24", gradB: "#DC2626",
    description: "\"내 머리가 제일 화려해야 해!\" 즉흥적으로 기분 따라 튀는 컬러와 파격을 즐기는 인간 비타민. 오늘 아침까지 기를 생각이었다가 점심에 인스타 보고 예약했어요. 당장, 오늘요. '충동적으로 미용실 갔다가 대박남' 릴스의 주인공이 바로 당신 유형이에요.",
    product: { name: "열손상 보호 헤어 미스트", link: "https://link.coupang.com/a/eEnvf1ILXU" },
  },
  // 4 ─ ENTJ ──────────────────────────────────────────────────────────────
  4: {
    mbti: "ENTJ",
    nickname: "헤어 플래너",
    tagline: "\"이 시술, 제 모질에 최선 맞나요?\"",
    emoji: "📊",
    gradA: "#7C3AED", gradB: "#4C1D95",
    description: "\"이 시술, 제 모질에 최선 맞나요?\" 실패 확률 0%를 위해 철저히 논리적으로 샵을 분석하는 CEO 스타일. 예약 전 리뷰 크로스체크는 기본이고, 상담 시 모질·두상·퍼스널 컬러를 먼저 설명해요. '업계 관계자세요?' 하는 착각을 유발하는 고객이에요.",
    product: { name: "기능성 두피 쿨링 토닉", link: "https://link.coupang.com/a/eEnAG9gOGc" },
  },
  // 5 ─ ENTP ──────────────────────────────────────────────────────────────
  5: {
    mbti: "ENTP",
    nickname: "도전정신 만렙 실험쥐",
    tagline: "\"탈색 3번? 콜! 삭발 빼고 다 해봅니다.\"",
    emoji: "🧪",
    gradA: "#10B981", gradB: "#065F46",
    description: "\"탈색 3번? 콜! 삭발 빼고 다 해봅니다.\" 남들이 안 하는 특이하고 실험적인 스타일을 즐기는 개성파. 원장님이 '이건 좀...' 하면 '괜찮아요, 제가 책임질게요'를 바로 대답할 수 있는 사람. 머리 망해도 그게 또 스토리가 되니까 괜찮아요.",
    product: { name: "고농축 단백질 본드 앰플", link: "https://link.coupang.com/a/eEnDYZ4YEe" },
  },
  // 6 ─ ENFJ ──────────────────────────────────────────────────────────────
  6: {
    mbti: "ENFJ",
    nickname: "헤어스타일 전도사",
    tagline: "\"야, 내 샵 원장님 미쳤어. 너도 여기 가봐.\"",
    emoji: "📢",
    gradA: "#F59E0B", gradB: "#B45309",
    description: "\"야, 내 샵 원장님 미쳤어. 너도 여기 가봐.\" 자기가 머리 성공하면 주변 지인들까지 다 끌어모으는 영업부장. 카톡 단톡방 3개에 후기 올리고 원장님 인스타 태그까지 해주는 당신, 미용실 입장에선 살아있는 마케터예요.",
    product: { name: "초강력 뿌리 볼륨 픽서", link: "https://link.coupang.com/a/eEnLJ6LF0u" },
  },
  // 7 ─ ENFP ──────────────────────────────────────────────────────────────
  7: {
    mbti: "ENFP",
    nickname: "변덕쟁이 금사빠",
    tagline: "\"자를까 기를까? 아 그냥 붙임머리 할까?!\"",
    emoji: "🎪",
    gradA: "#8B5CF6", gradB: "#BE185D",
    description: "\"자를까 기를까? 아 그냥 붙임머리 할까?!\" 단발병과 장발병이 하루에도 수십 번 교차하는 갈대 같은 마음. 아침엔 '기르자', 점심엔 단발 사진에 흔들리고, 저녁엔 울프컷 영상 보고 '이거다!' 결국 의자에 앉아서도 결정은 원장님이 대신해 줘요.",
    product: { name: "티 안 나는 똑딱이 앞머리 가발", link: "https://link.coupang.com/a/eEq31tjgKO" },
  },
  // 8 ─ ISTJ ──────────────────────────────────────────────────────────────
  8: {
    mbti: "ISTJ",
    nickname: "한 우물 파는 소나무",
    tagline: "\"10년째 같은 미용실, 같은 스타일.\"",
    emoji: "🌲",
    gradA: "#475569", gradB: "#1E293B",
    description: "\"10년째 같은 미용실, 같은 스타일.\" 변화를 극혐하며, '늘 하던 대로 해주세요'가 인생 모토인 안정형. 좋은 거 발견하면 바꾸지 않는 게 원칙이에요. 새 스타일 권유를 받아도 '그냥 늘 하던 대로 해주세요'가 자동으로 나오고, 그 선택은 항상 틀리지 않아요.",
    product: { name: "잔머리 정리 스틱 왁스", link: "https://link.coupang.com/a/eEnVGyip64" },
  },
  // 9 ─ ISTP ──────────────────────────────────────────────────────────────
  9: {
    mbti: "ISTP",
    nickname: "귀찮음 만렙 쌩얼헤어",
    tagline: "\"머리는 감고 말리면 끝.\"",
    emoji: "😴",
    gradA: "#64748B", gradB: "#0F172A",
    description: "\"머리는 감고 말리면 끝.\" 고데기 할 시간에 1분이라도 잠을 더 자는 실용주의 끝판왕. 감는다 → 말린다 → 나간다. 전 세계에서 가장 효율적인 3단계 루틴. 고데기는 있지만 반년째 콘센트에 꽂은 적 없어요.",
    product: { name: "3초 뽀송 드라이 샴푸", link: "https://link.coupang.com/a/eEp3q6Nteu" },
  },
  // 10 ─ ISFJ ─────────────────────────────────────────────────────────────
  10: {
    mbti: "ISFJ",
    nickname: "프로 손민수형",
    tagline: "\"이거 고데기죠...?\" (핸드폰 3번 켰다 껐다가 내미는)",
    emoji: "🪞",
    gradA: "#F472B6", gradB: "#9D174D",
    description: "튀는 건 싫지만 트렌드는 놓치고 싶지 않음. 연예인 사진 부끄럽게 내밀며 \"이거 고데기죠...?\" 물어보는 귀여운 소심러. 원하는 스타일 사진은 있는데 보여주기가 부끄러워서 핸드폰 3번 켰다 껐다 하다가 결국 내미는 사람이에요. 잘 나오면 속으로만 엄청 좋아하죠.",
    product: { name: "앞머리 전용 세팅 스프레이", link: "https://link.coupang.com/a/eEn2zPHXye" },
  },
  // 11 ─ ISFP ─────────────────────────────────────────────────────────────
  11: {
    mbti: "ISFP",
    nickname: "방구석 뷰티 유튜버",
    tagline: "밖에선 대충 묶고, 방구석에선 S컬 장인",
    emoji: "🎬",
    gradA: "#A78BFA", gradB: "#6D28D9",
    description: "밖에 나갈 땐 대충 묶고 나가지만, 방구석에서 혼자 고데기 연습하고 셀카 찍는 걸 가장 사랑하는 예술가. 유튜브 헤어 튜토리얼 저장 폴더가 수백 개예요. 당신의 진짜 실력은 카메라 앨범에만 존재하는 셀카들이 알고 있어요.",
    product: { name: "고데기 전용 컬 유지 크림", link: "https://link.coupang.com/a/eEn6wxl4Oy" },
  },
  // 12 ─ INTJ ─────────────────────────────────────────────────────────────
  12: {
    mbti: "INTJ",
    nickname: "헤어 분석가",
    tagline: "원장님이랑 팩트로 토론 가능한 지식인",
    emoji: "🔬",
    gradA: "#0D9488", gradB: "#134E4A",
    description: "미용실 가기 전 내 두상, 모질, 퍼스널 컬러까지 완벽히 분석해서 감. 원장님이랑 팩트로 토론 가능한 지식인. 시술 성분표도 체크하고, 트리트먼트 효능도 직접 확인해요. '혹시 이 약품 pH가 얼마예요?'라고 물어봐도 이상하지 않은 유형이에요.",
    product: { name: "성분 착한 약산성 비건 샴푸", link: "https://link.coupang.com/a/eEoal2SxC8" },
  },
  // 13 ─ INTP ─────────────────────────────────────────────────────────────
  13: {
    mbti: "INTP",
    nickname: "머리칼 방치형 학자",
    tagline: "\"머리카락은 뇌를 보호하는 단백질일 뿐.\"",
    emoji: "📚",
    gradA: "#2563EB", gradB: "#1E3A8A",
    description: "\"머리카락은 뇌를 보호하는 단백질일 뿐.\" 미용실 가는 게 세상에서 제일 귀찮은 방치형 천재. 미용실 기준이 '더 이상 앞이 안 보일 때'예요. 막상 가면 원장님과 헤어의 물리학적 특성을 토론하다가 나오는 게 함정이에요.",
    product: { name: "뿌리는 노워시(No-wash) 트리트먼트", link: "https://link.coupang.com/a/eEohliGJFs" },
  },
  // 14 ─ INFJ ─────────────────────────────────────────────────────────────
  14: {
    mbti: "INFJ",
    nickname: "내적 관종 미니멀리스트",
    tagline: "겉은 무난, 속은 시크릿 투톤",
    emoji: "🕯️",
    gradA: "#4F46E5", gradB: "#312E81",
    description: "겉으로는 무난해 보이지만 시크릿 투톤 같은 은근한 디테일을 즐김. 샵에서 말 거는 거 제일 힘들어함. 귀 뒤에만 살짝 넣은 포인트 컬러 같은 '아는 사람만 아는' 디테일이 당신의 진짜 매력이에요. 원장님은 왜 그렇게 말이 많은지...",
    product: { name: "명품 향수 향 헤어 퍼퓸 미스트", link: "https://link.coupang.com/a/eEolHKuo8a" },
  },
  // 15 ─ INFP ─────────────────────────────────────────────────────────────
  15: {
    mbti: "INFP",
    nickname: "망상 폭주 단발병 환자",
    tagline: "속으론 '나 완전 아이유 같겠지?' 상상하지만 티 안 냄",
    emoji: "💭",
    gradA: "#9333EA", gradB: "#581C87",
    description: "속으로는 '나 완전 아이유 같겠지?' 상상하지만 티 안 냄. 머리 망하면 집 가서 3일 내내 서럽게 우는 감성 충만러. 미용실 가기 전날 밤엔 화보 수준 결과물을 상상하지만, 막상 의자에 앉으면 '그냥... 조금만 다듬어 주세요'가 나오고 말아요.",
    product: { name: "거지존 탈출 패스트 샴푸", link: "https://link.coupang.com/a/eEouHNbV1M" },
  },
};

// ============================================================================
// 애니메이션
// ============================================================================
const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const FADE_UP = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ============================================================================
// Suspense 래퍼 (useSearchParams 요구사항)
// ============================================================================
export default function MbtiResultWrapper() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-charcoal">
          <p className="text-cream/50">결과를 불러오는 중...</p>
        </main>
      }
    >
      <MbtiResultPage />
    </Suspense>
  );
}

// ============================================================================
// 결과 페이지 메인
// ============================================================================
// 대기자 등록 링크 — 준비되면 여기에 카카오 채널 또는 구글 폼 URL 입력
const WAITLIST_LINK = "";

function MbtiResultPage() {
  const params = useSearchParams();
  const [copied, setCopied] = useState(false);

  let id = Number(params.get("r") ?? "-1");
  if (isNaN(id) || id < 0 || id > 15) {
    try { id = Number(sessionStorage.getItem("hair_dna_id") ?? "9"); } catch { id = 9; }
  }
  const data = HAIR_TYPES[id] ?? HAIR_TYPES[9];

  function handleMainCta() {
    if (WAITLIST_LINK) {
      window.open(WAITLIST_LINK, "_blank");
    } else {
      alert("정식 서비스 오픈 준비 중입니다! 조금만 기다려주세요.");
    }
  }

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `내 헤어 MBTI는 ${data.mbti} "${data.nickname}"\n어뷰티(A-Beauty) 헤어 MBTI 테스트 해봐 💇`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "헤어 MBTI 테스트", text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <main className="min-h-screen bg-charcoal text-cream">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-charcoal/90 px-5 py-3.5 backdrop-blur-md">
        <Link href="/mbti" className="text-sm font-medium text-cream/45 transition-colors hover:text-cream">
          ← 다시 하기
        </Link>
        <span className="text-xs font-semibold tracking-[0.22em] uppercase text-gold">
          헤어 MBTI
        </span>
        <button
          onClick={handleShare}
          className="text-sm font-medium text-cream/45 transition-colors hover:text-cream"
        >
          {copied ? "복사됨 ✓" : "공유"}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg px-5 pb-44">
        <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-5 pt-6">

          {/* 히어로 카드 */}
          <motion.div variants={FADE_UP} className="overflow-hidden rounded-3xl">
            <div
              className="px-7 pb-8 pt-10 text-center"
              style={{ background: `linear-gradient(135deg, ${data.gradA}, ${data.gradB})` }}
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 18 }}
                className="mb-4 text-6xl"
              >
                {data.emoji}
              </motion.div>
              <p className="mb-3 text-sm font-semibold tracking-[0.18em] uppercase text-white/60">
                나의 헤어 MBTI
              </p>
              {/* MBTI 4자리 코드 — 크고 굵게 */}
              <div className="mb-2 inline-block rounded-xl bg-white/20 px-5 py-1.5 backdrop-blur-sm">
                <span className="font-sans text-3xl font-black tracking-[0.15em] text-white">
                  {data.mbti}
                </span>
              </div>
              <h1 className="font-serif text-[1.55rem] font-bold leading-snug text-white">
                {data.nickname}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {data.tagline}
              </p>
            </div>

            {/* 공유 유도 배너 */}
            <div className="flex items-center justify-between bg-white/[0.07] px-6 py-3">
              <p className="text-sm text-cream/50">친구 유형도 궁금하지 않아요? 👀</p>
              <button
                onClick={handleShare}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-cream/80 transition-colors hover:bg-white/15"
              >
                공유하기
              </button>
            </div>
          </motion.div>

          {/* 팩폭 설명 */}
          <motion.div
            variants={FADE_UP}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6"
          >
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              <span>✦</span> 헤어 유형 분석
            </h2>
            <p className="text-base leading-[1.85] text-cream/80">
              {data.description}
            </p>
          </motion.div>

          {/* 맞춤 상품 추천 — 단일 CTA 버튼 */}
          <motion.div variants={FADE_UP}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              유형별 맞춤 처방
            </p>
            <a
              href={data.product.link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 py-5 text-center font-bold text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${data.gradA}, ${data.gradB})` }}
            >
              {/* 호버 글로우 */}
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15), transparent 60%)" }}
              />
              <span className="relative text-xl">🎁</span>
              <span className="relative leading-snug">
                <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.18em] opacity-75">
                  맞춤 처방
                </span>
                <span className="block text-base">
                  {data.product.name} 최저가 확인하기
                </span>
              </span>
              <span className="relative ml-auto text-lg opacity-80">→</span>
            </a>
          </motion.div>

          {/* 공유 카드 */}
          <motion.div variants={FADE_UP} className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-5 text-center">
            <p className="text-sm font-semibold text-cream/80">친구는 어떤 유형일까요? 🤔</p>
            <p className="mt-1 text-xs text-cream/40">공유하고 서로 비교해 보세요</p>
            <button
              onClick={handleShare}
              className="mt-4 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-cream/70 transition-all hover:border-white/30 hover:text-cream active:scale-[0.98]"
            >
              🔗 결과 링크 공유하기
            </button>
          </motion.div>

        </motion.div>

        {/* 쿠팡 파트너스 법적 고지 */}
        <p className="mt-8 pb-2 text-center text-[0.7rem] leading-relaxed text-cream/20">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로,<br />
          이에 따른 일정액의 수수료를 제공받습니다.
        </p>
      </div>

      {/* ── 하단 고정 메인 CTA (가장 크고 화려하게) ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg">
          <button
            onClick={handleMainCta}
            className="group relative w-full overflow-hidden rounded-2xl py-5 text-base font-bold text-white shadow-[0_8px_32px_rgba(168,85,247,0.40)] transition-all active:scale-[0.98] hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #e879f9, #8b5cf6, #3b82f6)" }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), transparent)" }}
            />
            <span className="relative leading-snug">
              👉 무료 AI 헤어 진단, 정식 오픈 알림 받기
              <span className="mt-0.5 block text-sm font-medium opacity-80">오픈 즉시 알려드릴게요 ✦</span>
            </span>
          </button>
          <p className="mt-2 text-center text-xs text-cream/25">
            정식 오픈 시 무료 체험 · 알림 우선 발송
          </p>
        </div>
      </div>
    </main>
  );
}
