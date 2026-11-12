// 2026-11-12 12:38 KST
// AI 트랙(2단계 ai-integration-specialist). 이 두 함수의 모양은 바꾸지 않는다.
import type { AiAnalysis } from "@/lib/types";
import { SYSTEM_PROMPT, buildUserPrompt, extractJson, parseAnalysis } from "./prompt";

export { detectCrisisKeyword, CRISIS_KEYWORDS } from "./crisis";

/** 모델 순서(PRD 2장). */
export const MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3.5-super-vl:free"] as const;

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** 모델 하나당 전체 경과 시간 한도(연결, 응답 본문 읽기까지). 두 모델 합계 50초로 Vercel 무료 함수 한도(60초) 안쪽. */
export const MODEL_TIMEOUT_MS = 25_000;

const MAX_TOKENS = 1000;

/** 모델 한 번 호출. 실패(시간 초과, HTTP 오류, 빈 content, JSON 아님, 스키마 불일치)면 null. */
async function callModel(model: string, content: string, apiKey: string): Promise<AiAnalysis | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // fetch나 본문 읽기가 abort 신호를 무시해도 시간이 되면 끊기도록 경주시킨다.
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, MODEL_TIMEOUT_MS);
  });

  const work = (async (): Promise<AiAnalysis | null> => {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(content) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data: unknown = JSON.parse(await res.text());
    const text = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) return null;
    return parseAnalysis(extractJson(text), model);
  })().catch(() => null);

  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** 감정 분석. 두 모델이 모두 실패하면 null 을 돌려준다(예외를 던지지 않는다). */
export async function analyzeEntry(content: string): Promise<AiAnalysis | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  for (const model of MODELS) {
    const result = await callModel(model, content, apiKey);
    if (result) return result;
  }
  return null;
}
