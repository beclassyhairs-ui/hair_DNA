// ============================================================================
// 어뷰티 인생뱅 — 6문항 정밀 설문 데이터 (사진 촬영 없이 텍스트 문항만으로 진행)
// 화면 노출 순서(Q1~Q6): 얼굴형(자가 선택) → 현재 스타일 → 상안부(이마)
//   → 중안부(광대·코) → 하관(턱) → 모질(커머스 매칭용)
// 내부 answers 키(qFaceShape/q1~q5)는 기존 로직(bangRecommend) 호환을 위해
// 그대로 유지 — qFaceShape만 새로 추가된 필드.
// ============================================================================

import type { FaceShapeKey } from "./bangRecommend";

// ─── 답변 타입 ────────────────────────────────────────────────────────────────

export type Q1CurrentStyle =
  | "side_part"     // 옆가르마 (왼쪽/오른쪽)
  | "center_part"   // 가운데 가르마 (5:5)
  | "allback"       // 앞머리 없음 (올백으로 넘김)
  | "has_bangs";    // 앞머리 있음

export type Q2ForeheadConcern =
  | "narrow_brow"    // 좁은 이마 또는 튀어나온 눈썹뼈
  | "wide_forehead"  // 넓은 이마 또는 M자 헤어라인
  | "none";          // 특별한 고민 없음

export type Q3MidfaceConcern =
  | "cheekbone"  // 도드라진 옆광대
  | "long_mid"   // 긴 중안부 / 긴 코
  | "none";      // 특별한 고민 없음

export type Q4JawConcern =
  | "round_jaw"    // 둥글거나 통통한 볼살
  | "angular_jaw"  // 각지거나 뾰족한 턱선
  | "none";        // 특별한 고민 없음

export type Q5HairTexture =
  | "flat_oily"  // 푹 가라앉고 금방 기름짐
  | "flyaway"    // 위로 솟구치거나 지저분한 잔머리
  | "healthy";   // 건강하고 손질하기 편함

export interface BangsSurveyAnswers {
  qFaceShape: FaceShapeKey | "";
  q1: Q1CurrentStyle | "";
  q2: Q2ForeheadConcern | "";
  q3: Q3MidfaceConcern | "";
  q4: Q4JawConcern | "";
  q5: Q5HairTexture | "";
}

// ─── 설문 옵션 데이터 ─────────────────────────────────────────────────────────

export interface SurveyOption {
  id: string;
  icon: string;
  label: string;
  desc: string;
  isNone?: boolean; // "고민 없음" 옵션 — 시각적으로 구분
}

