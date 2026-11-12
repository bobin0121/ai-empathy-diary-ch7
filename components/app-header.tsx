// 2026-11-12 13:14 KST
// 로그인 후 화면의 상단 줄(앱 이름, 로그아웃)과 두 탭(쓰기, 지난 기록). PRD 4.1.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";

const TABS = [
  { href: "/write", label: "쓰기" },
  { href: "/history", label: "지난 기록" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <div className="app-header__bar">
        <Link href="/write" className="brand">
          공감 다이어리
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-quiet">
            로그아웃
          </button>
        </form>
      </div>
      <nav aria-label="주 메뉴" className="tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="tab"
            aria-current={pathname === tab.href ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
