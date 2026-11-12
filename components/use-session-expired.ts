// 2026-11-12 13:14 KST
// API 가 401 을 주면 "로그인이 끝났어요." 를 보이고 잠시 뒤 시작 화면으로 보낸다(PRD 4.4).
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/components/api-client";

export const SESSION_EXPIRED_MESSAGE = "로그인이 끝났어요. 다시 로그인해 주세요.";

export function useSessionExpired() {
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** 401 이면 true 를 돌려주고 이동을 예약한다. 그 밖의 오류는 false 라서 호출한 쪽이 처리한다. */
  const handleUnauthorized = useCallback(
    (err: unknown): boolean => {
      if (!(err instanceof ApiError) || err.status !== 401) return false;
      setExpired(true);
      timer.current = setTimeout(() => router.push("/"), 2000);
      return true;
    },
    [router],
  );

  return { expired, handleUnauthorized };
}
