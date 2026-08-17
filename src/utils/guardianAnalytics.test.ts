import assert from 'node:assert/strict';
import test from 'node:test';
import { createResultSessionId, ensureShareId, getVisitorSessionId, trackGuardianEvent } from './guardianAnalytics.ts';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

const baseEvent = {
  eventId: '11111111-1111-4111-8111-111111111111',
  eventName: 'guardian_result_view' as const,
  occurredAt: '2026-08-17T00:00:00.000Z',
  visitorSessionId: '22222222-2222-4222-8222-222222222222',
  resultSessionId: '33333333-3333-4333-8333-333333333333',
  guardianId: '甲子',
};

const failingTransport = {
  sendBeacon: () => false,
  fetch: async () => { throw new Error('offline'); },
};

test('visitor ID is stable in sessionStorage and one result reuses one shareId', () => {
  const storage = createMemoryStorage();
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  const randomUUID = () => ids.shift()!;
  assert.equal(getVisitorSessionId(storage, randomUUID), '11111111-1111-4111-8111-111111111111');
  assert.equal(getVisitorSessionId(storage, randomUUID), '11111111-1111-4111-8111-111111111111');
  assert.equal(ensureShareId(null, randomUUID), '22222222-2222-4222-8222-222222222222');
  assert.equal(ensureShareId('22222222-2222-4222-8222-222222222222', randomUUID), '22222222-2222-4222-8222-222222222222');
});

test('transport filters undefined fields and resolves even when beacon and fetch fail', async () => {
  await assert.doesNotReject(() => trackGuardianEvent(baseEvent, failingTransport));
});

test('result session IDs are generated per result', () => {
  assert.equal(createResultSessionId(() => 'result-session-id'), 'result-session-id');
});

test('transport projects only allowlisted fields and falls back from beacon', async () => {
  let fetchBody = '';
  await trackGuardianEvent({
    ...baseEvent,
    shareId: null,
    shareChannel: undefined,
    privateNote: 'must not be sent',
  } as typeof baseEvent & { privateNote: string }, {
    sendBeacon: () => false,
    fetch: async (_url, init) => {
      fetchBody = String(init?.body);
      return new Response(null, { status: 202 });
    },
  });
  const expected = JSON.stringify({
    eventId: baseEvent.eventId,
    eventName: baseEvent.eventName,
    occurredAt: baseEvent.occurredAt,
    visitorSessionId: baseEvent.visitorSessionId,
    resultSessionId: baseEvent.resultSessionId,
    shareId: null,
    guardianId: baseEvent.guardianId,
  });
  assert.equal(fetchBody, expected);
});
