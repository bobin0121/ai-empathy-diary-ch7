// 2026-11-12 12:38 KST
// diary.entries 조회와 저장 함수 자리(2단계 백엔드 트랙에서 구현). 모든 함수는 userId 로 걸러야 한다(F6).
// SQL 은 매개변수로만 넘긴다. 반환은 공용 타입 Entry 로 바꿔서 내보낸다.
import type { AiAnalysis, Entry } from "@/lib/types";

export async function createEntry(userId: string, content: string, crisis: boolean): Promise<Entry> {
  void userId;
  void content;
  void crisis;
  throw new Error("not implemented");
}

export async function listEntries(
  userId: string,
  cursor: string | null,
): Promise<{ entries: Entry[]; nextCursor: string | null }> {
  void userId;
  void cursor;
  throw new Error("not implemented");
}

export async function getEntry(userId: string, id: string): Promise<Entry | null> {
  void userId;
  void id;
  throw new Error("not implemented");
}

/** 분석 결과를 반영한다. crisis 는 한 번 참이 되면 거짓으로 돌아가지 않는다. 내 일기가 아니면 null. */
export async function applyAnalysis(userId: string, id: string, analysis: AiAnalysis): Promise<Entry | null> {
  void userId;
  void id;
  void analysis;
  throw new Error("not implemented");
}

/** 지운 행이 있으면 true, 없거나 내 것이 아니면 false. */
export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  void userId;
  void id;
  throw new Error("not implemented");
}
