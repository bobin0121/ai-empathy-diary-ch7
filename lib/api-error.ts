// 2026-11-12 12:38 KST
// API 경로가 공통으로 쓰는 오류 응답 만들기(docs/API.md 3장). 백엔드 트랙 소유.
import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/types";

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

export const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION: "한 줄을 적어 주세요.",
  UNAUTHORIZED: "로그인이 필요해요.",
  NOT_FOUND: "일기를 찾을 수 없어요.",
  SERVER_ERROR: "잠시 뒤 다시 시도해 주세요.",
};

export function errorResponse(code: ApiErrorCode, message: string = DEFAULT_MESSAGES[code]) {
  const body: ApiErrorBody = { error: { code, message } };
  return NextResponse.json(body, { status: STATUS[code] });
}
