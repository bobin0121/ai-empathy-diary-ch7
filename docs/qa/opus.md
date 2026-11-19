<!-- 2026-11-19 14:40 KST -->
# QA 보고서 (qa-engineer, opus)

높음 1건, 중간 5건, 낮음 9건

- 시험 대상: `cf60c06`(작업 트리 깨끗함), 2026-11-19
- 실행 결과: `npm test -- --run` 61개 통과(5개 파일), `npm run lint` 오류 0건, `npm run build` 성공
- 규칙: `.env`를 열지 않음, OpenRouter 호출 없음, DB 접속 없음, 소스 파일 수정 없음

## 높음

### H1. 로그인할 때마다 사용자 식별자가 새 UUID로 바뀜. 다시 로그인하면 지난 일기가 모두 사라진 것처럼 보임
- 위치: `auth.ts:10-16`(jwt 콜백 없이 `session.user.id = token.sub`), 원인은 `@auth/core` 0.41.3의 `callback/oauth/callback.js:224`, `callback/handle-login.js:24-26`
- 원인: 어댑터 없이 쓰면 Auth.js가 OAuth 사용자의 `user.id`를 `crypto.randomUUID()`로 만들고, 구글 `sub`는 `account.providerAccountId`에만 넣는다. 기본 토큰의 `sub`는 `user.id`에서 오므로 로그인마다 새 값이 된다.
- 재현: 로그인 → 일기 쓰기 → 로그아웃 → 같은 계정으로 다시 로그인 → 지난 기록
- 기대: 같은 계정의 일기가 그대로 보임(PRD F1)
- 실제(코드로 추정): 새 `user_id`로 조회해 "지난 기록 없음"이 뜸. 예전 일기는 DB에 남지만 아무도 볼 수 없음
- 고칠 방향: `jwt({ token, account })`에서 `token.sub = account.providerAccountId`로 고정. 기존 행 정리 방침 결정. 단위 시험 추가

## 중간

### M1. 저장 뒤 분석 결과 반영 중 DB 오류가 나면 500. 화면은 "저장하지 못했어요"를 보이고, 다시 누르면 중복 저장
- 위치: `app/api/entries/route.ts:24-32`, `lib/entry-service.ts:33`
- 고칠 방향: 반영 단계 예외를 따로 잡아 저장된 일기를 201(`aiStatus: "failed"`)로 돌려줌. 시험 추가

### M2. 위기 키워드가 흔한 변형을 놓침(AI가 실패하면 위기 카드가 나오지 않음)
- 위치: `lib/ai/crisis.ts:9-45`
- 직접 실행 결과 `false`: "손목을 그었다", "손목 그음", "목숨 끊고 싶다", "죽었으면 좋겠다", "죽고파", "뒤지고 싶다", "죽어야겠다". "배고파 죽겠다"는 의도대로 `false`
- 고칠 방향: 어간 중심으로 넓힘(`손목을그`, `손목그`, `목숨끊`, `죽었으면좋겠`, `죽고파`, `뒤지고싶` 등)과 시험 추가

### M3. DB 연결 풀에 오류 처리기와 시간 제한이 없음(확인 필요)
- 위치: `lib/db/pool.ts:14`
- 고칠 방향: `pool.on("error", ...)`, `connectionTimeoutMillis`, `query_timeout`

### M4. 요청 속도 제한이 없어 무료 모델 한도(하루 50회)를 한 사용자가 소진할 수 있음
- 위치: `app/api/entries/route.ts:10-33`, `app/api/entries/[id]/analyze/route.ts:11-26`
- 고칠 방향: 사용자별 최소 간격 등. 사용자 결정 필요

### M5. 모델 시간 제한(모델당 25초, 합계 50초)과 배포 함수 시간 한도가 맞는지 확인되지 않음(5단계 전 필수)
- 위치: `lib/ai/index.ts:14`, 경로 파일에 `maxDuration` 없음
- 고칠 방향: 배포 한도 확인 뒤 `maxDuration` 명시 또는 모델당 시간 단축

