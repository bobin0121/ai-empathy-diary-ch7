// 2026-11-19 14:48 KST
// Auth.js 콜백. auth.ts 에서 쓰고, 시험에서 따로 부를 수 있게 분리했다.
import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

/**
 * 어댑터가 없으면 token.sub 가 로그인할 때마다 임의 값(randomUUID)으로 바뀐다.
 * 구글 로그인 때는 구글 계정 고유 번호(providerAccountId)로 고정해 사용자 식별자가 변하지 않게 한다.
 */
export function jwtCallback({ token, account }: { token: JWT; account?: Account | null }): JWT {
  if (account?.provider === "google" && account.providerAccountId) {
    token.sub = account.providerAccountId;
  }
  return token;
}

/** token.sub 를 세션의 사용자 식별자로 쓴다. */
export function sessionCallback({ session, token }: { session: Session; token: JWT }): Session {
  if (token.sub) session.user.id = token.sub;
  return session;
}
