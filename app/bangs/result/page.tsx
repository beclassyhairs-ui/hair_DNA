"use client";

// ============================================================================
// 어뷰티 인생뱅 — 카드뉴스형 결과지
// 얼굴형 × 가르마 × 앞머리유무 → 팩트 폭행 + 인생뱅 처방 + 제품 CTA
// ============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BANGS_PHOTO_KEY, BANGS_FACESHAPE_KEY, BANGS_SURVEY_KEY } from "../constants";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type FaceShapeKey = "oval" | "round" | "oblong" | "square" | "heart" | "diamond" | "hexagon" | "peanut";
type PartingKey   = "side" | "center" | "allback";
type HasBangsKey  = "yes" | "no";

interface SurveyData {
  parting:  PartingKey;
  hasBangs: HasBangsKey;
}

// ─── 얼굴형 처방 데이터베이스 ─────────────────────────────────────────────────

interface BangsPrescription {
  faceTitle:   string;   // "황금비율 계란형"
  summary:     string;   // 2줄 기본 정의 요약
  bestBang:    string;   // 1순위 추천 앞머리
  altBang:     string;   // 2순위
  detail:      string;   // 상세 처방 설명
  avoidText:   string;   // 피해야 할 스타일
  product: {
    name:    string;
    tagline: string;
    link:    string;
  };
}

