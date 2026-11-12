// 2026-11-12 13:14 KST
// 로그인 후 화면(쓰기, 결과, 지난 기록)이 함께 쓰는 틀. 상단 줄과 탭, 가운데 정렬 최대 640px.
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";

export default function PagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <AppHeader />
      <main className="page">{children}</main>
    </div>
  );
}
