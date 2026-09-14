import assert from 'node:assert/strict';
import test from 'node:test';
import { sendReportNotificationEmail } from './reportNotificationEmail.js';

test('완성 메일은 Resend에 HTML과 텍스트 본문 및 리포트 링크를 보낸다', async () => {
  const originalFetch = globalThis.fetch;
  let sentRequest;
  globalThis.fetch = async (url, options) => {
    sentRequest = { url: String(url), options };
    return new Response(JSON.stringify({ id: 'email-123' }), { status: 200 });
  };

  try {
    const result = await sendReportNotificationEmail({ RESEND_API_KEY: 'test-key' }, {
      email: 'USER@Example.com ',
      unlockToken: 'paid-token-123',
      sajuData: { ilgan: '갑목' },
      origin: 'https://jobsaju.kr',
    });
    const body = JSON.parse(sentRequest.options.body);

    assert.deepEqual(result, { sent: true, provider: 'resend' });
    assert.equal(sentRequest.url, 'https://api.resend.com/emails');
    assert.equal(sentRequest.options.headers['User-Agent'], 'jobsaju-worker/1.0');
    assert.deepEqual(body.to, ['user@example.com']);
    assert.match(body.subject, /갑목.*완성/);
    assert.match(body.html, /https:\/\/jobsaju\.kr\/\?p=/);
    assert.match(body.text, /https:\/\/jobsaju\.kr\/\?p=/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Resend가 실패 응답을 반환하면 발송 성공으로 처리하지 않는다', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'domain is not verified' }), { status: 403 });

  try {
    await assert.rejects(
      sendReportNotificationEmail({ RESEND_API_KEY: 'test-key' }, {
        email: 'user@example.com',
        unlockToken: 'paid-token-123',
      }),
      /Resend email failed \(403\).*domain is not verified/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('발송 설정이 없으면 외부 요청 없이 미설정 상태를 반환한다', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  };

  try {
    const result = await sendReportNotificationEmail({}, {
      email: 'user@example.com',
      unlockToken: 'paid-token-123',
    });
    assert.deepEqual(result, { sent: false, provider: null, reason: 'not-configured' });
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