const BANGS_DB: Record<FaceShapeKey, BangsPrescription> = {
  oval: {
    faceTitle: "황금비율 계란형",
    summary: "어떤 앞머리도 완벽하게 소화하는 이상적인 얼굴형이에요. 오히려 선택의 폭이 넓어서 트렌디한 개성을 마음껏 표현할 수 있어요.",
    bestBang: "가닥뱅",
    altBang: "시스루뱅",
    detail: "가닥뱅이나 눈썹 위 기장의 짧은 뱅으로 포인트를 더해보세요. 가볍게 흐르는 앞머리가 완벽한 계란형에 생기를 더해줍니다.",
    avoidText: "무거운 풀뱅 · 두꺼운 사이드뱅",
    product: {
      name: "앞머리 전용 세팅 스프레이",
      tagline: "가닥뱅 자연스러운 흐름 하루 종일!",
      link: "https://link.coupang.com/a/eEn2zPHXye",
    },
  },
  round: {
    faceTitle: "부드러운 동안 둥근형",
    summary: "'동안'의 정석! 귀엽고 사랑스러운 매력을 가졌어요. 앞머리 선택 하나로 갸름함이 크게 달라지는 얼굴형이에요.",
    bestBang: "시스루뱅",
    altBang: "사이드 스웹 뱅",
    detail: "이마 중심을 비우는 시스루뱅이 필수예요. 얼굴 옆선을 자연스럽게 감싸는 사이드뱅을 매치하면 갸름한 얼굴로 보정됩니다.",
    avoidText: "빽빽한 풀뱅 · 양옆으로 퍼지는 뱅",
    product: {
      name: "앞머리 전용 세팅 스프레이",
      tagline: "시스루뱅 자연스러운 결 고정!",
      link: "https://link.coupang.com/a/eEn2zPHXye",
    },
  },
  oblong: {
    faceTitle: "지적이고 세련된 긴형",
    summary: "지적이고 세련된 분위기를 자아내는 얼굴형이에요. 앞머리 하나로 이상적인 황금비율이 완성되는 잠재력이 있어요.",
    bestBang: "소프트 풀뱅",
    altBang: "시스루뱅",
    detail: "소프트 풀뱅이나 시스루뱅으로 이마를 자연스럽게 덮어 세로 길이를 축소해 주세요. 이마를 덮는 것만으로 얼굴 비율이 황금비율로 변신합니다.",
    avoidText: "이마 드러내는 올백 · 5:5 생머리",
    product: {
      name: "앞머리 전용 세팅 스프레이",
      tagline: "풀뱅 깔끔한 볼륨 하루 종일!",
      link: "https://link.coupang.com/a/eEn2zPHXye",
    },
  },
  square: {
    faceTitle: "매력적인 입체감 각진형",
    summary: "신뢰감과 카리스마를 주는 글로벌 트렌드 골격이에요. 커튼뱅 하나로 인상이 완전히 달라지는 가장 劇的인 변신이 가능해요.",
    bestBang: "커튼뱅",
    altBang: "사이드 스웹 뱅",
    detail: "5:5 가르마 중심으로 우아하게 흐르는 커튼뱅을 매치하시면 턱선으로 가는 시선이 양옆으로 분산되어 얼굴이 반쪽처럼 갸름해 보입니다.",
    avoidText: "무거운 일자 풀뱅 · 슬릭컷 · 딱 붙는 앞머리",
    product: {
      name: "잔머리 볼륨 픽서 에센스",
      tagline: "커튼뱅 자연스러운 볼륨 하루 종일!",
      link: "https://link.coupang.com/a/eEnVGyip64",
    },
  },
  heart: {
    faceTitle: "날렵한 V라인 하트형",
    summary: "도회적이고 트렌디한 요정 같은 분위기를 가진 얼굴형이에요. 커튼뱅 하나만으로 완벽한 균형미가 완성됩니다.",
    bestBang: "커튼뱅",
    altBang: "사이드 스웹 뱅",
    detail: "커튼뱅이나 사이드 스웹 뱅으로 넓은 이마를 자연스럽게 커버해주세요. 넓은 이마를 완전히 드러내거나 짧은 처피뱅은 역삼각형을 더 강조합니다.",
    avoidText: "넓은 이마 완전 노출 · 짧은 처피뱅",
    product: {
      name: "앞머리 전용 세팅 스프레이",
      tagline: "커튼뱅 흐르는 결 자연스럽게!",
      link: "https://link.coupang.com/a/eEn2zPHXye",
    },
  },
  diamond: {
    faceTitle: "엣지 넘치는 다이아몬드형",
    summary: "입체감 있는 개성 넘치는 얼굴형이에요. 앞머리 디자인으로 강한 인상을 세련된 매력으로 전환할 수 있어요.",
    bestBang: "롱 사이드뱅",
    altBang: "블록뱅",
    detail: "광대를 자연스럽게 가리는 롱 사이드뱅이나 블록뱅을 추천해요. 이마와 턱 주변을 채워 광대의 강한 인상이 부드럽게 보정됩니다.",
    avoidText: "광대 위치에서 끊기는 일자 앞머리 · 딱 붙는 포니테일",
    product: {
      name: "앞머리 전용 세팅 스프레이",
      tagline: "롱 사이드뱅 자연스럽게 고정!",
      link: "https://link.coupang.com/a/eEn2zPHXye",
    },
  },
  hexagon: {
    faceTitle: "고혹적인 카리스마 육각형",
    summary: "압도적인 카리스마와 귀족적인 분위기를 가진 얼굴형이에요. 앞머리로 강한 인상에 부드러운 공기감을 더하면 완벽해요.",
    bestBang: "시스루뱅",
    altBang: "히피뱅",
    detail: "시스루뱅이나 히피뱅으로 얼굴 주변에 부드러운 공기감을 채워주세요. 얼굴 라인에 딱 붙는 슬릭 생머리나 무거운 일자 앞머리는 인상을 더 딱딱하게 만듭니다.",
    avoidText: "슬릭 생머리 · 무거운 일자 앞머리",
    product: {
      name: "윤기 코팅 실크 헤어 오일",
      tagline: "시스루뱅에 딱! 윤기 코팅 마무리",
      link: "https://link.coupang.com/a/eEnlw9bAnQ",
    },
  },
  peanut: {
    faceTitle: "오묘한 매력의 유니크 땅콩형",
    summary: "한국 여성에게 특화된 오묘한 매력의 얼굴형이에요. 사이드뱅 하나로 완벽한 계란형으로 보정되는 놀라운 변신이 기다려요.",
    bestBang: "사이드뱅",
    altBang: "잔머리컷",
    detail: "패인 관자놀이를 자연스럽게 커버하는 사이드뱅이나 잔머리컷을 추천해요. 광대를 타고 흐르는 앞머리가 완벽한 계란형 실루엣으로 보정해줍니다.",
    avoidText: "짧은 처피뱅 · 5:5 가르마 올백",
    product: {
      name: "잔머리 볼륨 픽서 에센스",
      tagline: "사이드뱅 볼륨 하루 종일 고정!",
      link: "https://link.coupang.com/a/eEnVGyip64",
    },
  },
};

// ─── 가르마 × 얼굴형 팩트폭행 ────────────────────────────────────────────────

const PARTING_LABELS: Record<PartingKey, string> = {
  side:    "옆가르마",
  center:  "가운데 가르마 (5:5)",
  allback: "올백 스타일",
};

