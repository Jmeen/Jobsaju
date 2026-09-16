import assert from 'node:assert/strict';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';
import worker from './index.js';
import { schedulePurchaseCapture } from './posthogAnalytics.js';

const distinctId = '019fe111-1111-4111-8111-111111111111';
const sessionId = '019fe222-2222-4222-8222-222222222222';
test('서버 capture는 개인정보 제거, 익명 ID 연결, 실제 금액, 안정된 UUID를 사용한다', async () => {
  const events = [];
  let shutdowns = 0;
  class Client { capture(event) { events.push(event); } async shutdown() { shutdowns++; } }
  const tasks = [];
  const ctx = { waitUntil(task) { tasks.push(task); } };
  const env = { POSTHOG_KEY: 'phc_test', POSTHOG_HOST: 'https://us.i.posthog.com' };
  const input = {
    analytics: { distinct_id: distinctId, $session_id: sessionId, email: 'private@example.com', worry_text: '고민', price: 1, utm_source: 'instagram' },
    verifiedPrice: 8900, coupon: 'PROMO', purchaseId: 'internal-order-1',
  };
  schedulePurchaseCapture(env, ctx, input, Client);
  schedulePurchaseCapture(env, ctx, input, Client);
  await Promise.all(tasks);
  assert.equal(events[0].distinctId, distinctId);
  assert.equal(events[0].properties.$session_id, sessionId);
  assert.equal(events[0].properties.price, 8900);
  assert.equal(events[0].properties.promo_code, 'PROMO');
  assert.equal(events[0].properties.$process_person_profile, false);
  assert.equal(events[0].uuid, events[1].uuid);
  assert.equal(JSON.stringify(events).includes('private@example.com'), false);
  assert.equal(JSON.stringify(events).includes('internal-order-1'), false);
  assert.equal(shutdowns, 2);
});
test('설정 누락, sandbox, 미확정 금액, 잘못된 identity/order는 purchase로 발송하지 않는다', () => {
  let calls = 0;
  const ctx = { waitUntil() { calls++; } };
  const env = { POSTHOG_KEY: 'phc_test', POSTHOG_HOST: 'https://us.i.posthog.com' };
  schedulePurchaseCapture({}, ctx, { analytics: { distinct_id: distinctId }, verifiedPrice: 100 });
  schedulePurchaseCapture(env, ctx, { analytics: { distinct_id: distinctId }, verifiedPrice: null });
  schedulePurchaseCapture(env, ctx, { analytics: { distinct_id: 'private@example.com' }, verifiedPrice: 100 });
  for (const verifiedPrice of [undefined, NaN, Infinity, -1, '100']) {
    schedulePurchaseCapture(env, ctx, { analytics: { distinct_id: distinctId }, verifiedPrice, purchaseId: 'one' });
  }
  schedulePurchaseCapture(env, ctx, { analytics: { distinct_id: distinctId }, verifiedPrice: 100 });
  assert.equal(calls, 0);
});
test('SDK 장애가 결제 응답을 바꾸지 않는다', async () => {
  const tasks = [];
  class Broken { constructor() { throw Error('network'); } }
  assert.doesNotThrow(() => schedulePurchaseCapture(
    { POSTHOG_KEY: 'phc_test', POSTHOG_HOST: 'https://us.i.posthog.com' },
    { waitUntil(task) { tasks.push(task); } },
    { analytics: { distinct_id: distinctId }, verifiedPrice: 100, purchaseId: 'one' }, Broken,
  ));
  await Promise.all(tasks);
});

function environment() {
  const values = new Map();
  const redeemed = new Set();
  return {
    POSTHOG_KEY: 'phc_test', POSTHOG_HOST: 'https://analytics.example', PORTONE_API_SECRET: 'secret',
    SAJU_KV: { async get(key) { return values.get(key) || null; }, async put(key, value) { values.set(key, value); } },
    DB: { prepare() { return { bind(id) { return { async run() {
      if (redeemed.has(id)) return { meta: { changes: 0 } };
      redeemed.add(id); return { meta: { changes: 1 } };
    } }; } }; } },
  };
}
test('실제 결제 라우트: PAID와 금액 검증 및 원자적 소비 성공 후에만 1회 전송한다', async () => {
  const original = globalThis.fetch;
  const captured = [];
  let providerStatus = 'PAID';
  let total = 12900;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.portone.io/')) return Response.json({ status: providerStatus, amount: { total } });
    const bytes = Buffer.from(await new Response(init.body).arrayBuffer());
    captured.push(JSON.parse((bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes) : bytes).toString()));
    return Response.json({ status: 1 });
  };
  try {
    const env = environment();
    const tasks = [];
    const ctx = { waitUntil(task) { tasks.push(task); } };
    const request = id => new Request('https://jobsaju.kr/api/payment/validate', {
      method: 'POST', body: JSON.stringify({ paymentId: id, analytics: { distinct_id: distinctId, $session_id: sessionId, utm_source: 'instagram', email: 'private@example.com' } }),
    });
    assert.equal((await worker.fetch(request('order-1'), env, ctx)).status, 200);
    await Promise.all(tasks);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].batch[0].event, 'purchase_complete');
    assert.equal(captured[0].batch[0].properties.price, 12900);
    assert.equal((await worker.fetch(request('order-1'), env, ctx)).status, 409);
    providerStatus = 'FAILED';
    assert.equal((await worker.fetch(request('order-failed'), env, ctx)).status, 400);
    providerStatus = 'READY';
    assert.equal((await worker.fetch(request('order-ready'), env, ctx)).status, 400);
    providerStatus = 'CANCELLED';
    assert.equal((await worker.fetch(request('order-cancelled'), env, ctx)).status, 400);
    providerStatus = 'PAID'; total = 1;
    assert.equal((await worker.fetch(request('order-tampered'), env, ctx)).status, 400);
    await Promise.all(tasks);
    assert.equal(captured.length, 1);
    total = 12900;
    env.SAJU_KV.put = async () => { throw Error('synthetic storage failure'); };
    assert.equal((await worker.fetch(request('order-storage-failed'), env, ctx)).status, 500);
    await Promise.all(tasks); assert.equal(captured.length, 1, 'token persistence failure is not a completed purchase');
    assert.equal(JSON.stringify(captured).includes('private@example.com'), false);
  } finally { globalThis.fetch = original; }
});
test('실제 결제 라우트는 PostHog 네트워크 실패에도 200 및 해금 토큰을 반환한다', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).startsWith('https://api.portone.io/')) return Response.json({ status: 'PAID', amount: { total: 12900 } });
    throw Error('synthetic analytics blocker');
  };
  try {
    const tasks = [];
    const response = await worker.fetch(new Request('https://jobsaju.kr/api/payment/validate', {
      method: 'POST', body: JSON.stringify({ paymentId: 'order-analytics-blocked', analytics: { distinct_id: distinctId } }),
    }), environment(), { waitUntil(task) { tasks.push(task); } });
    assert.equal(response.status, 200);
    assert.ok((await response.json()).unlockToken);
    await Promise.all(tasks);
  } finally { globalThis.fetch = original; }
});
