// 2026-11-12 12:38 KST
// db/migrations/*.sql 을 파일명 순서로 실행한다. 이미 적용한 파일은 건너뛴다(diary.schema_migrations 기록).
// DATABASE_URL 은 .env 에서 읽기만 하고 출력하지 않는다.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 환경 변수가 없습니다. .env 를 확인해 주세요.");
  process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// TLS 로 연결하고 Supabase 루트 CA(certs/)로 서버 인증서를 검증한다(검증을 끄지 않는다).
const ca = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "certs", "supabase-prod-ca-2021.crt"),
  "utf8",
);
const client = new pg.Client({ connectionString: url, ssl: { ca } });

try {
  await client.connect();
  await client.query("CREATE SCHEMA IF NOT EXISTS diary");
  await client.query(
    "CREATE TABLE IF NOT EXISTS diary.schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const { rows } = await client.query("SELECT filename FROM diary.schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log("건너뜀(이미 적용):", file);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO diary.schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log("적용:", file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  console.log("마이그레이션 완료.");
} catch (err) {
  console.error("마이그레이션 실패:", err instanceof Error ? err.message : "알 수 없는 오류");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
