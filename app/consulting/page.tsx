"use client";

// ============================================================================
// 어뷰티 — 고민상담소 (`/consulting`)
// 정적 텍스트 카드 나열 → 실제 작동하는 모던 웰니스 커뮤니티 게시판으로 전면 개편.
// [주간 인기 고민 랭킹] → [글쓰기 FAB/모달] → [실시간 고민 피드 + 상세 아코디언] 구조.
// 지금은 더미 데이터 기반 — 실 연동 시 Supabase posts/comments 테이블로 대체.
// ============================================================================

import { useState } from "react";
import AppShell from "../components/layout/AppShell";
import { trackEvent } from "../../lib/trackEvent";

// ─── 카테고리 ────────────────────────────────────────────────────────────────

const POST_CATEGORIES = ["습도지옥", "펌/염색", "두피고민", "탈모케어", "기타"] as const;
type PostCategory = (typeof POST_CATEGORIES)[number];

const FILTER_TABS = ["전체", ...POST_CATEGORIES] as const;

// ─── 주간 인기 고민 랭킹 (더미) ───────────────────────────────────────────────

type HotTopic = {
  id: string;
  rank: number;
  category: PostCategory;
  title: string;
  viewCount: number;
  likeCount: number;
};

const HOT_TOPICS: HotTopic[] = [
  {
    id: "hot_scalp_smell",
    rank: 1,
    category: "두피고민",
    title: "저녁에 감아도 아침이면 두피 냄새가 나요 ㅠㅠ",
    viewCount: 3821,
    likeCount: 412,
  },
  {
    id: "hot_bangs_rain",
    rank: 2,
    category: "습도지옥",
    title: "비 오는 날만 되면 앞머리가 갈라지고 정수리가 처져요",
    viewCount: 2984,
    likeCount: 356,
  },
  {
    id: "hot_perm_drop",
    rank: 3,
    category: "펌/염색",
    title: "펌 한 지 2주 됐는데 벌써 처지는 느낌, 정상인가요?",
    viewCount: 2210,
    likeCount: 201,
  },
  {
    id: "hot_hair_loss",
    rank: 4,
    category: "탈모케어",
    title: "가르마 부분이 넓어진 것 같은데 기분 탓일까요?",
    viewCount: 1745,
    likeCount: 167,
  },
];

// ─── 댓글 / 게시글 데이터 구조 ────────────────────────────────────────────────

type Comment = {
  id: string;
  nickname: string;
  body: string;
  isExpert: boolean;
};

type Post = {
  id: string;
  category: PostCategory;
  nickname: string;
  title: string;
  body: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  comments: Comment[];
};

const INITIAL_POSTS: Post[] = [
  {
    id: "post_001",
    category: "습도지옥",
    nickname: "익명의 사모님",
    title: "장마철만 되면 정수리가 폭발해요",
    body: "습도 높은 날엔 아침에 힘줘서 세팅해도 오후만 되면 정수리 볼륨이 다 죽어요. 다들 어떤 제품 쓰세요?",
    viewCount: 542,
    commentCount: 2,
    likeCount: 38,
    liked: false,
    comments: [
      { id: "c1", nickname: "전문 헤어디자이너", body: "습도엔 가벼운 픽싱 미스트 + 뿌리 드라이가 정답이에요.", isExpert: true },
      { id: "c2", nickname: "지환님", body: "저도 똑같은 고민이었는데 공감돼요 ㅠㅠ", isExpert: false },
    ],
  },
  {
    id: "post_002",
    category: "펌/염색",
    nickname: "민지님",
    title: "디지털 펌 유지력 진짜 이렇게 짧나요?",
    body: "펌 한 지 열흘 됐는데 자고 일어나면 반은 풀려있어요. 시술 문제인지 관리 문제인지 모르겠어요.",
    viewCount: 389,
    commentCount: 1,
    likeCount: 21,
    liked: false,
    comments: [
      { id: "c3", nickname: "전문 헤어디자이너", body: "취침 전 롤 세팅 없이 자면 펌이 빨리 풀릴 수 있어요.", isExpert: true },
    ],
  },
  {
    id: "post_003",
    category: "두피고민",
    nickname: "익명의 사모님",
    title: "머리 감는 순서 바꿨더니 냄새가 줄었어요",
    body: "두피 전용 샴푸로 먼저 감고 트리트먼트는 모발 끝에만 발랐더니 확실히 냄새가 덜 나네요. 다들 참고하세요!",
    viewCount: 967,
    commentCount: 0,
    likeCount: 74,
    liked: false,
    comments: [],
  },
  {
    id: "post_004",
    category: "탈모케어",
    nickname: "재원님",
    title: "가르마 반대로 타는 것도 도움될까요?",
    body: "매번 같은 방향으로만 가르마를 타서 그런지 정수리가 휑해 보여요. 방향을 바꾸면 좀 나아질까요?",
    viewCount: 213,
    commentCount: 0,
    likeCount: 9,
    liked: false,
    comments: [],
  },
];

