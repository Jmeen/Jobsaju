import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createResultSessionId,
  ensureShareId,
  getGuardianResultViewEventId,
  getVisitorSessionId,
  trackGuardianEvent,
} from './guardianAnalytics.ts';

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

test('visitor ID falls back to a nonpersistent UUID when storage is denied', () => {
  const deniedStorage = {
    getItem: () => { throw new Error('storage denied'); },
    setItem: () => { throw new Error('storage denied'); },
  } as unknown as Storage;
  assert.equal(
    getVisitorSessionId(deniedStorage, () => 'fallback-visitor-id'),
    'fallback-visitor-id',
  );
  const setDeniedStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('storage denied'); },
  } as unknown as Storage;
  assert.equal(
    getVisitorSessionId(setDeniedStorage, () => 'set-denied-visitor-id'),
    'set-denied-visitor-id',
  );
  assert.equal(
    getVisitorSessionId(undefined, () => 'unavailable-storage-id'),
    'unavailable-storage-id',
  );
});

test('transport filters undefined fields and resolves even when beacon and fetch fail', async () => {
  await assert.doesNotReject(() => trackGuardianEvent(baseEvent, failingTransport));
});

test('result session IDs are generated per result', () => {
  assert.equal(createResultSessionId(() => 'result-session-id'), 'result-session-id');
});

test('result-view event ID is stable for restores and distinct between result sessions', () => {
  assert.equal(
    getGuardianResultViewEventId('33333333-3333-4333-8333-333333333333'),
    '33333333-3333-4333-8333-333333333333',
  );
  assert.equal(
    getGuardianResultViewEventId('44444444-4444-4444-8444-444444444444'),
    '44444444-4444-4444-8444-444444444444',
  );
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

test('transport resolves when event serialization fails', async () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  await assert.doesNotReject(() => trackGuardianEvent({
    ...baseEvent,
    eventId: circular,
  } as unknown as typeof baseEvent, failingTransport));
});

test('transport resolves when Blob construction fails', async () => {
  const originalBlob = globalThis.Blob;
  globalThis.Blob = class {
    constructor() { throw new Error('Blob unavailable'); }
  } as unknown as typeof Blob;
  try {
    await assert.doesNotReject(() => trackGuardianEvent(baseEvent, failingTransport));
  } finally {
    globalThis.Blob = originalBlob;
  }
});
