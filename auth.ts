// 2026-11-12 12:38 KST
// Auth.js(v5) 구글 로그인 설정. 세션은 JWT 방식이고 DB 어댑터는 쓰지 않는다.
// AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET 은 환경 변수에서 자동으로 읽는다(값은 3단계에서 넣음).
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    // 구글 계정 고유 식별자(sub)를 세션의 사용자 식별자로 쓴다.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
