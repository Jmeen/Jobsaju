DROP TABLE IF EXISTS paid_reports;
CREATE TABLE paid_reports (
  payment_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  report_json TEXT,
  generation_attempt INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
