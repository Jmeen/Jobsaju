import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGuardianAnalyticsRequest, recordGuardianAnalyticsEvent } from './guardianAnalytics.js';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

const makeRequest = body => new Request('https://example.com/api/analytics', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

function createAnalyticsDb() {
  const rows = [];
  return {
    rows,
    prepare() {
      return { bind(...values) { return { async run() {
        if (rows.some(row => row.event_id === values[0])) {
          const error = new Error('UNIQUE constraint failed: guardian_analytics_events.event_id');
          throw error;
        }
        rows.push({
          event_id: values[0],
          event_name: values[1],
          occurred_at: values[2],
          visitor_session_id: values[3],
          result_session_id: values[4],
          share_id: values[5],
          guardian_id: values[6],
          from_guardian_id: values[7],
          share_channel: values[8],
          utm_source: values[9],
        });
        return { success: true };
      } }; } };
    },
  };
}

const validEvent = () => ({
  eventId: UUID_A,
  eventName: 'guardian_result_view',
  occurredAt: '2026-08-17T00:00:00.000Z',
  visitorSessionId: UUID_B,
  resultSessionId: UUID_C,
  guardianId: '甲子',
});

test('POST /api/analytics stores one allowlisted event and dedupes the same eventId', async () => {
  const db = createAnalyticsDb();
  const body = validEvent();
  const first = await handleGuardianAnalyticsRequest(makeRequest(body), { DB: db });
  const retry = await handleGuardianAnalyticsRequest(makeRequest(body), { DB: db });
  assert.equal(first.status, 202);
  assert.equal(retry.status, 202);
  assert.equal(db.rows.length, 1);
  assert.equal(Object.hasOwn(db.rows[0], 'email'), false);
});

test('rejects unknown events, invalid UUIDs, invalid guardian IDs, and oversized bodies', async () => {
  assert.equal((await handleGuardianAnalyticsRequest(makeRequest({ eventName: 'anything' }), { DB: createAnalyticsDb() })).status, 400);
  assert.equal((await handleGuardianAnalyticsRequest(makeRequest({ ...validEvent(), eventId: 'not-a-uuid' }), { DB: createAnalyticsDb() })).status, 400);
  assert.equal((await handleGuardianAnalyticsRequest(makeRequest({ ...validEvent(), guardianId: 'not-a-guardian' }), { DB: createAnalyticsDb() })).status, 400);
  assert.equal((await handleGuardianAnalyticsRequest(makeRequest({ ...validEvent(), padding: 'x'.repeat(4096) }), { DB: createAnalyticsDb() })).status, 400);
});

test('allows only the documented event fields to reach D1', async () => {
  const db = createAnalyticsDb();
  const response = await handleGuardianAnalyticsRequest(makeRequest({
    ...validEvent(),
    email: 'private@example.com',
    birthDate: '2000-01-01',
    concernText: 'private concern',
  }), { DB: db });

  assert.equal(response.status, 202);
  assert.deepEqual(Object.keys(db.rows[0]).sort(), [
    'event_id', 'event_name', 'from_guardian_id', 'guardian_id', 'occurred_at',
    'result_session_id', 'share_channel', 'share_id', 'utm_source', 'visitor_session_id',
  ]);
});

test('returns null for unrelated paths and rejects unsupported analytics methods', async () => {
  const unrelated = await handleGuardianAnalyticsRequest(new Request('https://example.com/api/free-result', { method: 'POST' }), { DB: createAnalyticsDb() });
  const getResponse = await handleGuardianAnalyticsRequest(new Request('https://example.com/api/analytics'), { DB: createAnalyticsDb() });

  assert.equal(unrelated, null);
  assert.equal(getResponse.status, 405);
});

test('rethrows non-unique database failures', async () => {
  const db = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('database unavailable'); } }) }) };

  await assert.rejects(() => recordGuardianAnalyticsEvent({ DB: db }, validEvent()), /database unavailable/);
});
