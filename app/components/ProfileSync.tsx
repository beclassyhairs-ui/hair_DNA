"use client";

// ============================================================================
// B-2 동기화 마운트 지점 — 루트 레이아웃에 한 번만 붙인다.
//
// 결과지들이 저장 후 /home으로 이동하는 흐름을 그대로 활용한다. 라우트가 바뀔 때마다
// 한 번씩 동기화하므로, 결과지 4종을 각각 수정하지 않아도 저장분이 서버로 올라간다.
//
// - 미로그인이면 syncWithServer가 즉시 false로 빠져나온다(로컬만으로 기존과 동일 동작).
// - 동시 실행 방지: 이전 동기화가 끝나기 전엔 새로 시작하지 않는다.
// - 화면에 아무것도 그리지 않는다.
// ============================================================================

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { syncWithServer } from "@/lib/profileSync";

export default function ProfileSync() {
  const pathname = usePathname();
  const running = useRef(false);
  const pending = useRef(false); // 실행 중에 라우트가 또 바뀌었는지
  const mounted = useRef(true);

  // 언마운트 후에는 예약된 재실행을 시작하지 않는다(불필요한 요청 방지).
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // 관리자 화면은 유저 데이터와 무관하므로 건너뛴다.
    if (pathname?.startsWith("/admin")) return;

    // ⚠️ cleanup에서 잠금을 풀지 않는다. 라우트가 바뀔 때 풀어버리면 이전 동기화가
    //    아직 진행 중인데 새 동기화가 시작돼(같은 데이터 두 번 push) 경쟁이 생긴다.
    //    잠금은 오직 요청이 끝났을 때(finally)만 해제한다.
    if (running.current) {
      // 진행 중이면 그냥 버리지 않고 "끝나면 한 번 더" 예약한다 —
      // 결과 저장 직후 /home으로 이동하는 흐름에서 그 저장분을 놓치지 않기 위해.
      pending.current = true;
      return;
    }

    const run = () => {
      running.current = true;
      syncWithServer()
        .catch(() => false)
        .finally(() => {
          running.current = false;
          if (pending.current && mounted.current) {
            pending.current = false;
            run();
          }
        });
    };
    run();
  }, [pathname]);

  return null;
}
