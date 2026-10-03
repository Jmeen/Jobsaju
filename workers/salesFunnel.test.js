import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleSalesFunnelAdminRequest,
  handleSalesFunnelRequest,
  recordPurchaseConfirmed,
  sanitizeSalesAttribution,
} from './salesFunnel.js';

const NOW = Date.parse('2026-10-03T12:00:00.000Z');
const VISITOR = '11111111-1111-4111-8111-111111111111';
const EVENT = '22222222-2222-4222-8222-222222222222';

/** INSERT와 SELECT만 흉내 내는 최소 D1. */
function fakeDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (rows.has(args[0])) return { meta: { changes: 0 } };
              const [event_id, event_name, occurred_at, visitor_session_id, result_session_id,
                utm_source, utm_medium, utm_campaign, utm_content, amount, payment_kind, coupon_code] = args;
              rows.set(event_id, { event_id, event_name, occurred_at, visitor_session_id, result_session_id,
                utm_source, utm_medium, utm_campaign, utm_content, amount, payment_kind, coupon_code });
              return { meta: { changes: 1 } };
            },
            async all() {
              const inWindow = [...rows.values()].filter(row => row.occurred_at >= args[0] && row.occurred_at < args[1]);
              if (sql.includes('GROUP BY')) return { results: inWindow.map(row => ({ event_name: row.event_name, sessions: 1, events: 1 })) };
              return { results: inWindow.filter(row => row.event_name === 'purchase_confirmed') };
            },
          };
        },
      };
    },
  };
}

function post(body) {
  return new Request('https://jobsaju.kr/api/funnel', { method: 'POST', body: JSON.stringify(body) });
}

function browserEvent(overrides = {}) {
  return {
    eventId: EVENT, eventName: 'visit', occurredAt: new Date(NOW).toISOString(), visitorSessionId: VISITOR,
    utmSource: 'threads', utmMedium: 'social', utmCampaign: 'stay-or-go-72h', utmContent: 'c1-criteria',
    ...overrides,
  };
}

test('브라우저 퍼널 이벤트는 UTM 네 가지와 함께 저장된다', async () => {
  const DB = fakeDb();
  const response = await handleSalesFunnelRequest(post(browserEvent()), { DB }, { now: NOW, buckets: new Map() });
  assert.equal(response.status, 202);
  const row = DB.rows.get(EVENT);
  assert.equal(row.utm_campaign, 'stay-or-go-72h');
  assert.equal(row.utm_content, 'c1-criteria');
  assert.equal(row.amount, null);
});

test('브라우저는 결제 확인 이벤트를 만들 수 없다', async () => {
  const DB = fakeDb();
  const response = await handleSalesFunnelRequest(
    post(browserEvent({ eventName: 'purchase_confirmed', amount: 12900 })), { DB }, { now: NOW, buckets: new Map() },
  );
  assert.equal(response.status, 400);
  assert.equal(DB.rows.size, 0);
});

test('형식이 틀린 태그와 개인정보처럼 보이는 값은 버린다', () => {
  const clean = sanitizeSalesAttribution({
    visitorSessionId: 'not-a-uuid', utmSource: 'someone@example.com', utmCampaign: 'ok_tag', email: 'a@b.c',
  });
  assert.deepEqual(clean, {
    visitorSessionId: null, resultSessionId: null, utmSource: null, utmMedium: null, utmCampaign: 'ok_tag', utmContent: null,
  });
});

test('시간 창 밖의 이벤트와 과도한 반복 호출은 거절한다', async () => {
  const DB = fakeDb();
  const stale = await handleSalesFunnelRequest(
    post(browserEvent({ occurredAt: '2026-09-01T00:00:00.000Z' })), { DB }, { now: NOW, buckets: new Map() },
  );
  assert.equal(stale.status, 400);

  const buckets = new Map();
  let last;
  for (let index = 0; index < 31; index += 1) {
    last = await handleSalesFunnelRequest(post(browserEvent({ eventId: 'bad' })), { DB }, { now: NOW, buckets });
  }
  assert.equal(last.status, 429);
});

test('결제 확인은 결제번호당 한 행만 남고 금액·종류를 서버 값으로 기록한다', async () => {
  const DB = fakeDb();
  const input = {
    purchaseId: 'pay-1', amount: 12900, paymentKind: 'pg', couponCode: null,
    sales: { visitorSessionId: VISITOR, utmSource: 'threads', utmContent: 'c2-timing' }, now: NOW,
  };
  assert.equal(await recordPurchaseConfirmed({ DB }, input), 'inserted');
  assert.equal(await recordPurchaseConfirmed({ DB }, input), 'duplicate');
  const row = DB.rows.get('purchase:pay-1');
  assert.equal(row.event_name, 'purchase_confirmed');
  assert.equal(row.amount, 12900);
  assert.equal(row.payment_kind, 'pg');
  assert.equal(row.utm_content, 'c2-timing');
});

test('기록 실패는 예외를 던지지 않는다', async () => {
  const DB = { prepare() { throw new Error('d1 down'); } };
  assert.equal(await recordPurchaseConfirmed({ DB }, { purchaseId: 'pay-2', amount: 12900, paymentKind: 'pg' }), 'failed');
});

test('관리자 집계는 인증이 필요하고 유료·쿠폰·테스트를 나눠 센다', async () => {
  const DB = fakeDb();
  const env = { DB, COUPON_ADMIN_KEY: 'admin-test-key' };
  await recordPurchaseConfirmed(env, { purchaseId: 'pay-1', amount: 12900, paymentKind: 'pg', now: NOW });
  await recordPurchaseConfirmed(env, { purchaseId: 'tok-1', amount: 0, paymentKind: 'coupon_free', couponCode: 'FRIEND', now: NOW });
  await recordPurchaseConfirmed(env, { purchaseId: 'tok-2', amount: null, paymentKind: 'sandbox', now: NOW });

  const url = 'https://jobsaju.kr/api/admin/funnel?from=2026-10-01T00:00:00.000Z&to=2026-10-04T00:00:00.000Z';
  const denied = await handleSalesFunnelAdminRequest(new Request(url), env, { now: NOW });
  assert.equal(denied.status, 401);

  // 포트원 시크릿이 없으면 환불 조회는 '확인 불가'(null)로 남는다.
  const allowed = await handleSalesFunnelAdminRequest(
    new Request(`${url}&refunds=1`, { headers: { Authorization: 'Bearer admin-test-key' } }), env, { now: NOW },
  );
  assert.equal(allowed.status, 200);
  const body = await allowed.json();
  assert.deepEqual(body.totals, { paidCount: 1, paidAmount: 12900, couponFreeCount: 1, sandboxCount: 1, refundedAmount: null });
  // 결제번호 원문은 응답에 싣지 않는다.
  assert.equal(JSON.stringify(body).includes('pay-1'), false);

  const fetcher = async () => new Response(JSON.stringify({ status: 'CANCELLED', amount: { cancelled: 12900 } }));
  const refunded = await handleSalesFunnelAdminRequest(
    new Request(`${url}&refunds=1`, { headers: { Authorization: 'Bearer admin-test-key' } }),
    { ...env, PORTONE_API_SECRET: 'test-secret' }, { now: NOW, fetcher },
  );
  assert.equal((await refunded.json()).totals.refundedAmount, 12900);
});
