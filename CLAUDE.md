<!-- 2026-11-12 12:17 KST -->
# CLAUDE.md

이 폴더에서 일하는 Claude Code가 지켜야 할 프로젝트 규칙이다.

## 언어

- 모든 답, 질문, 보고는 한국어로 쓴다.
- 이 저장소에 만드는 문서(PRD, 계획, README, 주석 등)도 한국어로 쓴다. 코드의 식별자와 명령어는 영어 그대로 둔다.

## .env 보안

- `.env` 파일은 열거나 읽지 않는다. 내용을 화면, 대화, 로그, 문서에 출력하지 않는다.
- 키가 필요하면 변수 이름(`OPENROUTER_API_KEY`, `DATABASE_URL` 등)만 쓰고, 코드에서는 환경 변수로 읽는다. 값을 코드에 적지 않는다.
- `.env`는 `.gitignore`에 넣어 커밋하지 않는다.
- 로그인 비밀값을 담는 파일(예: `.env.local`, `secrets.toml`)이 생기면 같은 규칙을 따른다.
- 비밀값이 보이는 화면(구글 클라이언트 생성 창, 보안 비밀 추가 창, 배포 서비스의 환경 변수 화면)은 캡처하거나 읽지 않는다. 비밀값은 사용자가 숨겨진 입력 창이나 메모장으로 직접 넣는다. 대화에 비밀값이 드러나면 새로 발급하고 옛 값은 사용 중지한다.
- 커밋하기 전에 바뀐 파일에서 키 형식(`sk-or-v1-`, `GOCSPX-`, 비밀번호가 든 `postgresql://`)을 찾아 없는지 확인한다.

## 프로젝트 구성

- Next.js 16(App Router, TypeScript), Auth.js v5(구글 로그인, JWT 세션), `pg`, vitest.
- Next 16은 학습 자료와 다른 점이 많다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 읽는다(`AGENTS.md`). 미들웨어 파일 이름은 `proxy.ts`다.
- 맡는 구역: 백엔드 `app/api/`, `lib/db/`, `lib/entry-service.ts`, `db/` / AI `lib/ai/` / 화면 `app/page.tsx`, `app/(pages)/`, `components/`. 여러 에이전트가 동시에 일할 때는 자기 구역만 고친다.

## DB

- Supabase Postgres의 `diary` 스키마만 쓴다(`diary.entries`, `diary.schema_migrations`). `public` 등 다른 스키마는 다른 앱(냉장고 레시피)이 쓰므로 절대 건드리지 않는다.
- 표를 바꿀 때는 `db/migrations/`에 새 SQL 파일을 더하고 `npm run db:migrate`로 적용한다. 실행 전후로 스키마별 표 목록을 비교한다.
- 연결은 Transaction pooler(포트 6543)이고, Supabase 루트 CA(`certs/`, `lib/db/supabase-ca.ts`)로 서버 인증서를 검증한다. 인증서 검증을 끄지 않는다.
- 모든 쿼리는 `user_id`로 본인 것만 다루고, 값은 `$n` 매개변수로 넘긴다.
- 무료 Supabase 프로젝트는 7일 동안 쓰지 않으면 일시 정지된다. "tenant/user … not found" 오류가 나면 대시보드에서 Resume project를 누른다.

## 로그인

- 어댑터 없이 Auth.js를 쓰면 `token.sub`가 로그인마다 임의 UUID가 된다. `lib/auth-callbacks.ts`의 `jwtCallback`이 구글 `providerAccountId`로 고정하므로 이 콜백을 지우지 않는다(지우면 다시 로그인할 때 지난 일기가 사라진 것처럼 보인다).
- 구글 클라이언트의 리디렉션 URI는 `http://localhost:3000/api/auth/callback/google`이다. 배포 주소가 생기면 같은 클라이언트에 원본과 리디렉션 URI를 더한다.

## AI 모델

- OpenRouter 무료 모델만 쓴다. 순서: `nvidia/nemotron-3-ultra-550b-a55b:free` → `nvidia/nemotron-3.5-super-vl:free`. 모델당 25초, 합계 50초, API 경로 `maxDuration = 60`.
- 두 모델이 모두 실패해도 일기는 저장하고 `aiStatus: "failed"`로 알린다. 저장 뒤 실패는 500이 아니라 201로 응답한다(중복 저장 방지).
- 무료 모델은 목록에서 빠지거나(404) 몰리면(429) 실패한다. 하루 무료 호출은 약 50회이므로 시험에서 실제 호출을 아낀다.

## 위기 안내

- 위기 판단은 키워드 검사(`lib/ai/crisis.ts`)와 AI 판단을 함께 쓴다. 키워드에 걸리면 AI가 실패해도 안내가 나와야 한다.
- 상담 연락처(109, 1577-0199, 1388, 119)와 위기 카드 문구는 AI가 만들지 않고 `lib/types.ts`의 상수를 쓴다.
- 키워드를 고칠 때는 `tests/ai.test.ts`의 잡아야 할 문장과 잡지 말아야 할 문장을 함께 고친다.

## 확인과 커밋

- 고친 뒤 `npm test`, `npm run lint`, `npm run build`를 돌린다. 보고만 믿지 않고 내 컴퓨터에서 로그인과 일기 저장을 직접 확인한다.
- 커밋은 내용별로 나누고, 단계가 끝나면 태그(`DIARY_0N_0N`)를 붙여 올린다.
