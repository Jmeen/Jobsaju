import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCharacterShareUrl,
  getOrCreateOutgoingShareSessionId,
  loadIncomingShareAttribution,
  resetOutgoingShareSessionId,
  resolveShareAttribution,
  saveIncomingShareAttribution,
  trackShareEvent,
} from './shareTracking.ts';

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

test('buildCharacterShareUrl은 캐릭터·세션·medium을 쿼리로 붙인다', () => {
  const url = buildCharacterShareUrl({
    baseUrl: 'https://jobsaju.kr/',
    dayPillar: '甲寅',
    shareSessionId: '550e8400-e29b-41d4-a716-446655440000',
    medium: 'kakao',
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('fromCharacter'), '甲寅');
  assert.equal(parsed.searchParams.get('utm_source'), 'character_share');
  assert.equal(parsed.searchParams.get('utm_medium'), 'kakao');
  assert.equal(parsed.searchParams.get('shareSessionId'), '550e8400-e29b-41d4-a716-446655440000');
});

test('buildCharacterShareUrl은 개인화 공유 랜딩 URL에도 attribution을 붙인다(경로는 그대로 유지)', () => {
  const url = buildCharacterShareUrl({
    baseUrl: 'https://jobsaju.kr/api/share-page/abc-123',
    dayPillar: '乙丑',
    shareSessionId: 'session-1',
    medium: 'link',
  });
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/api/share-page/abc-123');
  assert.equal(parsed.searchParams.get('utm_medium'), 'link');
});

test('resolveShareAttribution은 fromCharacter/shareSessionId가 모두 있어야 attribution을 만든다', () => {
  assert.equal(resolveShareAttribution('?fromCharacter=甲寅'), null);
  assert.equal(resolveShareAttribution('?shareSessionId=abc'), null);
  assert.equal(resolveShareAttribution(''), null);
});

test('resolveShareAttribution은 쿼리에서 attribution 값을 읽는다', () => {
  const attribution = resolveShareAttribution('?fromCharacter=%E7%94%B2%E5%AF%85&shareSessionId=abc-123&utm_source=character_share&utm_medium=kakao');
  assert.deepEqual(attribution, {
    fromCharacter: '甲寅',
    shareSessionId: 'abc-123',
    utmSource: 'character_share',
    utmMedium: 'kakao',
  });
});

test('getOrCreateOutgoingShareSessionId는 같은 storage에서 같은 값을 재사용한다', () => {
  const storage = createStorage();
  const first = getOrCreateOutgoingShareSessionId(storage);
  const second = getOrCreateOutgoingShareSessionId(storage);
  assert.equal(first, second);
});

test('getOrCreateOutgoingShareSessionId는 storage가 다르면 다른 값을 만든다', () => {
  const a = getOrCreateOutgoingShareSessionId(createStorage());
  const b = getOrCreateOutgoingShareSessionId(createStorage());
  assert.notEqual(a, b);
});

test('resetOutgoingShareSessionId를 호출하면 다음 getOrCreate는 새 값을 만든다(새 결과 생성 시나리오)', () => {
  const storage = createStorage();
  const beforeReset = getOrCreateOutgoingShareSessionId(storage);
  resetOutgoingShareSessionId(storage);
  const afterReset = getOrCreateOutgoingShareSessionId(storage);
  assert.notEqual(beforeReset, afterReset, '새 결과가 생성되면 outbound shareSessionId도 새로 발급돼야 한다');
});

test('resetOutgoingShareSessionId 이후에도 여러 번 공유하면(같은 결과) 같은 값을 재사용한다', () => {
  const storage = createStorage();
  resetOutgoingShareSessionId(storage);
  const first = getOrCreateOutgoingShareSessionId(storage);
  const second = getOrCreateOutgoingShareSessionId(storage);
  assert.equal(first, second, '같은 결과를 여러 번 공유(카카오 재시도 등)하면 같은 흐름으로 묶여야 한다');
});

test('incoming attribution의 shareSessionId(친구가 보낸 값)는 내 outbound shareSessionId에 절대 섞이지 않는다', () => {
  const storage = createStorage();
  // 친구가 보낸 링크로 들어와서 attribution을 저장했다고 가정 — 이 값은 "내가 받은" 흐름의 id다.
  const incoming = { fromCharacter: '甲寅', shareSessionId: 'incoming-session-from-friend', utmSource: 'character_share', utmMedium: 'kakao' };
  saveIncomingShareAttribution(incoming, storage);

  // 그 뒤 내가 내 결과를 공유하면(outbound), 완전히 다른 값이 만들어져야 한다.
  const outbound = getOrCreateOutgoingShareSessionId(storage);
  assert.notEqual(outbound, incoming.shareSessionId);

  // incoming attribution 자체도 outbound 발급 과정에서 변형되지 않아야 한다.
  assert.deepEqual(loadIncomingShareAttribution(storage), incoming);
});

test('resetOutgoingShareSessionId는 incoming attribution에는 영향을 주지 않는다', () => {
  const storage = createStorage();
  const incoming = { fromCharacter: '乙丑', shareSessionId: 'incoming-session-2', utmSource: 'character_share', utmMedium: 'link' };
  saveIncomingShareAttribution(incoming, storage);
  getOrCreateOutgoingShareSessionId(storage);

  resetOutgoingShareSessionId(storage);

  assert.deepEqual(loadIncomingShareAttribution(storage), incoming, 'outbound 세션을 리셋해도 incoming attribution은 그대로 남아 있어야 한다');
});

test('saveIncomingShareAttribution/loadIncomingShareAttribution은 왕복된다', () => {
  const storage = createStorage();
  const attribution = { fromCharacter: '甲寅', shareSessionId: 's1', utmSource: 'character_share', utmMedium: 'kakao' };
  saveIncomingShareAttribution(attribution, storage);
  assert.deepEqual(loadIncomingShareAttribution(storage), attribution);
});

test('loadIncomingShareAttribution은 저장된 값이 없으면 null이다', () => {
  assert.equal(loadIncomingShareAttribution(createStorage()), null);
});

test('trackShareEvent는 /api/analytics/event로 이벤트를 보낸다', async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl = '';
  let calledBody: any;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    calledUrl = String(input);
    calledBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true }), { status: 202 });
  }) as typeof fetch;
  try {
    trackShareEvent('guardian_share_kakao_click', { characterId: '甲寅', shareSessionId: 's1', medium: 'kakao' });
    // fire-and-forget이므로 마이크로태스크가 돌 시간을 준다
    await new Promise(resolve => setTimeout(resolve, 0));
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(calledUrl, '/api/analytics/event');
  assert.equal(calledBody.event, 'guardian_share_kakao_click');
  assert.equal(calledBody.characterId, '甲寅');
});

test('trackShareEvent는 fetch가 실패해도 던지지 않는다', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('network down'); }) as typeof fetch;
  try {
    assert.doesNotThrow(() => trackShareEvent('guardian_share_landing', {}));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
