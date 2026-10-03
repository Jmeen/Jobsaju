-- 채널·콘텐츠별 판매 퍼널(방문 → 무료 결과 → 결제 시작 → 결제 확인)을 자체 D1에 남긴다.
-- purchase_confirmed 행은 브라우저가 아니라 /api/payment/validate가 PG 검증·결제 소비에
-- 성공한 직후에만 쓴다. 이름·이메일·생년월일·IP는 저장하지 않는다.
CREATE TABLE IF NOT EXISTS sales_funnel_events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  visitor_session_id TEXT,
  result_session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  amount INTEGER,
  payment_kind TEXT,
  coupon_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_funnel_name_time
  ON sales_funnel_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sales_funnel_campaign
  ON sales_funnel_events(utm_campaign, utm_source, utm_content);
