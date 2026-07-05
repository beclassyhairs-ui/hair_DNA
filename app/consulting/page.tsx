"use client";

// ============================================================================
// 어뷰티 — 고민상담소 (`/consulting`)
// 유저들이 헤어 고민을 질문하고 공감하는 게시판. 하단 탭바 "고민상담소"의 목적지.
// 지금은 더미 질문 목록 — 실 연동 시 Supabase에 저장된 질문/답변/공감수로 대체.
// ============================================================================

import { useState } from "react";
import AppShell from "../components/layout/AppShell";
import { trackEvent } from "../../lib/trackEvent";

const DUMMY_QUESTIONS = [
  {
    id: "bangs_rainy_day_001",
    tag: "습도 높은 날",
    question: "비 오는 날만 되면 앞머리가 갈라지고 정수리가 처져요. 제품 문제일까요?",
    likeCount: 128,
  },
  {
    id: "perm_drop_002",
    tag: "펌 고민",
    question: "펌 한 지 2주 됐는데 벌써 처지는 느낌이에요. 정상인가요?",
    likeCount: 84,
  },
  {
    id: "scalp_smell_003",
    tag: "두피 고민",
    question: "저녁에 감아도 아침이면 두피 냄새가 나요. 저만 그런가요?",
    likeCount: 56,
  },
];

function QuestionCard({ item }: { item: (typeof DUMMY_QUESTIONS)[number] }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likeCount);

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    trackEvent("consult_like_click", { questionId: item.id, source: "consulting_page" });
  };

  const handleViewAnswer = () => {
    trackEvent("consult_answer_view", { questionId: item.id, source: "consulting_page" });
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <span className="inline-block rounded-full bg-[#F9F4E8] px-2.5 py-1 text-[11px] font-semibold text-[#8A6D2F]">
        #{item.tag}
      </span>

      <p className="mt-3 rounded-xl bg-[#F9FAFB] px-4 py-3.5 text-sm leading-relaxed text-[#2F2F2F]">
        “{item.question}”
      </p>

      <div className="mt-3.5 flex items-center gap-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
            liked ? "border-[#C8A96A] bg-[#F3E9D2] text-[#8A6D2F]" : "border-gray-200 text-[#6B7280]"
          }`}
        >
          👍 나도 그래요 {likeCount}명
        </button>
        <button
          onClick={handleViewAnswer}
          className="flex-1 rounded-xl bg-[#2F2F2F] py-2.5 text-xs font-semibold text-white transition-opacity active:opacity-80"
        >
          전문가 답변 보기
        </button>
      </div>
    </section>
  );
}

export default function ConsultingPage() {
  return (
    <AppShell>
      <div>
        <h1 className="text-[19px] font-bold tracking-tight text-[#2F2F2F]">고민상담소</h1>
        <p className="mt-1 text-xs text-[#6B7280]">나와 비슷한 고민을 가진 사람들의 질문을 확인해보세요.</p>
      </div>

      {DUMMY_QUESTIONS.map((item) => (
        <QuestionCard key={item.id} item={item} />
      ))}
    </AppShell>
  );
}
