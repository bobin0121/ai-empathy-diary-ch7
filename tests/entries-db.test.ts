// 2026-11-12 13:17 KST
// lib/db/entries.ts 단위 시험. 실제 DB 대신 가짜 연결 풀을 쓴다.
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("@/lib/db/pool", () => ({ getPool: () => ({ query }) }));

import {
  applyAnalysis,
  createEntry,
  decodeCursor,
  deleteEntry,
  encodeCursor,
  getEntry,
  listEntries,
} from "@/lib/db/entries";

const ID = "11111111-1111-4111-8111-111111111111";
const TS = "2026-11-12T03:30:00.123456Z";

function row(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    user_id: "u1",
    content: "오늘 좋았다.",
    emotion: null,
    intensity: null,
    empathy_message: null,
    crisis: false,
    ai_status: "failed",
    model_used: null,
    created_at: new Date("2026-11-12T03:30:00.123Z"),
    analyzed_at: null,
    created_ts: TS,
    ...over,
  };
}

beforeEach(() => query.mockReset());

describe("createEntry", () => {
  it("매개변수로 저장하고 Entry 모양으로 돌려준다(내부 열은 숨김)", async () => {
    query.mockResolvedValue({ rows: [row()] });
    const e = await createEntry("u1", "오늘 좋았다.", true);
    expect(query.mock.calls[0][1]).toEqual(["u1", "오늘 좋았다.", true]);
    expect(query.mock.calls[0][0]).not.toContain("오늘 좋았다.");
    expect(e).toEqual({
      id: ID,
      content: "오늘 좋았다.",
      emotion: null,
      intensity: null,
      empathyMessage: null,
      crisis: false,
      aiStatus: "failed",
      createdAt: "2026-11-12T03:30:00.123Z",
    });
    expect(e).not.toHaveProperty("user_id");
  });
});

describe("listEntries", () => {
  it("user_id로 거르고 21개를 가져와 20개만 돌려주며 nextCursor를 만든다", async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      row({ id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}` }),
    );
    query.mockResolvedValue({ rows });
    const res = await listEntries("u1", null);
    expect(query.mock.calls[0][1]).toEqual(["u1", 21]);
    expect(res.entries).toHaveLength(20);
    expect(res.nextCursor).not.toBeNull();
    expect(decodeCursor(res.nextCursor!)).toEqual({ createdTs: TS, id: res.entries[19].id });
  });

  it("20개 이하면 nextCursor는 null", async () => {
    query.mockResolvedValue({ rows: [row()] });
    expect((await listEntries("u1", null)).nextCursor).toBeNull();
  });

  it("커서가 있으면 그 뒤부터 매개변수로 조회한다", async () => {
    query.mockResolvedValue({ rows: [] });
    await listEntries("u1", encodeCursor(TS, ID));
    expect(query.mock.calls[0][1]).toEqual(["u1", TS, ID, 21]);
  });

  it("잘못된 커서는 INVALID_CURSOR 오류이고 DB를 부르지 않는다", async () => {
    await expect(listEntries("u1", "abc")).rejects.toThrow("INVALID_CURSOR");
    await expect(listEntries("u1", encodeCursor("'; DROP TABLE x;--", ID))).rejects.toThrow("INVALID_CURSOR");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("getEntry, deleteEntry, applyAnalysis", () => {
  it("uuid가 아니면 DB를 부르지 않고 없는 것으로 본다", async () => {
    expect(await getEntry("u1", "nope")).toBeNull();
    expect(await deleteEntry("u1", "nope")).toBe(false);
    expect(
      await applyAnalysis("u1", "nope", { emotion: "기쁨", intensity: 3, empathyMessage: "x", crisis: false, modelUsed: "m" }),
    ).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("getEntry는 user_id와 id로 조회하고 없으면 null", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await getEntry("u1", ID)).toBeNull();
    expect(query.mock.calls[0][1]).toEqual(["u1", ID]);
  });

  it("deleteEntry는 지운 행 수로 true/false", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteEntry("u1", ID)).toBe(true);
    query.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteEntry("u2", ID)).toBe(false);
    expect(query.mock.calls[0][1]).toEqual(["u1", ID]);
  });

  it("applyAnalysis는 crisis를 OR로 합치고(되돌리지 않음) 결과를 Entry로 돌려준다", async () => {
    query.mockResolvedValue({
      rows: [row({ emotion: "기쁨", intensity: 4, empathy_message: "좋았겠어요.", ai_status: "done", crisis: true })],
    });
    const e = await applyAnalysis("u1", ID, {
      emotion: "기쁨",
      intensity: 4,
      empathyMessage: "좋았겠어요.",
      crisis: false,
      modelUsed: "m",
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("crisis = (crisis OR $6)");
    expect(params).toEqual(["u1", ID, "기쁨", 4, "좋았겠어요.", false, "m"]);
    expect(e).toMatchObject({ emotion: "기쁨", intensity: 4, aiStatus: "done", crisis: true });
  });

  it("applyAnalysis는 내 일기가 아니면 null", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(
      await applyAnalysis("u2", ID, { emotion: "평온", intensity: 1, empathyMessage: "x", crisis: false, modelUsed: "m" }),
    ).toBeNull();
  });
});
