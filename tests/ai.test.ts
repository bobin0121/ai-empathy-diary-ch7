// 2026-11-12 13:14 KST
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODELS, MODEL_TIMEOUT_MS, analyzeEntry, detectCrisisKeyword } from "@/lib/ai";

const GOOD = { emotion: "기쁨", intensity: 4, empathyMessage: "정말 기뻤겠어요. 그 마음이 오래 남았으면 좋겠어요.", crisis: false };

function okResponse(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("detectCrisisKeyword", () => {
  it("위기 표현을 잡고 띄어쓰기 변형도 잡는다", () => {
    for (const t of ["죽고 싶다", "죽고싶다", "죽 고 싶어", "자해를 했어", "자 살 생각", "극단적 선택을 떠올렸다", "손목을 긋고 싶어", "살기 싫다", "그냥 사라지고 싶다"]) {
      expect(detectCrisisKeyword(t), t).toBe(true);
    }
  });
  it("평범한 글은 잡지 않는다", () => {
    for (const t of ["오늘 친구와 맛있는 점심을 먹었다", "배고파 죽겠다", "", "회의가 길어져 지쳤다"]) {
      expect(detectCrisisKeyword(t), t).toBe(false);
    }
  });
  it("본문 중간에 있어도 잡는다", () => {
    expect(detectCrisisKeyword("하루가 길었다. 요즘 자살 생각이 자꾸 난다. 그래도 잔다.")).toBe(true);
  });
});

describe("analyzeEntry", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("1순위 모델이 성공하면 정규화한 결과와 모델 이름을 돌려준다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse("```json\n" + JSON.stringify({ ...GOOD, intensity: "4" }) + "\n```"));
    vi.stubGlobal("fetch", fetchMock);
    const r = await analyzeEntry("오늘 기뻤다");
    expect(r).toEqual({ ...GOOD, modelUsed: MODELS[0] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(MODELS[0]);
  });

  it("1순위가 HTTP 오류면 2순위로 넘어간다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(okResponse(JSON.stringify(GOOD)));
    vi.stubGlobal("fetch", fetchMock);
    const r = await analyzeEntry("x");
    expect(r?.modelUsed).toBe(MODELS[1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["content가 null", null],
    ["content가 공백", "   "],
    ["JSON이 아님", "죄송하지만 답할 수 없어요."],
    ["감정이 목록 밖", JSON.stringify({ ...GOOD, emotion: "행복" })],
    ["강도가 범위 밖", JSON.stringify({ ...GOOD, intensity: 6 })],
    ["강도가 소수", JSON.stringify({ ...GOOD, intensity: 2.5 })],
    ["crisis가 boolean 아님", JSON.stringify({ ...GOOD, crisis: "no" })],
    ["공감 메시지가 빔", JSON.stringify({ ...GOOD, empathyMessage: " " })],
  ])("1순위 응답이 %s이면 2순위로 넘어간다", async (_name, content) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(content)).mockResolvedValueOnce(okResponse(JSON.stringify(GOOD)));
    vi.stubGlobal("fetch", fetchMock);
    const r = await analyzeEntry("x");
    expect(r?.modelUsed).toBe(MODELS[1]);
  });

  it("둘 다 잘못된 JSON이면 예외 없이 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(okResponse("{깨진 json"))));
    await expect(analyzeEntry("x")).resolves.toBeNull();
  });

  it("fetch가 예외를 던져도 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(analyzeEntry("x")).resolves.toBeNull();
  });

  it("키가 없으면 호출하지 않고 null", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(analyzeEntry("x")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("응답이 시간 안에 안 오면 끊고 2순위로 넘어간다", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {})) // abort 신호도 무시하고 영원히 대기
      .mockResolvedValueOnce(okResponse(JSON.stringify(GOOD)));
    vi.stubGlobal("fetch", fetchMock);
    const p = analyzeEntry("x");
    await vi.advanceTimersByTimeAsync(MODEL_TIMEOUT_MS + 1);
    const r = await p;
    expect(r?.modelUsed).toBe(MODELS[1]);
  });

  it("본문이 끝나지 않고 흘러와도 시간이 되면 끊는다", async () => {
    vi.useFakeTimers();
    const hang = () => Promise.resolve(new Response(new ReadableStream({ start() {} }), { status: 200 }));
    const fetchMock = vi.fn().mockImplementation(hang);
    vi.stubGlobal("fetch", fetchMock);
    const p = analyzeEntry("x");
    await vi.advanceTimersByTimeAsync(MODEL_TIMEOUT_MS * 2 + 10);
    await expect(p).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("모델당 25초, 합계 60초 안쪽이다", () => {
    expect(MODEL_TIMEOUT_MS).toBe(25_000);
    expect(MODEL_TIMEOUT_MS * MODELS.length).toBeLessThan(60_000);
  });
});
