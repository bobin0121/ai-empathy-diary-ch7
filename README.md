<!-- 2026-11-19 16:07 KST -->
# 🕯️ 공감 다이어리

오늘 하루, 힘든 일은 없었나요? 한 줄로 털어놓으면 AI가 마음을 읽고 따뜻하게 답해 주는 일기 앱입니다.

- 배포 주소: 아직 없음(Vercel 배포 보류, 내 컴퓨터에서만 실행)
- 저장소: https://github.com/bobin0121/ai-empathy-diary-ch7

## 사용자 설명

1. **구글로 시작하기**를 눌러 로그인합니다. 일기는 로그인한 본인만 볼 수 있어요.
2. "오늘, 마음 쓰이는 일은 없었나요?" 화면에서 오늘의 마음을 한 줄(200자까지)로 적고 **털어놓기**를 누릅니다.
3. 잠시 뒤 주된 감정(기쁨, 슬픔, 분노, 불안, 평온, 지침)과 강도(1~5), 따뜻한 공감 메시지가 나옵니다.
4. **지난 기록**에서 그동안의 일기를 최근 것부터 볼 수 있고, 필요 없는 일기는 확인한 뒤 삭제할 수 있어요.
5. AI가 잠시 답하지 못하면 일기는 저장되고, 나중에 **다시 분석하기**를 누를 수 있어요.

힘든 마음이 크게 느껴지는 글에는 공감 메시지와 함께 전문 상담 연락처가 안내됩니다.

| 연락처 | 번호 |
|---|---|
| 자살예방상담전화 | 109 |
| 정신건강위기상담전화 | 1577-0199 |
| 청소년상담 | 1388 |
| 긴급 | 119 |

일기 한 줄은 감정 분석을 위해 외부 AI 서비스(OpenRouter)로 전달됩니다.

## 개발자 설명

### 기술 구성

| 영역 | 사용 |
|---|---|
| 화면과 서버 | Next.js 16(App Router, TypeScript) |
| 로그인 | Auth.js v5, 구글, JWT 세션 |
| DB | Supabase Postgres의 `diary` 스키마(`pg`) |
| AI | OpenRouter 무료 모델 `nvidia/nemotron-3-ultra-550b-a55b:free` → `nvidia/nemotron-3.5-super-vl:free` |
| 시험 | vitest |

### 내 컴퓨터에서 실행

1. 패키지 설치: `npm install`
2. `.env.example`을 보고 `.env`에 값 5개를 넣습니다(값은 커밋하지 않음).

   | 이름 | 내용 |
   |---|---|
   | `DATABASE_URL` | Supabase Transaction pooler(포트 6543) 연결 문자열 |
   | `OPENROUTER_API_KEY` | OpenRouter API 키 |
   | `AUTH_SECRET` | 무작위 문자열(예: `openssl rand -base64 32`) |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | 구글 클라우드 OAuth 클라이언트(웹 애플리케이션) 값 |

3. 구글 OAuth 클라이언트에 원본 `http://localhost:3000`, 리디렉션 URI `http://localhost:3000/api/auth/callback/google`을 등록합니다.
4. DB 표 만들기: `npm run db:migrate`(`diary` 스키마만 만들고, 다시 실행해도 안전)
5. 실행: `npm run dev` → http://localhost:3000

### 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 |
| `npm test` | 시험(69개) |
| `npm run lint` | 린트 |
| `npm run db:migrate` | `db/migrations/`의 SQL 적용 |

### 폴더

| 위치 | 내용 |
|---|---|
| `app/page.tsx`, `app/(pages)/` | 시작, 쓰기, 결과, 지난 기록 화면 |
| `app/api/entries/` | 일기 저장, 목록, 조회, 삭제, 다시 분석 API(`docs/API.md`) |
| `lib/ai/` | OpenRouter 호출, 프롬프트, 위기 키워드 |
| `lib/db/` | 연결 풀(Supabase 루트 CA 검증), 일기 쿼리 |
| `lib/auth-callbacks.ts` | 사용자 식별자를 구글 계정 번호로 고정 |
| `db/migrations/` | `diary` 스키마 SQL |
| `docs/` | 작업 계획, PRD, API, QA 보고서(haiku, opus, 비교) |
| `.claude/agents/` | 개발팀 에이전트 5개 |

### 만든 과정

`.claude/agents`의 에이전트 5개(product-manager, backend-developer, frontend-developer, ai-integration-specialist, qa-engineer)에게 단계별로 일을 나눠 맡겼습니다. 0단계 PRD, 1단계 뼈대, 2단계 백엔드, AI, 화면 동시 진행, 3단계 통합, 4단계 QA(haiku와 opus 비교) 순서이고, 단계마다 태그(`DIARY_00_01` ~ `DIARY_05_01`)를 붙였습니다.

### 남은 일

- Vercel 배포(구글 클라이언트에 배포 주소 등록, 환경 변수 5개, 보안 비밀번호 새로 발급)
- 요청 속도 제한(무료 AI 한도 보호), DB 연결 풀 시간 제한, 보안 응답 헤더 등 QA 중간, 낮음 항목(`docs/qa/compare.md`)
