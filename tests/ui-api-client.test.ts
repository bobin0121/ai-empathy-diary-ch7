// 2026-11-12 13:30 KST
// 화면용 API 클라이언트와 시각 표시 시험. fetch 는 가짜로 바꾼다.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeEntry,
  ApiError,
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
} from "@/components/api-client";
import { formatKst } from "@/components/format";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("api-client", () => {
  it("createEntry 는 POST /api/entries 에 content 만 보낸다", async () => {
    const entry = { id: "a" };
    const fn = mockFetch(201, { entry });
    expect(await createEntry("안녕")).toEqual(entry);
    const [path, init] = fn.mock.calls[0];
    expect(path).toBe("/api/entries");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ content: "안녕" });
  });

  it("listEntries 는 cursor 를 그대로 넘기고 응답을 돌려준다", async () => {
    const fn = mockFetch(200, { entries: [], nextCursor: null });
    await listEntries("abc=/x");
    expect(fn.mock.calls[0][0]).toBe("/api/entries?cursor=abc%3D%2Fx");
    await listEntries();
    expect(fn.mock.calls[1][0]).toBe("/api/entries");
  });

  it("getEntry, analyzeEntry, deleteEntry 경로와 방식", async () => {
    const fn = mockFetch(200, { entry: { id: "i" }, ok: true });
    await getEntry("i");
    await analyzeEntry("i");
    await deleteEntry("i");
    expect(fn.mock.calls.map((c) => [c[0], c[1].method])).toEqual([
      ["/api/entries/i", undefined],
      ["/api/entries/i/analyze", "POST"],
      ["/api/entries/i", "DELETE"],
    ]);
  });

  it("오류 응답은 ApiError 로 던진다", async () => {
    mockFetch(404, { error: { code: "NOT_FOUND", message: "일기를 찾을 수 없어요." } });
    await expect(getEntry("x")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "일기를 찾을 수 없어요.",
    });
  });

  it("네트워크 실패와 JSON 이 아닌 오류도 ApiError 로 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    await expect(getEntry("x")).rejects.toBeInstanceOf(ApiError);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));
    await expect(getEntry("x")).rejects.toMatchObject({ status: 500, code: "SERVER_ERROR" });
  });
});

describe("formatKst", () => {
  it("UTC 를 한국 시각으로 바꾼다", () => {
    const text = formatKst("2026-11-12T03:30:00.000Z");
    expect(text).toContain("11월");
    expect(text).toContain("12일");
    expect(text).toContain("12:30");
  });

  it("잘못된 값은 빈 문자열", () => {
    expect(formatKst("nope")).toBe("");
  });
});