// ─── 유틸: 카테고리별 뱃지 색상 ───────────────────────────────────────────────

const CATEGORY_BADGE_STYLE: Record<PostCategory, string> = {
  습도지옥: "bg-[#E7F1FB] text-[#3E7BB6]",
  "펌/염색": "bg-[#FBEAF1] text-[#B6467E]",
  두피고민: "bg-[#F9F4E8] text-[#8A6D2F]",
  탈모케어: "bg-[#EDEBFB] text-[#6B54C4]",
  기타: "bg-gray-100 text-[#6B7280]",
};

// ─── 위젯 1: 주간 인기 고민 랭킹 (가로 스크롤) ─────────────────────────────────

function WeeklyHotTopics({ topics }: { topics: HotTopic[] }) {
  return (
    <section>
      <div className="flex items-center gap-1.5 px-0.5">
        <span className="text-[15px]">🔥</span>
        <h2 className="text-[15px] font-bold tracking-tight text-[#2F2F2F]">주간 인기 고민</h2>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => trackEvent("consult_hot_topic_click", { postId: topic.id, rank: topic.rank })}
            className="flex w-[220px] shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm active:bg-[#F9F4E8]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                  topic.rank === 1 ? "bg-[#C8A96A]" : topic.rank === 2 ? "bg-[#B7B7B7]" : "bg-[#D8B48A]"
                }`}
              >
                {topic.rank}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE_STYLE[topic.category]}`}>
                #{topic.category}
              </span>
            </div>
            <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[#2F2F2F]">
              {topic.title}
            </p>
            <div className="mt-3 flex items-center gap-2.5 text-[11px] text-[#6B7280]">
              <span>👁️ {topic.viewCount.toLocaleString()}</span>
              <span>👍 {topic.likeCount.toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── 위젯 2: 카테고리 필터 탭 ─────────────────────────────────────────────────

function CategoryFilterTabs({
  active,
  onChange,
}: {
  active: (typeof FILTER_TABS)[number];
  onChange: (tab: (typeof FILTER_TABS)[number]) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
            active === tab ? "bg-[#2F2F2F] text-white" : "bg-white text-[#6B7280] border border-gray-100"
          }`}
        >
          {tab === "전체" ? tab : `#${tab}`}
        </button>
      ))}
    </div>
  );
}

// ─── 위젯 3: 실시간 고민 피드 카드 (리스트 + 상세 아코디언) ───────────────────────

