// 2026-11-12 12:38 KST
// GET /api/entries/{id} (일기 하나), DELETE /api/entries/{id} (삭제). docs/API.md 4.3, 4.5. 2단계 백엔드 트랙에서 구현.
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  return errorResponse("SERVER_ERROR", "아직 구현되지 않았어요.");
}

export async function DELETE() {
  return errorResponse("SERVER_ERROR", "아직 구현되지 않았어요.");
}
