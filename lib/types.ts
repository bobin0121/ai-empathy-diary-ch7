// 2026-11-12 12:35 KST
// 세 트랙(백엔드, AI, 화면)이 함께 쓰는 공용 타입. 바꿀 때는 docs/API.md도 같이 고친다.

export const EMOTIONS = ["기쁨", "슬픔", "분노", "불안", "평온", "지침"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_EMOJI: Record<Emotion, string> = {
  기쁨: "😊",
  슬픔: "😢",
  분노: "😠",
  불안: "😰",
  평온: "😌",
  지침: "😮‍💨",
};

export type Intensity = 1 | 2 | 3 | 4 | 5;

export const CONTENT_MAX_LENGTH = 200;
export const PAGE_SIZE = 20;

/** 분석 성공 여부. 성공이면 done, 두 모델이 모두 실패했거나 아직 못 했으면 failed. */
export type AiStatus = "done" | "failed";

/** AI 트랙(lib/ai)이 돌려주는 분석 결과. 서버가 감정 목록과 강도 범위를 다시 검사한다. */
export interface AiAnalysis {
  emotion: Emotion;
  intensity: Intensity;
  empathyMessage: string;
  /** AI의 위기 판단. 키워드 검사 결과와 합쳐 crisis를 정한다(둘 중 하나라도 참이면 참). */
  crisis: boolean;
  /** 분석에 성공한 모델 이름 */
  modelUsed: string;
}

/** API가 돌려주는 일기 하나. 분석 전이나 실패 시 emotion, intensity, empathyMessage는 null. */
export interface Entry {
  id: string;
  content: string;
  emotion: Emotion | null;
  intensity: Intensity | null;
  empathyMessage: string | null;
  crisis: boolean;
  aiStatus: AiStatus;
  /** ISO 8601 UTC 문자열. 화면에서 한국 시각으로 바꿔 보인다. */
  createdAt: string;
}

/** diary.entries 한 행(snake_case). lib/db에서만 쓰고, 밖으로는 Entry로 바꿔 내보낸다. */
export interface EntryRow {
  id: string;
  user_id: string;
  content: string;
  emotion: Emotion | null;
  intensity: number | null;
  empathy_message: string | null;
  crisis: boolean;
  ai_status: AiStatus;
  model_used: string | null;
  created_at: Date;
  analyzed_at: Date | null;
}

// ---- API 오류 ----
export type ApiErrorCode = "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "SERVER_ERROR";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

// ---- API 요청과 응답 ----
/** POST /api/entries 요청 */
export interface CreateEntryRequest {
  content: string;
}
/** POST /api/entries 응답 201, GET /api/entries/{id} 응답 200, POST /api/entries/{id}/analyze 응답 200 */
export interface EntryResponse {
  entry: Entry;
}
/** GET /api/entries 응답 200 */
export interface ListEntriesResponse {
  entries: Entry[];
  nextCursor: string | null;
}
/** DELETE /api/entries/{id} 응답 200 */
export interface DeleteEntryResponse {
  ok: true;
}

// ---- 위기 상담 연락처(PRD 3.4, 8.2). 앱 전체가 이 상수 하나를 쓴다. ----
export const CRISIS_CONTACTS = [
  { name: "자살예방상담전화", number: "109" },
  { name: "정신건강위기상담전화", number: "1577-0199" },
  { name: "청소년상담", number: "1388" },
  { name: "긴급 상황", number: "119" },
] as const;
