// 2026-11-12 13:17 KST
// /api/entries 경로 단위 시험. 로그인, AI, DB 함수는 가짜로 바꾼다.
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const analyzeEntry = vi.fn();
const detectCrisisKeyword = vi.fn();
const db = {
  createEntry: vi.fn(),
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  applyAnalysis: vi.fn(),
  deleteEntry: vi.fn(),
};

vi.mock("@/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/ai", () => ({
  analyzeEntry: (c: string) => analyzeEntry(c),
  detectCrisisKeyword: (c: string) => detectCrisisKeyword(c),
}));
vi.mock("@/lib/db/entries", () => ({
  createEntry: (...a: unknown[]) => db.createEntry(...a),
  listEntries: (...a: unknown[]) => db.listEntries(...a),
  getEntry: (...a: unknown[]) => db.getEntry(...a),
  applyAnalysis: (...a: unknown[]) => db.applyAnalysis(...a),
  deleteEntry: (...a: unknown[]) => db.deleteEntry(...a),
}));

import * as collection from "@/app/api/entries/route";
import * as single from "@/app/api/entries/[id]/route";
import * as analyze from "@/app/api/entries/[id]/analyze/route";
import type { Entry } from "@/lib/types";

const ID = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id: ID }) };

const saved: Entry = {
  id: ID,
  content: "발표가 끝났다.",
  emotion: null,
  intensity: null,
  empathyMessage: null,
  crisis: false,
  aiStatus: "failed",
  createdAt: "2026-11-12T03:30:00.000Z",
};
const done: Entry = { ...saved, emotion: "평온", intensity: 3, empathyMessage: "수고했어요.", aiStatus: "done" };
const analysis = { emotion: "평온" as const, intensity: 3 as const, empathyMessage: "수고했어요.", crisis: false, modelUsed: "m1" };

function post(body: unknown, raw = false) {
  return new Request("http://x/api/entries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.mockResolvedValue({ user: { id: "u1" } });
  detectCrisisKeyword.mockReturnValue(false);
  analyzeEntry.mockResolvedValue(analysis);
  db.createEntry.mockResolvedValue(saved);
  db.applyAnalysis.mockResolvedValue(done);
});

describe("로그인", () => {
  it("로그인하지 않으면 모든 경로가 401 UNAUTHORIZED", async () => {
    auth.mockResolvedValue(null);
    const rs = [
      await collection.POST(post({ content: "a" })),
      await collection.GET(new Request("http://x/api/entries")),
      await single.GET(new Request("http://x"), ctx),
      await single.DELETE(new Request("http://x"), ctx),
      await analyze.POST(new Request("http://x"), ctx),
    ];
    for (const r of rs) {
      expect(r.status).toBe(401);
      expect((await r.json()).error.code).toBe("UNAUTHORIZED");
    }
    expect(db.createEntry).not.toHaveBeenCalled();
  });
});

describe("POST /api/entries", () => {
  it("분석 성공이면 201과 aiStatus done", async () => {
    const r = await collection.POST(post({ content: "  발표가 끝났다.  " }));
    expect(r.status).toBe(201);
    expect((await r.json()).entry).toEqual(done);
    expect(db.createEntry).toHaveBeenCalledWith("u1", "발표가 끝났다.", false);
    expect(db.applyAnalysis).toHaveBeenCalledWith("u1", ID, analysis);
  });

  it("줄바꿈은 공백으로 바꾼다", async () => {
    await collection.POST(post({ content: "가\n나\r\n다" }));
    expect(db.createEntry.mock.calls[0][1]).toBe("가 나 다");
  });

  it("빈 문자열, 공백뿐, 본문 없음, 문자열 아님, JSON 오류는 400 VALIDATION", async () => {
    for (const body of [{ content: "" }, { content: "   \n " }, {}, { content: 5 }, null]) {
      const r = await collection.POST(post(body));
      expect(r.status).toBe(400);
      expect((await r.json()).error).toEqual({ code: "VALIDATION", message: "한 줄을 적어 주세요." });
    }
    const bad = await collection.POST(post("{oops", true));
    expect(bad.status).toBe(400);
    expect(db.createEntry).not.toHaveBeenCalled();
  });

  it("200자는 통과, 201자는 400(전용 메시지)", async () => {
    expect((await collection.POST(post({ content: "가".repeat(200) }))).status).toBe(201);
    const r = await collection.POST(post({ content: "가".repeat(201) }));
    expect(r.status).toBe(400);
    expect((await r.json()).error.message).toBe("200자 이하로 적어 주세요.");
  });

  it("AI가 null이면 201, aiStatus failed, 반영하지 않음", async () => {
    analyzeEntry.mockResolvedValue(null);
    const r = await collection.POST(post({ content: "발표가 끝났다." }));
    expect(r.status).toBe(201);
    expect((await r.json()).entry).toMatchObject({ aiStatus: "failed", emotion: null, intensity: null, empathyMessage: null });
    expect(db.applyAnalysis).not.toHaveBeenCalled();
  });

  it("AI가 예외를 던져도 failed로 정상 응답", async () => {
    analyzeEntry.mockRejectedValue(new Error("boom"));
    expect((await collection.POST(post({ content: "a" }))).status).toBe(201);
  });

  it("키워드 위기는 AI 실패와 상관없이 crisis true로 저장된다", async () => {
    detectCrisisKeyword.mockReturnValue(true);
    analyzeEntry.mockResolvedValue(null);
    db.createEntry.mockResolvedValue({ ...saved, crisis: true });
    const r = await collection.POST(post({ content: "a" }));
    expect(db.createEntry).toHaveBeenCalledWith("u1", "a", true);
    expect((await r.json()).entry.crisis).toBe(true);
  });

  it("키워드 위기는 AI 성공 때도 합쳐서 반영한다", async () => {
    detectCrisisKeyword.mockReturnValue(true);
    await collection.POST(post({ content: "a" }));
    expect(db.applyAnalysis.mock.calls[0][2].crisis).toBe(true);
  });

  it("AI가 감정 목록이나 강도 범위를 벗어난 값을 주면 failed로 본다", async () => {
    analyzeEntry.mockResolvedValue({ ...analysis, intensity: 9 });
    const r = await collection.POST(post({ content: "a" }));
    expect((await r.json()).entry.aiStatus).toBe("failed");
    expect(db.applyAnalysis).not.toHaveBeenCalled();
  });

  it("DB 저장 실패는 500 SERVER_ERROR이고 내부 정보가 없다", async () => {
    db.createEntry.mockRejectedValue(new Error("password=secret SELECT *"));
    const r = await collection.POST(post({ content: "a" }));
    expect(r.status).toBe(500);
    const text = JSON.stringify(await r.json());
    expect(text).toContain("SERVER_ERROR");
    expect(text).not.toContain("secret");
  });
});

