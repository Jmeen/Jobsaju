-- 캐릭터 공유 attribution/analytics 테이블.
--
-- schema.sql(paid_reports)과 별도 파일로 둔다 — schema.sql은 DROP TABLE IF EXISTS로 시작해서
-- 그대로 실행하면 기존 결제 리포트 데이터가 날아간다. 이 파일은 항상 IF NOT EXISTS만 쓴다.
--
-- 적용: wrangler d1 execute paid_reports_db --remote --file=schema_share_analytics.sql
-- (로컬 개발 DB에는 --remote 없이 실행)
--
-- 개인정보(이름·이메일·생년월일·전화번호·카카오 계정)는 어떤 컬럼에도 저장하지 않는다.
CREATE TABLE IF NOT EXISTS share_analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  character_id TEXT,
  from_character TEXT,
  share_session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  medium TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_share_analytics_events_session ON share_analytics_events(share_session_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_events_event ON share_analytics_events(event);
