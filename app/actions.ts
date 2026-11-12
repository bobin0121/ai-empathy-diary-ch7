// 2026-11-12 13:14 KST
// 로그인과 로그아웃 서버 액션. 화면은 Auth.js 의 signIn, signOut 을 이 액션으로 부른다(docs/API.md 4.6).
"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/write" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
