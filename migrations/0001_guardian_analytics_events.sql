CREATE TABLE IF NOT EXISTS guardian_analytics_events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  visitor_session_id TEXT,
  result_session_id TEXT,
  share_id TEXT,
  guardian_id TEXT,
  from_guardian_id TEXT,
  share_channel TEXT,
  utm_source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guardian_events_name_time
  ON guardian_analytics_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_guardian_events_share
  ON guardian_analytics_events(share_id, event_name);
CREATE INDEX IF NOT EXISTS idx_guardian_events_visitor
  ON guardian_analytics_events(visitor_session_id, event_name);
CREATE INDEX IF NOT EXISTS idx_guardian_events_result
  ON guardian_analytics_events(result_session_id, event_name);
