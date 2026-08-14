import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGeminiRequest } from './geminiTransport.js';

test('완전한 Gateway 설정은 인증된 Google AI Studio v1 요청을 만든다', () => {
  const request = buildGeminiRequest({
    GEMINI_API_KEY: 'google-key',
    CF_AIG_ACCOUNT_ID: 'account-123',
    CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
    CF_AIG_TOKEN: 'gateway-token',
  }, 'models/gemini-2.5-flash:generateContent');

  assert.equal(request.transport, 'cloudflare-ai-gateway');
  assert.equal(
    request.url,
    'https://gateway.ai.cloudflare.com/v1/account-123/jobsaju-gemini/google-ai-studio/v1/models/gemini-2.5-flash:generateContent',
  );
  assert.equal(request.headers['Content-Type'], 'application/json');
  assert.equal(request.headers['x-goog-api-key'], 'google-key');
  assert.equal(request.headers['cf-aig-authorization'], 'Bearer gateway-token');
  assert.ok(!request.url.includes('google-key'));
});

test('Gateway 설정이 전혀 없으면 기존 Google AI Studio 직접 호출을 유지한다', () => {
  const request = buildGeminiRequest(
    { GEMINI_API_KEY: 'google-key' },
    'models/gemini-2.5-flash:generateContent',
  );

  assert.equal(request.transport, 'google-ai-studio-direct');
  assert.equal(
    request.url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=google-key',
  );
  assert.deepEqual(request.headers, { 'Content-Type': 'application/json' });
});

test('Gateway 설정 일부만 있으면 공급자 요청을 만들지 않는다', () => {
  assert.throws(
    () => buildGeminiRequest({
      GEMINI_API_KEY: 'google-key',
      CF_AIG_ACCOUNT_ID: 'account-123',
      CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
    }, 'models'),
    /AI Gateway 설정이 완전하지 않습니다/,
  );
});
