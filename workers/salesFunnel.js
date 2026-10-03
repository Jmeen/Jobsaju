// 채널·콘텐츠별 판매 퍼널 기록.
//
// 브라우저가 보낼 수 있는 단계와 서버만 쓸 수 있는 단계를 나눈다.
// purchase_confirmed는 /api/payment/validate가 포트원 PAID·금액 검증과 결제번호 소비에
// 성공한 뒤에만 기록하므로, 결제창 진입이나 완료 페이지 방문과 섞이지 않는다.
import { UUID_V4_PATTERN } from './guardianAnalytics.js';

const MAX_BODY_BYTES = 2 * 1024;
const TAG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_OCCURRED_AT_PAST_MS = 24 * 60 * 60 * 1000;
const MAX_OCCURRED_AT_FUTURE_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_EVENTS = 30;
const RATE_LIMIT_MAX_TRACKED_CLIENTS = 5000;
const MAX_REFUND_LOOKUPS = 50;

export const BROWSER_SALES_EVENT_NAMES = new Set([
  'visit', 'free_result_view', 'paywall_view', 'checkout_open', 'checkout_start',
]);
export const PURCHASE_CONFIRMED_EVENT = 'purchase_confirmed';
/** pg: 포트원 검증 결제 · coupon_free: 전액 쿠폰 · sandbox: 서버 테스트 우회 */
export const PAYMENT_KINDS = new Set(['pg', 'coupon_free', 'sandbox']);
/** 퍼널 순서. 관리자 집계 표도 이 순서로 읽는다. */
export const SALES_FUNNEL_ORDER = [...BROWSER_SALES_EVENT_NAMES, PURCHASE_CONFIRMED_EVENT];

const rateLimitBuckets = new Map();

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

function isRateLimited(buckets, clientKey, now) {
  const bucket = buckets.get(clientKey);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= RATE_LIMIT_MAX_TRACKED_CLIENTS) buckets.clear();
    buckets.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_EVENTS;
}

function tagOrNull(value) {
  return typeof value === 'string' && TAG_PATTERN.test(value) ? value : null;
}

function uuidOrNull(value) {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value) ? value : null;
}

/** 형식이 맞지 않는 태그는 거절하지 않고 버린다 — 유입 태그 오타가 결제를 막으면 안 된다. */
export function sanitizeSalesAttribution(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return {
    visitorSessionId: uuidOrNull(source.visitorSessionId),
    resultSessionId: uuidOrNull(source.resultSessionId),
    utmSource: tagOrNull(source.utmSource),
    utmMedium: tagOrNull(source.utmMedium),
    utmCampaign: tagOrNull(source.utmCampaign),
    utmContent: tagOrNull(source.utmContent),
  };
}

function isValidOccurredAt(value, now) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString() !== value) return false;
  const drift = timestamp - now;
  return drift <= MAX_OCCURRED_AT_FUTURE_MS && drift >= -MAX_OCCURRED_AT_PAST_MS;
}

async function insertSalesEvent(env, row) {
  const result = await env.DB.prepare(`
    INSERT INTO sales_funnel_events (
      event_id, event_name, occurred_at, visitor_session_id, result_session_id,
      utm_source, utm_medium, utm_campaign, utm_content, amount, payment_kind, coupon_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id) DO NOTHING
  `).bind(
    row.eventId, row.eventName, row.occurredAt, row.visitorSessionId, row.resultSessionId,
    row.utmSource, row.utmMedium, row.utmCampaign, row.utmContent,
    row.amount ?? null, row.paymentKind ?? null, row.couponCode ?? null,
  ).run();
  return result?.meta?.changes === 1 ? 'inserted' : 'duplicate';
}

export async function handleSalesFunnelRequest(request, env, { now = Date.now(), buckets = rateLimitBuckets } = {}) {
  if (new URL(request.url).pathname !== '/api/funnel') return null;
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!env.DB) return json({ error: 'Funnel unavailable' }, 503);

  // IP는 카운터 키로만 쓰고 저장하지 않는다.
  const clientKey = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(buckets, clientKey, now)) return json({ error: 'Too Many Requests' }, 429);

  const text = await request.text().catch(() => null);
  if (text == null || new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'Invalid funnel request body' }, 400);
  }
  let event;
  try { event = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!event || Array.isArray(event) || typeof event !== 'object') return json({ error: 'Invalid funnel event' }, 400);

  if (!uuidOrNull(event.eventId)) return json({ error: 'Invalid eventId' }, 400);
  // 결제 확인 단계는 브라우저가 만들 수 없다.
  if (!BROWSER_SALES_EVENT_NAMES.has(event.eventName)) return json({ error: 'Invalid eventName' }, 400);
  if (!isValidOccurredAt(event.occurredAt, now)) return json({ error: 'Invalid occurredAt' }, 400);

  try {
    await insertSalesEvent(env, {
      eventId: event.eventId,
      eventName: event.eventName,
      occurredAt: event.occurredAt,
      ...sanitizeSalesAttribution(event),
    });
  } catch (error) {
    // 테이블 마이그레이션 전이거나 D1 장애여도 처리되지 않은 예외로 번지지 않게 한다.
    console.warn('Sales funnel insert failed:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Funnel unavailable' }, 503);
  }
  return json({ accepted: true }, 202);
}