function ConsultFeedCard({
  post,
  isOpen,
  onToggleOpen,
  onLike,
  onAddComment,
}: {
  post: Post;
  isOpen: boolean;
  onToggleOpen: () => void;
  onLike: () => void;
  onAddComment: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const hasExpertAnswer = post.comments.some((c) => c.isExpert);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.liked) return;
    onLike();
    trackEvent("consult_like_click", { postId: post.id, source: "consulting_feed" });
  };

  const handleSubmitComment = () => {
    const body = draft.trim();
    if (!body) return;
    onAddComment(body);
    trackEvent("consult_comment_create", { postId: post.id });
    setDraft("");
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <button className="block w-full text-left" onClick={onToggleOpen}>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${CATEGORY_BADGE_STYLE[post.category]}`}>
            #{post.category}
          </span>
          {hasExpertAnswer && (
            <span className="rounded-full bg-[#2F2F2F] px-2.5 py-1 text-[10px] font-bold text-white">
              전문가 답변 완료
            </span>
          )}
          <span className="ml-auto text-[11px] text-[#6B7280]">{post.nickname}</span>
        </div>

        <p className="mt-2.5 text-[15px] font-bold leading-snug text-[#2F2F2F]">{post.title}</p>
        <p className={`mt-1.5 text-[13px] leading-relaxed text-[#6B7280] ${isOpen ? "" : "line-clamp-2"}`}>
          {post.body}
        </p>
      </button>

      <div className="mt-3.5 flex items-center gap-3 text-xs text-[#6B7280]">
        <span>👁️ {post.viewCount.toLocaleString()}</span>
        <span>💬 {post.commentCount}</span>
        <button
          onClick={handleLike}
          className={`ml-auto flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold transition-colors ${
            post.liked ? "border-[#C8A96A] bg-[#F3E9D2] text-[#8A6D2F]" : "border-gray-200 text-[#6B7280]"
          }`}
        >
          👍 나도 그래요 {post.likeCount}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {post.comments.length === 0 ? (
            <p className="text-xs text-[#6B7280]">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#2F2F2F]">{comment.nickname}</span>
                  {comment.isExpert && (
                    <span className="rounded-full bg-[#F9F4E8] px-2 py-0.5 text-[10px] font-bold text-[#8A6D2F]">
                      전문가 답변
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[#2F2F2F]">{comment.body}</p>
              </div>
            ))
          )}

          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="댓글을 남겨보세요"
              className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#C8A96A]"
            />
            <button
              onClick={handleSubmitComment}
              className="shrink-0 rounded-xl bg-[#2F2F2F] px-4 py-2.5 text-xs font-semibold text-white active:opacity-80"
            >
              등록
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 위젯 4: 글쓰기 FAB + 바텀시트 폼 ─────────────────────────────────────────

function WriteFab({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20">
      <div className="mx-auto flex max-w-[430px] justify-end px-5">
        <button
          onClick={onClick}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-[#2F2F2F] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgba(47,47,47,0.55)] active:opacity-80"
        >
          ✍️ 내 고민 등록하기
        </button>
      </div>
    </div>
  );
}

function WriteConsultSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { category: PostCategory; title: string; body: string }) => void;
}) {
  const [category, setCategory] = useState<PostCategory>(POST_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (!open) return null;

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    trackEvent("consult_post_create", { category });
    onSubmit({ category, title: title.trim(), body: body.trim() });
    setTitle("");
    setBody("");
    setCategory(POST_CATEGORIES[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="닫기" className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[430px] rounded-t-3xl bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-[0_-16px_40px_-16px_rgba(0,0,0,0.25)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" />

        <h2 className="mt-4 text-[17px] font-bold tracking-tight text-[#2F2F2F]">내 고민 등록하기</h2>

        <div className="mt-4 flex gap-1.5 overflow-x-auto">
          {POST_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                category === c ? "bg-[#2F2F2F] text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-gray-100"
              }`}
            >
              #{c}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C8A96A]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="어떤 고민인지 편하게 적어주세요"
          rows={4}
          className="mt-2.5 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C8A96A]"
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-xl bg-[#2F2F2F] py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-30 active:opacity-80"
        >
          등록 완료
        </button>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ConsultingPage() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<(typeof FILTER_TABS)[number]>("전체");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const visiblePosts = activeTab === "전체" ? posts : posts.filter((p) => p.category === activeTab);

  const handleToggleOpen = (postId: string) => {
    const willOpen = openPostId !== postId;
    setOpenPostId(willOpen ? postId : null);
    if (willOpen) {
      trackEvent("consult_post_view", { postId, source: "consulting_feed" });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, viewCount: p.viewCount + 1 } : p)));
    }
  };

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, liked: true, likeCount: p.likeCount + 1 } : p))
    );
  };

  const handleAddComment = (postId: string, body: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              commentCount: p.commentCount + 1,
              comments: [...p.comments, { id: `${postId}_c${p.comments.length + 1}`, nickname: "나", body, isExpert: false }],
            }
          : p
      )
    );
  };

  const handleCreatePost = (input: { category: PostCategory; title: string; body: string }) => {
    const newPost: Post = {
      id: `post_${Date.now()}`,
      category: input.category,
      nickname: "익명의 사모님",
      title: input.title,
      body: input.body,
      viewCount: 0,
      commentCount: 0,
      likeCount: 0,
      liked: false,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setActiveTab("전체");
  };

  return (
    <AppShell>
      <div>
        <h1 className="text-[19px] font-bold tracking-tight text-[#2F2F2F]">고민상담소</h1>
        <p className="mt-1 text-xs text-[#6B7280]">나와 비슷한 고민을 나누고, 전문가 답변도 받아보세요.</p>
      </div>

      <WeeklyHotTopics topics={HOT_TOPICS} />

      <section>
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[15px]">📋</span>
          <h2 className="text-[15px] font-bold tracking-tight text-[#2F2F2F]">실시간 고민 피드</h2>
        </div>

        <div className="mt-3">
          <CategoryFilterTabs active={activeTab} onChange={setActiveTab} />
        </div>

        <div className="mt-3 space-y-3">
          {visiblePosts.map((post) => (
            <ConsultFeedCard
              key={post.id}
              post={post}
              isOpen={openPostId === post.id}
              onToggleOpen={() => handleToggleOpen(post.id)}
              onLike={() => handleLike(post.id)}
              onAddComment={(body) => handleAddComment(post.id, body)}
            />
          ))}
        </div>
      </section>

      <WriteFab onClick={() => setIsWriteOpen(true)} />
      <WriteConsultSheet open={isWriteOpen} onClose={() => setIsWriteOpen(false)} onSubmit={handleCreatePost} />
    </AppShell>
  );
}
