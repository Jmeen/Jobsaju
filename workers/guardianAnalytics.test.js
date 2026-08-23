import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
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
        if (values.some(value => value === undefined)) {
          throw new Error('D1_TYPE_ERROR: Type undefined not supported');
        }
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
  // 서버 시각 창 검증이 걸려 있으므로 고정 날짜를 쓰면 시간이 지나며 테스트가 썩는다.
  occurredAt: new Date().toISOString(),
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

test('rejects non-canonical occurredAt values so lexical KPI windows remain chronological', async () => {
  const invalidOccurredAtValues = [
    '2026-08-17T09:00:00+09:00',
    '2026-08-17T00:00:00Z',
    '2026-08-17',
    '2026-02-30T00:00:00.000Z',
  ];

  for (const occurredAt of invalidOccurredAtValues) {
    const response = await handleGuardianAnalyticsRequest(
      makeRequest({ ...validEvent(), occurredAt }),
      { DB: createAnalyticsDb() },
    );
    assert.equal(response.status, 400, `expected ${occurredAt} to be rejected`);
  }
});

test('rejects occurredAt outside the server clock window so KPI ranges cannot be poisoned', async () => {
  const now = Date.parse('2026-08-17T12:00:00.000Z');
  const at = offsetMs => new Date(now + offsetMs).toISOString();

  const rejected = [
    at(-25 * 60 * 60 * 1000), // 창보다 오래된 과거
    at(60 * 60 * 1000),       // 미래로 한 시간
    at(365 * 24 * 60 * 60 * 1000),
  ];
  for (const occurredAt of rejected) {
    const response = await handleGuardianAnalyticsRequest(
      makeRequest({ ...validEvent(), occurredAt }), { DB: createAnalyticsDb() }, { now, buckets: new Map() },
    );
    assert.equal(response.status, 400, `expected ${occurredAt} to be rejected`);
  }

  const accepted = [at(0), at(-23 * 60 * 60 * 1000), at(10 * 60 * 1000)];
  for (const occurredAt of accepted) {
    const response = await handleGuardianAnalyticsRequest(
      makeRequest({ ...validEvent(), occurredAt }), { DB: createAnalyticsDb() }, { now, buckets: new Map() },
    );
    assert.equal(response.status, 202, `expected ${occurredAt} to be accepted`);
  }
});

test('rate limits a single client so the public D1 write path cannot be flooded', async () => {
  const db = createAnalyticsDb();
  const buckets = new Map();
  const now = Date.now();
  const send = (id, at = now) => handleGuardianAnalyticsRequest(
    new Request('https://example.com/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
      body: JSON.stringify({ ...validEvent(), eventId: id }),
    }),
    { DB: db },
    { now: at, buckets },
  );

  const uuid = index => `${String(index).padStart(8, '0')}-1111-4111-8111-111111111111`;
  for (let index = 0; index < 60; index += 1) {
    assert.equal((await send(uuid(index))).status, 202, `event ${index} should be accepted`);
  }

  const throttled = await send(uuid(60));
  assert.equal(throttled.status, 429);
  assert.equal(throttled.headers.get('Retry-After'), '60');
  assert.equal(db.rows.length, 60);

  // 다른 발신지는 영향을 받지 않고, 창이 지나면 다시 열린다.
  const otherClient = await handleGuardianAnalyticsRequest(
    new Request('https://example.com/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.4' },
      body: JSON.stringify({ ...validEvent(), eventId: uuid(61) }),
    }),
    { DB: db },
    { now, buckets },
  );
  assert.equal(otherClient.status, 202);
  assert.equal((await send(uuid(62), now + 61_000)).status, 202);
});

