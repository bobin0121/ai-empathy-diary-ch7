// 2026-11-12 12:38 KST
// Postgres 연결 풀. DATABASE_URL 은 환경 변수로만 읽고 값을 로그에 남기지 않는다. 백엔드 트랙 소유.
import { Pool } from "pg";
import { SUPABASE_CA_CERT } from "./supabase-ca";

let pool: Pool | undefined;

/** 처음 부를 때 연결 풀을 만든다(빌드 때는 환경 변수가 없어도 깨지지 않도록 늦게 만든다). */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL 환경 변수가 없습니다.");
    // Supabase 루트 CA로 서버 인증서를 검증한다(검증을 끄지 않는다).
    pool = new Pool({ connectionString: url, ssl: { ca: SUPABASE_CA_CERT }, max: 5 });
  }
  return pool;
}
