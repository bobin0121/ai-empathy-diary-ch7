// 2026-11-19 14:48 KST
// Auth.js 콜백 단위 시험: 사용자 식별자가 로그인마다 바뀌지 않아야 한다.
import { describe, expect, it } from "vitest";
import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { jwtCallback, sessionCallback } from "@/lib/auth-callbacks";

const google = { provider: "google", providerAccountId: "1234567890", type: "oidc" } as Account;

describe("jwtCallback", () => {
  it("구글 로그인이면 임의 sub 를 providerAccountId 로 바꾼다", () => {
    expect(jwtCallback({ token: { sub: "random-uuid-1" }, account: google }).sub).toBe("1234567890");
    expect(jwtCallback({ token: { sub: "random-uuid-2" }, account: google }).sub).toBe("1234567890");
  });
  it("이후 요청(account 없음)에서는 sub 를 그대로 둔다", () => {
    expect(jwtCallback({ token: { sub: "1234567890" } }).sub).toBe("1234567890");
    expect(jwtCallback({ token: { sub: "1234567890" }, account: null }).sub).toBe("1234567890");
  });
  it("다른 제공자나 providerAccountId 가 비면 바꾸지 않는다", () => {
    const other = { ...google, provider: "github" } as Account;
    expect(jwtCallback({ token: { sub: "x" }, account: other }).sub).toBe("x");
    const empty = { ...google, providerAccountId: "" } as Account;
    expect(jwtCallback({ token: { sub: "x" }, account: empty }).sub).toBe("x");
  });
});

describe("sessionCallback", () => {
  it("token.sub 를 session.user.id 로 쓴다", () => {
    const session = { user: { name: "a" }, expires: "" } as unknown as Session;
    const out = sessionCallback({ session, token: { sub: "1234567890" } as JWT });
    expect(out.user.id).toBe("1234567890");
  });
});
