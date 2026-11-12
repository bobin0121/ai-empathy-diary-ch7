// 2026-11-12 13:14 KST
// docs/API.md 의 경로와 형식을 그대로 부르는 작은 클라이언트. 사용자 식별자는 보내지 않는다(세션 쿠키로만 구분).
import type {
  ApiErrorBody,
  ApiErrorCode,
  DeleteEntryResponse,
  Entry,
  EntryResponse,
  ListEntriesResponse,
} from "@/lib/types";

const DEFAULT_ERROR_MESSAGE = "잠시 뒤 다시 시도해 주세요.";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    // 네트워크 자체가 끊긴 경우(상태 코드 없음).
    throw new ApiError(0, "SERVER_ERROR", DEFAULT_ERROR_MESSAGE);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as Partial<ApiErrorBody> | null)?.error;
    throw new ApiError(res.status, err?.code ?? "SERVER_ERROR", err?.message ?? DEFAULT_ERROR_MESSAGE);
  }
  return body as T;
}

/** POST /api/entries: 저장하고 분석한 결과까지 받는다. */
export async function createEntry(content: string): Promise<Entry> {
  const data = await request<EntryResponse>("/api/entries", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return data.entry;
}

/** GET /api/entries?cursor=...: cursor 는 서버가 준 값을 그대로 넘긴다. */
export function listEntries(cursor?: string | null): Promise<ListEntriesResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return request<ListEntriesResponse>(`/api/entries${query}`);
}

/** GET /api/entries/{id} */
export async function getEntry(id: string): Promise<Entry> {
  const data = await request<EntryResponse>(`/api/entries/${encodeURIComponent(id)}`);
  return data.entry;
}

/** POST /api/entries/{id}/analyze: 분석만 다시 한다. */
export async function analyzeEntry(id: string): Promise<Entry> {
  const data = await request<EntryResponse>(`/api/entries/${encodeURIComponent(id)}/analyze`, {
    method: "POST",
  });
  return data.entry;
}

/** DELETE /api/entries/{id} */
export async function deleteEntry(id: string): Promise<void> {
  await request<DeleteEntryResponse>(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
}