/**
 * 결제 검증·결제번호 소비·토큰 저장이 모두 끝난 뒤에만 호출한다.
 * 기록 실패가 결제 응답을 바꾸면 안 되므로 예외를 밖으로 던지지 않는다.
 */
export async function recordPurchaseConfirmed(env, { purchaseId, amount, paymentKind, couponCode, sales, now = Date.now() }) {
  try {
    if (!env.DB || typeof purchaseId !== 'string' || !purchaseId) return 'skipped';
    if (!PAYMENT_KINDS.has(paymentKind)) return 'skipped';
    return await insertSalesEvent(env, {
      // 같은 결제번호가 다시 와도 한 행만 남는다.
      eventId: `purchase:${purchaseId}`,
      eventName: PURCHASE_CONFIRMED_EVENT,
      occurredAt: new Date(now).toISOString(),
      ...sanitizeSalesAttribution(sales),
      amount: typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? amount : null,
      paymentKind,
      couponCode: tagOrNull(couponCode),
    });
  } catch (error) {
    console.warn('Sales funnel purchase record failed:', error instanceof Error ? error.message : 'unknown');
    return 'failed';
  }
}

function isAdmin(request, env) {
  const received = request.headers.get('Authorization') || '';
  return [env.COUPON_ADMIN_KEY, env.DIAGNOSTICS_ADMIN_KEY]
    .some(key => key && received === `Bearer ${key}`);
}

/** 포트원에서 현재 결제 상태를 다시 읽어 환불(취소) 금액을 확인한다. 실패하면 null — '확인 불가'. */
async function lookupRefund(env, paymentId, fetcher) {
  const secret = env.PORTONE_API_SECRET || env.PORTONE_API_KEY;
  if (!secret) return null;
  try {
    const response = await fetcher(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${secret}` },
    });
    if (!response.ok) return null;
    const payment = await response.json();
    return {
      status: typeof payment.status === 'string' ? payment.status : null,
      cancelledAmount: typeof payment.amount?.cancelled === 'number' ? payment.amount.cancelled : 0,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/funnel?from=<ISO>&to=<ISO>[&refunds=1]
 * 채널·콘텐츠별 단계 집계와 결제 확인 목록을 돌려준다. 개인정보는 테이블에 없으므로 응답에도 없다.
 */
export async function handleSalesFunnelAdminRequest(request, env, { now = Date.now(), fetcher = fetch } = {}) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/admin/funnel') return null;
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증에 실패했습니다.' }, 401);
  if (!env.DB) return json({ error: 'Funnel unavailable' }, 503);

  const to = url.searchParams.get('to') || new Date(now).toISOString();
  const from = url.searchParams.get('from') || new Date(now - 72 * 60 * 60 * 1000).toISOString();
  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return json({ error: 'from/to는 ISO 시각이어야 합니다.' }, 400);
  }

  // 방문자 단계는 세션 단위로 센다. 세션 ID가 없는 행은 이벤트 단위로 센다.
  const stages = await env.DB.prepare(`
    SELECT
      COALESCE(utm_source, '(none)') AS utm_source,
      COALESCE(utm_medium, '(none)') AS utm_medium,
      COALESCE(utm_campaign, '(none)') AS utm_campaign,
      COALESCE(utm_content, '(none)') AS utm_content,
      event_name,
      COUNT(DISTINCT COALESCE(visitor_session_id, event_id)) AS sessions,
      COUNT(*) AS events
    FROM sales_funnel_events
    WHERE occurred_at >= ?1 AND occurred_at < ?2
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY 3, 1, 4, 5
  `).bind(from, to).all();

  const purchases = await env.DB.prepare(`
    SELECT event_id, occurred_at, amount, payment_kind, coupon_code,
           utm_source, utm_medium, utm_campaign, utm_content
    FROM sales_funnel_events
    WHERE event_name = '${PURCHASE_CONFIRMED_EVENT}' AND occurred_at >= ?1 AND occurred_at < ?2
    ORDER BY occurred_at
  `).bind(from, to).all();

  const withRefunds = url.searchParams.get('refunds') === '1';
  const purchaseRows = [];
  for (const [index, row] of (purchases.results || []).entries()) {
    // 결제번호는 PG 콘솔 대조에만 필요하므로 응답에는 순번만 싣는다.
    const { event_id: eventId, ...rest } = row;
    const entry = { no: index + 1, ...rest };
    if (withRefunds && row.payment_kind === 'pg' && index < MAX_REFUND_LOOKUPS) {
      entry.refund = await lookupRefund(env, String(eventId).replace(/^purchase:/, ''), fetcher);
    }
    purchaseRows.push(entry);
  }

  const paid = purchaseRows.filter(row => row.payment_kind === 'pg');
  return json({
    window: { from, to },
    order: SALES_FUNNEL_ORDER,
    stages: stages.results || [],
    purchases: purchaseRows,
    totals: {
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, row) => sum + (row.amount || 0), 0),
      couponFreeCount: purchaseRows.filter(row => row.payment_kind === 'coupon_free').length,
      sandboxCount: purchaseRows.filter(row => row.payment_kind === 'sandbox').length,
      // 환불은 포트원에서 확인된 값만 더한다. 조회하지 않았거나 실패하면 null(확인 불가).
      refundedAmount: withRefunds && paid.every(row => row.refund)
        ? paid.reduce((sum, row) => sum + row.refund.cancelledAmount, 0)
        : null,
    },
  }, 200);
}
