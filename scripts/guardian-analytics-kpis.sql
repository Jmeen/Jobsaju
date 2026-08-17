-- Guardian analytics baseline KPI queries for Cloudflare D1.
-- Bind the reporting window as ?1 (inclusive ISO timestamp) and ?2 (exclusive ISO timestamp).
-- All ratios use the approved distinct identifiers; NULL means the denominator is zero.

-- Primary: Share Inbound Completion Rate
-- Share landing visitor session -> completed guardian result.
SELECT
  1.0 * COUNT(DISTINCT CASE
    WHEN event_name = 'guardian_result_complete_from_share' THEN visitor_session_id
  END)
  / NULLIF(COUNT(DISTINCT CASE
    WHEN event_name = 'guardian_share_landing_view' THEN visitor_session_id
  END), 0) AS share_inbound_result_complete_rate
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;

-- Secondary: Share Rate
SELECT
  1.0 * COUNT(DISTINCT CASE WHEN event_name = 'guardian_share_click' THEN result_session_id END)
      / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'guardian_result_view' THEN result_session_id END), 0)
    AS share_rate
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;

-- Guardrail: Paid Conversion Rate
SELECT
  1.0 * COUNT(DISTINCT CASE WHEN event_name = 'paid_conversion' THEN result_session_id END)
      / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'guardian_result_view' THEN result_session_id END), 0)
    AS paid_conversion_rate
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;

-- Growth: Completed Guardians per Confirmed Share
-- Plan 2 will begin producing the inbound completion event; keep this query ready for rollout.
-- One confirmed row represents one Kakao X-Kakao-Resource-ID; transport retries reuse event_id.
SELECT
  1.0 * COUNT(DISTINCT CASE
    WHEN event_name = 'guardian_result_complete_from_share' THEN visitor_session_id
  END)
  / NULLIF(COUNT(DISTINCT CASE
    WHEN event_name = 'guardian_share_confirmed' THEN share_id
  END), 0) AS completed_guardians_per_confirmed_share
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;

-- Growth: Completed Guardians per Attempted Share
-- Uses the share sheet opening as the denominator when the channel cannot confirm delivery.
SELECT
  1.0 * COUNT(DISTINCT CASE
    WHEN event_name = 'guardian_result_complete_from_share' THEN visitor_session_id
  END)
  / NULLIF(COUNT(DISTINCT CASE
    WHEN event_name = 'guardian_share_sheet_opened' THEN share_id
  END), 0) AS completed_guardians_per_attempted_share
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;
