// 2026-11-12 12:38 KST
// POST /api/entries (일기 저장과 분석), GET /api/entries (내 일기 목록). docs/API.md 4.1, 4.2.
import { auth } from "@/auth";
import { detectCrisisKeyword } from "@/lib/ai";
import { errorResponse } from "@/lib/api-error";
import { createEntry, listEntries } from "@/lib/db/entries";
import { analyzeAndApply, checkContent } from "@/lib/entry-service";
import type { EntryResponse, ListEntriesResponse } from "@/lib/types";

export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return errorResponse("UNAUTHORIZED");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION");
  }
  const raw = body && typeof body === "object" ? (body as { content?: unknown }).content : undefined;
  const check = checkContent(raw);
  if (!check.ok) return errorResponse("VALIDATION", check.message);

  try {
    const saved = await createEntry(userId, check.content, detectCrisisKeyword(check.content));
    const analyzed = await analyzeAndApply(userId, saved);
    const res: EntryResponse = { entry: analyzed ?? saved }; // AI 실패면 저장된 그대로(aiStatus failed)
    return Response.json(res, { status: 201 });
  } catch (e) {
    console.error("POST /api/entries 실패", e instanceof Error ? e.name : "unknown");
    return errorResponse("SERVER_ERROR");
  }
}

export async function GET(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return errorResponse("UNAUTHORIZED");

  const cursor = new URL(request.url).searchParams.get("cursor");
  try {
    const res: ListEntriesResponse = await listEntries(userId, cursor === "" ? null : cursor);
    return Response.json(res);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_CURSOR") {
      return errorResponse("VALIDATION", "잘못된 요청이에요.");
    }
    console.error("GET /api/entries 실패", e instanceof Error ? e.name : "unknown");
    return errorResponse("SERVER_ERROR");
  }
}
