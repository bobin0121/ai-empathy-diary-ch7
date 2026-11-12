// 2026-11-12 12:38 KST
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "공감 다이어리",
  description: "오늘 있었던 일을 한 줄로 적으면 AI가 마음을 읽고 따뜻하게 답해 주는 일기장.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
