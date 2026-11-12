// 2026-11-12 13:14 KST
// 위기 표현 키워드 검사(PRD F5). 안전 쪽으로 기울어, 오탐은 감수한다.

/**
 * 위기 표현 키워드. 공백을 모두 뺀 형태로 적는다(검사 전에 본문의 공백도 뺀다).
 * 그래서 "죽고 싶다", "죽고싶다", "죽 고 싶다"가 모두 잡힌다.
 * "배고파 죽겠다" 같은 표현은 아래 목록에 없으므로 잡지 않는다.
 */
export const CRISIS_KEYWORDS = [
  "자살",
  "자해",
  "자결",
  "극단적선택",
  "극단적인선택",
  "죽고싶",
  "죽고만싶",
  "죽어버리",
  "죽어버릴",
  "죽을래",
  "죽을까",
  "죽는게나",
  "죽는편이",
  "죽어도좋",
  "목숨을끊",
  "목숨을버",
  "목숨을포기",
  "생을마감",
  "생을끝",
  "삶을끝",
  "삶을포기",
  "손목을긋",
  "손목긋",
  "사라지고싶",
  "사라져버리고싶",
  "없어지고싶",
  "살기싫",
  "살고싶지않",
  "살아갈이유가없",
  "살아있기싫",
  "뛰어내리고싶",
  "뛰어내릴까",
  "투신",
  "유서를쓰",
  "유서썼",
] as const;

/** 공백과 보이지 않는 문자를 빼고 소문자로 맞춘다. */
function normalize(text: string): string {
  return text.replace(/[\s​-‍﻿]+/g, "").toLowerCase();
}

/** 본문 전체에서 위기 키워드를 찾는다. 띄어쓰기 변형도 잡는다. */
export function detectCrisisKeyword(content: string): boolean {
  if (typeof content !== "string" || content.length === 0) return false;
  const text = normalize(content);
  return CRISIS_KEYWORDS.some((keyword) => text.includes(keyword));
}
