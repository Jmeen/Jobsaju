import assert from 'node:assert/strict';
import test from 'node:test';
import { handleShareAnalyticsRequest, recordShareEvent } from './shareAnalytics.js';

function createDb() {
  const inserts = [];
  return {
    inserts,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              inserts.push({ sql, args });
              return { success: true };
            },
          };
        },
      };
    },
  };
}

test('알려진 이벤트는 D1에 한 행으로 저장된다', async () => {
  const db = createDb();
  const response = await handleShareAnalyticsRequest(new Request('https://example.com/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'guardian_share_kakao_click',
      characterId: '甲寅',
      shareSessionId: 'session-1',
      utmSource: 'character_share',
      utmMedium: 'kakao',
      medium: 'kakao',
    }),
  }), { DB: db });

  assert.equal(response.status, 202);
  assert.equal(db.inserts.length, 1);
  assert.deepEqual(db.inserts[0].args, ['guardian_share_kakao_click', '甲寅', null, 'session-1', 'character_share', 'kakao', 'kakao']);
});

test('허용되지 않은 이벤트 이름은 거부하고 아무것도 저장하지 않는다', async () => {
  const db = createDb();
  const response = await handleShareAnalyticsRequest(new Request('https://example.com/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'not_a_real_event' }),
  }), { DB: db });

  assert.equal(response.status, 400);
  assert.equal(db.inserts.length, 0);
});

test('D1 바인딩이 없어도 202로 응답한다(로컬/스테이징에서 analytics가 없어도 공유 기능은 막지 않는다)', async () => {
  const response = await handleShareAnalyticsRequest(new Request('https://example.com/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'guardian_share_landing' }),
  }), {});

  assert.equal(response.status, 202);
});

test('POST가 아니면 null을 돌려줘 다른 라우트가 이어서 처리하게 한다', async () => {
  const response = await handleShareAnalyticsRequest(new Request('https://example.com/api/analytics/event', { method: 'GET' }), {});
  assert.equal(response, null);
});

test('경로가 다르면 null을 돌려준다', async () => {
  const response = await handleShareAnalyticsRequest(new Request('https://example.com/api/other', { method: 'POST' }), {});
  assert.equal(response, null);
});

test('recordShareEvent는 DB.prepare가 예외를 던져도 절대 던지지 않는다', async () => {
  const brokenDb = { prepare() { throw new Error('d1 down'); } };
  await assert.doesNotReject(recordShareEvent({ DB: brokenDb }, { event: 'guardian_share_kakao_success', shareSessionId: 's1' }));
});

test('recordShareEvent는 허용되지 않은 이벤트를 조용히 무시한다', async () => {
  const db = createDb();
  await recordShareEvent({ DB: db }, { event: 'not_allowed' });
  assert.equal(db.inserts.length, 0);
});
