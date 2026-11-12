// 2026-11-12 12:38 KST
// AI 트랙 자리(2단계 ai-integration-specialist 가 구현). 이 두 함수의 모양은 바꾸지 않는다.
import type { AiAnalysis } from "@/lib/types";

/** 모델 순서(PRD 2장). */
export const MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3.5-super-vl:free"] as const;

/** 위기 키워드 검사. 본문 전체에서 찾고 띄어쓰기 변형도 잡는다(F5). */
export function detectCrisisKeyword(content: string): boolean {
  void content;
  throw new Error("not implemented");
}

/** 감정 분석. 두 모델이 모두 실패하면 null 을 돌려준다(예외를 던지지 않는다). */
export async function analyzeEntry(content: string): Promise<AiAnalysis | null> {
  void content;
  throw new Error("not implemented");
}
