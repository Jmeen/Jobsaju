import assert from 'node:assert/strict';
import test from 'node:test';
import { handleSharePageRequest } from './sharePage.js';

function createKv() {
  const values = new Map();
  return {
    values,
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(key, value) {
      values.set(key, value);
    },
  };
}

const validImageUrl = 'https://job-saju.example/api/share-card/123e4567-e89b-42d3-a456-426614174000.png';

test('개인화 이미지·문구로 공유 페이지를 만들고 shareUrl을 반환한다', async () => {
  const kv = createKv();
  const response = await handleSharePageRequest(new Request('https://job-saju.example/api/share-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: validImageUrl, title: '나는 잔류형이래', description: '지금은 협상 카드를 먼저 쓸 시점입니다.' }),
  }), { SAJU_KV: kv });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.match(data.shareUrl, /^https:\/\/job-saju\.example\/api\/share-page\/[0-9a-f-]+$/);
  assert.equal(kv.values.size, 1);
});

test('우리 R2 공유카드 URL이 아닌 이미지는 거부한다', async () => {
  const kv = createKv();
  const response = await handleSharePageRequest(new Request('https://job-saju.example/api/share-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: 'https://evil.example/x.png', title: 't', description: 'd' }),
  }), { SAJU_KV: kv });

  assert.equal(response.status, 400);
  assert.equal(kv.values.size, 0);
});

test('제목이나 설명이 비어 있으면 거부한다', async () => {
  const kv = createKv();
  const response = await handleSharePageRequest(new Request('https://job-saju.example/api/share-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: validImageUrl, title: '', description: 'd' }),
  }), { SAJU_KV: kv });

  assert.equal(response.status, 400);
});

test('생성된 공유 페이지는 og 태그에 개인화된 이미지·제목·설명을 담는다', async () => {
  const kv = createKv();
  const createResponse = await handleSharePageRequest(new Request('https://job-saju.example/api/share-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: validImageUrl, title: '나는 잔류형이래', description: '지금은 협상 카드를 먼저 쓸 시점입니다.' }),
  }), { SAJU_KV: kv });
  const { shareUrl } = await createResponse.json();

  const pageResponse = await handleSharePageRequest(new Request(shareUrl), { SAJU_KV: kv });
  assert.equal(pageResponse.status, 200);
  assert.equal(pageResponse.headers.get('Content-Type'), 'text/html; charset=utf-8');
  const html = await pageResponse.text();
  assert.match(html, /<meta property="og:image" content="https:\/\/job-saju\.example\/api\/share-card\/123e4567-e89b-42d3-a456-426614174000\.png" \/>/);
  assert.match(html, /<meta property="og:title" content="나는 잔류형이래" \/>/);
  assert.match(html, /<meta property="og:description" content="지금은 협상 카드를 먼저 쓸 시점입니다\." \/>/);
});

test('존재하지 않는 공유 페이지 id는 기본 서비스 URL로 리다이렉트한다', async () => {
  const kv = createKv();
  const response = await handleSharePageRequest(
    new Request('https://job-saju.example/api/share-page/00000000-0000-4000-8000-000000000000', { redirect: 'manual' }),
    { SAJU_KV: kv },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), 'https://job-saju.example/');
});

test('제목·설명에 포함된 HTML 특수문자는 이스케이프한다(XSS 방지)', async () => {
  const kv = createKv();
  const createResponse = await handleSharePageRequest(new Request('https://job-saju.example/api/share-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: validImageUrl, title: '<script>alert(1)</script>', description: 'd' }),
  }), { SAJU_KV: kv });
  const { shareUrl } = await createResponse.json();

  const pageResponse = await handleSharePageRequest(new Request(shareUrl), { SAJU_KV: kv });
  const html = await pageResponse.text();
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('관련 없는 경로·메서드는 null을 반환해 다른 라우팅으로 넘긴다', async () => {
  const kv = createKv();
  const response = await handleSharePageRequest(new Request('https://job-saju.example/api/other'), { SAJU_KV: kv });
  assert.equal(response, null);
});
