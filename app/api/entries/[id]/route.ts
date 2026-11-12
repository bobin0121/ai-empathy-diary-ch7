// 2026-11-12 12:38 KST
// GET /api/entries/{id} (일기 하나), DELETE /api/entries/{id} (삭제). docs/API.md 4.3, 4.5.
import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-error";
import { deleteEntry, getEntry } from "@/lib/db/entries";
import type { DeleteEntryResponse, EntryResponse } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const userId = (await auth())?.user?.id;
  if (!userId) return errorResponse("UNAUTHORIZED");
  const { id } = await params;
  try {
    const entry = await getEntry(userId, id);
    if (!entry) return errorResponse("NOT_FOUND");
    const res: EntryResponse = { entry };
    return Response.json(res);
  } catch (e) {
    console.error("GET /api/entries/[id] 실패", id, e instanceof Error ? e.name : "unknown");
    return errorResponse("SERVER_ERROR");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = (await auth())?.user?.id;
  if (!userId) return errorResponse("UNAUTHORIZED");
  const { id } = await params;
  try {
    if (!(await deleteEntry(userId, id))) return errorResponse("NOT_FOUND");
    const res: DeleteEntryResponse = { ok: true };
    return Response.json(res);
  } catch (e) {
    console.error("DELETE /api/entries/[id] 실패", id, e instanceof Error ? e.name : "unknown");
    return errorResponse("SERVER_ERROR");
  }
}