describe("GET /api/entries", () => {
  it("커서를 넘기고 결과를 그대로 돌려준다", async () => {
    db.listEntries.mockResolvedValue({ entries: [done], nextCursor: "abc" });
    const r = await collection.GET(new Request("http://x/api/entries?cursor=abc"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ entries: [done], nextCursor: "abc" });
    expect(db.listEntries).toHaveBeenCalledWith("u1", "abc");
  });

  it("커서가 없으면 null로 부른다", async () => {
    db.listEntries.mockResolvedValue({ entries: [], nextCursor: null });
    await collection.GET(new Request("http://x/api/entries"));
    expect(db.listEntries).toHaveBeenCalledWith("u1", null);
  });

  it("잘못된 커서는 400 VALIDATION", async () => {
    db.listEntries.mockRejectedValue(new Error("INVALID_CURSOR"));
    const r = await collection.GET(new Request("http://x/api/entries?cursor=zzz"));
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe("VALIDATION");
  });

  it("DB 오류는 500", async () => {
    db.listEntries.mockRejectedValue(new Error("db down"));
    expect((await collection.GET(new Request("http://x/api/entries"))).status).toBe(500);
  });
});

describe("GET, DELETE /api/entries/{id}", () => {
  it("내 일기는 200", async () => {
    db.getEntry.mockResolvedValue(done);
    const r = await single.GET(new Request("http://x"), ctx);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ entry: done });
    expect(db.getEntry).toHaveBeenCalledWith("u1", ID);
  });

  it("없거나 남의 것이면 404 NOT_FOUND", async () => {
    db.getEntry.mockResolvedValue(null);
    const r = await single.GET(new Request("http://x"), ctx);
    expect(r.status).toBe(404);
    expect((await r.json()).error).toEqual({ code: "NOT_FOUND", message: "일기를 찾을 수 없어요." });
  });

  it("삭제 성공은 { ok: true }, 없으면 404", async () => {
    db.deleteEntry.mockResolvedValueOnce(true);
    const ok = await single.DELETE(new Request("http://x"), ctx);
    expect(await ok.json()).toEqual({ ok: true });
    db.deleteEntry.mockResolvedValueOnce(false);
    expect((await single.DELETE(new Request("http://x"), ctx)).status).toBe(404);
    expect(db.deleteEntry).toHaveBeenCalledWith("u1", ID);
  });
});

describe("POST /api/entries/{id}/analyze", () => {
  it("남의 것이나 없는 일기는 404이고 AI를 부르지 않는다", async () => {
    db.getEntry.mockResolvedValue(null);
    const r = await analyze.POST(new Request("http://x"), ctx);
    expect(r.status).toBe(404);
    expect(analyzeEntry).not.toHaveBeenCalled();
  });

  it("다시 분석에 성공하면 200과 done", async () => {
    db.getEntry.mockResolvedValue(saved);
    const r = await analyze.POST(new Request("http://x"), ctx);
    expect(r.status).toBe(200);
    expect((await r.json()).entry).toEqual(done);
  });

  it("또 실패하면 200으로 현재 일기(failed)를 돌려주고 DB를 바꾸지 않는다", async () => {
    db.getEntry.mockResolvedValue(saved);
    analyzeEntry.mockResolvedValue(null);
    const r = await analyze.POST(new Request("http://x"), ctx);
    expect(r.status).toBe(200);
    expect((await r.json()).entry.aiStatus).toBe("failed");
    expect(db.applyAnalysis).not.toHaveBeenCalled();
  });

  it("AI는 일기 한 줄만 받는다", async () => {
    db.getEntry.mockResolvedValue(saved);
    await analyze.POST(new Request("http://x"), ctx);
    expect(analyzeEntry).toHaveBeenCalledWith(saved.content);
  });
});
