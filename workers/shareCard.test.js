import assert from 'node:assert/strict';
import test from 'node:test';
import { handleShareCardRequest } from './shareCard.js';

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);

test('정상 PNG를 R2에 저장하고 공개 URL을 반환한다', async () => {
  const stored = [];
  const env = { SHARE_CARDS: { put: async (...args) => stored.push(args) } };
  const response = await handleShareCardRequest(new Request('https://job-saju.example/api/share-card', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png }), env);
  assert.equal(response.status, 201);
  assert.equal(stored.length, 1);
  assert.match((await response.json()).imageUrl, /^https:\/\/job-saju\.example\/api\/share-card\/[0-9a-f-]+\.png$/);
});

test('PNG가 아니거나 너무 큰 요청을 거부한다', async () => {
  const env = { SHARE_CARDS: { put: async () => undefined } };
  const badMime = await handleShareCardRequest(new Request('https://x.test/api/share-card', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' }), env);
  assert.equal(badMime.status, 415);
  const badSignature = await handleShareCardRequest(new Request('https://x.test/api/share-card', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array(8) }), env);
  assert.equal(badSignature.status, 400);
  const tooLarge = await handleShareCardRequest(new Request('https://x.test/api/share-card', { method: 'POST', headers: { 'Content-Type': 'image/png', 'Content-Length': '1048577' }, body: png }), env);
  assert.equal(tooLarge.status, 413);
});

test('R2 이미지를 올바른 보안·캐시 헤더로 응답한다', async () => {
  const env = { SHARE_CARDS: { get: async () => ({ body: png }) } };
  const response = await handleShareCardRequest(new Request('https://x.test/api/share-card/123e4567-e89b-42d3-a456-426614174000.png'), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=86400');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
});
