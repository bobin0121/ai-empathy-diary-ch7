// 2026-11-12 13:14 KST
// "구글로 시작하기" 단추. 누르면 로딩 문구를 보이고 단추를 잠시 비활성으로 둔다(PRD 4.3).
"use client";

import { useFormStatus } from "react-dom";

export function GoogleSignInButton() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        구글로 시작하기
      </button>
      <p className="status-line" role="status" aria-live="polite">
        {pending ? "구글로 이동하는 중이에요." : ""}
      </p>
    </>
  );
}
