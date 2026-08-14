import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

test('/api/diag는 설정된 Gateway를 사용하고 비밀 값을 응답하지 않는다', async () => {
  const originalFetch = globalThis.fetch;
  let received;
  globalThis.fetch = async (url, options = {}) => {
    received = { url: String(url), headers: options.headers };
    return Response.json({
      models: [{
        name: 'models/gemini-2.5-flash',
        supportedGenerationMethods: ['generateContent'],
      }],
    });
  };

  try {
    const response = await worker.fetch(new Request('https://example.com/api/diag'), {
      GEMINI_API_KEY: 'google-secret',
      GEMINI_MODEL: 'gemini-2.5-flash',
      CF_AIG_ACCOUNT_ID: 'account-123',
      CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
      CF_AIG_TOKEN: 'gateway-secret',
    });
    const body = await response.json();

    assert.equal(body.ai_transport, 'cloudflare-ai-gateway');
    assert.equal(body.gateway_configured, true);
    assert.equal(
      received.url,
      'https://gateway.ai.cloudflare.com/v1/account-123/jobsaju-gemini/google-ai-studio/v1/models',
    );
    assert.equal(received.headers['x-goog-api-key'], 'google-secret');
    assert.equal(received.headers['cf-aig-authorization'], 'Bearer gateway-secret');
    assert.doesNotMatch(JSON.stringify(body), /google-secret|gateway-secret|account-123/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/api/diag는 불완전한 Gateway 설정을 외부 요청 전에 거부한다', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error('외부 요청을 보내면 안 됩니다.');
  };

  try {
    const response = await worker.fetch(new Request('https://example.com/api/diag'), {
      GEMINI_API_KEY: 'google-secret',
      CF_AIG_ACCOUNT_ID: 'account-123',
      CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
    });
    const body = await response.json();

    assert.equal(fetchCount, 0);
    assert.equal(body.gateway_configured, false);
    assert.match(body.models_error, /AI Gateway 설정이 완전하지 않습니다/);
    assert.doesNotMatch(JSON.stringify(body), /google-secret|account-123/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
