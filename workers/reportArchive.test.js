import assert from 'node:assert/strict';
import test from 'node:test';
import { archivePaidReport } from './reportArchive.js';

function createKv() {
  const values = new Map();
  return { async get(key) { return values.get(key) ?? null; }, async put(key, value) { values.set(key, value); } };
}

test('유료 리포트는 이메일 이력, 딥링크 보관본, 출생정보를 함께 저장한다', async () => {
  const kv = createKv();
  await archivePaidReport({
    kv, paymentId: 'paid-report-token-123',
    responsePayload: JSON.stringify({ status: 'success', report: { report_summary: { headline: '테스트' } } }),
    careerContext: { email: 'USER@Example.com ', job_title: '개발자', career_goal: '이직' },
    birth: { year: 1990, month: 1, day: 1, gender: 1 },
  });
  assert.ok(await kv.get('report:copy-v2:paid-report-token-123'));
  const meta = JSON.parse(await kv.get('meta:paid-report-token-123'));
  assert.equal(meta.user_context.birth_data.year, 1990);
  const history = JSON.parse(await kv.get('email:user@example.com'));
  assert.equal(history[0].label, '개발자 → 이직');
  assert.match(history[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
});