test('rejects guardian_share_confirmed from the unauthenticated browser analytics route', async () => {
  const db = createAnalyticsDb();
  const response = await handleGuardianAnalyticsRequest(makeRequest({
    ...validEvent(),
    eventName: 'guardian_share_confirmed',
    shareId: UUID_A,
    shareChannel: 'kakao',
  }), { DB: db });

  assert.equal(response.status, 400);
  assert.equal(db.rows.length, 0);
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

test('normalizes every omitted optional field to null before binding to D1', async () => {
  const db = createAnalyticsDb();
  const event = validEvent();

  await recordGuardianAnalyticsEvent({ DB: db }, event);

  assert.deepEqual(db.rows[0], {
    event_id: UUID_A,
    event_name: 'guardian_result_view',
    occurred_at: event.occurredAt,
    visitor_session_id: UUID_B,
    result_session_id: UUID_C,
    share_id: null,
    guardian_id: '甲子',
    from_guardian_id: null,
    share_channel: null,
    utm_source: null,
  });
});

test('writes omitted optional fields through a real local Miniflare D1 binding', async () => {
  const miniflare = new Miniflare(convertV4MiniflareOptions({
    compatibilityDate: '2026-08-13',
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } };',
    d1Databases: { DB: 'guardian-analytics-test' },
  }));

  try {
    const db = await miniflare.getD1Database('DB');
    const migration = await readFile(new URL('../migrations/0001_guardian_analytics_events.sql', import.meta.url), 'utf8');
    for (const statement of migration.split(';').map(value => value.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }

    await recordGuardianAnalyticsEvent({ DB: db }, validEvent());

    const row = await db.prepare(`
      SELECT share_id, from_guardian_id, share_channel, utm_source
      FROM guardian_analytics_events WHERE event_id = ?
    `).bind(UUID_A).first();
    assert.deepEqual(row, {
      share_id: null,
      from_guardian_id: null,
      share_channel: null,
      utm_source: null,
    });
  } finally {
    await miniflare.dispose();
  }
});

test('링크 복사 공유 이벤트와 copy 채널을 받아 저장한다', async () => {
  const db = createAnalyticsDb();

  const response = await handleGuardianAnalyticsRequest(makeRequest({
    ...validEvent(),
    eventName: 'guardian_share_link_copy',
    shareId: UUID_A,
    shareChannel: 'copy',
  }), { DB: db });

  assert.equal(response.status, 202);
  assert.equal(db.rows[0].event_name, 'guardian_share_link_copy');
  assert.equal(db.rows[0].share_channel, 'copy');
});

test('카카오와 링크 복사가 share_channel로 갈라져 저장된다', async () => {
  const db = createAnalyticsDb();

  for (const [eventId, shareChannel] of [[UUID_A, 'kakao'], [UUID_B, 'copy']]) {
    await handleGuardianAnalyticsRequest(makeRequest({
      ...validEvent(), eventId, eventName: 'guardian_share_click', shareId: UUID_C, shareChannel,
    }), { DB: db });
  }

  assert.deepEqual(db.rows.map(row => row.share_channel), ['kakao', 'copy']);
});

test('모르는 공유 채널은 거부한다', async () => {
  const db = createAnalyticsDb();

  const response = await handleGuardianAnalyticsRequest(makeRequest({
    ...validEvent(), eventName: 'guardian_share_link_copy', shareChannel: 'telegram',
  }), { DB: db });

  assert.equal(response.status, 400);
  assert.equal(db.rows.length, 0);
});

test('유료 공유의 utm_source=report_share를 허용해 저장한다', async () => {
  const db = createAnalyticsDb();

  const response = await handleGuardianAnalyticsRequest(makeRequest({
    ...validEvent(), eventName: 'guardian_share_click', shareId: UUID_C, shareChannel: 'kakao', utmSource: 'report_share',
  }), { DB: db });

  assert.equal(response.status, 202);
  assert.equal(db.rows[0].utm_source, 'report_share');
});

test('알 수 없는 utm_source는 거부한다', async () => {
  const db = createAnalyticsDb();

  const response = await handleGuardianAnalyticsRequest(makeRequest({
    ...validEvent(), eventName: 'guardian_share_click', shareId: UUID_C, shareChannel: 'kakao', utmSource: 'facebook_ads',
  }), { DB: db });

  assert.equal(response.status, 400);
  assert.equal(db.rows.length, 0);
});
