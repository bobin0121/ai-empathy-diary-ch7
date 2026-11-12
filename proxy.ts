// 2026-11-12 12:38 KST
// 로그인하지 않고 /write, /history, /result/... 로 오면 시작 화면(/)으로 보낸다(PRD 4.7).
// Next.js 16 에서는 middleware.ts 대신 proxy.ts 를 쓴다. API 의 401 은 각 경로가 직접 처리한다.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/write", "/history", "/result/:path*"],
};