const BANGS_LABELS: Record<HasBangsKey, string> = {
  yes: "앞머리 있음",
  no:  "앞머리 없음 (이마 노출)",
};

// 얼굴형별 가르마 팩트 (center/allback은 보정 필요, side는 칭찬)
const FACT_MAP: Record<FaceShapeKey, Record<PartingKey, string>> = {
  oval: {
    side:    "옆가르마를 하고 계시네요. 계란형에 옆가르마는 이미 훌륭한 조합이에요! 가닥뱅이나 시스루뱅을 추가하면 더욱 완벽해집니다.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 계란형에 가운데 가르마는 대칭미가 강조돼요. 가닥뱅을 더하면 단조로움을 방지할 수 있어요.",
    allback: "이마를 완전히 드러내고 계시네요. 완벽한 계란형이라 올백도 아름다워요! 앞머리를 더하면 더욱 고급스러운 분위기를 낼 수 있어요.",
  },
  round: {
    side:    "옆가르마를 하고 계시네요. 좋은 선택이에요! 여기에 시스루뱅이나 사이드뱅을 더하면 갸름한 얼굴로 완벽하게 보정됩니다.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 둥근 얼굴에 5:5 가르마는 가로 폭을 더 넓어 보이게 합니다. 사선 가르마로 바꾸고 시스루뱅을 더하면 갸름해져요!",
    allback: "이마를 완전히 드러내고 계시네요. 둥근 얼굴에 올백은 얼굴이 더 커 보일 수 있어요. 시스루뱅이나 사이드뱅으로 옆선을 자연스럽게 감싸주세요!",
  },
  oblong: {
    side:    "옆가르마를 하고 계시네요. 긴 얼굴에 옆가르마는 무난한 선택이에요. 이마를 살짝 덮는 시스루뱅을 더하면 비율이 훨씬 좋아집니다.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 긴 얼굴에 이마를 완전히 드러내면 세로 길이가 더 강조됩니다. 소프트 풀뱅이나 시스루뱅으로 이마를 덮어주세요!",
    allback: "이마를 완전히 드러내고 계시네요. 긴 얼굴형에는 이마를 덮는 앞머리가 필수예요. 소프트 풀뱅이나 시스루뱅으로 얼굴 길이를 줄여주세요!",
  },
  square: {
    side:    "옆가르마를 하고 계시네요. 각진형에 옆가르마는 좋은 선택이에요! 커튼뱅이나 사이드뱅을 더하면 각진 인상이 훨씬 부드러워집니다.",
    center:  "현재 [가운데 가르마]를 하고 계시네요. 이는 양쪽 턱의 각이 정직하게 노출될 수 있습니다. 자로 잰 듯 무거운 앞머리는 절대 피해주세요!",
    allback: "이마와 얼굴선을 모두 드러내고 계시네요. 각진 얼굴에 올백은 강한 인상을 더욱 부각시킬 수 있어요. 커튼뱅이나 사이드뱅으로 하관을 부드럽게 감싸주세요!",
  },
  heart: {
    side:    "옆가르마를 하고 계시네요. 하트형에 옆가르마는 무난한 선택이에요! 커튼뱅을 더하면 넓은 이마를 자연스럽게 커버해 완벽한 균형미가 완성돼요.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 하트형에 넓은 이마를 드러내는 가르마는 무게중심이 위로 쏠려 보여요. 커튼뱅이나 사이드 스웹 뱅으로 이마를 커버해주세요!",
    allback: "이마를 완전히 드러내고 계시네요. 하트형에 넓은 이마를 모두 드러내면 역삼각형이 강조됩니다. 커튼뱅으로 이마를 부드럽게 덮어 균형을 맞춰주세요!",
  },
  diamond: {
    side:    "옆가르마를 하고 계시네요. 다이아몬드형에 옆가르마는 좋은 선택이에요! 롱 사이드뱅이나 블록뱅을 더하면 광대의 강한 인상이 부드러워집니다.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 다이아몬드형에 이마를 완전히 드러내면 광대의 볼록함이 더 강조될 수 있어요. 롱 사이드뱅으로 이마와 광대를 커버해주세요!",
    allback: "이마와 얼굴선을 모두 드러내고 계시네요. 광대가 돌출된 얼굴에 올백은 골격을 여과 없이 드러냅니다. 롱 사이드뱅이나 블록뱅으로 균형을 맞춰주세요!",
  },
  hexagon: {
    side:    "옆가르마를 하고 계시네요. 강한 카리스마를 가진 육각형에 옆가르마는 기본 조합이에요! 시스루뱅이나 히피뱅을 더하면 얼굴 주변이 부드러워집니다.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 강한 골격에 가운데 가르마는 뼈대의 대칭을 너무 선명하게 부각합니다. 시스루뱅이나 히피뱅으로 골격을 부드럽게 감싸주세요!",
    allback: "이마와 얼굴선을 모두 드러내고 계시네요. 육각형의 강한 골격에 올백은 인상이 더 강해 보일 수 있어요. 시스루뱅이나 히피뱅으로 부드러운 공기감을 채워주세요!",
  },
  peanut: {
    side:    "옆가르마를 하고 계시네요. 땅콩형에 옆가르마는 무난한 선택이에요! 사이드뱅이나 잔머리컷을 더하면 울퉁불퉁한 얼굴 라인이 매끈하게 커버됩니다.",
    center:  "5:5 가운데 가르마를 하고 계시네요. 땅콩형에 가운데 가르마는 울퉁불퉁한 얼굴 라인을 여과 없이 드러냅니다. 사이드뱅이나 잔머리컷으로 매끈하게 커버해주세요!",
    allback: "이마와 패인 관자놀이를 모두 드러내고 계시네요. 땅콩형에 올백은 얼굴 굴곡이 강조됩니다. 사이드뱅이나 잔머리컷으로 자연스럽게 커버해주세요!",
  },
};

