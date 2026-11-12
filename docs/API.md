<!-- 2026-11-12 12:38 KST -->
# API 약속

PRD 7장을 확정한 문서다. 세 트랙(백엔드, AI, 화면)은 이 문서와 `lib/types.ts`만 보고 일한다. 바꿔야 하면 두 곳을 함께 고치고 사용자에게 알린다.

## 1. 공통

- 모든 `/api/entries` 경로는 로그인이 필요하다. 사용자 식별자는 세션(`session.user.id`, 구글 계정 `sub`)에서만 얻고 요청 본문과 쿼리에서는 받지 않는다.
- 요청과 응답은 JSON(`Content-Type: application/json`)이다.
- 시각은 ISO 8601 UTC 문자열이다(예: `2026-11-12T03:30:00.000Z`). 한국 시각으로 바꾸는 일은 화면이 한다.
- 일기 번호 `id`는 uuid다. uuid 형식이 아니면 404로 답한다(존재 여부를 알려 주지 않는다).
- 로그에는 일기 번호와 상태 코드만 남기고 본문, 공감 메시지, AI 요청과 응답은 남기지 않는다.

## 2. 일기 객체 `Entry`

| 필드 | 형식 | 설명 |
|---|---|---|
| `id` | string(uuid) | 일기 번호 |
| `content` | string | 일기 한 줄(1~200자, 앞뒤 공백 제거, 줄바꿈은 공백으로 바뀜) |
| `emotion` | `"기쁨"`, `"슬픔"`, `"분노"`, `"불안"`, `"평온"`, `"지침"`, 또는 `null` | 분석 전과 실패 시 `null` |
| `intensity` | 1, 2, 3, 4, 5, 또는 `null` | `emotion`과 함께 채워지거나 함께 `null` |
| `empathyMessage` | string 또는 `null` | 공감 메시지(2~3문장) |
| `crisis` | boolean | 위기 표시. 한 번 참이면 다시 분석해도 거짓이 되지 않음 |
| `aiStatus` | `"done"` 또는 `"failed"` | 분석 성공이면 `done` |
| `createdAt` | string | 저장 시각(서버가 정함) |

DB 열 `user_id`, `model_used`, `analyzed_at`은 밖으로 내보내지 않는다.

## 3. 오류 응답

```json
{ "error": { "code": "VALIDATION", "message": "한 줄을 적어 주세요." } }
```

| 상태 | code | 의미 | 기본 메시지 |
|---|---|---|---|
| 400 | `VALIDATION` | 본문이 없거나 비었거나 200자 초과, JSON 형식 오류 | 한 줄을 적어 주세요. (200자 초과는 "200자 이하로 적어 주세요.") |
| 401 | `UNAUTHORIZED` | 로그인하지 않음 | 로그인이 필요해요. |
| 404 | `NOT_FOUND` | 일기가 없거나 내 것이 아님 | 일기를 찾을 수 없어요. |
| 500 | `SERVER_ERROR` | 서버나 DB 오류(저장 자체 실패 포함) | 잠시 뒤 다시 시도해 주세요. |

AI 분석 실패는 오류가 아니다. 일기가 이미 저장되었으므로 정상 응답의 `aiStatus: "failed"`로 알린다. 오류 메시지에는 내부 정보(SQL, 스택, 키)를 담지 않는다.

## 4. 경로

### 4.1 `POST /api/entries` 일기 저장과 분석

- 요청: `{ "content": "오늘 발표가 잘 끝나서 후련했다." }`
- 처리 순서: 검증, 저장, 키워드 검사, AI 분석, 결과 반영. AI 분석이 끝나야 응답한다.
- 응답 201: `{ "entry": Entry }`
  - 분석 성공: `aiStatus: "done"`, `emotion`, `intensity`, `empathyMessage` 채움.
  - 분석 실패: `aiStatus: "failed"`, 세 필드는 `null`. `crisis`는 키워드 검사 결과를 반영한다.
- 오류: 400, 401, 500.

### 4.2 `GET /api/entries?cursor=...` 내 일기 목록

- 쿼리: `cursor`(선택). 이전 응답의 `nextCursor` 값을 그대로 넘긴다. 형식은 서버가 정하는 불투명 문자열이다(화면은 해석하지 않는다). 잘못된 값은 400 `VALIDATION`.
- 응답 200: `{ "entries": Entry[], "nextCursor": string | null }`. 내 일기만, 최근 것부터, 한 번에 20개. 더 없으면 `nextCursor`는 `null`.
- 오류: 400, 401, 500.

### 4.3 `GET /api/entries/{id}` 일기 하나

- 응답 200: `{ "entry": Entry }`
- 오류: 401, 404, 500.

### 4.4 `POST /api/entries/{id}/analyze` 다시 분석

- 요청: 본문 없음.
- 처리: 내 일기인지 확인한 뒤 AI 분석만 다시 한다. `crisis`는 거짓으로 되돌리지 않는다.
- 응답 200: `{ "entry": Entry }`. 성공이면 `aiStatus: "done"`, 또 실패면 `"failed"`.
- 오류: 401, 404, 500.

### 4.5 `DELETE /api/entries/{id}` 일기 삭제

- 응답 200: `{ "ok": true }`. DB에서 실제로 지운다.
- 오류: 401, 404(이미 지웠거나 내 것이 아님), 500.

### 4.6 인증 경로

`/api/auth/*`는 Auth.js(`auth.ts`)가 제공하는 경로를 그대로 쓴다. 화면은 Auth.js의 `signIn("google", { redirectTo: "/write" })`, `signOut({ redirectTo: "/" })`를 쓴다.

## 5. 트랙 사이의 함수 약속

| 위치 | 함수 | 설명 |
|---|---|---|
| `lib/ai/index.ts` | `detectCrisisKeyword(content): boolean` | 위기 키워드 검사 |
| `lib/ai/index.ts` | `analyzeEntry(content): Promise<AiAnalysis \| null>` | 두 모델 순서대로 시도. 모두 실패하면 `null`(예외 없음). 모델 호출에는 일기 한 줄만 보낸다 |
| `lib/db/entries.ts` | `createEntry`, `listEntries`, `getEntry`, `applyAnalysis`, `deleteEntry` | 모두 `userId`를 첫 인자로 받아 `user_id`로 거른다 |
| `lib/types.ts` | `CRISIS_CONTACTS` | 위기 상담 연락처 상수(PRD 8.2). 화면은 이 상수만 쓴다 |

## 6. DB

`diary` 스키마 안에만 만든다(`db/migrations/001_create_diary_entries.sql`, 실행은 `npm run db:migrate`).

- `diary.entries`: PRD 6.1의 열 그대로(`id`, `user_id`, `content`, `emotion`, `intensity`, `empathy_message`, `crisis`, `ai_status`, `model_used`, `created_at`, `analyzed_at`). `(user_id, created_at DESC)` 인덱스, RLS 켬.
- `diary.schema_migrations`: 적용한 마이그레이션 파일명과 시각.

## 7. 환경 변수

`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, `OPENROUTER_API_KEY` (이름 목록은 `.env.example`). 비밀값에 `NEXT_PUBLIC_` 접두어를 쓰지 않는다.