## 낮음

- L1. 이미 지워진 일기를 삭제하면 목록에서는 빠지는데 "삭제하지 못했어요"가 뜸(`app/(pages)/history/page.tsx:107-114`). 404면 실패 문구를 숨기거나 "이미 삭제된 일기예요."
- L2. 다시 분석 API가 이미 분석된(`done`) 일기도 AI를 다시 부르고 덮어씀(`app/api/entries/[id]/analyze/route.ts:16-19`)
- L3. 화면 문구가 PRD 4.3~4.6과 다름(의도한 변경, 커밋 `283ac85`, `9250620`). PRD 갱신 필요
- L4. 16px보다 작은 글자(`app/globals.css`의 `.greeting` 15px, `.small`, `.counter`, `.entry__time` 14px)
- L5. 제로폭 공백만 쓴 입력이 저장되고, NUL 문자는 500(`lib/entry-service.ts:12-14`)
- L6. 글자 수를 UTF-16 단위로 셈(이모지가 2자 이상)
- L7. 보안 응답 헤더 없음(`X-Frame-Options`, CSP), `X-Powered-By` 노출(`next.config.ts`)
- L8. 시험이 빠진 경로(H1, M1, DELETE와 analyze의 DB 오류, `choices` 없는 AI 응답)
- L9. 본문에 `</diary>`를 넣어 프롬프트 태그를 닫을 수 있음(`lib/ai/prompt.ts:19-21`). 키워드 검사는 그대로 동작

## 문제없음으로 확인한 것

| 항목 | 결과 | 근거 |
|---|---|---|
| 로그인 없이 API 접근 | 통과 | curl로 모든 경로 401, 위조 쿠키(`alg:none`)도 401 |
| 로그인 없이 화면 접근 | 통과 | `/write`, `/history`, `/result/{id}`는 307로 `/`, 우회 헤더도 307 |
| 빈 입력, 200자 초과 | 통과(단위 시험) | `tests/entries-api.test.ts:100,111` |
| 남의 일기 접근 | 통과(코드, 시험) | 모든 SQL에 `WHERE user_id = $1`, 없으면 404 |
| AI 429, 시간 초과, 빈 응답, 형식 오류 | 통과(시험) | `tests/ai.test.ts` |
| 위기 카드는 AI 실패와 무관 | 통과 | 저장 때 키워드 반영, `crisis OR`, 문구와 번호는 상수 |
| 키 노출 | 통과 | `.next/static`과 git 이력에 키 형식 0건, `NEXT_PUBLIC_` 없음 |
| SQL 인젝션 | 통과 | 모두 `$n` 매개변수 |
| 로그에 일기 본문 | 통과 | 경로 이름, id, `e.name`만 남김 |
| HTML 주입 | 통과 | `dangerouslySetInnerHTML` 없음 |

## PRD 기능별 통과 여부

| 기능 | 결과 | 비고 |
|---|---|---|
| F1 구글 로그인 | 실패 | 구분 값이 구글 `sub`가 아님(H1) |
| F2 한 줄 일기 | 통과(조건부) | M1, L5, L6 |
| F3 감정 분석과 공감 | 통과 | M5, L2 |
| F4 지난 기록 | 실패(H1 영향) | 다시 로그인하면 기록이 보이지 않음 |
| F5 위기 안내 | 부분 통과 | 흔한 변형 누락(M2) |
| F6 내 일기만 보기 | 통과 | 식별자 자체는 H1 문제 |
| F7 일기 삭제 | 통과 | L1 |

## 확인하지 못한 것

실제 재로그인(H1 실증), 로그인 뒤 375px 배치와 키보드 조작, 실제 DB에서 두 계정 거르기, DB 연결 끊김(M3), 실제 OpenRouter 응답 시간, Vercel 함수 시간 한도(M5)
