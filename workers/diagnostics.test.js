import test from 'node:test';
import assert from 'node:assert/strict';
import { handleDiagnostics, observeRequest, sanitizeClientEvent } from './diagnostics.js';

const id = '12345678-1234-4234-8234-123456789012';
function kvStore() {
  const values = new Map();
  return { values, async put(key, value, options) { values.set(key, { value, options }); }, async get(key) { return values.get(key)?.value || null; }, async list() { return { keys: [...values.keys()].sort().map(name => ({ name })), list_complete: true }; } };
}
test('클라이언트 로그는 개인정보와 URL 쿼리, 임의 오류 메시지를 버린다', () => {
  const safe = sanitizeClientEvent({ id, code: 'RENDER_ERROR', route: '/api/followup?token=secret', message: 'a@b.com', question: 'private', token: 'secret', frames: ['https://site/?token=secret', '/assets/index-a.js:1:20'] });
  assert.equal(safe.route, '/api/followup');
  assert.deepEqual(safe.frames, ['/assets/index-a.js:1:20']);
  assert.doesNotMatch(JSON.stringify(safe), /secret|private|a@b.com/);
});
test('서버 예외에 요청 번호를 부여하고 14일 로그를 남긴다', async () => {
  const kv = kvStore();
  const response = await observeRequest(new Request('https://example.com/api/followup', { headers: { 'X-Request-Id': id } }), { SAJU_KV: kv }, undefined, async () => { throw new Error('private question token=secret'); });
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('X-Request-Id'), id);
  const [{ value, options }] = [...kv.values.values()];
  assert.equal(options.expirationTtl, 1209600);
  assert.equal(JSON.parse(value).outcome, 'error');
  assert.doesNotMatch(value + await response.text(), /private question|secret/);
});
test('로그 저장 장애는 성공한 본 요청을 실패시키지 않는다', async () => {
  const response = await observeRequest(new Request('https://example.com/api/followup'), { SAJU_KV: { async put() { throw new Error('unavailable'); } } }, undefined, async () => Response.json({ answer: 'ok' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: 'ok' });
});
test('수집은 동일 출처와 크기를 검사하고 조회는 관리자만 허용한다', async () => {
  const kv = kvStore();
  const env = { SAJU_KV: kv, DIAGNOSTICS_ADMIN_KEY: 'test-admin' };
  const request = (origin, body) => new Request('https://example.com/api/diagnostics', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body });
  assert.equal((await handleDiagnostics(request('https://other.com', '{}'), env)).status, 403);
  assert.equal((await handleDiagnostics(request('https://example.com', 'x'.repeat(8193)), env)).status, 413);
  assert.equal((await handleDiagnostics(request('https://example.com', JSON.stringify({ id, code: 'RENDER_ERROR' })), env)).status, 202);
  assert.equal((await handleDiagnostics(new Request('https://example.com/api/admin/diagnostics'), env)).status, 401);
  const result = await handleDiagnostics(new Request('https://example.com/api/admin/diagnostics', { headers: { Authorization: 'Bearer test-admin' } }), env);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).events.length, 1);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});