export interface SurveyQuestion {
  qKey: keyof BangsSurveyAnswers;
  no: string;
  stepTag: string;
  title: string;
  hint?: string;
  options: SurveyOption[];
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // ── Q1: 얼굴형 (자가 선택) ───────────────────────────────────────────────────
  {
    qKey: "qFaceShape",
    no: "Q1",
    stepTag: "얼굴형",
    title: "내 얼굴형은 어떠신가요?",
    hint: "가장 비슷한 얼굴형을 골라주세요",
    options: [
      { id: "oval",   icon: "◯", label: "계란형",          desc: "이마와 턱선이 부드럽고 갸름한 라인" },
      { id: "round",  icon: "●", label: "둥근형",          desc: "양 볼에 살이 있어 전체적으로 둥근 느낌" },
      { id: "square", icon: "◆", label: "각진형",          desc: "턱 각이 살아있고 하관이 발달한 느낌" },
      { id: "oblong", icon: "▮", label: "긴 얼굴형",       desc: "가로보다 세로 비율이 긴 갸름한 느낌" },
      { id: "heart",  icon: "▽", label: "역삼각형/하트형", desc: "이마가 넓고 턱끝이 뾰족한 느낌" },
      { id: "peanut", icon: "◇", label: "땅콩형",          desc: "광대가 부각되고 관자놀이나 볼이 들어가서 울퉁불퉁한 라인" },
    ],
  },
  // ── Q2: 현재 스타일 ──────────────────────────────────────────────────────────
  {
    qKey: "q1",
    no: "Q2",
    stepTag: "현재 스타일",
    title: "현재 헤어스타일은 어떤가요?",
    options: [
      { id: "side_part",   icon: "↗",  label: "옆가르마",          desc: "왼쪽 또는 오른쪽으로 가르마를 타요" },
      { id: "center_part", icon: "↑",  label: "가운데 가르마 (5:5)", desc: "정중앙으로 이마를 드러내요" },
      { id: "allback",     icon: "↰",  label: "앞머리 없음 · 올백",  desc: "이마를 완전히 드러내고 넘겨요" },
      { id: "has_bangs",   icon: "💇", label: "앞머리 있음",         desc: "현재 앞머리가 있어요" },
    ],
  },
  // ── Q3: 상안부 — 이마 고민 ───────────────────────────────────────────────────
  {
    qKey: "q2",
    no: "Q3",
    stepTag: "상안부 · 이마",
    title: "이마 / 헤어라인의 가장 큰 고민은?",
    hint: "앞머리 처방 방향이 달라져요",
    options: [
      { id: "narrow_brow",   icon: "🔼", label: "좁은 이마 · 튀어나온 눈썹뼈", desc: "이마가 좁거나 눈썹뼈가 도드라져요" },
      { id: "wide_forehead", icon: "↔️", label: "넓은 이마 · M자 헤어라인",     desc: "이마 여백이 넓거나 헤어라인이 올라가요" },
      { id: "none",          icon: "✓",  label: "특별한 고민 없음",              desc: "이마 쪽은 괜찮아요", isNone: true },
    ],
  },
  // ── Q4: 중안부 — 광대·코 고민 ────────────────────────────────────────────────
  {
    qKey: "q3",
    no: "Q4",
    stepTag: "중안부 · 광대",
    title: "얼굴 중앙에서 가리고 싶은 부분은?",
    hint: "사이드뱅 / 커튼뱅 처방 방향이 달라져요",
    options: [
      { id: "cheekbone", icon: "◉",  label: "도드라진 옆광대",     desc: "광대가 옆으로 도드라져 보여요" },
      { id: "long_mid",  icon: "↕️", label: "긴 중안부 / 긴 코",   desc: "코 아래~입술 구간이 길어 보여요" },
      { id: "none",      icon: "✓",  label: "특별한 고민 없음",    desc: "이 부분은 괜찮아요", isNone: true },
    ],
  },
  // ── Q5: 하관 — 턱 고민 ──────────────────────────────────────────────────────
  {
    qKey: "q4",
    no: "Q5",
    stepTag: "하관 · 턱선",
    title: "턱선 주변의 특징은?",
    hint: "롱 뱅 vs 짧은 뱅 처방 방향이 달라져요",
    options: [
      { id: "round_jaw",   icon: "⭕", label: "둥글거나 통통한 볼살",  desc: "볼살이 있거나 턱이 둥글어요" },
      { id: "angular_jaw", icon: "◇",  label: "각지거나 뾰족한 턱선", desc: "하관이 각지거나 턱이 뾰족해요" },
      { id: "none",        icon: "✓",  label: "특별한 고민 없음",     desc: "턱 쪽은 괜찮아요", isNone: true },
    ],
  },
  // ── Q6: 모질 — 커머스 매칭용 ────────────────────────────────────────────────
  {
    qKey: "q5",
    no: "Q6",
    stepTag: "앞머리 모질",
    title: "앞머리 쪽 머릿결의 특징은?",
    hint: "맞춤 헤어 제품을 추천해드릴게요",
    options: [
      { id: "flat_oily", icon: "💧", label: "푹 가라앉고 금방 기름짐", desc: "오후만 되면 떡지거나 납작해져요" },
      { id: "flyaway",   icon: "🌬️", label: "위로 솟구치거나 잔머리 많음", desc: "잔머리가 많거나 위로 뻗쳐나와요" },
      { id: "healthy",   icon: "✨", label: "건강하고 손질하기 편함",    desc: "큰 불편 없이 손질해요", isNone: true },
    ],
  },
];
