// 2026-11-12 13:17 KST
// 일기 분석 흐름(저장 뒤 AI 호출과 결과 반영)과 입력 검증. 경로 파일들이 함께 쓴다. 백엔드 트랙 소유.
import { analyzeEntry, detectCrisisKeyword } from "@/lib/ai";
import { applyAnalysis } from "@/lib/db/entries";
import { CONTENT_MAX_LENGTH, EMOTIONS, type AiAnalysis, type Entry } from "@/lib/types";

export type ContentCheck = { ok: true; content: string } | { ok: false; message: string };

/** 앞뒤 공백을 지우고 줄바꿈은 공백으로 바꾼 뒤 1~200자인지 본다. */
export function checkContent(raw: unknown): ContentCheck {
  if (typeof raw !== "string") return { ok: false, message: "한 줄을 적어 주세요." };
  const content = raw.replace(/\s*[\r\n]+\s*/g, " ").trim();
  if (content.length === 0) return { ok: false, message: "한 줄을 적어 주세요." };
  if (content.length > CONTENT_MAX_LENGTH) return { ok: false, message: "200자 이하로 적어 주세요." };
  return { ok: true, content };
}

/**
 * AI 분석을 해서 결과를 반영한 일기를 돌려준다. AI 가 실패하면 반영하지 않고 null(호출한 쪽이 처리).
 * 키워드 위기는 AI 결과와 상관없이 crisis 에 합친다.
 */
export async function analyzeAndApply(userId: string, entry: Entry): Promise<Entry | null> {
  const keywordCrisis = detectCrisisKeyword(entry.content);
  let analysis: AiAnalysis | null = null;
  try {
    analysis = await analyzeEntry(entry.content);
  } catch {
    analysis = null; // analyzeEntry 는 예외를 던지지 않기로 했지만 방어한다.
  }
  if (!analysis || !EMOTIONS.includes(analysis.emotion) || ![1, 2, 3, 4, 5].includes(analysis.intensity)) {
    return null;
  }
  return applyAnalysis(userId, entry.id, { ...analysis, crisis: analysis.crisis || keywordCrisis });
}
