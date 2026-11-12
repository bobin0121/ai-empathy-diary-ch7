// 2026-11-12 12:38 KST
// POST /api/entries/{id}/analyze (다시 분석). docs/API.md 4.4.
import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-error";
import { getEntry } from "@/lib/db/entries";
import { analyzeAndApply } from "@/lib/entry-service";
import type { EntryResponse } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const userId = (await auth())?.user?.id;
  if (!userId) return errorResponse("UNAUTHORIZED");
  const { id } = await params;
  try {
    const entry = await getEntry(userId, id);
    if (!entry) return errorResponse("NOT_FOUND");
    // 또 실패하면 DB 를 바꾸지 않고 현재 일기를 돌려준다(이전 분석 결과가 있으면 지키기 위해).
    const analyzed = await analyzeAndApply(userId, entry);
    const res: EntryResponse = { entry: analyzed ?? entry };
    return Response.json(res);
  } catch (e) {
    console.error("POST /api/entries/[id]/analyze 실패", id, e instanceof Error ? e.name : "unknown");
    return errorResponse("SERVER_ERROR");
  }
}
