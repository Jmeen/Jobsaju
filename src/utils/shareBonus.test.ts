import assert from 'node:assert/strict';
import test from 'node:test';
import { grantCopyShareBonus } from './shareBonus.ts';

test('링크 복사 보상은 유효 토큰을 전용 POST 경로로 보낸다', async () => {
  const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const granted = await grantCopyShareBonus('paid-token-1234567890', async (input, init) => {
    requests.push({ input, init });
    return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
  });

  const request = requests[0];
  assert.equal(granted, true);
  assert.equal(request.input, '/api/share-bonus/copy');
  assert.equal(request.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(request.init?.body)), { unlock_token: 'paid-token-1234567890' });
});

test('링크 복사 보상 API가 거부되거나 네트워크 오류가 나면 false를 돌려준다', async () => {
  assert.equal(await grantCopyShareBonus('paid-token-1234567890', async () => new Response(null, { status: 403 })), false);
  assert.equal(await grantCopyShareBonus('paid-token-1234567890', async () => { throw new Error('offline'); }), false);
  assert.equal(await grantCopyShareBonus('', async () => new Response(null, { status: 200 })), false);
});
