import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        {/* 브랜드 마크 */}
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/50 px-5 py-2 text-base font-medium tracking-wide text-accent">
          ✦ 어뷰티(A-Beauty)
        </span>

        {/* 메인 타이틀 */}
        <h1 className="font-serif text-4xl font-semibold leading-snug text-brown sm:text-5xl sm:leading-snug">
          나만의 어뷰티(A-Beauty),
          <br />
          <span className="text-accent">AI 얼굴형 헤어 진단</span>
        </h1>

        {/* 서브 카피 */}
        <p className="mt-7 text-xl leading-relaxed text-brown-light sm:text-2xl">
          사진 한 장으로 내 얼굴형을 분석하고,
          <br className="hidden sm:block" />
          가장 잘 어울리는 헤어스타일을 찾아드립니다.
        </p>

        {/* CTA 버튼 — 크고 누르기 쉽게 */}
        <Link
          href="/diagnosis"
          className="mt-12 inline-flex w-full max-w-md items-center justify-center rounded-2xl bg-brown px-10 py-6 text-2xl font-bold text-cream shadow-lg shadow-brown/20 transition-all duration-200 hover:bg-brown-dark hover:shadow-xl active:scale-[0.98] sm:text-3xl"
        >
          진단 시작하기
        </Link>

        {/* 안내 문구 */}
        <p className="mt-6 text-lg text-brown-light/80">
          무료로 진단받을 수 있어요. 약 1분 소요
        </p>
      </div>
    </main>
  );
}
