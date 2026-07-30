// ============================================================================
// app/components/TextureSwatch.tsx — 모발 질감 스와치
//
// primary 텍스처를 A레이어(전면)로 깔고, secondary가 있으면 대각(／ 방향)으로
// 분할해 하단-우측 삼각을 B레이어로 얹는다. 분할 경계선은 반드시 clip-path로만
// 그린다 — 그라데이션으로 그리면 경계와 90도 어긋나는 버그가 확인됨.
//
// ratio: A(primary) 영역 비중(%), 기본 50(대각선이 정중앙 코너-투-코너).
//   ratio가 커지면 A가 넓어지고 B(하단-우측 삼각)가 좁아진다. 대각선은 좌/우변
//   위에서만 이동하므로 B레이어와 선 레이어의 x좌표(0%·100%)는 항상 공유된다.
// ============================================================================

import { TEXTURES, type TextureKey } from "@/lib/textures";

interface TextureSwatchProps {
  primary: TextureKey;
  secondary?: TextureKey;
  /** A(primary) 영역 비중(%), 기본 50 */
  ratio?: number;
  className?: string;
}

const LINE_COLOR = "#F5F2EC";
const LINE_THICKNESS = 2.4; // 경계선 두께(%)

export default function TextureSwatch({
  primary,
  secondary,
  ratio = 50,
  className = "",
}: TextureSwatchProps) {
  // ratio 50 → shift 0(코너-투-코너). shift만큼 좌/우변에서 대각선을 평행 이동.
  const shift = (ratio - 50) * 2;
  const rightY = shift;          // 우변(x=100%)에서 대각선의 y
  const leftY = 100 + shift;     // 좌변(x=0%)에서 대각선의 y

  // B레이어: 대각선 아래(하단-우측) 삼각. ratio 50에서 polygon(100% 0, 100% 100%, 0 100%)로 축약.
  const bClip = `polygon(100% ${rightY}%, 100% 100%, 0 100%, 0 ${leftY}%)`;
  // 선 레이어: 대각선을 따라가는 얇은 띠. ratio 50에서 polygon(100% 0, 100% 2.4%, 0 100%, 0 97.6%).
  const lineClip = `polygon(100% ${rightY}%, 100% ${rightY + LINE_THICKNESS}%, 0 ${leftY}%, 0 ${leftY - LINE_THICKNESS}%)`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* A레이어 (primary) — 전면 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${TEXTURES[primary]})` }}
      />

      {secondary && (
        <>
          {/* B레이어 (secondary) — ／ 방향 하단-우측 삼각 */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${TEXTURES[secondary]})`, clipPath: bClip }}
          />
          {/* 경계선 — clip-path로만(그라데이션 금지). B와 x좌표 공유 → 항상 정렬 */}
          <div
            className="absolute inset-0"
            style={{ background: LINE_COLOR, clipPath: lineClip }}
          />
        </>
      )}

      {/* 상단 비네트 1겹 — 라벨 가독용 */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.28), transparent)" }}
      />
    </div>
  );
}
