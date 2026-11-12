// 2026-11-12 12:38 KST
// diary.entries 조회와 저장 함수. 모든 함수는 userId 로 걸러야 한다(F6).
// SQL 은 매개변수로만 넘긴다. 반환은 공용 타입 Entry 로 바꿔서 내보낸다.
import { getPool } from "@/lib/db/pool";
import { PAGE_SIZE, type AiAnalysis, type Entry, type EntryRow, type Intensity } from "@/lib/types";

/** 쿼리가 돌려주는 행. created_ts 는 마이크로초까지 보존한 시각 문자열(커서용). */
type Row = EntryRow & { created_ts: string };

const COLUMNS = `id, user_id, content, emotion, intensity, empathy_message, crisis, ai_status, model_used, created_at, analyzed_at,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_ts`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    content: row.content,
    emotion: row.emotion,
    intensity: row.intensity as Intensity | null,
    empathyMessage: row.empathy_message,
    crisis: row.crisis,
    aiStatus: row.ai_status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** 커서는 (저장 시각, 번호)를 base64url 로 감싼 불투명 문자열이다. */
export function encodeCursor(createdTs: string, id: string): string {
  return Buffer.from(JSON.stringify([createdTs, id])).toString("base64url");
}

/** 잘못된 커서면 null. */
export function decodeCursor(cursor: string): { createdTs: string; id: string } | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [ts, id] = parsed;
    if (typeof ts !== "string" || typeof id !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}Z$/.test(ts) || !isUuid(id)) return null;
    return { createdTs: ts, id };
  } catch {
    return null;
  }
}

export async function createEntry(userId: string, content: string, crisis: boolean): Promise<Entry> {
  const { rows } = await getPool().query<Row>(
    `INSERT INTO diary.entries (user_id, content, crisis) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [userId, content, crisis],
  );
  return toEntry(rows[0]);
}

/** 잘못된 cursor 는 Error("INVALID_CURSOR") 를 던진다. 경로가 400 으로 바꾼다. */
export async function listEntries(
  userId: string,
  cursor: string | null,
): Promise<{ entries: Entry[]; nextCursor: string | null }> {
  let rows: Row[];
  if (cursor === null) {
    ({ rows } = await getPool().query<Row>(
      `SELECT ${COLUMNS} FROM diary.entries WHERE user_id = $1
       ORDER BY created_at DESC, id DESC LIMIT $2`,
      [userId, PAGE_SIZE + 1],
    ));
  } else {
    const decoded = decodeCursor(cursor);
    if (!decoded) throw new Error("INVALID_CURSOR");
    ({ rows } = await getPool().query<Row>(
      `SELECT ${COLUMNS} FROM diary.entries
       WHERE user_id = $1 AND (created_at, id) < ($2::timestamptz, $3::uuid)
       ORDER BY created_at DESC, id DESC LIMIT $4`,
      [userId, decoded.createdTs, decoded.id, PAGE_SIZE + 1],
    ));
  }
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = page[page.length - 1];
  return {
    entries: page.map(toEntry),
    nextCursor: hasMore && last ? encodeCursor(last.created_ts, last.id) : null,
  };
}

export async function getEntry(userId: string, id: string): Promise<Entry | null> {
  if (!isUuid(id)) return null;
  const { rows } = await getPool().query<Row>(
    `SELECT ${COLUMNS} FROM diary.entries WHERE user_id = $1 AND id = $2`,
    [userId, id],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

/** 분석 결과를 반영한다. crisis 는 한 번 참이 되면 거짓으로 돌아가지 않는다. 내 일기가 아니면 null. */
export async function applyAnalysis(userId: string, id: string, analysis: AiAnalysis): Promise<Entry | null> {
  if (!isUuid(id)) return null;
  const { rows } = await getPool().query<Row>(
    `UPDATE diary.entries
     SET emotion = $3, intensity = $4, empathy_message = $5, crisis = (crisis OR $6),
         ai_status = 'done', model_used = $7, analyzed_at = now()
     WHERE user_id = $1 AND id = $2
     RETURNING ${COLUMNS}`,
    [userId, id, analysis.emotion, analysis.intensity, analysis.empathyMessage, analysis.crisis, analysis.modelUsed],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

/** 지운 행이 있으면 true, 없거나 내 것이 아니면 false. */
export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const result = await getPool().query(`DELETE FROM diary.entries WHERE user_id = $1 AND id = $2`, [userId, id]);
  return (result.rowCount ?? 0) > 0;
}
