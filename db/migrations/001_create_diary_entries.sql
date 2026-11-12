-- 2026-11-12 12:38 KST
-- diary 스키마와 표를 만든다. 다시 실행해도 안전하다. diary 밖의 객체는 건드리지 않는다.

CREATE SCHEMA IF NOT EXISTS diary;

-- 적용한 마이그레이션 기록(scripts/migrate.mjs가 같은 표를 먼저 만들어 두므로 IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS diary.schema_migrations (
  filename   text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diary.entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text        NOT NULL,
  content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  emotion         text        CHECK (emotion IN ('기쁨', '슬픔', '분노', '불안', '평온', '지침')),
  intensity       smallint    CHECK (intensity BETWEEN 1 AND 5),
  empathy_message text,
  crisis          boolean     NOT NULL DEFAULT false,
  ai_status       text        NOT NULL DEFAULT 'failed' CHECK (ai_status IN ('done', 'failed')),
  model_used      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  analyzed_at     timestamptz,
  -- emotion과 intensity는 함께 채워지거나 함께 비어 있다.
  CONSTRAINT entries_emotion_intensity_together
    CHECK ((emotion IS NULL) = (intensity IS NULL))
);

-- 목록 조회용: 사용자별 최근 순
CREATE INDEX IF NOT EXISTS entries_user_created_idx
  ON diary.entries (user_id, created_at DESC);

-- 브라우저에서 직접 접근하는 경로를 막는다. 앱은 서버에서 연결 주소로만 접근한다.
ALTER TABLE diary.entries ENABLE ROW LEVEL SECURITY;
