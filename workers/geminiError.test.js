import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGeminiError } from './geminiError.js';

test('Gemini 오류 응답에서 상태와 실제 원인 메시지를 보존한다', () => {
  const result = parseGeminiError(404, 'Not Found', JSON.stringify({
    error: {
      code: 404,
      status: 'NOT_FOUND',
      message: 'models/gemini-2.5-flash is not found for API version v1beta',
    },
  }));

  assert.deepEqual(result, {
    status: 404,
    code: 'NOT_FOUND',
    message: 'models/gemini-2.5-flash is not found for API version v1beta',
  });
  assert.equal(String(result), '[NOT_FOUND] models/gemini-2.5-flash is not found for API version v1beta');
});

test('오류 메시지에 키가 포함돼도 응답에서는 제거한다', () => {
  const result = parseGeminiError(400, 'Bad Request', JSON.stringify({
    error: { message: 'request failed with key=secret-value&model=test' },
  }));

  assert.equal(result.message, 'request failed with key=[redacted]&model=test');
});

test('Gemini가 JSON이 아닌 오류를 반환해도 안전한 기본값을 만든다', () => {
  const result = parseGeminiError(503, 'Service Unavailable', '<html>down</html>');

  assert.deepEqual(result, {
    status: 503,
    code: 'GEMINI_UPSTREAM_ERROR',
    message: 'Service Unavailable',
  });
});