// ─── 애니메이션 ───────────────────────────────────────────────────────────────

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const CARD_ANIM = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function BangsResultPage() {
  const [photo, setPhoto]     = useState<string | null>(null);
  const [survey, setSurvey]   = useState<SurveyData | null>(null);
  const [faceKey, setFaceKey] = useState<FaceShapeKey>("round");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem(BANGS_PHOTO_KEY);
      if (p) setPhoto(p);

      const s = sessionStorage.getItem(BANGS_SURVEY_KEY);
      if (s) setSurvey(JSON.parse(s) as SurveyData);

      const f = (sessionStorage.getItem(BANGS_FACESHAPE_KEY) ?? "round") as FaceShapeKey;
      setFaceKey(f in BANGS_DB ? f : "round");
    } catch { /**/ }
  }, []);

  const data    = BANGS_DB[faceKey];
  const parting = survey?.parting ?? "side";
  const hasBangs = survey?.hasBangs ?? "no";
  const factText = FACT_MAP[faceKey]?.[parting] ?? `현재 ${PARTING_LABELS[parting]}를 하고 계시네요. AI 처방전을 확인해 보세요!`;

  function handleShare() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/bangs?utm_source=result_share` : "/bangs";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "내 인생 앞머리 찾기", text: `나는 ${data.faceTitle}! 인생 앞머리는 ${data.bestBang}이에요 💇`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert("링크가 복사되었습니다! 카톡 채팅방에 붙여넣기 해주세요 🚀");
      });
    }
  }

  return (
    <main className="min-h-screen bg-charcoal pb-40 text-cream">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-charcoal/90 px-5 py-4 backdrop-blur-md">
        <Link href="/bangs/upload" className="text-base font-medium text-cream/40 hover:text-cream">
          ← 다시 찍기
        </Link>
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
          인생뱅 결과지
        </span>
        <button
          onClick={handleShare}
          className="text-base font-medium text-cream/40 hover:text-cream"
        >
          {copied ? "복사됨 ✓" : "공유"}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg px-5">
        <motion.div
          variants={STAGGER}
          initial="hidden"
          animate="show"
          className="space-y-5 pt-6"
        >

          {/* ── CARD 1: AI 얼굴형 분석 이미지 ── */}
          <motion.div variants={CARD_ANIM} className="overflow-hidden rounded-3xl">
            {/* 사진 + 얼굴형 레이블 */}
            <div className="relative">
              {photo ? (
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="분석 사진" className="h-full w-full object-cover" />
                  {/* 그라디언트 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent" />
                  {/* 얼굴형 결과 뱃지 */}
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-7">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-gold">
                      ✦ AI 분석 결과
                    </p>
                    <h1 className="font-serif text-3xl font-bold leading-snug text-cream">
                      고객님은
                      <br />
                      <span className="text-gold-light">{data.faceTitle}</span>
                    </h1>
                    <p className="mt-2 text-base text-cream/60">
                      {PARTING_LABELS[parting]} · {BANGS_LABELS[hasBangs]}
                    </p>
                  </div>
                </div>
              ) : (
                /* 사진 없을 때 placeholder */
                <div className="flex h-64 flex-col items-center justify-center bg-white/[0.04]">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 text-4xl">✦</div>
                  <p className="text-base text-cream/50">AI 분석 결과</p>
                  <p className="mt-1 font-serif text-2xl font-bold text-gold-light">{data.faceTitle}</p>
                  <p className="mt-2 text-sm text-cream/40">{PARTING_LABELS[parting]} · {BANGS_LABELS[hasBangs]}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── CARD 2: 기본 정의 ── */}
          <motion.div
            variants={CARD_ANIM}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] p-6"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
              얼굴형 정의
            </p>
            <p className="text-xl leading-[1.75] text-cream/85">
              {data.summary}
            </p>
          </motion.div>

          {/* ── CARD 3: 팩트 폭행 ── */}
          <motion.div
            variants={CARD_ANIM}
            className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              현재 스타일 분석
            </p>
            <p className="text-xl leading-[1.75] text-cream/85">
              {factText}
            </p>
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3">
              <p className="text-base font-semibold text-red-300/90">
                ❌ 피해야 할 스타일: {data.avoidText}
              </p>
            </div>
          </motion.div>

          {/* ── CARD 4: 인생 앞머리 처방 (강조) ── */}
          <motion.div
            variants={CARD_ANIM}
            className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/12 to-transparent"
          >
            {/* 골드 헤더 바 */}
            <div className="h-1 w-full bg-gradient-to-r from-gold-light via-gold to-gold-dark" />
            <div className="p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
                ✨ AI 추천 인생 앞머리
              </p>
              {/* 추천 앞머리 뱃지 */}
              <div className="mb-5 flex flex-wrap gap-3">
                <span className="rounded-xl bg-gold-dark px-5 py-2.5 text-xl font-black text-charcoal">
                  {data.bestBang}
                </span>
                <span className="rounded-xl border border-gold/50 px-5 py-2.5 text-xl font-bold text-gold-light">
                  {data.altBang}
                </span>
              </div>
              <p className="text-xl leading-[1.75] text-cream/85">
                {data.detail}
              </p>
            </div>
          </motion.div>

          {/* ── CARD 5: 맞춤 제품 처방 CTA ── */}
          <motion.div variants={CARD_ANIM}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">
              전문가 추천 픽
            </p>
            <a
              href={data.product.link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl px-6 py-5 text-left font-bold text-charcoal shadow-[0_4px_24px_rgba(255,124,152,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #FF7C98, #C084FC)" }}
            >
              <span className="relative leading-snug">
                <span className="block text-sm font-semibold uppercase tracking-wider opacity-80">
                  {data.product.tagline}
                </span>
                <span className="mt-0.5 block text-xl">
                  어뷰티 {data.product.name} 최저가 보기
                </span>
              </span>
              <span className="relative flex-none text-2xl">🎁 →</span>
            </a>
            <p className="mt-2 text-center text-xs text-cream/20">
              이 포스팅은 쿠팡 파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
            </p>
          </motion.div>

          {/* ── 공유 카드 ── */}
          <motion.div
            variants={CARD_ANIM}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-5 py-5 text-center"
          >
            <p className="text-lg font-semibold text-cream/85">
              친구도 인생 앞머리 찾아줄까요? 🤔
            </p>
            <p className="mt-1 text-base text-cream/40">공유하고 서로 결과를 비교해 보세요</p>
            <button
              onClick={handleShare}
              className="mt-4 w-full rounded-xl border border-white/15 py-4 text-lg font-semibold text-cream/70 transition-all hover:border-white/30 hover:text-cream active:scale-[0.98]"
            >
              🔗 결과 링크 공유하기
            </button>
          </motion.div>

        </motion.div>
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-charcoal/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          <Link
            href="/bangs"
            className="flex h-16 flex-none items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] px-6 text-base font-medium text-cream/60 transition-colors hover:text-cream"
          >
            처음부터
          </Link>
          <a
            href={data.product.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-lg font-bold text-charcoal shadow-gold transition-all hover:brightness-110 active:scale-[0.98]"
          >
            🎁 맞춤 제품 확인하기
          </a>
        </div>
      </div>
    </main>
  );
}
