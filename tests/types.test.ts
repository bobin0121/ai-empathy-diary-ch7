// 2026-11-12 12:38 KST
import { describe, expect, it } from "vitest";
import { CONTENT_MAX_LENGTH, CRISIS_CONTACTS, EMOTIONS, EMOTION_EMOJI } from "@/lib/types";

describe("공용 상수", () => {
  it("감정은 6가지이고 모두 이모지가 있다", () => {
    expect(EMOTIONS).toHaveLength(6);
    for (const e of EMOTIONS) expect(EMOTION_EMOJI[e]).toBeTruthy();
  });

  it("일기 최대 길이는 200자다", () => {
    expect(CONTENT_MAX_LENGTH).toBe(200);
  });

  it("위기 상담 연락처 4개가 PRD 3.4항과 같다", () => {
    expect(CRISIS_CONTACTS.map((c) => c.number)).toEqual(["109", "1577-0199", "1388", "119"]);
  });
});
